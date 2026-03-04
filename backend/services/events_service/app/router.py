"""Events Service WebSocket router."""
import asyncio
import logging
import os

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .ws_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

ORBITAL_SERVICE_URL = os.environ.get("ORBITAL_SERVICE_URL", "http://orbital_service:8002")
KESSLER_SERVICE_URL = os.environ.get("KESSLER_SERVICE_URL", "http://kessler_service:8004")
COLLISION_SERVICE_URL = os.environ.get("COLLISION_SERVICE_URL", "http://collision_service:8003")

# Shared httpx client (connection pool reuse)
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "events_service",
        "connections": {
            "positions": manager.connection_count("positions"),
            "kessler": manager.connection_count("kessler"),
            "alerts": manager.connection_count("alerts"),
        }
    }


# ---------------------------------------------------------------------------
# WebSocket: Live satellite positions
# ---------------------------------------------------------------------------
@router.websocket("/ws/positions")
async def satellite_positions_ws(websocket: WebSocket):
    """Streams live satellite positions every 2 seconds."""
    await manager.connect(websocket, "positions")
    client = get_http_client()
    try:
        while True:
            try:
                # Fetch positions for key constellations (or all active)
                resp = await client.get(f"{ORBITAL_SERVICE_URL}/constellation/ISS")
                if resp.status_code == 200:
                    data = resp.json()
                    await websocket.send_text(
                        __import__("json").dumps({
                            "type": "satellite_positions",
                            "data": data.get("satellites", []),
                            "constellation": "ISS",
                            "count": data.get("count", 0),
                        })
                    )
            except Exception as e:
                logger.debug(f"positions fetch error: {e}")

            await asyncio.sleep(2.0)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, "positions")
    except Exception as e:
        logger.error(f"positions WS error: {e}")
        await manager.disconnect(websocket, "positions")


# ---------------------------------------------------------------------------
# WebSocket: Kessler cascade stream
# ---------------------------------------------------------------------------
@router.websocket("/ws/kessler")
async def kessler_stream_ws(websocket: WebSocket):
    """Streams Kessler cascade simulation state + fragments every 1 second."""
    await manager.connect(websocket, "kessler")
    client = get_http_client()
    try:
        while True:
            try:
                status_resp, frags_resp = await asyncio.gather(
                    client.get(f"{KESSLER_SERVICE_URL}/status"),
                    client.get(f"{KESSLER_SERVICE_URL}/fragments?limit=2000"),
                    return_exceptions=True,
                )

                payload = {"type": "kessler_update"}

                if not isinstance(status_resp, Exception) and status_resp.status_code == 200:
                    payload["stats"] = status_resp.json()

                if not isinstance(frags_resp, Exception) and frags_resp.status_code == 200:
                    frag_data = frags_resp.json()
                    payload["fragment_positions"] = frag_data.get("fragments", [])
                    payload["fragment_count"] = frag_data.get("active", 0)

                await websocket.send_text(__import__("json").dumps(payload))

            except Exception as e:
                logger.debug(f"kessler fetch error: {e}")

            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, "kessler")
    except Exception as e:
        logger.error(f"kessler WS error: {e}")
        await manager.disconnect(websocket, "kessler")


# ---------------------------------------------------------------------------
# WebSocket: Alert feed
# ---------------------------------------------------------------------------
@router.websocket("/ws/alerts")
async def alerts_ws(websocket: WebSocket):
    """Streams high-risk conjunction alerts every 5 seconds."""
    await manager.connect(websocket, "alerts")
    client = get_http_client()
    try:
        while True:
            try:
                resp = await client.get(f"{COLLISION_SERVICE_URL}/feed?limit=20")
                if resp.status_code == 200:
                    data = resp.json()
                    await websocket.send_text(
                        __import__("json").dumps({
                            "type": "alert_batch",
                            "events": data.get("events", []),
                        })
                    )
            except Exception as e:
                logger.debug(f"alerts fetch error: {e}")

            await asyncio.sleep(5.0)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, "alerts")
    except Exception as e:
        logger.error(f"alerts WS error: {e}")
        await manager.disconnect(websocket, "alerts")
