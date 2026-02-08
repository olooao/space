from fastapi import APIRouter, HTTPException
from backend.app.services.orbital import orbital_service
from backend.app.db.supabase import get_supabase
from backend.app.models.risk import RiskEvent
from skyfield.api import wgs84

router = APIRouter()

@router.get("/simulation/feed", response_model=dict)
def get_simulation_feed():
    """
    Returns a list of high-risk events. 
    Fetches real calculation results from Supabase (populated by the background worker).
    """
    supabase = get_supabase()
    
    if supabase:
        try:
            # Fetch latest high-probability events
            response = supabase.table("risk_events")\
                .select("*")\
                .order("probability", desc=True)\
                .limit(20)\
                .execute()
            
            # Use the .data property to get the list of records
            events = response.data 
            return {"events": events}
        except Exception as e:
            print(f"Error fetching from Supabase: {e}")
            # Fallback or empty if DB fails
            return {"events": []}
    else:
        # DB not configured
        return {"events": []}

@router.get("/satellites")
def get_satellites():
    sats = orbital_service.get_all_satellites()
    return {"satellites": sorted(list(sats.keys()))}

@router.get("/constellation/{name}")
def get_constellation(name: str):
    """
    Returns positions for an entire constellation (e.g., 'STARLINK', 'GPS').
    """
    t_now = orbital_service.ts.now()
    fleet = []
    
    search_term = name.upper()
    if "STARLINK" in search_term:
        search_term = "STARLINK"
    elif "GPS" in search_term:
        search_term = "NAVSTAR" 
    
    count = 0
    MAX_LIMIT = 500
    
    # We iterate over the loaded satellites in memory
    for sat_name, sat in orbital_service.get_all_satellites().items():
        if search_term in sat_name.upper():
            try:
                geo, sub = orbital_service.get_position(sat, t_now)
                
                fleet.append({
                    "name": sat_name,
                    "lat": sub.latitude.degrees,
                    "lon": sub.longitude.degrees,
                    "alt": sub.elevation.km
                })
                count += 1
                if count >= MAX_LIMIT:
                    break
            except Exception:
                continue
                
    return {"constellation": name, "count": count, "satellites": fleet}
