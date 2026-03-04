"""Orbital Service API router."""
import logging
import os
from datetime import datetime, timezone

import httpx
import json
from fastapi import APIRouter, HTTPException, Query

from .propagator import (
    get_position,
    get_position_with_trajectory,
    get_constellation_positions,
    get_keplerian_elements,
)

logger = logging.getLogger(__name__)
router = APIRouter()

TLE_SERVICE_URL = os.environ.get("TLE_SERVICE_URL", "http://localhost:8001")


async def _fetch_all_tles() -> dict:
    """Fetch TLE dict from tle_service."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{TLE_SERVICE_URL}/tle/raw/all")
        resp.raise_for_status()
        return resp.json().get("data", {})


async def _fetch_tle(name: str) -> dict | None:
    """Fetch a single TLE from tle_service by name."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(f"{TLE_SERVICE_URL}/tle/{name}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


@router.get("/health")
async def health():
    return {"status": "ok", "service": "orbital_service"}


@router.get("/satellites")
async def list_satellites():
    """List all tracked satellite names."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{TLE_SERVICE_URL}/satellites")
        return resp.json()


@router.get("/satellite/{name}/position")
async def satellite_position(name: str, trajectory: bool = Query(False)):
    """Get current 3D position (+ optional 90-min trajectory) for a satellite."""
    tle = await _fetch_tle(name)
    if not tle:
        raise HTTPException(status_code=404, detail=f"Satellite '{name}' not found")

    if trajectory:
        pos = await get_position_with_trajectory(tle)
    else:
        pos = await get_position(tle)

    return pos


@router.get("/satellite/{name}/elements")
async def satellite_elements(name: str):
    """Return Keplerian orbital elements for a satellite (used by kessler_service)."""
    tle = await _fetch_tle(name)
    if not tle:
        raise HTTPException(status_code=404, detail=f"Satellite '{name}' not found")
    elements = get_keplerian_elements(tle)
    elements["name"] = name
    return elements


@router.get("/constellation/{name}")
async def constellation_positions(
    name: str,
    limit: int = Query(500, le=1000),
):
    """Get current positions for all satellites in a constellation."""
    # Map common names to TLE search terms
    search_map = {
        "STARLINK": "STARLINK",
        "GPS": "NAVSTAR",
        "GLONASS": "COSMOS",
        "GALILEO": "GALILEO",
        "ONEWEBI": "ONEWEB",
        "IRIDIUM": "IRIDIUM",
        "ISS": "ISS",
    }
    search_term = search_map.get(name.upper(), name.upper())

    all_tles = await _fetch_all_tles()
    positions = await get_constellation_positions(all_tles, search_term, limit)

    return {
        "constellation": name,
        "search_term": search_term,
        "count": len(positions),
        "satellites": positions,
    }


@router.post("/positions/batch")
async def batch_positions(names: list[str]):
    """Get current positions for a list of satellite names (max 100)."""
    if len(names) > 100:
        raise HTTPException(status_code=400, detail="Max 100 satellites per batch")

    import asyncio
    results = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = []
        for name in names:
            tasks.append(client.get(f"{TLE_SERVICE_URL}/tle/{name}"))
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    valid_tles = []
    for resp in responses:
        if isinstance(resp, Exception) or resp.status_code != 200:
            continue
        valid_tles.append(resp.json())

    import asyncio as _asyncio
    positions = await _asyncio.gather(
        *[get_position(tle) for tle in valid_tles],
        return_exceptions=True,
    )
    return [p for p in positions if not isinstance(p, Exception)]
