from supabase import create_client, Client
from backend.app.core.config import settings
import logging

# Configure logger
logger = logging.getLogger(__name__)

class SupabaseClient:
    _instance: Client = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
                logger.warning("Supabase credentials not found. Database features may fail.")
                # We return None or a mock could be implemented, but for now we warn.
                # In strict production, this might raise an error.
                return None
            
            try:
                cls._instance = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Connected to Supabase successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to Supabase: {e}")
                raise e
        return cls._instance

# Singleton accessor
def get_supabase() -> Client:
    return SupabaseClient.get_client()
