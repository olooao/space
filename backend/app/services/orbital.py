from skyfield.api import load, wgs84
from datetime import timedelta
from backend.app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class OrbitalService:
    def __init__(self):
        self.satellites = {}
        self.ts = load.timescale()
        self.is_loaded = False

    def load_data(self):
        """Loads TLE data from configured sources."""
        if self.is_loaded:
            return

        logger.info("⏳ [PHYSICS] Ingesting CelesTrak TLE Data...")
        count = 0
        for url in settings.TLE_URLS:
            try:
                # In a real prod env, we might want to cache these files locally
                # to avoid hitting CelesTrak on every restart.
                tles = load.tle_file(url)
                for sat in tles:
                    self.satellites[sat.name] = sat
                    count += 1
            except Exception as e:
                logger.warning(f"⚠️ [WARNING] Failed source {url}: {e}")
        
        self.is_loaded = True
        logger.info(f"✅ [SYSTEM READY] Tracking {count} active orbital bodies.")

    def get_satellite(self, name: str):
        # Exact match
        if name in self.satellites:
            return self.satellites[name]
        
        # Fuzzy match (first found)
        # Optimization: Create a normalized mapping if this is slow
        for key, sat in self.satellites.items():
            if name.upper() in key.upper():
                return sat
        return None

    def get_all_satellites(self):
        return self.satellites

    def get_trajectory(self, sat, t_now, duration_minutes=90, steps=30):
        """Calculates future path for visualization"""
        path = []
        step_size = duration_minutes / steps
        
        for i in range(steps):
            time_offset = i * step_size
            t_future = self.ts.from_datetime(t_now.utc_datetime() + timedelta(minutes=time_offset))
            
            geocentric = sat.at(t_future)
            subpoint = wgs84.subpoint(geocentric)
            
            path.append([subpoint.longitude.degrees, subpoint.latitude.degrees])
        
        return path

    def get_position(self, sat, t):
        geo = sat.at(t)
        sub = wgs84.subpoint(geo)
        return geo, sub

orbital_service = OrbitalService()
