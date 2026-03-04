from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timedelta
from skyfield.api import load, wgs84
import math
import random

# --- CONFIGURATION ---
DATABASE_URL = "sqlite:///./space_risk.db"
TLE_URLS = [
    'http://celestrak.org/NORAD/elements/stations.txt',
    'http://celestrak.org/NORAD/elements/science.txt',
    'http://celestrak.org/NORAD/elements/weather.txt'
]

# --- APP SETUP ---
app = FastAPI(title="ASRIDE Orbital Defense API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
        time_offset = i * step_size
        t_future = ts.from_datetime(t_now.utc_datetime() + timedelta(minutes=time_offset))
        geocentric = sat.at(t_future)
        subpoint = wgs84.subpoint(geocentric)
        path.append([subpoint.longitude.degrees, subpoint.latitude.degrees])
    return path

def load_orbital_data():
    """Preloads satellite TLE data into memory for sub-millisecond lookups."""
    print("[PHYSICS] Ingesting CelesTrak TLE Data...")
    try:
        count = 0
        for url in TLE_URLS:
            try:
                tles = load.tle_file(url)
                for sat in tles:
                    satellites[sat.name] = sat
                    count += 1
            except Exception as e:
                print(f"[WARNING] Failed source {url}: {e}")
        print(f"[SYSTEM READY] Tracking {count} active orbital bodies.")
    except Exception as e:
        print(f"[CRITICAL] TLE Ingestion Failed: {e}")

# Run load on startup
load_orbital_data()


# ===========================================================================
# CORE ROUTE HANDLERS (shared by legacy and microservice-compatible routes)
# ===========================================================================

def _get_satellites_list():
    return {"satellites": sorted(list(satellites.keys())), "count": len(satellites)}

def _get_constellation(name: str):
    t_now = ts.now()
    fleet = []
    search_term = name.upper()
    if "STARLINK" in search_term:
        search_term = "STARLINK"
    elif "GPS" in search_term:
        search_term = "NAVSTAR"
    count = 0
    MAX_LIMIT = 500
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
            except Exception:
                continue
    return {"constellation": name, "count": count, "satellites": fleet}

def _analyze_risk(data: CollisionCheck):
    real_distance = None
    obj1_pos = None
    obj2_pos = None
    relative_velocity_km_s = data.velocity_kms

    # Satellite Resolution
    sat1 = satellites.get(data.obj1_name)
    sat2 = satellites.get(data.obj2_name)
    if not sat1:
        sat1 = next((s for name, s in satellites.items() if data.obj1_name.upper() in name.upper()), None)
    if not sat2:
        sat2 = next((s for name, s in satellites.items() if data.obj2_name.upper() in name.upper()), None)

    tca_seconds = 0

    if sat1 and sat2:
        t = ts.now()
        geo1 = sat1.at(t)
        geo2 = sat2.at(t)
        pos1 = geo1.position.km
        pos2 = geo2.position.km
        current_distance = math.sqrt(sum((p1 - p2) ** 2 for p1, p2 in zip(pos1, pos2)))

        # TCA: Propagate 60 minutes
        min_dist = current_distance
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
        real_distance = min_dist

        sub1 = wgs84.subpoint(geo1)
        sub2 = wgs84.subpoint(geo2)
        alt1 = sub1.elevation.km
        alt2 = sub2.elevation.km
        vel1 = geo1.velocity.km_per_s
        vel2 = geo2.velocity.km_per_s
        relative_velocity_km_s = math.sqrt(sum((v1 - v2) ** 2 for v1, v2 in zip(vel1, vel2)))

        traj1 = get_trajectory(sat1, t)
        traj2 = get_trajectory(sat2, t)

        obj1_pos = {
            "lat": sub1.latitude.degrees, "lon": sub1.longitude.degrees,
            "alt": alt1, "velocity": math.sqrt(sum(v**2 for v in vel1)),
            "name": sat1.name, "path": traj1
        }
        obj2_pos = {
            "lat": sub2.latitude.degrees, "lon": sub2.longitude.degrees,
            "alt": alt2, "velocity": math.sqrt(sum(v**2 for v in vel2)),
            "name": sat2.name, "path": traj2
        }
        data.distance_km = real_distance
        data.velocity_kms = relative_velocity_km_s

    # Risk Algorithm
    if data.distance_km <= 10:
        risk_score = 99.9
    else:
        risk_score = 100 * math.exp(-data.distance_km / 500)
        if data.velocity_kms > 10:
            risk_score *= 1.2
        risk_score = min(risk_score, 100)

    decision = "SAFE"
    if risk_score > 80: decision = "CRITICAL: COLLISION IMMINENT"
    elif risk_score > 50: decision = "WARNING: MANEUVER ADVISED"
    elif risk_score > 20: decision = "CAUTION: MONITORING"

    # Audit Logging
    try:
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
    except Exception as e:
        print(f"[DB] Logging failed: {e}")

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

def _get_simulation_feed():
    t_now = ts.now()
    events = []
    keys = list(satellites.keys())
    if len(keys) < 10:
        return {"events": []}
    for _ in range(5):
        sat_name = random.choice(keys)
        sat = satellites[sat_name]
        try:
            geo = sat.at(t_now)
            sub = wgs84.subpoint(geo)
        except Exception:
            continue
        miss_dist = random.uniform(0.5, 50.0)
        prob = round(100 * math.exp(-miss_dist / 10), 1)
        events.append({
            "id": random.randint(1000, 9999),
            "primary": sat_name, "primary_asset": sat_name,
            "secondary": f"DEBRIS-{random.randint(10000, 99999)}",
            "secondary_asset": f"DEBRIS-{random.randint(10000, 99999)}",
            "lat": sub.latitude.degrees, "lon": sub.longitude.degrees,
            "miss_distance": round(miss_dist, 3),
            "probability": prob,
            "time_to_impact": random.randint(30, 600)
        })
    return {"events": sorted(events, key=lambda x: x['probability'], reverse=True)}


# ===========================================================================
# LEGACY ROUTES (backwards-compatible)
# ===========================================================================

@app.get("/")
def health_check():
    return {"status": "operational", "satellites_tracked": len(satellites)}

@app.get("/satellites")
def get_satellites_legacy():
    return _get_satellites_list()

@app.get("/constellation/{name}")
def get_constellation_legacy(name: str):
    return _get_constellation(name)

@app.post("/analyze-risk")
def analyze_risk_legacy(data: CollisionCheck):
    return _analyze_risk(data)

@app.get("/simulation/feed")
def get_simulation_feed_legacy():
    return _get_simulation_feed()

@app.get("/history")
def get_history():
    db = SessionLocal()
    logs = db.query(RiskLog).order_by(RiskLog.id.desc()).limit(20).all()
    db.close()
    return logs


# ===========================================================================
# MICROSERVICE-COMPATIBLE ROUTES (matches /api/* paths the frontend expects)
# These allow the frontend to work against the monolith without Docker/Nginx.
# ===========================================================================

# --- TLE Service routes ---
tle_router = APIRouter(prefix="/api/tle", tags=["TLE"])

@tle_router.get("/satellites")
def api_tle_satellites():
    return _get_satellites_list()

@tle_router.get("/health")
def api_tle_health():
    return {"status": "ok", "count": len(satellites)}

app.include_router(tle_router)

# --- Orbital Service routes ---
orbital_router = APIRouter(prefix="/api/orbital", tags=["Orbital"])

@orbital_router.get("/satellites")
def api_orbital_satellites():
    return _get_satellites_list()

@orbital_router.get("/constellation/{name}")
def api_orbital_constellation(name: str):
    return _get_constellation(name)

@orbital_router.get("/satellite/{name}/position")
def api_orbital_position(name: str, trajectory: bool = False):
    sat = satellites.get(name)
    if not sat:
        sat = next((s for n, s in satellites.items() if name.upper() in n.upper()), None)
    if not sat:
        return {"error": f"Satellite '{name}' not found"}
    t = ts.now()
    geo = sat.at(t)
    sub = wgs84.subpoint(geo)
    pos_km = geo.position.km
    vel = geo.velocity.km_per_s
    result = {
        "name": sat.name,
        "lat": sub.latitude.degrees, "lon": sub.longitude.degrees,
        "alt_km": sub.elevation.km,
        "x_km": float(pos_km[0]), "y_km": float(pos_km[1]), "z_km": float(pos_km[2]),
        "vx_km_s": float(vel[0]), "vy_km_s": float(vel[1]), "vz_km_s": float(vel[2]),
        "speed_km_s": math.sqrt(sum(v**2 for v in vel)),
        "timestamp": datetime.utcnow().isoformat()
    }
    if trajectory:
        result["path"] = get_trajectory(sat, t)
    return result

@orbital_router.get("/health")
def api_orbital_health():
    return {"status": "ok"}

app.include_router(orbital_router)

# --- Collision Service routes ---
collision_router = APIRouter(prefix="/api/collision", tags=["Collision"])

@collision_router.post("/analyze")
def api_collision_analyze(data: CollisionCheck):
    return _analyze_risk(data)

@collision_router.get("/feed")
def api_collision_feed():
    return _get_simulation_feed()

@collision_router.get("/health")
def api_collision_health():
    return {"status": "ok"}

@collision_router.post("/evade")
def api_collision_evade(data: CollisionCheck):
    """Compute evasion maneuver for a conjunction event (monolith route)."""
    import numpy as np

    # Resolve satellites
    sat1 = satellites.get(data.obj1_name)
    sat2 = satellites.get(data.obj2_name)
    if not sat1:
        sat1 = next((s for name, s in satellites.items() if data.obj1_name.upper() in name.upper()), None)
    if not sat2:
        sat2 = next((s for name, s in satellites.items() if data.obj2_name.upper() in name.upper()), None)

    if not sat1 or not sat2:
        return {"error": "One or both objects not found"}

    t = ts.now()
    geo1 = sat1.at(t)
    geo2 = sat2.at(t)
    pos1 = list(geo1.position.km)
    pos2 = list(geo2.position.km)
    vel1 = list(geo1.velocity.km_per_s)
    vel2 = list(geo2.velocity.km_per_s)

    miss_dist = math.sqrt(sum((p1 - p2) ** 2 for p1, p2 in zip(pos1, pos2)))
    rel_vel = math.sqrt(sum((v1 - v2) ** 2 for v1, v2 in zip(vel1, vel2)))

    # Import evasion optimizer
    import sys, os
    evasion_path = os.path.join(os.path.dirname(__file__), "services", "collision_service", "app")
    if evasion_path not in sys.path:
        sys.path.insert(0, evasion_path)
    from evasion_optimizer import compute_evasion

    target_miss = getattr(data, "target_miss_km", 5.0) if hasattr(data, "target_miss_km") else 5.0
    burn_lead = getattr(data, "burn_lead_s", 900.0) if hasattr(data, "burn_lead_s") else 900.0

    evasion = compute_evasion(
        sat_pos_km=pos1,
        sat_vel_km_s=vel1,
        debris_pos_km=pos2,
        debris_vel_km_s=vel2,
        burn_lead_s=burn_lead,
        target_miss_km=target_miss,
    )

    # Risk score
    risk_score = 100 * math.exp(-miss_dist / 500) if miss_dist > 10 else 99.9

    sub1 = wgs84.subpoint(geo1)
    sub2 = wgs84.subpoint(geo2)

    return {
        "obj1_name": sat1.name,
        "obj2_name": sat2.name,
        "miss_distance_km": round(miss_dist, 3),
        "relative_velocity_kms": round(rel_vel, 3),
        "risk_score": round(risk_score, 2),
        "evasion": evasion,
        "obj1_pos": {"lat": sub1.latitude.degrees, "lon": sub1.longitude.degrees, "alt_km": sub1.elevation.km},
        "obj2_pos": {"lat": sub2.latitude.degrees, "lon": sub2.longitude.degrees, "alt_km": sub2.elevation.km},
    }

app.include_router(collision_router)

# --- Kessler Service routes (REAL cascade engine, NASA SBAM physics) ---
import sys as _sys, os as _os, threading as _threading
_kessler_path = _os.path.join(_os.path.dirname(__file__), "services", "kessler_service", "app")
if _kessler_path not in _sys.path:
    _sys.path.insert(0, _kessler_path)
from cascade_engine import KesslerCascadeEngine

kessler_router = APIRouter(prefix="/api/kessler", tags=["Kessler"])

_cascade_engine = KesslerCascadeEngine()
_cascade_thread = None
_cascade_stop_event = _threading.Event()


def _run_cascade_loop():
    """Background thread: step the cascade engine every 1 second."""
    while not _cascade_stop_event.is_set() and _cascade_engine.is_running:
        _cascade_engine.step()
        _cascade_stop_event.wait(1.0)


def _get_sat_orbit(name):
    """Get orbital elements for a named satellite from loaded TLE data."""
    sat = satellites.get(name)
    if not sat:
        sat = next((s for n, s in satellites.items() if name.upper() in n.upper()), None)
    if not sat:
        return {"semi_major_axis_km": 6771.0, "inclination_deg": 51.6, "mass_kg": 500.0}
    t = ts.now()
    try:
        geo = sat.at(t)
        r_km = float((geo.position.km[0]**2 + geo.position.km[1]**2 + geo.position.km[2]**2)**0.5)
        sub = wgs84.subpoint(geo)
        return {
            "semi_major_axis_km": r_km,
            "inclination_deg": float(sub.latitude.degrees) if abs(sub.latitude.degrees) < 90 else 51.6,
            "mass_kg": 500.0,
            "name": sat.name,
        }
    except Exception:
        return {"semi_major_axis_km": 6771.0, "inclination_deg": 51.6, "mass_kg": 500.0}


@kessler_router.get("/status")
def api_kessler_status():
    return _cascade_engine._stats()


@kessler_router.post("/trigger")
def api_kessler_trigger(
    target_name: str = "ISS (ZARYA)",
    projectile_mass_kg: float = 950.0,
    relative_velocity_km_s: float = 10.5,
):
    global _cascade_thread
    # Stop any existing simulation
    if _cascade_engine.is_running:
        _cascade_stop_event.set()
        if _cascade_thread and _cascade_thread.is_alive():
            _cascade_thread.join(timeout=3)
    _cascade_stop_event.clear()

    # Get real orbital data for the target
    target_orbit = _get_sat_orbit(target_name)

    # Load active satellites for cascade conjunction screening
    _cascade_engine.active_satellites = []
    for name, sat in list(satellites.items())[:100]:
        try:
            orb = _get_sat_orbit(name)
            orb["name"] = name
            _cascade_engine.active_satellites.append(orb)
        except Exception:
            continue

    # Trigger the collision using NASA SBAM physics
    event = _cascade_engine.trigger_initial_collision(
        target_name=target_name,
        target_orbit=target_orbit,
        projectile_mass_kg=projectile_mass_kg,
        relative_velocity_km_s=relative_velocity_km_s,
    )

    # Start background simulation loop
    _cascade_thread = _threading.Thread(target=_run_cascade_loop, daemon=True)
    _cascade_thread.start()

    stats = _cascade_engine._stats()
    stats["event"] = event
    return stats


@kessler_router.post("/stop")
def api_kessler_stop():
    _cascade_stop_event.set()
    _cascade_engine.is_running = False
    return {"message": "Cascade simulation stopped", **_cascade_engine._stats()}


@kessler_router.post("/reset")
def api_kessler_reset():
    _cascade_stop_event.set()
    _cascade_engine.reset()
    return {"message": "Reset complete"}


@kessler_router.get("/fragments")
def api_kessler_fragments(limit: int = 2000):
    frags = _cascade_engine.get_active_fragment_positions(limit=limit)
    return {
        "total": _cascade_engine._stats()["active_fragments"],
        "fragments": frags,
    }


@kessler_router.get("/solutions")
def api_kessler_solutions():
    solutions = _cascade_engine.get_solutions()
    return {"solutions": solutions}


@kessler_router.get("/events")
def api_kessler_events(limit: int = 50):
    events = _cascade_engine.cascade_events[-limit:]
    return {"events": events}


@kessler_router.get("/health")
def api_kessler_health():
    return {"status": "ok"}

app.include_router(kessler_router)


# ===========================================================================
# Entry point for local dev: python backend/main.py
# ===========================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
