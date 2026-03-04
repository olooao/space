/**
 * ExplosionEffect.jsx — Expanding ring animation for collision events.
 *
 * Renders at lat/lon/alt of the collision, expands outward and fades.
 * Self-destructs after animation completes via onComplete callback.
 */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

export default function ExplosionEffect({ explosion, onComplete }) {
  const ringRef = useRef();
  const flashRef = useRef();
  const [elapsed, setElapsed] = useState(0);
  const duration = 2.0; // seconds

  const pos = latLonAltToVector3(
    explosion.lat ?? 0,
    explosion.lon ?? 0,
    explosion.alt_km ?? 400
  );
  const position = new THREE.Vector3(pos.x, pos.y, pos.z);

  useFrame((_, delta) => {
    const newElapsed = elapsed + delta;
    setElapsed(newElapsed);

    const t = newElapsed / duration; // 0 → 1

    if (t >= 1.0) {
      onComplete?.(explosion.id);
      return;
    }

    // Expand ring
    if (ringRef.current) {
      const scale = 1.0 + t * 3.0;
      ringRef.current.scale.set(scale, scale, scale);
      ringRef.current.material.opacity = 1.0 - t;
    }

    // Flash sphere (fades quickly)
    if (flashRef.current) {
      flashRef.current.material.opacity = Math.max(0, 0.8 - t * 4);
      const fScale = 1.0 + t * 0.5;
      flashRef.current.scale.set(fScale, fScale, fScale);
    }
  });

  return (
    <group position={position}>
      {/* Expanding ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.02, 0.002, 8, 24]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={1.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Central flash */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
