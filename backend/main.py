from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from skyfield.api import load, wgs84
import math

# --- CONFIGURATION ---
DATABASE_URL = "sqlite:///./space_risk.db"
TLE_URLS = [
    'http://celestrak.org/NORAD/elements/stations.txt',
    'http://celestrak.org/NORAD/elements/science.txt',
    'http://celestrak.org/NORAD/elements/weather.txt'
]

# --- APP SETUP ---
app = FastAPI(title="ASRIDE Orbital Defense API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE LAYER ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class RiskLog(Base):
    __tablename__ = "risk_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    obj1_name = Column(String)
    obj2_name = Column(String)
    distance_km = Column(Float)
    velocity_kms = Column(Float)
    risk_score = Column(Float)
    decision = Column(String)

Base.metadata.create_all(bind=engine)

# --- DATA MODELS ---
class CollisionCheck(BaseModel):
    obj1_name: str
    obj2_name: str
    distance_km: float = 0.0
    velocity_kms: float = 7.6

# --- PHYSICS ENGINE (SINGLETON) ---
satellites = {}
ts = load.timescale()

# --- HELPER: Trajectory Calculator ---
def get_trajectory(sat, t_now, duration_minutes=90, steps=30):
    """Calculates future path for visualization"""
    path = []
    step_size = duration_minutes / steps
    
    for i in range(steps):
        # Calculate time offset
        time_offset = i * step_size
        # Skyfield time arithmetic
        t_future = ts.from_datetime(t_now.utc_datetime() + timedelta(minutes=time_offset))
        
        geocentric = sat.at(t_future)
        subpoint = wgs84.subpoint(geocentric)
        
        # [Longitude, Latitude] format for GeoJSON
        path.append([subpoint.longitude.degrees, subpoint.latitude.degrees])
    
    return path

def load_orbital_data():
    """Preloads satellite TLE data into memory for sub-millisecond lookups."""
    print("⏳ [PHYSICS] Ingesting CelesTrak TLE Data...")
    try:
        count = 0
        for url in TLE_URLS:
            try:
                tles = load.tle_file(url)
                for sat in tles:
                    satellites[sat.name] = sat
                    count += 1
            except Exception as e:
                print(f"⚠️ [WARNING] Failed source {url}: {e}")
        print(f"✅ [SYSTEM READY] Tracking {count} active orbital bodies.")
    except Exception as e:
        print(f"❌ [CRITICAL] TLE Ingestion Failed: {e}")

# Run load on startup
load_orbital_data()

# --- ROUTES ---

import random

@app.get("/simulation/feed")
def get_simulation_feed():
    """
    Returns a list of simulated high-risk events for the Global Monitor.
    This simulates real-time physics engine outputs scanning thousands of pairs.
    """
    t_now = ts.now()
    events = []
    
    # Randomly pick some satellites to be in "Danger"
    # In a real system, this would be the output of an all-vs-all SGP4 filter
    keys = list(satellites.keys())
    if len(keys) < 10:
        return {"events": []}
        
    for _ in range(5):
        sat_name = random.choice(keys)
        sat = satellites[sat_name]
        
        # Calculate real position
        geo = sat.at(t_now)
        sub = wgs84.subpoint(geo)
        
        # Simulate a "Debris Object" near it
        miss_dist = random.uniform(0.5, 50.0) # 0.5km to 50km
        prob = 100 * math.exp(-miss_dist / 10)
        
        events.append({
            "id": random.randint(1000, 9999),
            "primary": sat_name,
            "secondary": f"DEBRIS-{random.randint(10000, 99999)}",
            "lat": sub.latitude.degrees,
            "lon": sub.longitude.degrees,
            "miss_distance": miss_dist,
            "probability": prob,
            "time_to_impact": random.randint(30, 600) # seconds
        })
        
    return {"events": sorted(events, key=lambda x: x['probability'], reverse=True)}

@app.get("/satellites")
def get_satellites():
    return {"satellites": sorted(list(satellites.keys()))}

@app.get("/constellation/{name}")
def get_constellation(name: str):
    """
    Returns positions for an entire constellation (e.g., 'STARLINK', 'GPS').
    """
    t_now = ts.now()
    fleet = []
    
    search_term = name.upper()
    if "STARLINK" in search_term:
        search_term = "STARLINK"
    elif "GPS" in search_term:
        search_term = "NAVSTAR" 
    
    count = 0
    MAX_LIMIT = 500 # Performance cap to avoid freezing frontend
    
    for sat_name, sat in satellites.items():
        if search_term in sat_name.upper():
            try:
                geocentric = sat.at(t_now)
                subpoint = wgs84.subpoint(geocentric)
                
                fleet.append({
                    "name": sat_name,
                    "lat": subpoint.latitude.degrees,
                    "lon": subpoint.longitude.degrees,
                    "alt": subpoint.elevation.km
                })
                count += 1
                if count >= MAX_LIMIT:
                    break
            except Exception as e:
                continue
                
    return {"constellation": name, "count": count, "satellites": fleet}

@app.get("/")
def health_check():
    return {"status": "operational", "satellites_tracked": len(satellites)}

@app.post("/analyze-risk")
def analyze_risk(data: CollisionCheck):
    real_distance = None
    obj1_pos = None
    obj2_pos = None
    
    # 1. Satellite Resolution (Exact Match Preferred)
    sat1 = satellites.get(data.obj1_name)
    sat2 = satellites.get(data.obj2_name)
    
    # Fallback to fuzzy search if not found (e.g. slight casing mismatch)
    if not sat1:
        sat1 = next((s for name, s in satellites.items() if data.obj1_name.upper() in name.upper()), None)
    if not sat2:
        sat2 = next((s for name, s in satellites.items() if data.obj2_name.upper() in name.upper()), None)

    if sat1 and sat2:
        t = ts.now()
        
        # 2. Physics Calculation (SGP4 Propagation)
        geo1 = sat1.at(t)
        geo2 = sat2.at(t)
        
        pos1 = geo1.position.km
        pos2 = geo2.position.km
        
        # Current Euclidean Distance
        current_distance = math.sqrt(sum((p1 - p2) ** 2 for p1, p2 in zip(pos1, pos2)))

        # --- REAL PHYSICS: Time to Closest Approach (TCA) ---
        # Propagate forward 90 minutes (1 orbit) to find minimum distance
        min_dist = current_distance
        tca_seconds = 0
        
        # Sampling every 30 seconds for 60 minutes
        minutes_to_check = 60
        steps = 120 
        
        for i in range(1, steps + 1):
            offset_m = (i * minutes_to_check) / steps
            t_future = ts.from_datetime(t.utc_datetime() + timedelta(minutes=offset_m))
            
            p1_fut = sat1.at(t_future).position.km
            p2_fut = sat2.at(t_future).position.km
            
            dist_fut = math.sqrt(sum((a - b) ** 2 for a, b in zip(p1_fut, p2_fut)))
            
            if dist_fut < min_dist:
                min_dist = dist_fut
                tca_seconds = offset_m * 60

        # Use the closest approach for risk, not just current
        real_distance = min_dist

        # 3. Geolocation (Sub-point calculation)
        sub1 = wgs84.subpoint(geo1)
        sub2 = wgs84.subpoint(geo2)

        # Calculate Altitude
        alt1 = sub1.elevation.km
        alt2 = sub2.elevation.km

        # Calculate Relative Speed (Scalar)
        vel1 = geo1.velocity.km_per_s
        vel2 = geo2.velocity.km_per_s
        relative_velocity_km_s = math.sqrt(sum((v1 - v2) ** 2 for v1, v2 in zip(vel1, vel2)))

        # --- GENERATE TRAJECTORIES ---
        traj1 = get_trajectory(sat1, t)
        traj2 = get_trajectory(sat2, t)
        
        obj1_pos = {
            "lat": sub1.latitude.degrees, 
            "lon": sub1.longitude.degrees, 
            "alt": alt1,
            "velocity": math.sqrt(sum(v**2 for v in vel1)),
            "name": sat1.name, 
            "path": traj1
        }
        obj2_pos = {
            "lat": sub2.latitude.degrees, 
            "lon": sub2.longitude.degrees, 
            "alt": alt2,
            "velocity": math.sqrt(sum(v**2 for v in vel2)),
            "name": sat2.name, 
            "path": traj2
        }
        
        # Override MVP defaults with Real Physics
        data.distance_km = real_distance
        data.velocity_kms = relative_velocity_km_s

    # 4. Risk Algorithm
    # Refined Physic-based Risk Model: Based on Miss Distance and Time to Closest Approach (Simplified)
    # Basic logic: High risk if distance is low AND they are moving towards similar volume (complex to do fully without propagation)
    # We will stick to the heuristic: Risk ~ 1 / (Distance * Velocity_Factor)
    
    if data.distance_km <= 10: # Critically close
        risk_score = 99.9
    else:
        # Logistic decay function for smoother probability
        # 1000km distance -> Low Risk (~5%)
        # 100km distance -> High Risk (~80%)
        risk_score = 100 * math.exp(-data.distance_km / 500) 
        
        # Velocity weighting: Higher relative velocity increases consequences (risk)
        if data.velocity_kms > 10:
            risk_score *= 1.2
            
        risk_score = min(risk_score, 100)


    # 5. Decision Matrix
    decision = "SAFE"
    if risk_score > 80: decision = "CRITICAL: COLLISION IMMINENT"
    elif risk_score > 50: decision = "WARNING: MANEUVER ADVISED"
    elif risk_score > 20: decision = "CAUTION: MONITORING"

    # 6. Audit Logging
    db = SessionLocal()
    db.add(RiskLog(
        obj1_name=sat1.name if sat1 else data.obj1_name,
        obj2_name=sat2.name if sat2 else data.obj2_name,
        distance_km=round(data.distance_km, 2),
        velocity_kms=data.velocity_kms,
        risk_score=round(risk_score, 2),
        decision=decision
    ))
    db.commit()
    db.close()

    return {
        "risk_score": round(risk_score, 2),
        "decision": decision,
        "real_physics_used": bool(real_distance),
        "distance_calculated": round(data.distance_km, 2),
        "tca": tca_seconds,
        "velocity_kms": round(relative_velocity_km_s, 2),
        "obj1_pos": obj1_pos,
        "obj2_pos": obj2_pos
    }

@app.get("/history")
def get_history():
    db = SessionLocal()
    logs = db.query(RiskLog).order_by(RiskLog.id.desc()).limit(20).all()
    db.close()
    return logs
