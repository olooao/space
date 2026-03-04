/**
 * Earth.jsx — Textured Earth sphere with Blue Marble day map.
 *
 * Single layer: NASA Blue Marble 2K texture + topology bump map.
 * No overlays, no additive layers — clean, crisp continents.
 *
 * Uses R3F useLoader for Suspense-compatible, cached texture loading
 * (no race conditions with React StrictMode).
 */
import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

const base = import.meta.env.BASE_URL || "/";
const TEX_URLS = {
  day: `${base}textures/earth-blue-marble.jpg`,
  bump: `${base}textures/earth-topology.png`,
};

export default function Earth({ lowPower = false }) {
  const segments = lowPower ? 48 : 64;
  const earthRef = useRef();

  const dayTex = useLoader(THREE.TextureLoader, TEX_URLS.day);
  const bumpTex = useLoader(THREE.TextureLoader, TEX_URLS.bump);

  // Set colorSpace + filter once after load
  useMemo(() => {
    if (dayTex) {
      dayTex.colorSpace = THREE.SRGBColorSpace;
      if (lowPower) {
        dayTex.minFilter = THREE.LinearFilter;
        dayTex.generateMipmaps = false;
      }
    }
    if (bumpTex) {
      bumpTex.colorSpace = THREE.LinearSRGBColorSpace;
      if (lowPower) {
        bumpTex.minFilter = THREE.LinearFilter;
        bumpTex.generateMipmaps = false;
      }
    }
  }, [dayTex, bumpTex, lowPower]);

  // Slow rotation
  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshStandardMaterial
        map={dayTex}
        bumpMap={bumpTex}
        bumpScale={0.012}
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  );
}
