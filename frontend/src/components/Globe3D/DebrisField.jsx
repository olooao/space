/**
 * DebrisField.jsx — GPU-accelerated particle cloud for Kessler debris.
 *
 * Uses Points + BufferGeometry with Float32Arrays for 50k+ fragments.
 * Per-fragment color by cascade generation (red → orange → yellow → lime).
 * Additive blending creates a glowing orbital debris cloud.
 * Slow rotation per useFrame to simulate orbital drift.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

// Color ramp per generation
function fragmentColor(generation) {
  if (generation === 0) return [1.0, 0.1, 0.05];
  if (generation === 1) return [1.0, 0.45, 0.05];
  if (generation === 2) return [1.0, 0.8, 0.05];
  return [0.9, 1.0, 0.2];
}

export default function DebrisField({ fragments = [] }) {
  const pointsRef = useRef();

  const { positions, colors, sizes } = useMemo(() => {
    const n = fragments.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);

    fragments.forEach((frag, i) => {
      const pos = latLonAltToVector3(
        frag.lat ?? 0,
        frag.lon ?? 0,
        frag.alt_km ?? 400
      );
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const [r, g, b] = fragmentColor(frag.generation ?? 0);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Vary point size by generation for visual depth
      sizes[i] = 0.004 + (frag.generation ?? 0) * 0.001;
    });

    return { positions, colors, sizes };
  }, [fragments]);

  // Slow rotation to simulate orbital motion
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02;
    }
  });

  if (fragments.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.006}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
