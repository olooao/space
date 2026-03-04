"""TLE fetcher — async CelesTrak download + Redis cache."""
import json
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

CELESTRAK_URLS = [
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=debris&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle",
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle",
]

TLE_CACHE_KEY = "tle:all"
TLE_TIMESTAMP_KEY = "tle:last_updated"
TLE_TTL_SECONDS = 14700  # 4 hours + 5 min buffer


def _parse_tle_text(text: str) -> dict:
    """Parse raw TLE text (3-line format) into a dict keyed by satellite name."""
    satellites = {}
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    i = 0
    while i < len(lines) - 2:
        # TLE line 1 starts with "1 " and line 2 starts with "2 "
        if lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 "):
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()
            satellites[name] = {"name": name, "line1": line1, "line2": line2}
            i += 3
        else:
            i += 1
    return satellites


async def fetch_and_cache_tles(redis) -> int:
    """Fetch TLEs from CelesTrak, merge all groups, cache in Redis.

    Returns number of satellites cached.
    """
    all_satellites = {}

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        for url in CELESTRAK_URLS:
            try:
                response = await client.get(url)
                response.raise_for_status()
                parsed = _parse_tle_text(response.text)
                all_satellites.update(parsed)
                logger.info(f"Fetched {len(parsed)} TLEs from {url.split('=')[1]}")
            except Exception as exc:
                logger.warning(f"Failed to fetch {url}: {exc}")

    if not all_satellites:
        logger.error("No TLEs fetched from any source!")
        return 0

    serialized = json.dumps(all_satellites)
    await redis.setex(TLE_CACHE_KEY, TLE_TTL_SECONDS, serialized)
    await redis.set(
        TLE_TIMESTAMP_KEY,
        datetime.now(timezone.utc).isoformat()
    )

    count = len(all_satellites)
    logger.info(f"Cached {count} TLEs in Redis (TTL={TLE_TTL_SECONDS}s)")
    return count


async def get_all_tles(redis) -> dict:
    """Load all TLEs from Redis cache. Returns empty dict if not yet loaded."""
    data = await redis.get(TLE_CACHE_KEY)
    if not data:
        return {}
    return json.loads(data)


async def find_tle(redis, name: str) -> dict | None:
    """Fuzzy-match satellite by name. Tries exact first, then substring (case-insensitive)."""
    all_tles = await get_all_tles(redis)

    # Exact match
    if name in all_tles:
        return all_tles[name]

    # Substring match (case-insensitive)
    name_upper = name.upper()
    for key, tle in all_tles.items():
        if name_upper in key.upper():
            return tle

    return None
