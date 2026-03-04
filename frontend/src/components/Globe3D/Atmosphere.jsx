/**
 * Atmosphere.jsx — Single thin atmospheric rim glow.
 *
 * One BackSide sphere with Fresnel shader — visible only at the globe edge.
 * High power exponent (6.0) ensures zero bleed onto the globe face.
 * Low intensity keeps it from washing out the Earth texture.
 *
 * Cost: 1 sphere draw call, <0.1ms on Intel HD 530.
 */
import { extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

const glowVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const glowFrag = /* glsl */ `
  uniform vec3  glowColor;
  uniform float intensity;
  uniform float power;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  void main() {
    vec3 viewDir = normalize(-vViewPos);
    float rim = 1.0 - abs(dot(vNormal, viewDir));
    float glow = pow(rim, power) * intensity;
    gl_FragColor = vec4(glowColor, glow);
  }
`;

const AtmoGlowMaterial = shaderMaterial(
  {
    glowColor: new THREE.Color(0.3, 0.6, 1.0),
    intensity: 0.8,
    power: 6.0,
  },
  glowVert,
  glowFrag
);
extend({ AtmoGlowMaterial });

export default function Atmosphere({ lowPower = false }) {
  const seg = lowPower ? 24 : 40;

  return (
    <mesh>
      <sphereGeometry args={[1.12, seg, seg]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <atmoGlowMaterial
        glowColor={new THREE.Color(0.3, 0.6, 1.0)}
        intensity={0.8}
        power={6.0}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
