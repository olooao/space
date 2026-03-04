"""Kessler Cascade Engine — real-time orbital debris cascade simulation.

Physics:
- J2 nodal regression for orbit precession
- Exponential atmospheric drag model (MSIS-90 simplified)
- Geometric conjunction screening (altitude-shell bucketing)
- Secondary breakup via NASA SBAM on close approach < threshold
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np

from .breakup_model import NASABreakupModel, DebrisFragment, R_EARTH, MU_EARTH

logger = logging.getLogger(__name__)

# Atmospheric density scale (exponential model, Jacchia 1970 simplified)
_ATMO_H0 = 200.0   # km reference altitude
_ATMO_RHO0 = 1.41e-7  # kg/m^3 at 200 km
_ATMO_H_SCALE = 63.3  # km scale height

# J2 constant
J2 = 1.08263e-3
R_EARTH_J2 = R_EARTH

DEORBIT_ALT_KM = 180.0   # Below this → deorbit
MAX_FRAGMENTS = 50000     # Cap for performance


class KesslerCascadeEngine:
    """Manages the Kessler cascade simulation state and step execution."""

    def __init__(self):
        self.breakup_model = NASABreakupModel()
        self.fragments: List[DebrisFragment] = []
        self.active_satellites: List[dict] = []   # Real sat orbital data from orbital_service
        self.cascade_events: List[dict] = []
        self.is_running: bool = False
        self.simulation_id: str = ""
        self.elapsed_steps: int = 0
        self.time_step_s: float = 60.0   # 1 min per step
        self.collision_threshold_km: float = 0.5

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def trigger_initial_collision(
        self,
        target_name: str,
        target_orbit: dict,
        projectile_mass_kg: float,
        relative_velocity_km_s: float,
    ) -> dict:
        """Start a new cascade from an initial collision event."""
        self.fragments.clear()
        self.cascade_events.clear()
        self.elapsed_steps = 0
        self.is_running = True
        self.simulation_id = str(uuid.uuid4())[:8]

        initial_frags = self.breakup_model.catastrophic_collision(
            target_mass_kg=target_orbit.get("mass_kg", 500.0),
            projectile_mass_kg=projectile_mass_kg,
            relative_velocity_km_s=relative_velocity_km_s,
            target_orbit=target_orbit,
            parent_id=target_name,
            generation=0,
            max_fragments=8000,
        )
        self.fragments.extend(initial_frags)

        event = {
            "type": "initial_collision",
            "target": target_name,
            "fragments_generated": len(initial_frags),
            "alt_km": target_orbit.get("semi_major_axis_km", 6771) - R_EARTH,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "generation": 0,
        }
        self.cascade_events.append(event)
        logger.info(
            f"Cascade started: {target_name}, {len(initial_frags)} initial fragments"
        )
        return event

    def step(self) -> dict:
        """Advance the simulation one time step (1 minute).

        1. Propagate all fragments (J2 + drag)
        2. Detect conjunctions with active satellites
        3. Trigger secondary breakups
        4. Compute statistics

        Returns step dict for WebSocket broadcast.
        """
        if not self.is_running:
            return self._stats()

        new_fragments: List[DebrisFragment] = []
        new_events: List[dict] = []

        # 1. Propagate fragments
        active_frags = []
        for frag in self.fragments:
            if not frag.is_active:
                continue
            alt = frag.semi_major_axis_km - R_EARTH

            # Deorbit check
            if alt < DEORBIT_ALT_KM:
                frag.is_active = False
                continue

            # Advance mean anomaly (orbital period)
            n_deg_day = np.sqrt(MU_EARTH / frag.semi_major_axis_km**3) * (180.0 / np.pi) * 86400.0
            dM = n_deg_day * (self.time_step_s / 86400.0)
            frag.mean_anomaly_deg = (frag.mean_anomaly_deg + dM) % 360.0

            # J2 nodal regression (deg/day)
            cos_i = np.cos(np.radians(frag.inclination_deg))
            e2 = frag.eccentricity**2
            d_raan = (
                -9.964 * (R_EARTH_J2 / frag.semi_major_axis_km)**3.5
                * cos_i / (1 - e2)**2
            )
            frag.raan_deg = (frag.raan_deg + d_raan * self.time_step_s / 86400.0) % 360.0

            # Atmospheric drag (exponential model)
            if alt < 600.0:
                rho = _ATMO_RHO0 * np.exp(-(alt - _ATMO_H0) / _ATMO_H_SCALE)
                v_orbit = np.sqrt(MU_EARTH / frag.semi_major_axis_km) * 1000.0  # m/s
                a_drag = 0.5 * rho * v_orbit**2 * frag.area_to_mass_ratio  # m/s^2
                a_drag_km_s2 = a_drag / 1e6
                # da/dt = -2 * a * a_drag / v²
                da = -2.0 * frag.semi_major_axis_km * a_drag_km_s2 * self.time_step_s
                frag.semi_major_axis_km = max(frag.semi_major_axis_km + da, R_EARTH + 100)

            active_frags.append(frag)

        # 2. Conjunction screening (bucket by 100km altitude shell)
        sat_buckets: dict[int, list] = {}
        for sat in self.active_satellites[:200]:
            sma = sat.get("semi_major_axis_km", 6771.0)
            bucket = int((sma - R_EARTH) / 100)
            sat_buckets.setdefault(bucket, []).append(sat)

        # Sample fragments for screening (performance limit)
        sample_size = min(1000, len(active_frags))
        if sample_size > 0:
            sample_idx = np.random.choice(len(active_frags), sample_size, replace=False)
            sample_frags = [active_frags[i] for i in sample_idx]
        else:
            sample_frags = []

        for frag in sample_frags:
            frag_bucket = int((frag.semi_major_axis_km - R_EARTH) / 100)

            # Check frags buckets ±1 shell
            for b in [frag_bucket - 1, frag_bucket, frag_bucket + 1]:
                for sat in sat_buckets.get(b, []):
                    sat_sma = sat.get("semi_major_axis_km", 6771.0)
                    sat_inc = sat.get("inclination_deg", 51.6)

                    # Quick geometric filter
                    miss = self._estimate_miss_distance(frag, sat_sma, sat_inc)
                    if miss < self.collision_threshold_km:
                        cascade_frags = self.breakup_model.catastrophic_collision(
                            target_mass_kg=sat.get("mass_kg", 300.0),
                            projectile_mass_kg=frag.mass_kg,
                            relative_velocity_km_s=10.5,
                            target_orbit={
                                "semi_major_axis_km": sat_sma,
                                "inclination_deg": sat_inc,
                                "mass_kg": sat.get("mass_kg", 300.0),
                            },
                            parent_id=sat.get("name", "UNKNOWN"),
                            generation=frag.generation + 1,
                            max_fragments=500,
                        )
                        new_fragments.extend(cascade_frags)
                        new_events.append({
                            "type": "cascade_collision",
                            "victim_satellite": sat.get("name", "UNKNOWN"),
                            "impacting_fragment": frag.id,
                            "new_fragments": len(cascade_frags),
                            "generation": frag.generation + 1,
                            "alt_km": float(frag.semi_major_axis_km - R_EARTH),
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                        frag.is_active = False
                        break

        # 3. Add new fragments (capped)
        remaining_capacity = MAX_FRAGMENTS - len(self.fragments)
        if remaining_capacity > 0:
            self.fragments.extend(new_fragments[:remaining_capacity])

        self.cascade_events.extend(new_events)
        self.elapsed_steps += 1

        stats = self._stats()
        stats["new_events"] = new_events
        return stats

    def get_active_fragment_positions(self, limit: int = 2000) -> list:
        """Return position dicts for active fragments (most recent first)."""
        active = [f for f in self.fragments if f.is_active]
        # Prioritize higher generation (cascade) fragments for visual interest
        active.sort(key=lambda f: -f.generation)
        return [f.to_dict() for f in active[:limit]]

    def get_solutions(self) -> list:
        """Compute Hohmann deorbit solutions for densest altitude zones."""
        density = self._zone_density()
        solutions = []

        for zone, count in sorted(density.items(), key=lambda x: -x[1])[:5]:
            if count == 0:
                continue
            alt_lo = int(zone.split("-")[0])
            alt_hi = int(zone.split("-")[1].replace("km", ""))
            alt_center = (alt_lo + alt_hi) / 2

            r1 = (R_EARTH + alt_center) * 1000.0   # meters
            r2 = (R_EARTH + max(alt_center - 50, 100)) * 1000.0

            v1 = np.sqrt(MU_EARTH * 1e9 / r1)             # m/s
            v_trans_apo = np.sqrt(2 * MU_EARTH * 1e9 * r2 / (r1 * (r1 + r2)))
            dv = abs(v1 - v_trans_apo)

            clearance_years = round(50.0 / max(alt_center * 0.001, 0.01), 1)
            solutions.append({
                "zone": zone,
                "fragment_count": count,
                "recommended_action": "controlled_deorbit",
                "target_altitude_km": int(alt_center - 50),
                "delta_v_m_s": round(dv, 1),
                "priority": (
                    "CRITICAL" if count > 2000
                    else "HIGH" if count > 500
                    else "MEDIUM"
                ),
                "estimated_clearance_years": clearance_years,
            })
        return solutions

    def reset(self):
        """Reset simulation state."""
        self.fragments.clear()
        self.cascade_events.clear()
        self.elapsed_steps = 0
        self.is_running = False
        self.simulation_id = ""

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _estimate_miss_distance(
        self, frag: DebrisFragment, sat_sma: float, sat_inc: float
    ) -> float:
        """Simplified geometric miss-distance estimate using orbital proximity."""
        sma_diff = abs(frag.semi_major_axis_km - sat_sma)
        inc_diff = abs(frag.inclination_deg - sat_inc)
        # Weighted metric: altitude proximity dominates
        return sma_diff + inc_diff * 20.0

    def _zone_density(self) -> dict:
        """Count active fragments per 100km altitude shell (200–2000km)."""
        shells = {}
        for lo in range(200, 2000, 100):
            hi = lo + 100
            shells[f"{lo}-{hi}km"] = 0

        for frag in self.fragments:
            if not frag.is_active:
                continue
            alt = frag.semi_major_axis_km - R_EARTH
            if 200 <= alt < 2000:
                lo_key = int((alt - 200) // 100) * 100 + 200
                hi_key = lo_key + 100
                key = f"{lo_key}-{hi_key}km"
                if key in shells:
                    shells[key] += 1
        return shells

    def _stats(self) -> dict:
        active = sum(1 for f in self.fragments if f.is_active)
        gens = [f.generation for f in self.fragments if f.is_active]
        return {
            "simulation_id": self.simulation_id,
            "is_running": self.is_running,
            "total_fragments": len(self.fragments),
            "active_fragments": active,
            "total_cascade_events": len(self.cascade_events),
            "zone_density": self._zone_density(),
            "elapsed_steps": self.elapsed_steps,
            "max_generation": int(max(gens)) if gens else 0,
            "generations": list(set(gens)),
        }


# Module-level singleton
engine = KesslerCascadeEngine()
