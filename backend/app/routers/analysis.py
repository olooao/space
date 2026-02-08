from fastapi import APIRouter
from backend.app.models.risk import CollisionCheckRequest, RiskAnalysisResponse, SatellitePosition
from backend.app.services.orbital import orbital_service
from datetime import timedelta
from skyfield.api import wgs84
import math

router = APIRouter()

@router.post("/analyze-risk", response_model=RiskAnalysisResponse)
def analyze_risk(data: CollisionCheckRequest):
    sat1 = orbital_service.get_satellite(data.obj1_name)
    sat2 = orbital_service.get_satellite(data.obj2_name)
    
    if not sat1 or not sat2:
        # In a real app we might raise 404, but to match original logic we might return default/partial
        # But this response model requires data. Let's assume frontend validates or we find them.
        # For now, if we can't find them, we can't really do physics.
        # Let's fallback to returning a dummy structure or raise HTTP error.
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="One or both objects not found in TLE database.")

    t = orbital_service.ts.now()
    
    # Physics Calculation
    geo1, sub1 = orbital_service.get_position(sat1, t)
    geo2, sub2 = orbital_service.get_position(sat2, t)
    
    pos1 = geo1.position.km
    pos2 = geo2.position.km
    
    current_distance = math.sqrt(sum((p1 - p2) ** 2 for p1, p2 in zip(pos1, pos2)))

    # TCA
    min_dist = current_distance
    # tca_seconds = 0
    
    minutes_to_check = 60
    steps = 120 
    
    for i in range(1, steps + 1):
        offset_m = (i * minutes_to_check) / steps
        t_future = orbital_service.ts.from_datetime(t.utc_datetime() + timedelta(minutes=offset_m))
        
        p1_fut = sat1.at(t_future).position.km
        p2_fut = sat2.at(t_future).position.km
        
        dist_fut = math.sqrt(sum((a - b) ** 2 for a, b in zip(p1_fut, p2_fut)))
        
        if dist_fut < min_dist:
            min_dist = dist_fut
            # tca_seconds = offset_m * 60

    real_distance = min_dist

    # Velocities
    vel1 = geo1.velocity.km_per_s
    vel2 = geo2.velocity.km_per_s
    relative_velocity_km_s = math.sqrt(sum((v1 - v2) ** 2 for v1, v2 in zip(vel1, vel2)))

    # Trajectories
    traj1 = orbital_service.get_trajectory(sat1, t)
    traj2 = orbital_service.get_trajectory(sat2, t)
    
    # Risk Algo
    if real_distance <= 10:
        risk_score = 99.9
    else:
        risk_score = 100 * math.exp(-real_distance / 500) 
        if relative_velocity_km_s > 10:
            risk_score *= 1.2
        risk_score = min(risk_score, 100)

    return RiskAnalysisResponse(
        obj1=SatellitePosition(
            lat=sub1.latitude.degrees,
            lon=sub1.longitude.degrees,
            alt=sub1.elevation.km,
            velocity=math.sqrt(sum(v**2 for v in vel1)),
            name=sat1.name,
            path=traj1
        ),
        obj2=SatellitePosition(
            lat=sub2.latitude.degrees,
            lon=sub2.longitude.degrees,
            alt=sub2.elevation.km,
            velocity=math.sqrt(sum(v**2 for v in vel2)),
            name=sat2.name,
            path=traj2
        ),
        miss_distance_km=real_distance,
        relative_velocity_kms=relative_velocity_km_s,
        risk_score=risk_score,
        timestamp=t.utc_datetime()
    )
