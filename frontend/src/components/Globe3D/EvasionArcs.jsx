/**
 * EvasionArcs.jsx — Collision avoidance maneuver visualization.
 *
 * For each computed evasion maneuver, renders:
 *   1. Original doomed trajectory — red dashed line
 *   2. AI-computed evasion trajectory — green glowing solid line
 *   3. Burn point — pulsing sphere with ΔV magnitude label
 *
 * Paths share origin and diverge at the burn point, visually proving
 * the Clohessy-Wiltshire optimizer computed a safe avoidance path.
 *
 * Uses drei <Line> for StrictMode-safe rendering.
 * Capped at 3 maneuvers for performance.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonAltToVector3 } from "./utils";

function pathToPoints(pathData) {
  if (!pathData || pathData.length < 4) return null;
  const vectors = pathData.map(([lon, lat, alt]) => {
    const p = latLonAltToVector3(lat, lon, alt ?? 400);
    return new THREE.Vector3(p.x, p.y, p.z);
  });
  const curve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.1);
  const pts = curve.getPoints(vectors.length * 3);
  return pts.map(p => [p.x, p.y, p.z]);
}

function BurnPointMarker({ burnPoint, magnitude }) {
  const meshRef = useRef();

  const position = useMemo(() => {
    if (!burnPoint) return null;
    const p = latLonAltToVector3(burnPoint.lat, burnPoint.lon, burnPoint.alt_km || 400);
    return [p.x, p.y, p.z];
  }, [burnPoint]);

  // Pulsing scale animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1.0 + Math.sin(t * 4.0) * 0.3;
      meshRef.current.scale.setScalar(scale);
    }
  });

  if (!position) return null;

  return (
    <group position={position}>
      {/* Outer glow */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.005, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* ΔV label */}
      <Html
        center
        distanceFactor={3}
        style={{
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <div style={{
          background: "rgba(0,0,0,0.75)",
          border: "1px solid rgba(34,197,94,0.5)",
          borderRadius: "6px",
          padding: "3px 8px",
          whiteSpace: "nowrap",
          transform: "translateY(-24px)",
        }}>
          <span style={{
            color: "#22c55e",
            fontSize: "10px",
            fontFamily: "monospace",
            fontWeight: "bold",
          }}>
            ΔV {magnitude?.toFixed(1) || "?"} m/s
          </span>
        </div>
      </Html>
    </group>
  );
}

function EvasionManeuver({ maneuver }) {
  const dotRef = useRef();

  const {
    originalPoints,
    evasionPoints,
    evasionCurve,
  } = useMemo(() => {
    const origPts = pathToPoints(maneuver.original_trajectory);
    const evadePts = pathToPoints(maneuver.evasion_trajectory);

    let evadeCurve = null;
    if (maneuver.evasion_trajectory && maneuver.evasion_trajectory.length >= 4) {
      const vectors = maneuver.evasion_trajectory.map(([lon, lat, alt]) => {
        const p = latLonAltToVector3(lat, lon, alt ?? 400);
        return new THREE.Vector3(p.x, p.y, p.z);
      });
      evadeCurve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.1);
    }

    return {
      originalPoints: origPts,
      evasionPoints: evadePts,
      evasionCurve: evadeCurve,
    };
  }, [maneuver]);

  // Animate traveling dot along evasion path
  useFrame(({ clock }) => {
    if (dotRef.current && evasionCurve) {
      const t = (clock.getElapsedTime() * 0.06) % 1.0;
      const pos = evasionCurve.getPointAt(t);
      dotRef.current.position.set(pos.x, pos.y, pos.z);
    }
  });

  return (
    <group>
      {/* Original doomed trajectory — red dashed */}
      {originalPoints && (
        <Line
          points={originalPoints}
          color="#ef4444"
          transparent
          opacity={0.5}
          lineWidth={1.5}
          dashed
          dashSize={0.02}
          gapSize={0.012}
          depthWrite={false}
        />
      )}

      {/* Evasion trajectory — green solid glow */}
      {evasionPoints && (
        <Line
          points={evasionPoints}
          color="#22c55e"
          transparent
          opacity={0.7}
          lineWidth={2}
          depthWrite={false}
        />
      )}

      {/* Traveling dot on evasion path */}
      {evasionCurve && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Burn point marker with ΔV label */}
      <BurnPointMarker
        burnPoint={maneuver.burn_point}
        magnitude={maneuver.magnitude_m_s}
      />
    </group>
  );
}

export default function EvasionArcs({ data = [] }) {
  if (data.length === 0) return null;

  return (
    <group>
      {data.slice(0, 3).map((maneuver, i) => (
        <EvasionManeuver
          key={`evasion-${maneuver.primary || i}`}
          maneuver={maneuver}
        />
      ))}
    </group>
  );
}
