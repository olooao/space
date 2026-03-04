/**
 * useKessler — cascade simulation control + real-time state streaming.
 *
 * Connects to the kessler WebSocket channel and exposes:
 * - simStats: current cascade statistics
 * - wsStatus: WebSocket connection state
 * - triggerCascade(params): POST to kessler_service /trigger
 * - stopCascade(): POST to kessler_service /stop
 * - fetchSolutions(): GET deorbit countermeasures
 * - solutions: list of DeorbitSolution objects
 */
import { useState, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useAppStore } from "../store/appStore";
import { WS_ENDPOINTS, API_ENDPOINTS } from "../config/api";

export function useKessler(enabled = true) {
  const setFragments = useAppStore((s) => s.setFragments);
  const setKesslerStats = useAppStore((s) => s.setKesslerStats);
  const addCascadeEvents = useAppStore((s) => s.addCascadeEvents);
  const kesslerStats = useAppStore((s) => s.kesslerStats);

  const [solutions, setSolutions] = useState([]);

  const onMessage = useCallback(
    (msg) => {
      if (msg.type === "kessler_update") {
        if (msg.stats) {
          setKesslerStats(msg.stats);
        }
        if (Array.isArray(msg.fragment_positions)) {
          setFragments(msg.fragment_positions);
        }
        if (msg.stats?.new_events?.length) {
          addCascadeEvents(msg.stats.new_events);
        }
      }
    },
    [setFragments, setKesslerStats, addCascadeEvents]
  );

  const { status: wsStatus } = useWebSocket(WS_ENDPOINTS.kesslerStream, {
    onMessage,
    enabled,
    reconnectDelay: 2000,
    maxRetries: 8,
  });

  const triggerCascade = useCallback(async (params) => {
    const res = await fetch(API_ENDPOINTS.kesslerTrigger, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`Trigger failed: ${res.status}`);
    return res.json();
  }, []);

  const stopCascade = useCallback(async () => {
    const res = await fetch(API_ENDPOINTS.kesslerStop, { method: "POST" });
    return res.json();
  }, []);

  const fetchSolutions = useCallback(async () => {
    const res = await fetch(API_ENDPOINTS.kesslerSolutions);
    if (!res.ok) return;
    const data = await res.json();
    setSolutions(data.solutions ?? []);
  }, []);

  return {
    simStats: kesslerStats,
    solutions,
    wsStatus,
    triggerCascade,
    stopCascade,
    fetchSolutions,
  };
}
