/**
 * GlobeGrid.jsx — Lat/lon coordinate grid + animated radar sweep.
 *
 * Renders:
 * - Major latitude circles every 30 deg
 * - Longitude meridians every 30 deg
 * - Animated radar sweep line that rotates around the equator
 *
 * All lines use lineBasicMaterial with low opacity.
 * Sweep line uses slightly higher opacity and animates via useFrame.
 * Cost: ~19 line draw calls + 1 animated line, negligible GPU impact.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function makeCircle(radiusScale, segments, axis, angleDeg) {
  const pts = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    if (axis === "lat") {
      const r = radiusScale * Math.sin(Math.PI / 2 - angleRad);
      const y = radiusScale * Math.cos(Math.PI / 2 - angleRad);
      pts.push(new THREE.Vector3(r * Math.cos(t), y, r * Math.sin(t)));
    } else {
      const phi = t;
      pts.push(
        new THREE.Vector3(
          radiusScale * Math.sin(phi) * Math.cos(angleRad),
          radiusScale * Math.cos(phi),
          radiusScale * Math.sin(phi) * Math.sin(angleRad)
        )
      );
    }
  }
  return pts;
}

// Build a single-meridian line for the sweep
function makeSweepLine(radius, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI;
    pts.push(
      new THREE.Vector3(
        radius * Math.sin(phi),
        radius * Math.cos(phi),
        0
      )
    );
  }
  return new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
}

export default function GlobeGrid({ radius = 1.003, opacity = 0.07 }) {
  const sweepRef = useRef();

  const lines = useMemo(() => {
    const result = [];
    const seg = 64;

    // Latitude lines: -60, -30, 0, 30, 60
    for (let lat = -60; lat <= 60; lat += 30) {
      result.push({ pts: makeCircle(radius, seg, "lat", lat), key: `lat${lat}` });
    }

    // Longitude lines: every 30 degrees
    for (let lon = 0; lon < 360; lon += 30) {
      result.push({ pts: makeCircle(radius, seg, "lon", lon), key: `lon${lon}` });
    }

    return result;
  }, [radius]);

  const sweepPositions = useMemo(() => makeSweepLine(radius + 0.001, 48), [radius]);

  // Rotate the sweep line around Y axis
  useFrame(({ clock }) => {
    if (sweepRef.current) {
      sweepRef.current.rotation.y = clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <group>
      {/* Static grid lines */}
      {lines.map(({ pts, key }) => (
        <line key={key}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#22d3ee"
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </line>
      ))}

      {/* Animated radar sweep meridian */}
      <group ref={sweepRef}>
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sweepPositions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.4}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </line>
      </group>
    </group>
  );
}
