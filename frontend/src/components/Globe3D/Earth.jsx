/**
 * Earth.jsx — Textured Earth sphere with Blue Marble day map.
 *
 * Single layer: NASA Blue Marble 2K texture + topology bump map.
 * No overlays, no additive layers — clean, crisp continents.
 *
 * Optimized for Intel HD 530: 2K textures max, no mipmaps on lowPower.
 */
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const base = import.meta.env.BASE_URL || "/";
const TEX_URLS = {
  day: `${base}textures/earth-blue-marble.jpg`,
  bump: `${base}textures/earth-topology.png`,
};

function useTexture(url, colorSpace, lowPower) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (cancelled) return;
        t.colorSpace = colorSpace;
        if (lowPower) {
          t.minFilter = THREE.LinearFilter;
          t.generateMipmaps = false;
        }
        setTex(t);
      },
      undefined,
      (err) => { console.error("[Earth] Texture load failed:", url, err); }
    );
    return () => { cancelled = true; };
  }, [url, colorSpace, lowPower]);
  return tex;
}

export default function Earth({ lowPower = false }) {
  const segments = lowPower ? 48 : 64;
  const earthRef = useRef();

  const dayTex = useTexture(TEX_URLS.day, THREE.SRGBColorSpace, lowPower);
  const bumpTex = useTexture(TEX_URLS.bump, THREE.LinearSRGBColorSpace, lowPower);

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
        bumpScale={bumpTex ? 0.012 : 0}
        color={dayTex ? "#ffffff" : "#1a3a5c"}
        roughness={0.85}
        metalness={0.0}
      />
    </mesh>
  );
}
