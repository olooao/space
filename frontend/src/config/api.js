/**
 * Centralized API + WebSocket endpoint configuration.
 * All service URLs are driven by env vars so they work in dev, Docker, and production.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

export const API_ENDPOINTS = {
  // TLE Service
  satellites:       `${API_BASE_URL}/tle/satellites`,
  tleRaw:           `${API_BASE_URL}/tle/tle/raw/all`,
  tleLookup:        (name) => `${API_BASE_URL}/tle/tle/${encodeURIComponent(name)}`,

  // Orbital Service
  satellitePosition: (name) =>
    `${API_BASE_URL}/orbital/satellite/${encodeURIComponent(name)}/position`,
  satellitePositionTraj: (name) =>
    `${API_BASE_URL}/orbital/satellite/${encodeURIComponent(name)}/position?trajectory=true`,
  constellation: (name) =>
    `${API_BASE_URL}/orbital/constellation/${encodeURIComponent(name)}`,

  // Collision Service
  analyzeRisk:     `${API_BASE_URL}/collision/analyze`,
  alertFeed:       `${API_BASE_URL}/collision/feed`,

  // Kessler Service
  kesslerTrigger:  `${API_BASE_URL}/kessler/trigger`,
  kesslerStop:     `${API_BASE_URL}/kessler/stop`,
  kesslerStatus:   `${API_BASE_URL}/kessler/status`,
  kesslerFragments:`${API_BASE_URL}/kessler/fragments`,
  kesslerSolutions:`${API_BASE_URL}/kessler/solutions`,
  kesslerEvents:   `${API_BASE_URL}/kessler/events`,
  kesslerReset:    `${API_BASE_URL}/kessler/reset`,
};

export const WS_ENDPOINTS = {
  livePositions: `${WS_BASE_URL}/ws/positions`,
  kesslerStream: `${WS_BASE_URL}/ws/kessler`,
  alertFeed:     `${WS_BASE_URL}/ws/alerts`,
};
