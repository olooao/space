/**
 * SelectedMarker.jsx — Highlights the currently selected satellite on the 3D globe.
 *
 * Renders at the selected satellite's position:
 *   - Pulsing outer ring (cyan glow)
 *   - Bright core dot
 *   - Html label showing satellite name + altitude
 *
 * Uses drei <Html> for StrictMode-safe label rendering.
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

export default function SelectedMarker({ satellite }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const pulseRef = useRef();

  const position = useMemo(() => {
    if (!satellite) return null;
    const p = latLonAltToVector3(
      satellite.lat ?? 0,
      satellite.lon ?? 0,
      satellite.alt_km ?? 400
    );
    return [p.x, p.y, p.z];
  }, [satellite?.lat, satellite?.lon, satellite?.alt_km]);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    // Billboard: face the camera so rings are always visible
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
    if (ringRef.current) {
      const s = 1.0 + Math.sin(t * 3.0) * 0.25;
      ringRef.current.scale.setScalar(s);
      ringRef.current.material.opacity = 0.35 + Math.sin(t * 3.0) * 0.15;
    }
    if (pulseRef.current) {
      const s2 = 1.5 + Math.sin(t * 2.0) * 0.5;
      pulseRef.current.scale.setScalar(s2);
      pulseRef.current.material.opacity = 0.15 + Math.sin(t * 2.0 + 1) * 0.1;
    }
  });

  if (!satellite || !position) return null;

  const statusColor = satellite.status === "debris" || satellite.status === "defunct"
    ? "#f97316" : satellite.risk_level === "RED"
    ? "#ef4444" : "#38bdf8";

  return (
    <group position={position} ref={groupRef}>
      {/* Outer pulse ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.022, 0.026, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Inner selection ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.013, 0.016, 32]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Core bright dot */}
      <mesh>
        <sphereGeometry args={[0.006, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Name + altitude label */}
      <Html
        center
        distanceFactor={3.5}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div style={{
          background: "rgba(0,0,0,0.82)",
          border: `1px solid ${statusColor}44`,
          borderRadius: "8px",
          padding: "5px 10px",
          whiteSpace: "nowrap",
          transform: "translateY(-32px)",
          backdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
        }}>
          <span style={{
            color: "#ffffff",
            fontSize: "11px",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}>
            {satellite.name}
          </span>
          <span style={{
            color: statusColor,
            fontSize: "9px",
            fontFamily: "monospace",
            fontWeight: 500,
            opacity: 0.85,
          }}>
            {satellite.alt_km ? `${Math.round(satellite.alt_km)} km` : ""}
            {satellite.velocity ? ` · ${Number(satellite.velocity).toFixed(1)} km/s` : ""}
          </span>
        </div>
      </Html>
    </group>
  );
}
