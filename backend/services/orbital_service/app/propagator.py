"""SGP4 orbital propagation using Skyfield.

Outputs include ECI XYZ coordinates for direct Three.js 3D rendering.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import numpy as np
from skyfield.api import EarthSatellite, load, wgs84

logger = logging.getLogger(__name__)

# Skyfield timescale — loaded once (contains leap-second table)
_ts = load.timescale()

# Thread pool for Skyfield (CPU-bound, synchronous)
_executor = ThreadPoolExecutor(max_workers=8)


def _tle_to_satellite(tle: dict) -> EarthSatellite:
    """Construct a Skyfield EarthSatellite from a TLE dict."""
    return EarthSatellite(tle["line1"], tle["line2"], tle["name"], _ts)


def _compute_position_sync(tle: dict, t_utc: datetime) -> dict:
    """Synchronous SGP4 propagation — run in executor."""
    sat = _tle_to_satellite(tle)
    t = _ts.from_datetime(t_utc)

    geo = sat.at(t)
    sub = wgs84.subpoint(geo)
    pos_km = geo.position.km
    vel_km_s = geo.velocity.km_per_s
    speed = float(np.linalg.norm(vel_km_s))

    return {
        "name": tle["name"],
        "lat": float(sub.latitude.degrees),
        "lon": float(sub.longitude.degrees),
        "alt_km": float(sub.elevation.km),
        "x_km": float(pos_km[0]),
        "y_km": float(pos_km[1]),
        "z_km": float(pos_km[2]),
        "vx_km_s": float(vel_km_s[0]),
        "vy_km_s": float(vel_km_s[1]),
        "vz_km_s": float(vel_km_s[2]),
        "speed_km_s": speed,
        "timestamp": t_utc.isoformat(),
        "path": [],
        "risk_level": "GREEN",
    }


def _compute_trajectory_sync(tle: dict, t_utc: datetime, steps: int = 90) -> list:
    """Compute 90-step trajectory (1 step per minute). Returns [[lon,lat,alt],...]."""
    sat = _tle_to_satellite(tle)
    path = []
    for i in range(steps):
        t_future = t_utc + timedelta(minutes=i)
        t = _ts.from_datetime(t_future)
        try:
            geo = sat.at(t)
            sub = wgs84.subpoint(geo)
            path.append([
                float(sub.longitude.degrees),
                float(sub.latitude.degrees),
                float(sub.elevation.km),
            ])
        except Exception:
            continue
    return path


async def get_position(tle: dict, t_utc: Optional[datetime] = None) -> dict:
    """Async wrapper for satellite position computation."""
    if t_utc is None:
        t_utc = datetime.now(timezone.utc)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _compute_position_sync, tle, t_utc)


async def get_position_with_trajectory(tle: dict, t_utc: Optional[datetime] = None) -> dict:
    """Get current position plus 90-minute trajectory path."""
    if t_utc is None:
        t_utc = datetime.now(timezone.utc)
    loop = asyncio.get_event_loop()

    pos, path = await asyncio.gather(
        loop.run_in_executor(_executor, _compute_position_sync, tle, t_utc),
        loop.run_in_executor(_executor, _compute_trajectory_sync, tle, t_utc, 90),
    )
    pos["path"] = path
    return pos


async def get_constellation_positions(tles: dict, search_term: str, limit: int = 500) -> list:
    """Get current positions for all satellites matching search_term (case-insensitive)."""
    term_upper = search_term.upper()
    matching = [v for k, v in tles.items() if term_upper in k.upper()][:limit]

    if not matching:
        return []

    t_utc = datetime.now(timezone.utc)
    loop = asyncio.get_event_loop()

    # Fan-out in thread pool
    tasks = [
        loop.run_in_executor(_executor, _compute_position_sync, tle, t_utc)
        for tle in matching
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    positions = []
    for res in results:
        if isinstance(res, Exception):
            logger.debug(f"Position compute failed: {res}")
            continue
        positions.append(res)

    return positions


def get_keplerian_elements(tle: dict) -> dict:
    """Extract Keplerian elements from TLE line2 for Kessler cascade engine."""
    line2 = tle["line2"]
    try:
        inclination = float(line2[8:16].strip())
        raan = float(line2[17:25].strip())
        ecc_str = line2[26:33].strip()
        eccentricity = float("0." + ecc_str)
        arg_perigee = float(line2[34:42].strip())
        mean_anomaly = float(line2[43:51].strip())
        mean_motion = float(line2[52:63].strip())   # rev/day
        # Semi-major axis from mean motion (km)
        mu = 398600.4418  # km^3/s^2
        n_rad_s = mean_motion * 2 * np.pi / 86400.0
        sma = (mu / (n_rad_s ** 2)) ** (1.0 / 3.0)

        return {
            "semi_major_axis_km": float(sma),
            "eccentricity": eccentricity,
            "inclination_deg": inclination,
            "raan_deg": raan,
            "arg_perigee_deg": arg_perigee,
            "mean_anomaly_deg": mean_anomaly,
        }
    except Exception as e:
        logger.warning(f"Failed to parse Keplerian elements: {e}")
        return {
            "semi_major_axis_km": 6771.0,
            "eccentricity": 0.001,
            "inclination_deg": 51.6,
            "raan_deg": 0.0,
            "arg_perigee_deg": 0.0,
            "mean_anomaly_deg": 0.0,
        }
