"""Time of Closest Approach calculation via SGP4 propagation."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import numpy as np
from skyfield.api import EarthSatellite, load

logger = logging.getLogger(__name__)
_ts = load.timescale()
_executor = ThreadPoolExecutor(max_workers=4)


def _find_tca_sync(
    tle1: dict,
    tle2: dict,
    t_start: datetime,
    window_minutes: int = 120,
    steps: int = 240,
) -> tuple:
    """Find Time of Closest Approach.

    Returns:
        (tca_iso: str, min_dist_km: float, rel_vel_km_s: float,
         pos1: list[float,float,float], pos2: list[float,float,float])
    """
    sat1 = EarthSatellite(tle1["line1"], tle1["line2"], tle1["name"], _ts)
    sat2 = EarthSatellite(tle2["line1"], tle2["line2"], tle2["name"], _ts)

    step_size = window_minutes / steps  # minutes
    min_dist = float("inf")
    tca_time = t_start
    tca_vel = 0.0
    pos1_at_tca = [0.0, 0.0, 0.0]
    pos2_at_tca = [0.0, 0.0, 0.0]

    for i in range(steps):
        t_dt = t_start + timedelta(minutes=i * step_size)
        t = _ts.from_datetime(t_dt)

        try:
            g1 = sat1.at(t)
            g2 = sat2.at(t)
            p1 = np.array(g1.position.km)
            p2 = np.array(g2.position.km)
            dist = float(np.linalg.norm(p1 - p2))

            if dist < min_dist:
                min_dist = dist
                tca_time = t_dt
                v1 = np.array(g1.velocity.km_per_s)
                v2 = np.array(g2.velocity.km_per_s)
                tca_vel = float(np.linalg.norm(v1 - v2))
                pos1_at_tca = p1.tolist()
                pos2_at_tca = p2.tolist()
        except Exception:
            continue

    return (
        tca_time.isoformat(),
        min_dist,
        tca_vel,
        pos1_at_tca,
        pos2_at_tca,
    )


async def find_tca(tle1: dict, tle2: dict) -> tuple:
    """Async wrapper for TCA computation."""
    t_start = datetime.now(timezone.utc)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _find_tca_sync, tle1, tle2, t_start)
