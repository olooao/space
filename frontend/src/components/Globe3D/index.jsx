/**
 * Globe3D/index.jsx — Three.js interactive 3D Earth visualization.
 *
 * Optimized for Intel integrated graphics (HD 530 / UHD 6xx).
 *
 * Scene composition (inner → outer):
 * - Earth: day surface + night lights + bump map + cloud layer
 * - Atmosphere: triple-layer Fresnel glow (inner rim + outer halo + pulse)
 * - GlobeGrid: lat/lon coordinate lines + radar sweep
 * - Satellites: InstancedMesh with pulsing emissive glow
 * - OrbitalPaths: animated dashed trajectories + traveling dots
 * - DebrisField: Points particle cloud (Kessler mode)
 * - Stars: lightweight background starfield (600–800 pts)
 *
 * Lighting: directional sun + blue fill + rim + ambient.
 * Renderer: no antialias, DPR=1 on iGPU, stencil off, alpha off.
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import React, { Suspense, useState, useEffect, useRef } from "react";

import Earth from "./Earth";
import Atmosphere from "./Atmosphere";
import GlobeGrid from "./GlobeGrid";
import Satellites from "./Satellites";
import OrbitalPaths from "./OrbitalPaths";
import GroundTracks from "./GroundTracks";
import CollisionArcs from "./CollisionArcs";
import DebrisField from "./DebrisField";

export { latLonAltToVector3 } from "./utils";

// --- Lightweight WebGL check (no context creation) ---
function isWebGLAvailable() {
  return typeof WebGLRenderingContext !== "undefined";
}

// Detect integrated GPU from the *actual* R3F renderer (called after mount)
function detectLowPowerGPU(gl) {
  try {
    const ctx = gl.getContext();
    if (!ctx) return true;
    const debugInfo = ctx.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return true;
    const renderer = ctx
      .getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      .toLowerCase();
    return /intel|llvmpipe|swiftshader|mesa|integrated|hd graphics|uhd graphics/i.test(
      renderer
    );
  } catch {
    return true;
  }
}

// --- Fallback when WebGL is not available ---
function WebGLFallback({ allSats, kesslerMode, debrisFragments }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#020817] rounded-2xl text-center p-8 gap-4">
      <div className="w-32 h-32 rounded-full border-2 border-cyan-800/50 flex items-center justify-center relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-900 to-cyan-950 border border-cyan-700/30" />
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-[spin_20s_linear_infinite]" />
      </div>
      <div className="text-amber-400 text-sm font-bold font-mono tracking-wider">
        WEBGL UNAVAILABLE
      </div>
      <p className="text-slate-500 text-xs font-mono max-w-sm">
        3D globe requires WebGL. Try enabling hardware acceleration in your
        browser settings, or use a browser that supports WebGL.
      </p>
      {allSats.length > 0 && (
        <div className="mt-2 bg-slate-900/70 border border-white/10 rounded-lg px-4 py-2">
          <span className="text-[11px] font-mono text-cyan-400">
            {allSats.length} OBJECTS TRACKED
          </span>
        </div>
      )}
      {kesslerMode && (
        <div className="bg-red-950/80 border border-red-600/40 rounded-lg px-4 py-2">
          <span className="text-[11px] font-mono font-bold text-red-400 tracking-widest">
            CASCADE ACTIVE — {debrisFragments.length.toLocaleString()} FRAGMENTS
          </span>
        </div>
      )}
    </div>
  );
}

// --- Error boundary for Canvas-level crashes ---
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("[Globe3D] Canvas error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#020817] rounded-2xl text-center p-8 gap-4">
          <div className="text-amber-500 text-sm font-bold font-mono tracking-wider">
            3D RENDERER ERROR
          </div>
          <p className="text-slate-500 text-xs font-mono max-w-sm">
            The 3D globe encountered an error during initialization.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SceneLoader() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#1e293b" wireframe />
    </mesh>
  );
}

const MAX_CONTEXT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export default function Globe3D({
  satellites = [],
  constellation = [],
  conjunctions = [],
  debrisFragments = [],
  kesslerMode = false,
  showPaths = false,
  className = "",
}) {
  const allSats = [...satellites, ...constellation];
  const [webglOk, setWebglOk] = useState(() => isWebGLAvailable());
  const [contextLost, setContextLost] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasContainerRef = useRef(null);
  const lowPower = useRef(true);
  const glRef = useRef(null);

  // Context-loss listener
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    const canvas = gl.domElement;
    if (!canvas) return;

    const onLost = (e) => {
      e.preventDefault();
      console.warn("[Globe3D] WebGL context lost");
      setContextLost(true);
    };
    const onRestored = () => {
      console.info("[Globe3D] WebGL context restored");
      setContextLost(false);
      setRetryCount(0);
    };

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [canvasKey, retryCount]);

  // Auto-retry on context loss
  useEffect(() => {
    if (!contextLost) return;
    if (retryCount >= MAX_CONTEXT_RETRIES) return;
    const timer = setTimeout(() => {
      setContextLost(false);
      setRetryCount((c) => c + 1);
      setCanvasKey((k) => k + 1);
    }, RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [contextLost, retryCount]);

  const handleCreated = ({ gl }) => {
    const ctx = gl.getContext();
    if (!ctx) {
      setWebglOk(false);
      return;
    }
    glRef.current = gl;
    lowPower.current = detectLowPowerGPU(gl);
  };

  // --- Render guards ---
  if (!webglOk) {
    return (
      <div className={`relative w-full h-full bg-[#020817] rounded-2xl overflow-hidden ${className}`}>
        <WebGLFallback allSats={allSats} kesslerMode={kesslerMode} debrisFragments={debrisFragments} />
      </div>
    );
  }

  if (contextLost && retryCount >= MAX_CONTEXT_RETRIES) {
    return (
      <div className={`relative w-full h-full bg-[#020817] rounded-2xl overflow-hidden ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="text-amber-500 text-sm font-bold font-mono tracking-wider">GPU CONTEXT LOST</div>
          <p className="text-slate-500 text-xs font-mono max-w-sm">
            The GPU driver reset the WebGL context after {MAX_CONTEXT_RETRIES} attempts.
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setRetryCount(0); setContextLost(false); setCanvasKey((k) => k + 1); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">RETRY</button>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold">RELOAD PAGE</button>
          </div>
        </div>
      </div>
    );
  }

  if (contextLost) {
    return (
      <div className={`relative w-full h-full bg-[#020817] rounded-2xl overflow-hidden ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="text-amber-500 text-sm font-bold font-mono tracking-wider animate-pulse">
            RECOVERING GPU CONTEXT...
          </div>
          <p className="text-slate-500 text-xs font-mono">
            Attempt {retryCount + 1} of {MAX_CONTEXT_RETRIES}
          </p>
        </div>
      </div>
    );
  }

  // --- Adaptive quality ---
  const lp = lowPower.current;
  const maxDpr = lp ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  return (
    <div
      ref={canvasContainerRef}
      className={`relative w-full h-full bg-[#020817] rounded-2xl overflow-hidden ${className}`}
    >
      <CanvasErrorBoundary>
        <Canvas
          key={canvasKey}
          camera={{ position: [0, 0, 2.8], fov: 45, near: 0.01, far: 500 }}
          gl={{
            antialias: false,
            toneMapping: THREE.NoToneMapping,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
            stencil: false,
            depth: true,
            alpha: false,
            preserveDrawingBuffer: false,
          }}
          dpr={[1, maxDpr]}
          onCreated={handleCreated}
        >
          {/* Starfield — 600-800 pts, minimal GPU cost */}
          <Stars
            radius={200}
            depth={80}
            count={lp ? 600 : 800}
            factor={5}
            saturation={0.1}
            fade
            speed={0.15}
          />

          {/* Lighting rig: sun + ambient */}
          <ambientLight intensity={0.35} />
          {/* Sun — main key light */}
          <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />

          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={6}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.45}
            zoomSpeed={0.7}
            autoRotate
            autoRotateSpeed={0.12}
          />

          <Suspense fallback={<SceneLoader />}>
            <Earth lowPower={lp} />
            <Atmosphere lowPower={lp} />
            <GlobeGrid />

            {allSats.length > 0 && <Satellites data={allSats} />}

            {showPaths && allSats.length > 0 && (
              <OrbitalPaths data={allSats.slice(0, 10)} />
            )}

            {showPaths && allSats.length > 0 && (
              <GroundTracks data={allSats.slice(0, 8)} />
            )}

            <CollisionArcs conjunctions={conjunctions} satellites={allSats} />

            {kesslerMode && debrisFragments.length > 0 && (
              <DebrisField fragments={debrisFragments} />
            )}
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      {/* DOM HUD overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
        {kesslerMode && (
          <div className="bg-red-950/80 backdrop-blur border border-red-600/40 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-mono font-bold text-red-400 tracking-widest">
              CASCADE ACTIVE — {debrisFragments.length.toLocaleString()} FRAGMENTS
            </span>
          </div>
        )}
        {allSats.length > 0 && (
          <div className="bg-slate-900/70 backdrop-blur border border-white/10 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-mono text-cyan-400">
              {allSats.length} OBJECTS TRACKED
            </span>
          </div>
        )}
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <span className="text-[9px] text-slate-600 font-mono">
          SCROLL TO ZOOM · DRAG TO ROTATE
        </span>
      </div>
    </div>
  );
}
