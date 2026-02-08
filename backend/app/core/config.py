import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ASRIDE Space Debris System"
    API_V1_STR: str = "/api/v1"
    
    # Supabase - using defaults or env vars
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev_secret")

    # TLE Sources
    TLE_URLS: list[str] = [
        'http://celestrak.org/NORAD/elements/stations.txt',
        'http://celestrak.org/NORAD/elements/science.txt',
        'http://celestrak.org/NORAD/elements/weather.txt'
    ]

    class Config:
        case_sensitive = True
        # env_file = ".env" # Uncomment if using .env file loading via python-dotenv

settings = Settings()
