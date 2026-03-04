"""Shared Pydantic models across all microservices."""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class TLERecord(BaseModel):
    name: str
    line1: str
    line2: str


class SatellitePosition(BaseModel):
    name: str
    lat: float
    lon: float
    alt_km: float
    # ECI XYZ for Three.js 3D rendering
    x_km: float
    y_km: float
    z_km: float
    vx_km_s: float
    vy_km_s: float
    vz_km_s: float
    speed_km_s: float
    timestamp: str
    path: Optional[List[List[float]]] = []  # [[lon, lat, alt], ...]
    risk_level: Optional[str] = "GREEN"


class ConjunctionRequest(BaseModel):
    obj1_name: str
    obj2_name: str


class ConjunctionResult(BaseModel):
    obj1: SatellitePosition
    obj2: SatellitePosition
    miss_distance_km: float
    relative_velocity_kms: float
    Pc: float
    risk_color: str  # RED / YELLOW / GREEN
    tca_timestamp: str
    timestamp: datetime


class DebrisFragment(BaseModel):
    id: str
    parent_id: str
    lat: float
    lon: float
    alt_km: float
    x_km: float
    y_km: float
    z_km: float
    char_length_m: float
    area_to_mass: float
    mass_kg: float
    generation: int
    is_active: bool


class RiskEvent(BaseModel):
    id: Optional[int] = None
    primary_asset: str
    secondary_asset: str
    lat: float
    lon: float
    miss_distance: float
    probability: float
    time_to_impact: int


class KesslerTriggerRequest(BaseModel):
    target: str
    projectile_mass_kg: float = 900.0
    relative_velocity_km_s: float = 10.2


class KesslerStatus(BaseModel):
    simulation_id: str
    is_running: bool
    total_fragments: int
    active_fragments: int
    total_cascade_events: int
    zone_density: dict
    elapsed_steps: int


class DeorbitSolution(BaseModel):
    zone: str
    fragment_count: int
    recommended_action: str
    target_altitude_km: int
    delta_v_m_s: float
    priority: str
    estimated_clearance_years: float
