"""Probability of Collision using Foster 1992 method.

Reference: Foster & Estes 1992, "A Parametric Analysis of Orbital Debris Collision
Probability and Maneuver Rate for Space Vehicles"
"""
import numpy as np


# Default one-sigma position uncertainty per object (km)
DEFAULT_SIGMA_KM = 0.2


def calculate_Pc_foster(
    miss_distance_km: float,
    sigma1_km: float = DEFAULT_SIGMA_KM,
    sigma2_km: float = DEFAULT_SIGMA_KM,
    hard_body_radius_km: float = 0.01,
) -> float:
    """Foster 1992 simplified Pc calculation.

    Assumes Gaussian miss distance in the combined conjunction plane.
    Combined 1-sigma = sqrt(sigma1^2 + sigma2^2).

    Args:
        miss_distance_km: closest approach distance (km)
        sigma1_km: 1-sigma position uncertainty of object 1 (km)
        sigma2_km: 1-sigma position uncertainty of object 2 (km)
        hard_body_radius_km: sum of physical radii (km)

    Returns:
        Probability of collision [0, 1]
    """
    combined_sigma = np.sqrt(sigma1_km**2 + sigma2_km**2)
    if combined_sigma <= 0:
        return 0.0

    # Mahalanobis distance
    u = miss_distance_km / combined_sigma

    # 2D Gaussian integral approximation (radial)
    # Pc ≈ (HBR/σ)^2 * exp(-u^2/2)
    Pc = (hard_body_radius_km / combined_sigma) ** 2 * np.exp(-(u**2) / 2.0)
    return float(np.clip(Pc, 0.0, 1.0))


def classify_risk(Pc: float, miss_distance_km: float) -> str:
    """NASA STD-8719.14 risk classification.

    Returns:
        "RED"    — immediate action required
        "YELLOW" — elevated risk, monitor closely
        "GREEN"  — nominal, no action required
    """
    if Pc > 1e-4 or miss_distance_km < 1.0:
        return "RED"
    elif Pc > 1e-5 or miss_distance_km < 5.0:
        return "YELLOW"
    else:
        return "GREEN"


def risk_label(risk_color: str) -> str:
    labels = {"RED": "CRITICAL", "YELLOW": "ELEVATED", "GREEN": "NOMINAL"}
    return labels.get(risk_color, "NOMINAL")
