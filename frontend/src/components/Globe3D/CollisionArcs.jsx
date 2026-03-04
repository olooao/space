/**
 * CollisionArcs.jsx — Conjunction warning arcs between at-risk objects.
 *
 * Draws curved arcs between pairs of satellites flagged for collision risk.
 * Each arc rises above the globe surface in a parabolic bezier curve.
 * Pulsing opacity animation for visual urgency.
 *
 * Input: array of { sat1, sat2 } pairs where each has lat/lon/alt_km.
 * Alternatively, auto-generates arcs from satellites with risk_level "RED".
 *
 * Capped at 5 arcs to limit draw calls.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

function makeArcPoints(p1, p2, segments = 32) {
  const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);

  // Midpoint raised above the globe for a visible arc
  const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
  const liftHeight = v1.distanceTo(v2) * 0.4;
  mid.normalize().multiplyScalar(mid.length() + liftHeight);

  const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
  const pts = curve.getPoints(segments);
  return new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
}

function WarningArc({ from, to }) {
  const matRef = useRef();

  const positions = useMemo(() => {
    const p1 = latLonAltToVector3(from.lat ?? 0, from.lon ?? 0, from.alt_km ?? 400);
    const p2 = latLonAltToVector3(to.lat ?? 0, to.lon ?? 0, to.alt_km ?? 400);
    return makeArcPoints(p1, p2);
  }, [from, to]);

  // Pulsing opacity for urgency
  useFrame(({ clock }) => {
    if (matRef.current) {
      const t = clock.getElapsedTime();
      matRef.current.opacity = 0.3 + Math.sin(t * 3.0) * 0.2;
    }
  });

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color="#ff3333"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </line>
  );
}

export default function CollisionArcs({ conjunctions = [], satellites = [] }) {
  // If explicit conjunctions provided, use those.
  // Otherwise, auto-pair RED-risk satellites that are near each other.
  const arcs = useMemo(() => {
    if (conjunctions.length > 0) {
      return conjunctions.slice(0, 5);
    }

    // Auto-generate: pair up RED-risk satellites
    const redSats = satellites.filter((s) => s.risk_level === "RED");
    const pairs = [];
    for (let i = 0; i < redSats.length && pairs.length < 5; i++) {
      for (let j = i + 1; j < redSats.length && pairs.length < 5; j++) {
        pairs.push({ sat1: redSats[i], sat2: redSats[j] });
      }
    }
    return pairs;
  }, [conjunctions, satellites]);

  if (arcs.length === 0) return null;

  return (
    <group>
      {arcs.map((arc, i) => (
        <WarningArc
          key={`arc-${i}`}
          from={arc.sat1}
          to={arc.sat2}
        />
      ))}
    </group>
  );
}
