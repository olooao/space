/**
 * OrbitalPaths.jsx — Animated dashed orbital trajectories with traveling dots.
 *
 * Each path renders:
 * 1. A dashed line via drei <Line> (safe under React StrictMode)
 * 2. A small glowing sphere that travels along the path
 *
 * Type-aware colors:
 *   ISS      → bright cyan (#00e5ff)
 *   STARLINK → teal-green (#34d399)
 *   DEBRIS   → dim orange (#f59e0b)
 *   RED risk → red (#ef4444)
 *   default  → cyan (#22d3ee)
 *
 * Traveling dot position interpolated via CatmullRomCurve3.getPointAt().
 * Capped at 10 paths to keep draw calls low.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

function getPathColor(sat) {
  const name = (sat.name || "").toUpperCase();
  if (name.includes("ISS")) return "#00e5ff";
  if (sat.risk_level === "RED") return "#ef4444";
  if (sat.risk_level === "YELLOW") return "#fbbf24";
  if (name.includes("STARLINK")) return "#34d399";
  const type = (sat.type || "").toLowerCase();
  if (type === "debris" || sat.status === "debris" || sat.status === "defunct") return "#f59e0b";
  return "#22d3ee";
}

function AnimatedPath({ pathPoints, color = "#22d3ee", speed = 1.0 }) {
  const dotRef = useRef();

  const { points, curve } = useMemo(() => {
    if (!pathPoints || pathPoints.length < 4) return { points: null, curve: null };

    const vectors = pathPoints.map(([lon, lat, alt]) => {
      const p = latLonAltToVector3(lat, lon, alt ?? 400);
      return new THREE.Vector3(p.x, p.y, p.z);
    });

    const crv = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.1);
    const pts = crv.getPoints(vectors.length * 3);
    const linePoints = pts.map(p => [p.x, p.y, p.z]);
    return { points: linePoints, curve: crv };
  }, [pathPoints]);

  // Animate traveling dot along the curve
  useFrame(({ clock }) => {
    if (dotRef.current && curve) {
      const t = (clock.getElapsedTime() * 0.08 * speed) % 1.0;
      const pos = curve.getPointAt(t);
      dotRef.current.position.set(pos.x, pos.y, pos.z);
    }
  });

  if (!points || !curve) return null;

  return (
    <group>
      <Line
        points={points}
        color={color}
        transparent
        opacity={0.45}
        lineWidth={1}
        dashed
        dashSize={0.02}
        gapSize={0.015}
      />

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
