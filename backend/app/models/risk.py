from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CollisionCheckRequest(BaseModel):
    obj1_name: str
    obj2_name: str
    distance_km: float = 0.0
    velocity_kms: float = 7.6

class TrajectoryPoint(BaseModel):
    lat: float
    lon: float

class SatellitePosition(BaseModel):
    lat: float
    lon: float
    alt: float
    velocity: float
    name: str
    path: List[List[float]] # [lon, lat] pairs

class RiskAnalysisResponse(BaseModel):
    obj1: SatellitePosition
    obj2: SatellitePosition
    miss_distance_km: float
    relative_velocity_kms: float
    risk_score: float
    timestamp: datetime
    # decision: str = "MONITOR" 

class RiskEvent(BaseModel):
    id: int
    primary: str
    secondary: str
    lat: float
    lon: float
    miss_distance: float
    probability: float
    time_to_impact: int
