/**
 * GroundTracks.jsx — Satellite ground track lines on Earth surface.
 *
 * Projects orbital paths onto the globe surface (alt=0) as thin colored lines.
 * Shows where a satellite's orbit passes over on the ground.
 *
 * Color coding by satellite type:
 *   ISS      → cyan
 *   STARLINK → green
 *   debris   → orange
 *   default  → blue
 *
 * Capped at 8 tracks. Each track is a single line draw call.
 */
import { useMemo } from "react";
import * as THREE from "three";
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
  if (sat.type === "debris") return TRACK_COLORS.DEBRIS;
  return TRACK_COLORS.DEFAULT;
}

function GroundTrackLine({ pathPoints, color }) {
  const positions = useMemo(() => {
    if (!pathPoints || pathPoints.length < 4) return null;

    // Project each path point onto the surface (alt=0, radius slightly above globe)
    const surfacePoints = [];
    for (let i = 0; i < pathPoints.length; i++) {
      const [lon, lat] = pathPoints[i];
      const p = latLonAltToVector3(lat, lon, 5); // 5km above surface
      surfacePoints.push(p.x, p.y, p.z);
    }
    return new Float32Array(surfacePoints);
  }, [pathPoints]);

  if (!positions) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.25}
        depthWrite={false}
      />
    </line>
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
