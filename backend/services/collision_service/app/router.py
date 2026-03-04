"""Collision Service API router."""
import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .conjunction import find_tca
from .probability import calculate_Pc_foster, classify_risk, risk_label

logger = logging.getLogger(__name__)
router = APIRouter()

TLE_SERVICE_URL = os.environ.get("TLE_SERVICE_URL", "http://tle_service:8001")
ORBITAL_SERVICE_URL = os.environ.get("ORBITAL_SERVICE_URL", "http://orbital_service:8002")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")


class ConjunctionRequest(BaseModel):
    obj1_name: str
    obj2_name: str


async def _fetch_tle(name: str) -> dict | None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(f"{TLE_SERVICE_URL}/tle/{name}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Failed to fetch TLE for {name}: {e}")
            return None


@router.get("/health")
async def health():
    return {"status": "ok", "service": "collision_service"}


@router.post("/analyze")
async def analyze_conjunction(req: ConjunctionRequest):
    """Full conjunction analysis between two orbital objects.

    Returns: current positions (3D), TCA, miss distance, relative velocity,
             probability of collision, NASA risk classification.
    """
    # Fetch TLEs for both objects
    tle1, tle2 = await _fetch_tle(req.obj1_name), await _fetch_tle(req.obj2_name)

    if not tle1:
        raise HTTPException(status_code=404, detail=f"Object '{req.obj1_name}' not found")
    if not tle2:
        raise HTTPException(status_code=404, detail=f"Object '{req.obj2_name}' not found")

    # Compute TCA and positions
    tca_iso, miss_dist, rel_vel, pos1_km, pos2_km = await find_tca(tle1, tle2)

    # Fetch current 3D positions (with trajectory)
    async with httpx.AsyncClient(timeout=30.0) as client:
        import asyncio
        r1, r2 = await asyncio.gather(
            client.get(f"{ORBITAL_SERVICE_URL}/satellite/{tle1['name']}/position?trajectory=true"),
            client.get(f"{ORBITAL_SERVICE_URL}/satellite/{tle2['name']}/position?trajectory=true"),
        )

    obj1_pos = r1.json() if r1.status_code == 200 else {}
    obj2_pos = r2.json() if r2.status_code == 200 else {}

    # Probability of collision
    Pc = calculate_Pc_foster(miss_dist)
    risk_color = classify_risk(Pc, miss_dist)

    # Persist to Supabase if available
    if SUPABASE_URL and SUPABASE_KEY and risk_color in ("RED", "YELLOW"):
        try:
            from supabase import create_client
            sb = create_client(SUPABASE_URL, SUPABASE_KEY)
            sb.table("risk_events").insert({
                "primary_asset": req.obj1_name,
                "secondary_asset": req.obj2_name,
                "lat": obj1_pos.get("lat", 0),
                "lon": obj1_pos.get("lon", 0),
                "miss_distance": miss_dist,
                "probability": Pc * 100,
                "time_to_impact": 3600,
            }).execute()
        except Exception as e:
            logger.warning(f"Supabase insert failed: {e}")

    return {
        "obj1": obj1_pos,
        "obj2": obj2_pos,
        "miss_distance_km": round(miss_dist, 3),
        "relative_velocity_kms": round(rel_vel, 3),
        "Pc": Pc,
        "Pc_percent": round(Pc * 100, 4),
        "risk_color": risk_color,
        "risk_label": risk_label(risk_color),
        "tca_timestamp": tca_iso,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/feed")
async def event_feed(limit: int = 20):
    """Return recent high-risk conjunction events from Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"events": []}
    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = (
            sb.table("risk_events")
            .select("*")
            .order("probability", desc=True)
            .limit(limit)
            .execute()
        )
        return {"events": result.data or []}
    except Exception as e:
        logger.warning(f"Supabase feed failed: {e}")
        return {"events": []}
