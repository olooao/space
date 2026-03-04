/**
 * GroundTracks.jsx — Satellite ground track lines on Earth surface.
 *
 * Projects orbital paths onto the globe surface as thin colored lines.
 * Uses drei <Line> for StrictMode-safe rendering.
 *
 * Color coding by satellite type:
 *   ISS      → cyan
 *   STARLINK → green
 *   debris   → orange
 *   default  → blue
 *
 * Capped at 8 tracks.
 */
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { latLonAltToVector3 } from "./utils";

const TRACK_COLORS = {
  ISS: "#00e5ff",
  STARLINK: "#34d399",
  DEBRIS: "#f59e0b",
  DEFAULT: "#3b82f6",
};

function getTrackColor(sat) {
  const name = (sat.name || "").toUpperCase();
  if (name.includes("ISS")) return TRACK_COLORS.ISS;
  if (name.includes("STARLINK")) return TRACK_COLORS.STARLINK;
  const type = (sat.type || "").toLowerCase();
  if (type === "debris" || sat.status === "debris" || sat.status === "defunct") return TRACK_COLORS.DEBRIS;
  return TRACK_COLORS.DEFAULT;
}

function GroundTrackLine({ pathPoints, color }) {
  const points = useMemo(() => {
    if (!pathPoints || pathPoints.length < 4) return null;

    return pathPoints.map(([lon, lat]) => {
      const p = latLonAltToVector3(lat, lon, 5); // 5km above surface
      return [p.x, p.y, p.z];
    });
  }, [pathPoints]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color={color}
      transparent
      opacity={0.25}
      lineWidth={1}
      depthWrite={false}
    />
  );
}

export default function GroundTracks({ data = [] }) {
  return (
    <group>
      {data.slice(0, 8).map((sat, i) =>
        sat.path && sat.path.length > 3 ? (
          <GroundTrackLine
            key={`gt-${sat.name || i}`}
            pathPoints={sat.path}
            color={getTrackColor(sat)}
          />
        ) : null
      )}
    </group>
  );
}
