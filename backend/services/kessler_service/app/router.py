"""Kessler Service API router."""
import asyncio
import logging
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel

from .cascade_engine import engine

logger = logging.getLogger(__name__)
router = APIRouter()

ORBITAL_SERVICE_URL = os.environ.get("ORBITAL_SERVICE_URL", "http://orbital_service:8002")

_cascade_task: Optional[asyncio.Task] = None


class KesslerTriggerRequest(BaseModel):
    target: str = "ISS (ZARYA)"
    projectile_mass_kg: float = 900.0
    relative_velocity_km_s: float = 10.2


async def _load_satellite_data(target_name: str) -> dict:
    """Fetch orbital elements for target satellite from orbital_service."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{ORBITAL_SERVICE_URL}/satellite/{target_name}/elements"
            )
            if resp.status_code == 200:
                data = resp.json()
                data["mass_kg"] = 420000.0 if "ISS" in target_name.upper() else 500.0
                return data
        except Exception as e:
            logger.warning(f"Could not fetch orbital elements for {target_name}: {e}")

    # Fallback: ISS-like orbit
    return {
        "semi_major_axis_km": 6778.0,
        "inclination_deg": 51.6,
        "eccentricity": 0.001,
        "mass_kg": 500.0,
    }


async def _load_active_satellites():
    """Load active satellite list for cascade conjunction screening."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(f"{ORBITAL_SERVICE_URL}/satellites")
            if resp.status_code == 200:
                sat_names = resp.json().get("satellites", [])[:200]
                # Fetch simplified orbital elements for top 100 satellites
                sats = []
                for name in sat_names[:100]:
                    try:
                        r = await client.get(
                            f"{ORBITAL_SERVICE_URL}/satellite/{name}/elements"
                        )
                        if r.status_code == 200:
                            d = r.json()
                            d["mass_kg"] = 300.0
                            sats.append(d)
                    except Exception:
                        continue
                engine.active_satellites = sats
                logger.info(f"Loaded {len(sats)} active satellites for cascade screening")
        except Exception as e:
            logger.warning(f"Failed to load active satellites: {e}")


async def _run_cascade_loop(sim_id: str, step_interval: float = 1.0):
    """Background cascade loop — runs engine.step() every second until stopped."""
    logger.info(f"Cascade loop started: {sim_id}")
    while engine.is_running and engine.simulation_id == sim_id:
        try:
            engine.step()
        except Exception as e:
            logger.error(f"Cascade step error: {e}")
        await asyncio.sleep(step_interval)
    logger.info(f"Cascade loop ended: {sim_id}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "kessler_service"}


@router.post("/trigger")
async def trigger_kessler(req: KesslerTriggerRequest, background_tasks: BackgroundTasks):
    """Trigger a Kessler cascade simulation from an initial collision."""
    global _cascade_task

    # Stop any running simulation
    if engine.is_running:
        engine.is_running = False
        await asyncio.sleep(0.5)

    engine.reset()

    # Load orbital data
    target_orbit = await _load_satellite_data(req.target)
    await _load_active_satellites()

    # Trigger initial collision
    event = engine.trigger_initial_collision(
        target_name=req.target,
        target_orbit=target_orbit,
        projectile_mass_kg=req.projectile_mass_kg,
        relative_velocity_km_s=req.relative_velocity_km_s,
    )

    # Start background cascade loop
    sim_id = engine.simulation_id
    background_tasks.add_task(_run_cascade_loop, sim_id, 1.0)

    return {
        "status": "cascade_initiated",
        "simulation_id": sim_id,
        "initial_event": event,
    }


@router.post("/stop")
async def stop_kessler():
    """Stop the running cascade simulation."""
    engine.is_running = False
    return {"status": "stopped", "simulation_id": engine.simulation_id}


@router.get("/status")
async def get_status():
    """Return current cascade statistics."""
    stats = engine._stats()
    return stats


@router.get("/fragments")
async def get_fragments(limit: int = Query(2000, le=10000)):
    """Return active fragment positions (for Globe3D rendering)."""
    positions = engine.get_active_fragment_positions(limit=limit)
    return {
        "simulation_id": engine.simulation_id,
        "total": len(engine.fragments),
        "active": sum(1 for f in engine.fragments if f.is_active),
        "count": len(positions),
        "fragments": positions,
    }


@router.get("/solutions")
async def get_solutions():
    """Return Hohmann deorbit solutions for densest altitude zones."""
    solutions = engine.get_solutions()
    return {"simulation_id": engine.simulation_id, "solutions": solutions}


@router.get("/events")
async def get_events(limit: int = Query(50, le=200)):
    """Return recent cascade collision events."""
    events = engine.cascade_events[-limit:]
    events.reverse()
    return {"events": events, "total": len(engine.cascade_events)}


@router.post("/reset")
async def reset_simulation():
    """Reset the simulation to initial state."""
    engine.reset()
    return {"status": "reset"}
