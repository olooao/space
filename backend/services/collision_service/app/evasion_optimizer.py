"""ASRIDE Evasion Optimizer — Minimum-fuel collision avoidance maneuver computation.

Uses Clohessy-Wiltshire (CW) linearized relative motion equations for
analytically differentiable ΔV optimization. The CW state transition matrix
provides a closed-form mapping from thrust vectors to miss distances,
enabling gradient-based optimization without Monte Carlo sampling.

Physics:
  - RIC (Radial/In-track/Cross-track) reference frame
  - CW state transition matrix Φ(Δt) for relative motion
  - Minimum-norm ΔV via Φᵀ(ΦΦᵀ)⁻¹ analytical solution
  - scipy L-BFGS-B refinement with analytical Jacobian
  - Tsiolkovsky rocket equation for fuel mass estimation

Reference: Clohessy & Wiltshire 1960, "Terminal Guidance System for
Satellite Rendezvous", Journal of the Aerospace Sciences.
"""
from __future__ import annotations

import logging
import math
from typing import Optional

import numpy as np
from scipy.optimize import minimize

logger = logging.getLogger(__name__)

# Constants
MU_EARTH = 398600.4418  # km³/s²
R_EARTH = 6371.0        # km
G0 = 9.80665e-3         # km/s² (standard gravity)


def _ric_rotation_matrix(pos_km: np.ndarray, vel_km_s: np.ndarray) -> np.ndarray:
    """Build rotation matrix from ECI to RIC (Radial/In-track/Cross-track).

    R (radial)     = pos / |pos|          (away from Earth center)
    C (cross-track) = (pos × vel) / |pos × vel|  (angular momentum direction)
    I (in-track)   = C × R                (roughly along velocity)
    """
    r_hat = pos_km / np.linalg.norm(pos_km)
    h = np.cross(pos_km, vel_km_s)
    c_hat = h / np.linalg.norm(h)
    i_hat = np.cross(c_hat, r_hat)
    # Rows of rotation matrix = RIC unit vectors
    return np.array([r_hat, i_hat, c_hat])


def _cw_state_transition(n: float, dt: float) -> np.ndarray:
    """Clohessy-Wiltshire state transition matrix Φ(dt).

    Maps [δr₀; δv₀] in RIC to [δr(dt); δv(dt)].
    n = mean motion (rad/s), dt = time interval (s).

    Returns 6x6 matrix.
    """
    nt = n * dt
    c = math.cos(nt)
    s = math.sin(nt)

    phi = np.zeros((6, 6))

    # Position from position
    phi[0, 0] = 4 - 3 * c
    phi[0, 1] = 0
    phi[0, 2] = 0
    phi[1, 0] = 6 * (s - nt)
    phi[1, 1] = 1
    phi[1, 2] = 0
    phi[2, 0] = 0
    phi[2, 1] = 0
    phi[2, 2] = c

    # Position from velocity
    phi[0, 3] = s / n
    phi[0, 4] = 2 * (1 - c) / n
    phi[0, 5] = 0
    phi[1, 3] = -2 * (1 - c) / n
    phi[1, 4] = (4 * s - 3 * nt) / n
    phi[1, 5] = 0
    phi[2, 3] = 0
    phi[2, 4] = 0
    phi[2, 5] = s / n

    # Velocity from position
    phi[3, 0] = 3 * n * s
    phi[3, 1] = 0
    phi[3, 2] = 0
    phi[4, 0] = 6 * n * (c - 1)
    phi[4, 1] = 0
    phi[4, 2] = 0
    phi[5, 0] = 0
    phi[5, 1] = 0
    phi[5, 2] = -n * s

    # Velocity from velocity
    phi[3, 3] = c
    phi[3, 4] = 2 * s
    phi[3, 5] = 0
    phi[4, 3] = -2 * s
    phi[4, 4] = 4 * c - 3
    phi[4, 5] = 0
    phi[5, 3] = 0
    phi[5, 4] = 0
    phi[5, 5] = c

    return phi


def _classify_direction(dv_ric: np.ndarray) -> str:
    """Classify maneuver direction from RIC ΔV vector."""
    abs_ric = np.abs(dv_ric)
    idx = np.argmax(abs_ric)
    labels = ["radial", "prograde" if dv_ric[1] >= 0 else "retrograde", "cross-track"]
    return labels[idx]


def _fuel_mass_kg(dv_km_s: float, mass_kg: float, isp_s: float) -> float:
    """Tsiolkovsky rocket equation: Δm = m · (1 - e^(-|ΔV|/(g₀·Isp)))."""
    if isp_s <= 0 or dv_km_s <= 0:
        return 0.0
    ve = G0 * isp_s  # exhaust velocity km/s
    return mass_kg * (1 - math.exp(-dv_km_s / ve))


def _propagate_trajectory_simple(
    pos_km: np.ndarray,
    vel_km_s: np.ndarray,
    duration_s: float = 5400.0,
    steps: int = 48,
) -> list:
    """Simple Keplerian propagation for trajectory visualization.

    Returns list of [lon, lat, alt_km] points.
    """
    trajectory = []
    dt = duration_s / steps
    r = pos_km.copy().astype(float)
    v = vel_km_s.copy().astype(float)

    for _ in range(steps):
        r_mag = np.linalg.norm(r)
        if r_mag < R_EARTH:
            break

        # Convert ECI to lat/lon/alt
        alt_km = r_mag - R_EARTH
        lat = math.degrees(math.asin(np.clip(r[2] / r_mag, -1, 1)))
        lon = math.degrees(math.atan2(r[1], r[0]))
        trajectory.append([lon, lat, alt_km])

        # Keplerian two-body advance (velocity Verlet)
        a = -MU_EARTH * r / (r_mag ** 3)
        r = r + v * dt + 0.5 * a * dt * dt
        r_mag_new = np.linalg.norm(r)
        a_new = -MU_EARTH * r / (r_mag_new ** 3)
        v = v + 0.5 * (a + a_new) * dt

    return trajectory


def compute_evasion(
    sat_pos_km: list | np.ndarray,
    sat_vel_km_s: list | np.ndarray,
    debris_pos_km: list | np.ndarray,
    debris_vel_km_s: list | np.ndarray,
    burn_lead_s: float = 900.0,
    target_miss_km: float = 5.0,
    sat_mass_kg: float = 500.0,
    isp_s: float = 220.0,
) -> dict:
    """Compute minimum-fuel evasion maneuver using CW relative motion.

    Args:
        sat_pos_km: Satellite ECI position at TCA [x, y, z] (km)
        sat_vel_km_s: Satellite ECI velocity at TCA [vx, vy, vz] (km/s)
        debris_pos_km: Debris ECI position at TCA [x, y, z] (km)
        debris_vel_km_s: Debris ECI velocity at TCA [vx, vy, vz] (km/s)
        burn_lead_s: Time before TCA to execute burn (seconds)
        target_miss_km: Desired safe miss distance (km)
        sat_mass_kg: Satellite wet mass (kg)
        isp_s: Thruster specific impulse (seconds)

    Returns:
        dict with evasion parameters, trajectories, and fuel cost.
    """
    sat_pos = np.array(sat_pos_km, dtype=float)
    sat_vel = np.array(sat_vel_km_s, dtype=float)
    debris_pos = np.array(debris_pos_km, dtype=float)
    debris_vel = np.array(debris_vel_km_s, dtype=float)

    # Current miss distance
    current_miss = float(np.linalg.norm(sat_pos - debris_pos))

    # Mean motion of the satellite orbit
    r_mag = np.linalg.norm(sat_pos)
    n = math.sqrt(MU_EARTH / (r_mag ** 3))  # rad/s

    # Build RIC frame centered on satellite
    Q = _ric_rotation_matrix(sat_pos, sat_vel)

    # Relative state in RIC frame at TCA
    dr_eci = debris_pos - sat_pos
    dv_eci = debris_vel - sat_vel
    dr_ric = Q @ dr_eci  # relative position in RIC
    dv_ric = Q @ dv_eci  # relative velocity in RIC

    # ──────────────────────────────────────────────
    # CW State Transition: map burn ΔV to miss offset
    # We want: what ΔV at (TCA - burn_lead_s) produces a position offset at TCA?
    # Φ(burn_lead_s) maps [δr₀; δv₀] → [δr_TCA; δv_TCA]
    # We only control δv₀ (the burn), so the mapping is:
    #   δr_TCA = Φ_rv · δv₀
    # where Φ_rv is the upper-right 3×3 block of Φ
    # ──────────────────────────────────────────────

    phi = _cw_state_transition(n, burn_lead_s)
    phi_rv = phi[0:3, 3:6]  # position-from-velocity block

    # We want the satellite to shift so the miss distance = target_miss_km
    # Direction: move perpendicular to relative velocity in the B-plane
    rel_vel_dir = dv_ric / (np.linalg.norm(dv_ric) + 1e-12)

    # B-plane: perpendicular to relative velocity
    # Choose the component of dr_ric perpendicular to dv_ric
    dr_along = np.dot(dr_ric, rel_vel_dir) * rel_vel_dir
    dr_perp = dr_ric - dr_along
    dr_perp_mag = np.linalg.norm(dr_perp)

    if dr_perp_mag > 1e-6:
        b_hat = dr_perp / dr_perp_mag
    else:
        # If dr_perp is zero, pick an arbitrary perpendicular direction
        arbitrary = np.array([1, 0, 0]) if abs(rel_vel_dir[0]) < 0.9 else np.array([0, 1, 0])
        b_hat = np.cross(rel_vel_dir, arbitrary)
        b_hat = b_hat / np.linalg.norm(b_hat)

    # Target offset: move away from debris by target_miss_km in B-plane
    target_offset_ric = b_hat * target_miss_km

    # ──────────────────────────────────────────────
    # Analytical minimum-norm solution:
    # δv₀ = Φ_rv^T (Φ_rv Φ_rv^T)⁻¹ · target_offset
    # ──────────────────────────────────────────────
    gram = phi_rv @ phi_rv.T
    try:
        gram_inv = np.linalg.inv(gram)
    except np.linalg.LinAlgError:
        gram_inv = np.linalg.pinv(gram)

    dv_analytical = phi_rv.T @ gram_inv @ target_offset_ric  # ΔV in RIC (km/s)

    # ──────────────────────────────────────────────
    # Refine with scipy (L-BFGS-B) using CW forward model
    # ──────────────────────────────────────────────
    def objective(dv_vec):
        """Minimize |ΔV| subject to miss_distance >= target."""
        dv = np.array(dv_vec)
        # CW propagation: new position at TCA = Φ_rv · dv
        new_offset = phi_rv @ dv
        # New relative position = original dr_ric + new_offset (satellite moved)
        new_dr = dr_ric + new_offset
        miss = np.linalg.norm(new_dr)
        # Cost: minimize |ΔV| + penalty for insufficient miss
        penalty = max(0, target_miss_km - miss) ** 2 * 1000.0
        return float(np.linalg.norm(dv) ** 2 + penalty)

    def jacobian(dv_vec):
        """Analytical gradient of objective."""
        dv = np.array(dv_vec)
        new_offset = phi_rv @ dv
        new_dr = dr_ric + new_offset
        miss = np.linalg.norm(new_dr)
        # d(|dv|²)/d(dv) = 2·dv
        grad_norm = 2.0 * dv
        # d(penalty)/d(dv) chain rule through phi_rv
        if miss < target_miss_km and miss > 1e-12:
            d_miss_d_offset = new_dr / miss
            d_penalty = -2000.0 * (target_miss_km - miss) * (phi_rv.T @ d_miss_d_offset)
        else:
            d_penalty = np.zeros(3)
        return grad_norm + d_penalty

    result = minimize(
        objective,
        x0=dv_analytical,
        jac=jacobian,
        method="L-BFGS-B",
        options={"maxiter": 200, "ftol": 1e-12},
    )

    dv_ric_optimal = result.x  # km/s
    dv_magnitude_km_s = float(np.linalg.norm(dv_ric_optimal))
    dv_magnitude_m_s = dv_magnitude_km_s * 1000.0

    # Verify new miss distance
    new_offset = phi_rv @ dv_ric_optimal
    new_dr = dr_ric + new_offset
    new_miss_km = float(np.linalg.norm(new_dr))

    # Convert ΔV back to ECI for trajectory propagation
    dv_eci_optimal = Q.T @ dv_ric_optimal  # RIC → ECI

    # Burn point: satellite position at (TCA - burn_lead_s)
    # Backward propagate from TCA
    phi_neg = _cw_state_transition(n, -burn_lead_s)
    # In ECI, approximate burn position by backward Keplerian motion
    burn_pos = sat_pos - sat_vel * burn_lead_s  # simple linear approx for position
    # Better: use two-body backward
    burn_pos_eci = sat_pos.copy()
    burn_vel_eci = sat_vel.copy()
    # Velocity Verlet backward
    dt_back = -burn_lead_s
    r_back = sat_pos.copy()
    v_back = sat_vel.copy()
    r_mag_b = np.linalg.norm(r_back)
    a_b = -MU_EARTH * r_back / (r_mag_b ** 3)
    r_back = r_back + v_back * dt_back + 0.5 * a_b * dt_back * dt_back
    r_mag_b2 = np.linalg.norm(r_back)
    a_b2 = -MU_EARTH * r_back / (r_mag_b2 ** 3)
    v_back = v_back + 0.5 * (a_b + a_b2) * dt_back

    burn_r_mag = np.linalg.norm(r_back)
    burn_lat = math.degrees(math.asin(np.clip(r_back[2] / burn_r_mag, -1, 1)))
    burn_lon = math.degrees(math.atan2(r_back[1], r_back[0]))
    burn_alt = burn_r_mag - R_EARTH

    # Generate trajectories for visualization
    # Original (no maneuver): propagate from burn point with original velocity
    original_traj = _propagate_trajectory_simple(r_back, v_back, duration_s=burn_lead_s * 3, steps=48)

    # Evasion: propagate from burn point with adjusted velocity
    evade_vel = v_back + dv_eci_optimal
    evasion_traj = _propagate_trajectory_simple(r_back, evade_vel, duration_s=burn_lead_s * 3, steps=48)

    # Fuel cost
    fuel_kg = _fuel_mass_kg(dv_magnitude_km_s, sat_mass_kg, isp_s)

    # Burn duration estimate (assuming constant thrust)
    # F = m · |ΔV| / t_burn, typical thrust ~1 N for small sats
    thrust_n = 1.0  # Newton (representative)
    burn_duration_s = (sat_mass_kg * dv_magnitude_m_s) / thrust_n if thrust_n > 0 else 0

    direction = _classify_direction(dv_ric_optimal)

    logger.info(
        f"Evasion computed: ΔV={dv_magnitude_m_s:.3f} m/s, "
        f"fuel={fuel_kg:.2f} kg, miss={current_miss:.1f}→{new_miss_km:.1f} km, "
        f"direction={direction}"
    )

    return {
        "delta_v_m_s": [round(v * 1000, 4) for v in dv_ric_optimal],  # RIC, m/s
        "delta_v_eci_m_s": [round(v * 1000, 4) for v in dv_eci_optimal],  # ECI, m/s
        "magnitude_m_s": round(dv_magnitude_m_s, 4),
        "fuel_kg": round(fuel_kg, 3),
        "burn_duration_s": round(burn_duration_s, 1),
        "new_miss_km": round(new_miss_km, 3),
        "original_miss_km": round(current_miss, 3),
        "target_miss_km": target_miss_km,
        "burn_lead_s": burn_lead_s,
        "direction": direction,
        "burn_point": {
            "lat": round(burn_lat, 4),
            "lon": round(burn_lon, 4),
            "alt_km": round(burn_alt, 2),
        },
        "original_trajectory": original_traj,
        "evasion_trajectory": evasion_traj,
        "optimizer_converged": result.success,
        "optimizer_iterations": result.nit,
    }
