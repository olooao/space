"""NASA Standard Breakup Model (SBAM) — Johnson et al. 2001.

Reference: Johnson, N.L. et al. 2001, "NASA's New Breakup Model of EVOLVE 4.0",
           Advances in Space Research 28(9), pp. 1377-1384.

Implements:
- Fragment count distribution (power-law CDF)
- Characteristic length distribution
- Area-to-mass ratio distribution (log-normal)
- Velocity distribution (Hansen 2006)
- Orbital perturbation via vis-viva equation
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import List

import numpy as np

logger = logging.getLogger(__name__)

MU_EARTH = 398600.4418  # km^3/s^2
R_EARTH = 6371.0        # km


@dataclass
class DebrisFragment:
    id: str
    parent_id: str

    # Simplified Keplerian elements (for orbit propagation)
    semi_major_axis_km: float
    eccentricity: float
    inclination_deg: float
    raan_deg: float
    arg_perigee_deg: float
    mean_anomaly_deg: float

    # Physical properties
    char_length_m: float        # L_c characteristic length
    area_to_mass_ratio: float   # A/m (m^2/kg)
    mass_kg: float

    # Runtime state
    is_active: bool = True
    generation: int = 0         # 0=primary debris, 1=first cascade, etc.

    def to_dict(self) -> dict:
        alt = self.semi_major_axis_km - R_EARTH
        # Approximate lat/lon from mean anomaly + inclination (simplified Keplerian)
        lat = np.clip(
            self.inclination_deg * np.sin(np.radians(self.mean_anomaly_deg)),
            -90, 90
        )
        lon = (self.raan_deg + self.arg_perigee_deg + self.mean_anomaly_deg) % 360 - 180
        r = self.semi_major_axis_km
        x = r * np.cos(np.radians(lon)) * np.cos(np.radians(lat))
        y = r * np.sin(np.radians(lon)) * np.cos(np.radians(lat))
        z = r * np.sin(np.radians(lat))
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "lat": float(lat),
            "lon": float(lon),
            "alt_km": float(alt),
            "x_km": float(x),
            "y_km": float(y),
            "z_km": float(z),
            "char_length_m": self.char_length_m,
            "area_to_mass": self.area_to_mass_ratio,
            "mass_kg": self.mass_kg,
            "generation": self.generation,
            "is_active": self.is_active,
        }


class NASABreakupModel:
    """Implementation of NASA Standard Breakup Model (SBAM) v4.0."""

    LC_MIN = 0.1    # Minimum trackable debris size (10 cm), meters
    LC_MAX = 10.0   # Maximum realistic fragment size, meters

    def catastrophic_collision(
        self,
        target_mass_kg: float,
        projectile_mass_kg: float,
        relative_velocity_km_s: float,
        target_orbit: dict,
        parent_id: str = "UNKNOWN",
        generation: int = 0,
        max_fragments: int = 10000,
    ) -> List[DebrisFragment]:
        """Generate fragment cloud from a hypervelocity collision.

        Catastrophic: Ep/mass_target >= 40 J/g (both objects fully fragmented).
        Non-catastrophic: cratering event, only ejecta from target surface.

        Args:
            target_mass_kg: mass of the target satellite (kg)
            projectile_mass_kg: mass of the impacting object (kg)
            relative_velocity_km_s: impact velocity (km/s)
            target_orbit: dict with semi_major_axis_km, inclination_deg
            parent_id: NORAD ID / name of target (for fragment labeling)
            generation: cascade generation number
            max_fragments: performance cap

        Returns:
            List of DebrisFragment objects
        """
        # Specific energy (J/g)
        v_m_s = relative_velocity_km_s * 1000.0
        Ep = 0.5 * projectile_mass_kg * v_m_s**2
        Ep_per_gram = Ep / (target_mass_kg * 1000.0)

        if Ep_per_gram >= 40.0:
            M_total = target_mass_kg + projectile_mass_kg
            collision_type = "catastrophic"
        else:
            # Non-catastrophic: ejecta mass ~ 4× projectile KE / target strength
            M_total = min(projectile_mass_kg * (v_m_s**2) / (5e6), target_mass_kg * 0.15)
            collision_type = "non_catastrophic"

        logger.info(
            f"Collision [{collision_type}]: Ep/g={Ep_per_gram:.1f}, "
            f"M_total={M_total:.1f}kg, v_rel={relative_velocity_km_s:.1f}km/s"
        )

        # Fragment count: N(Lc >= Lc_min) = 0.1 × M_total^0.75 × Lc_min^-1.71
        # (Johnson 2001, Eq. 2)
        N_expected = int(0.1 * (M_total ** 0.75) * (self.LC_MIN ** -1.71))
        N_fragments = min(N_expected, max_fragments)

        logger.info(f"Generating {N_fragments} fragments (expected {N_expected})")

        fragments = []
        for i in range(N_fragments):
            frag = self._generate_fragment(
                index=i,
                M_total=M_total,
                target_orbit=target_orbit,
                relative_velocity_km_s=relative_velocity_km_s,
                parent_id=parent_id,
                generation=generation,
            )
            fragments.append(frag)

        return fragments

    def _generate_fragment(
        self,
        index: int,
        M_total: float,
        target_orbit: dict,
        relative_velocity_km_s: float,
        parent_id: str,
        generation: int,
    ) -> DebrisFragment:
        """Generate a single debris fragment using SBAM distributions."""
        rng = np.random.default_rng()

        # ---- Characteristic Length (power-law CDF inversion) ----
        # CDF: P(L < x) = 1 - (x/Lmin)^(-1.71)  =>  inverse: x = Lmin * (1-u)^(-1/1.71)
        u = rng.uniform(0.001, 0.999)
        Lc = self.LC_MIN * ((1.0 - u) ** (-1.0 / 1.71))
        Lc = float(np.clip(Lc, self.LC_MIN, self.LC_MAX))

        # ---- Area-to-Mass Ratio (log-normal, SBAM Table 2) ----
        if Lc > 0.11:
            mu_log = 0.347 * np.log10(Lc) - 1.594
            sigma_log = 0.245 * np.log10(Lc) + 0.556
        else:
            mu_log = -0.45
            sigma_log = 0.55
        AmR = float(10.0 ** rng.normal(mu_log, sigma_log))
        AmR = float(np.clip(AmR, 1e-5, 100.0))

        # ---- Mass from projected area ----
        area_m2 = 0.556 * Lc**2
        mass_kg = float(np.clip(area_m2 / AmR, 1e-4, M_total * 0.5))

        # ---- Delta-V (Hansen 2006, log-normal distribution) ----
        chi = np.log10(AmR)
        mu_v = 0.2 * chi + 1.85
        sigma_v = 0.4
        dv_m_s = float(10.0 ** rng.normal(mu_v, sigma_v))
        dv_m_s = float(np.clip(dv_m_s, 0.01, 5000.0))
        dv_km_s = dv_m_s / 1000.0

        # ---- Random isotropic delta-V direction ----
        theta = rng.uniform(0, 2 * np.pi)
        phi = rng.uniform(0, np.pi)
        dv_unit = np.array([
            np.sin(phi) * np.cos(theta),
            np.sin(phi) * np.sin(theta),
            np.cos(phi),
        ])

        # ---- Perturb semi-major axis via vis-viva ----
        sma_parent = target_orbit.get("semi_major_axis_km", 6771.0)
        v_parent = np.sqrt(MU_EARTH / sma_parent)          # circular velocity (km/s)
        dv_radial = float(np.dot(dv_unit, np.array([1, 0, 0])) * dv_km_s)

        # Approximation: ΔE ≈ v_circ × Δv_tangential
        dv_tangential = float(np.linalg.norm(dv_unit[1:] * dv_km_s))
        new_energy = -MU_EARTH / (2 * sma_parent) + v_parent * dv_tangential
        if new_energy >= 0:
            new_sma = sma_parent * 1.5   # escape-bound → artificial cap
        else:
            new_sma = -MU_EARTH / (2 * new_energy)
        new_sma = float(np.clip(new_sma, R_EARTH + 100, 42164.0))  # LEO-GEO range

        # ---- Orbital element perturbations ----
        inc_parent = target_orbit.get("inclination_deg", 51.6)
        d_inc = float(rng.normal(0, abs(dv_km_s) * 0.3))
        new_inc = float(np.clip(inc_parent + d_inc, 0.0, 180.0))

        # Ecc: fragments start near-circular, small random perturbation
        new_ecc = float(np.clip(rng.exponential(0.02), 0.0, 0.7))

        return DebrisFragment(
            id=f"FRAG-{parent_id[:10]}-{index:06d}",
            parent_id=parent_id,
            semi_major_axis_km=new_sma,
            eccentricity=new_ecc,
            inclination_deg=new_inc,
            raan_deg=float(rng.uniform(0, 360)),
            arg_perigee_deg=float(rng.uniform(0, 360)),
            mean_anomaly_deg=float(rng.uniform(0, 360)),
            char_length_m=Lc,
            area_to_mass_ratio=AmR,
            mass_kg=mass_kg,
            generation=generation,
        )
