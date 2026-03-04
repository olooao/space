"""TLE Service API router."""
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
import redis.asyncio as aioredis

from .tle_fetcher import get_all_tles, find_tle, TLE_TIMESTAMP_KEY

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_redis() -> aioredis.Redis:
    """Dependency — gets the app-level Redis client."""
    from main import redis_client
    return redis_client


@router.get("/health")
async def health():
    return {"status": "ok", "service": "tle_service"}


@router.get("/satellites")
async def list_satellites(redis: aioredis.Redis = Depends(get_redis)):
    """Return all tracked satellite names and total count."""
    all_tles = await get_all_tles(redis)
    last_updated = await redis.get(TLE_TIMESTAMP_KEY)
    return {
        "count": len(all_tles),
        "last_updated": last_updated,
        "satellites": list(all_tles.keys()),
    }


@router.get("/tle/{name}")
async def get_tle(name: str, redis: aioredis.Redis = Depends(get_redis)):
    """Return TLE for a specific satellite (fuzzy name match)."""
    tle = await find_tle(redis, name)
    if not tle:
        raise HTTPException(status_code=404, detail=f"Satellite '{name}' not found")
    return tle


@router.get("/tle/raw/all")
async def get_all_raw(redis: aioredis.Redis = Depends(get_redis)):
    """Return all TLEs with metadata."""
    all_tles = await get_all_tles(redis)
    last_updated = await redis.get(TLE_TIMESTAMP_KEY)
    return {
        "last_updated": last_updated,
        "count": len(all_tles),
        "data": all_tles,
    }


@router.post("/refresh")
async def force_refresh(redis: aioredis.Redis = Depends(get_redis)):
    """Force-trigger an immediate TLE refresh."""
    from .tle_fetcher import fetch_and_cache_tles
    count = await fetch_and_cache_tles(redis)
    return {"status": "refreshed", "count": count}
