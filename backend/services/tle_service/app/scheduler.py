"""APScheduler job for periodic TLE refresh."""
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from .tle_fetcher import fetch_and_cache_tles

logger = logging.getLogger(__name__)


def create_scheduler(redis, refresh_hours: int = 4) -> AsyncIOScheduler:
    """Create and configure the TLE refresh scheduler."""
    scheduler = AsyncIOScheduler(timezone="UTC")

    scheduler.add_job(
        fetch_and_cache_tles,
        trigger="interval",
        hours=refresh_hours,
        args=[redis],
        id="tle_refresh",
        next_run_time=datetime.now(timezone.utc),  # Run immediately at startup
        replace_existing=True,
    )

    logger.info(f"TLE scheduler configured: refresh every {refresh_hours}h")
    return scheduler
