"""TLE Service — FastAPI app entry point."""
import logging
import os

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import router
from app.scheduler import create_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ASRIDE TLE Service",
    version="2.0.0",
    description="Two-Line Element data ingestion and caching service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Module-level Redis client (shared with router via import)
redis_client: aioredis.Redis | None = None
_scheduler = None


@app.on_event("startup")
async def startup():
    global redis_client, _scheduler

    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    redis_client = aioredis.from_url(redis_url, decode_responses=True)

    refresh_hours = int(os.environ.get("TLE_REFRESH_HOURS", "4"))
    _scheduler = create_scheduler(redis_client, refresh_hours)
    _scheduler.start()

    logger.info(f"TLE Service started. Redis: {redis_url}")


@app.on_event("shutdown")
async def shutdown():
    if _scheduler:
        _scheduler.shutdown(wait=False)
    if redis_client:
        await redis_client.aclose()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tle_service"}
