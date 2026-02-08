import os
import time
import random
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# 1. Setup Supabase
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
    exit(1)

supabase = create_client(URL, KEY)

def kessler_loop():
    print("🚀 Kessler Worker Started... Monitoring Debris Fields...")
    
    while True:
        # --- SIMULATION PART (Replace with Real Physics later) ---
        # We simulate a "Close Approach" event
        
        # 1. Pick a Victim (Asset)
        asset = random.choice(["ISS (ZARYA)", "HUBBLE", "STARLINK-3033", "TIANGONG"])
        
        # 2. Pick a Villain (Debris)
        debris = random.choice(["FENGYUN 1C DEB", "COSMOS 2251 DEB", "SL-16 R/B", "UNKNOWN"])
        
        # 3. Calculate Risk (Mock Math)
        miss_dist = round(random.uniform(0.1, 50.0), 3) # km
        prob = round(random.uniform(0, 100), 1)         # %
        
        # 4. If High Risk, Alert the Database!
        if prob > 80.0: 
            print(f"⚠️ CRITICAL ALERT: {asset} vs {debris} ({prob}%)")
            
            event_data = {
                "primary_asset": asset,      # Matches your SQL
                "secondary_asset": debris,   # Matches your SQL
                "lat": round(random.uniform(-90, 90), 2),
                "lon": round(random.uniform(-180, 180), 2),
                "miss_distance": miss_dist,
                "probability": prob,
                "time_to_impact": random.randint(300, 86400)
            }
            
            try:
                # Insert into Supabase
                supabase.table("risk_events").insert(event_data).execute()
                print("✅ Alert Saved to DB")
            except Exception as e:
                print(f"❌ DB Error: {e}")

        # Wait 5 seconds before checking again
        time.sleep(5)

if __name__ == "__main__":
    kessler_loop()