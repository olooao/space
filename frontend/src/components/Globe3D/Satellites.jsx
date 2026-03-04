/**
 * Satellites.jsx — InstancedMesh satellite markers with type-aware colors.
 *
 * Single draw call via InstancedMesh. Per-instance color + scale based on
 * satellite type (ISS, Starlink, debris) and risk level.
 *
 * Colors:
 *   ISS        → bright cyan (#00e5ff) + 2x scale
 *   STARLINK   → teal-green
 *   DEBRIS     → dim orange
 *   RED risk   → bright red
 *   YELLOW risk→ amber
 *   default    → cyan
 *
 * Subtle pulsing emissive glow animated in useFrame.
 * Max 500 instances, single draw call.
 */
import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

const COLORS = {
  ISS:      new THREE.Color(0.0, 0.9, 1.0),
  STARLINK: new THREE.Color(0.2, 0.85, 0.6),
  DEBRIS:   new THREE.Color(0.9, 0.4, 0.1),
  RED:      new THREE.Color(1.0, 0.15, 0.15),
  YELLOW:   new THREE.Color(1.0, 0.75, 0.1),
  GREEN:    new THREE.Color(0.1, 0.85, 1.0),
};

const _dummy = new THREE.Object3D();

function getSatColor(sat) {
  const name = (sat.name || "").toUpperCase();
  if (name.includes("ISS")) return COLORS.ISS;
  if (sat.risk_level === "RED") return COLORS.RED;
  if (sat.risk_level === "YELLOW") return COLORS.YELLOW;
  if (name.includes("STARLINK")) return COLORS.STARLINK;
  if (sat.type === "debris") return COLORS.DEBRIS;
  return COLORS.GREEN;
}

function getSatScale(sat) {
  const name = (sat.name || "").toUpperCase();
  if (name.includes("ISS")) return 2.5;
  if (sat.risk_level === "RED") return 1.8;
  return 1.0;
}

export default function Satellites({ data = [] }) {
  const meshRef = useRef();
  const count = data.length;

  const [geo, mat] = useMemo(
    () => [
      new THREE.SphereGeometry(0.004, 8, 8),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    ],
    []
  );

  useEffect(() => {
    if (!meshRef.current || count === 0) return;

    data.forEach((sat, i) => {
      const pos = latLonAltToVector3(
        sat.lat ?? 0,
        sat.lon ?? 0,
        sat.alt_km ?? 400
      );
      const s = getSatScale(sat);
      _dummy.position.set(pos.x, pos.y, pos.z);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
      meshRef.current.setColorAt(i, getSatColor(sat));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [data, count]);

  // Subtle pulsing opacity
  useFrame(({ clock }) => {
    if (mat) {
      const t = clock.getElapsedTime();
      mat.opacity = 0.8 + Math.sin(t * 2.0) * 0.15;
    }
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geo, mat, count]} />
  );
}
