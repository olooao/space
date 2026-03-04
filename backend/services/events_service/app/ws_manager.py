"""WebSocket connection manager for multi-channel broadcasting."""
from __future__ import annotations

import json
import logging
from typing import Dict, List

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

logger = logging.getLogger(__name__)

CHANNELS = ["positions", "kessler", "alerts"]


class WebSocketManager:
    """Manages WebSocket connections organized by named channels."""

    def __init__(self):
        self.channels: Dict[str, List[WebSocket]] = {ch: [] for ch in CHANNELS}

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        if channel not in self.channels:
            await websocket.close(code=4004)
            return
        await websocket.accept()
        self.channels[channel].append(websocket)
        logger.info(f"Client connected to channel '{channel}' (total: {len(self.channels[channel])})")

    async def disconnect(self, websocket: WebSocket, channel: str) -> None:
        if channel in self.channels and websocket in self.channels[channel]:
            self.channels[channel].remove(websocket)
            logger.info(f"Client disconnected from '{channel}'")

    async def broadcast(self, channel: str, data: dict) -> None:
        """Broadcast data to all connected clients on a channel."""
        if channel not in self.channels:
            return

        dead: List[WebSocket] = []
        for ws in self.channels[channel]:
            try:
                await ws.send_text(json.dumps(data))
            except (WebSocketDisconnect, RuntimeError, Exception):
                dead.append(ws)

        for ws in dead:
            if ws in self.channels[channel]:
                self.channels[channel].remove(ws)

    def connection_count(self, channel: str) -> int:
        return len(self.channels.get(channel, []))

    def total_connections(self) -> int:
        return sum(len(v) for v in self.channels.values())


# Module-level singleton
manager = WebSocketManager()
