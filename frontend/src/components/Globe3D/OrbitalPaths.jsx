/**
 * OrbitalPaths.jsx — Animated dashed orbital trajectories with traveling dots.
 *
 * Each path renders:
 * 1. A dashed line with animated dashOffset (flowing "data stream" effect)
 * 2. A small glowing sphere that travels along the path
 *
 * Type-aware colors:
 *   ISS      → bright cyan (#00e5ff)
 *   STARLINK → teal-green (#34d399)
 *   DEBRIS   → dim orange (#f59e0b)
 *   RED risk → red (#ef4444)
 *   default  → cyan (#22d3ee)
 *
 * Uses LineDashedMaterial + CatmullRomCurve3 for smooth curves.
 * Traveling dot position interpolated via curve.getPointAt().
 * Capped at 10 paths to keep draw calls low.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

function getPathColor(sat) {
  const name = (sat.name || "").toUpperCase();
  if (name.includes("ISS")) return "#00e5ff";
  if (sat.risk_level === "RED") return "#ef4444";
  if (sat.risk_level === "YELLOW") return "#fbbf24";
  if (name.includes("STARLINK")) return "#34d399";
  if (sat.type === "debris") return "#f59e0b";
  return "#22d3ee";
}

function AnimatedPath({ pathPoints, color = "#22d3ee", speed = 1.0 }) {
  const lineRef = useRef();
  const dotRef = useRef();

  const { geometry, curve } = useMemo(() => {
    if (!pathPoints || pathPoints.length < 4) return { geometry: null, curve: null };

    const vectors = pathPoints.map(([lon, lat, alt]) => {
      const p = latLonAltToVector3(lat, lon, alt ?? 400);
      return new THREE.Vector3(p.x, p.y, p.z);
    });

    const crv = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.1);
    const pts = crv.getPoints(vectors.length * 3);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.computeLineDistances(); // required for dashed material
    return { geometry: geo, curve: crv };
  }, [pathPoints]);

  // Animate dash offset + traveling dot
  useFrame(({ clock }, delta) => {
    if (lineRef.current?.material) {
      lineRef.current.material.dashOffset -= delta * 0.5;
    }
    if (dotRef.current && curve) {
      // Loop the dot along the full path
      const t = (clock.getElapsedTime() * 0.08 * speed) % 1.0;
      const pos = curve.getPointAt(t);
      dotRef.current.position.set(pos.x, pos.y, pos.z);
    }
  });

  if (!geometry || !curve) return null;

  return (
    <group>
      <line ref={lineRef} geometry={geometry}>
        <lineDashedMaterial
          color={color}
          transparent
          opacity={0.45}
          dashSize={0.02}
          gapSize={0.015}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Traveling dot */}
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.006, 6, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function OrbitalPaths({ data = [] }) {
  return (
    <group>
      {data.slice(0, 10).map((sat, i) =>
        sat.path && sat.path.length > 3 ? (
          <AnimatedPath
            key={sat.name || i}
            pathPoints={sat.path}
            color={getPathColor(sat)}
            speed={0.8 + (i % 3) * 0.3}
          />
        ) : null
      )}
    </group>
  );
}
