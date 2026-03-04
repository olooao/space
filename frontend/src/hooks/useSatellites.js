/**
 * useSatellites — streams live satellite positions from the WebSocket hub.
 * Falls back to polling the orbital API if WS unavailable.
 */
import { useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAppStore } from "../store/appStore";
import { WS_ENDPOINTS } from "../config/api";

export function useSatellites(enabled = true) {
  const setSatellites = useAppStore((s) => s.setSatellites);

  const onMessage = useCallback(
    (msg) => {
      if (msg.type === "satellite_positions" && Array.isArray(msg.data)) {
        setSatellites(msg.data);
      }
    },
    [setSatellites]
  );

  const { status } = useWebSocket(WS_ENDPOINTS.livePositions, {
    onMessage,
    enabled,
    reconnectDelay: 3000,
    maxRetries: 8,
  });

  return { status };
}
