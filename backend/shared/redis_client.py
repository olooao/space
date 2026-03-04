"""Shared async Redis client factory."""
import os
import redis.asyncio as aioredis

_redis_pool = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
        _redis_pool = aioredis.from_url(redis_url, decode_responses=True)
    return _redis_pool


async def close_redis():
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None
