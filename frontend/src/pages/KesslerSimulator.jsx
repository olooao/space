/**
 * KesslerSimulator.jsx — Full-screen cinematic Kessler cascade simulator.
 *
 * Full-viewport globe with floating glass panels, dramatic arming sequence,
 * real-time cascade visualization, and countermeasure overlays.
 *
 * Phases:  idle → arming → cascade → (solutions overlay)
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, AlertTriangle, Activity, Zap, Shield,
  ShieldAlert, ChevronDown, ChevronUp, RotateCcw,
  Square, Radio, Target, Crosshair,
} from "lucide-react";
import Globe3D from "../components/Globe3D";
import { useKessler } from "../hooks/useKessler";
import { useAppStore } from "../store/appStore";

/* ═══════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════ */
const TARGET_OPTIONS = [
  { value: "ISS (ZARYA)", label: "ISS (ZARYA)", alt: "408 km", type: "Station" },
  { value: "TIANGONG (CSS)", label: "TIANGONG", alt: "390 km", type: "Station" },
  { value: "HST", label: "Hubble (HST)", alt: "540 km", type: "Payload" },
  { value: "STARLINK-1007", label: "STARLINK-1007", alt: "550 km", type: "Payload" },
  { value: "NOAA 19", label: "NOAA 19", alt: "870 km", type: "Payload" },
];

const ARMING_DURATION = 3000; // 3-second countdown

/* ═══════════════════════════════════════════
   ANIMATED COUNTER HOOK
   ═══════════════════════════════════════════ */
function useCounter(target, duration = 2000, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */
function ZoneDensityBar({ zone, count, maxCount }) {
  const pct = maxCount > 0 ? Math.min((count / maxCount) * 100, 100) : 0;
  const color = pct > 70 ? "bg-status-critical" : pct > 40 ? "bg-status-warning" : "bg-accent-blue";
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-text-tertiary w-24 shrink-0 truncate font-mono">{zone}</span>
      <div className="flex-1 h-1 bg-surface-bg rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-right font-mono ${pct > 70 ? "text-status-critical" : "text-text-secondary"}`}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function SolutionCard({ sol, index }) {
  const styles = {
    CRITICAL: { border: "border-status-critical/30", bg: "bg-status-critical/[0.08]", text: "text-status-critical", glow: "shadow-status-critical/10" },
    HIGH: { border: "border-status-warning/30", bg: "bg-status-warning/[0.08]", text: "text-status-warning", glow: "shadow-status-warning/10" },
    MEDIUM: { border: "border-status-success/30", bg: "bg-status-success/[0.08]", text: "text-status-success", glow: "shadow-status-success/10" },
  };
  const s = styles[sol.priority] || styles.MEDIUM;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.4 }}
      className={`glass-surface border ${s.border} rounded-xl p-4 shadow-lg ${s.glow}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[11px] font-mono font-bold ${s.text}`}>{sol.zone}</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg ${s.bg} ${s.text} tracking-wider`}>{sol.priority}</span>
      </div>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-text-tertiary">Deorbit ΔV</span>
          <span className="text-text-primary font-mono font-bold">{sol.delta_v_m_s} m/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Target Alt.</span>
          <span className="text-text-primary font-mono">{sol.target_altitude_km} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Fragments</span>
          <span className={`font-mono ${s.text}`}>{sol.fragment_count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">Clearance</span>
          <span className="text-text-primary font-mono">~{sol.estimated_clearance_years} yr</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function KesslerSimulator() {
  const fragments = useAppStore((s) => s.fragments);
  const cascadeEvents = useAppStore((s) => s.cascadeEvents);
  const clearCascade = useAppStore((s) => s.clearCascade);

  const { simStats, solutions, wsStatus, triggerCascade, stopCascade, fetchSolutions } = useKessler(true);

  const [phase, setPhase] = useState("idle"); // idle | arming | cascade
  const [showSolutions, setShowSolutions] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [showConfig, setShowConfig] = useState(true);
  const [armingProgress, setArmingProgress] = useState(0);
  const [impactFlash, setImpactFlash] = useState(false);
  const [config, setConfig] = useState({
    target: "ISS (ZARYA)",
    projectile_mass_kg: 900,
    relative_velocity_km_s: 10.2,
  });

  const armingTimerRef = useRef(null);
  const targetInfo = TARGET_OPTIONS.find(t => t.value === config.target) || TARGET_OPTIONS[0];

  /* ─── Arming sequence ─── */
  const startArming = useCallback(() => {
    setPhase("arming");
    setArmingProgress(0);
    const start = Date.now();
    armingTimerRef.current = setInterval(() => {
      const p = (Date.now() - start) / ARMING_DURATION;
      setArmingProgress(Math.min(p, 1));
      if (p >= 1) {
        clearInterval(armingTimerRef.current);
        // Fire the cascade
        setPhase("cascade");
        setImpactFlash(true);
        setTimeout(() => setImpactFlash(false), 1500);
        triggerCascade(config).catch(err => {
          console.error("Trigger failed:", err);
          setPhase("idle");
        });
        setTimeout(fetchSolutions, 10000);
      }
    }, 30);
  }, [config, triggerCascade, fetchSolutions]);

  const cancelArming = useCallback(() => {
    if (armingTimerRef.current) clearInterval(armingTimerRef.current);
    setPhase("idle");
    setArmingProgress(0);
  }, []);

  const handleStop = useCallback(async () => {
    await stopCascade();
    setPhase("idle");
  }, [stopCascade]);

  const handleReset = useCallback(() => {
    if (armingTimerRef.current) clearInterval(armingTimerRef.current);
    setPhase("idle");
    setArmingProgress(0);
    setImpactFlash(false);
    setShowSolutions(false);
    clearCascade();
  }, [clearCascade]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "KeyR") { e.preventDefault(); handleReset(); }
      if (e.code === "KeyS" && solutions.length > 0) { e.preventDefault(); setShowSolutions(s => !s); }
      if (e.code === "Escape") { e.preventDefault(); if (phase === "arming") cancelArming(); if (showSolutions) setShowSolutions(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, solutions.length, showSolutions, handleReset, cancelArming]);

  /* ─── Derived values ─── */
  const fragmentCount = fragments.length;
  const isActive = phase === "cascade" || fragmentCount > 0;
  const cascadeIntensity = Math.min(fragmentCount / 1200, 1);
  const maxZoneCount = simStats?.zone_density ? Math.max(...Object.values(simStats.zone_density), 1) : 1;

  const wsColor = wsStatus === "open" ? "bg-status-success" : wsStatus === "connecting" ? "bg-status-warning" : wsStatus === "error" ? "bg-status-critical" : "bg-text-tertiary";

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#020817] font-sans text-text-primary">

      {/* ═══ VIGNETTE OVERLAYS ═══ */}
      {/* Red vignette — intensity scales with fragment count */}
      <div className="absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000"
        style={{
          opacity: isActive ? 0.3 + cascadeIntensity * 0.7 : 0,
          boxShadow: "inset 0 0 200px rgba(239,68,68,0.2), inset 0 0 80px rgba(239,68,68,0.1)",
        }} />

      {/* ═══ GLOBE — FULL SCREEN ═══ */}
      <Globe3D
        satellites={[]}
        constellation={[]}
        debrisFragments={fragments}
        kesslerMode={isActive}
        showPaths={false}
        showGrid={true}
        showAtmosphere
        showGroundTracks={false}
        className="absolute inset-0"
      />

      {/* ═══ IMPACT FLASH ═══ */}
      <AnimatePresence>
        {impactFlash && (
          <motion.div key="flash" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 1.5 }}
            className="absolute inset-0 z-[35] pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,140,0,0.7) 0%, rgba(255,80,0,0.4) 30%, transparent 65%)" }} />
        )}
      </AnimatePresence>

      {/* ═══ FLOATING HEADER BAR ═══ */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="absolute top-4 left-20 right-4 z-20">
        <div className="glass-surface rounded-2xl px-5 py-3 shadow-2xl shadow-black/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame size={18} className={isActive ? "text-status-critical animate-pulse" : "text-text-tertiary"} />
            <div>
              <h1 className="text-[14px] font-bold tracking-tight">Kessler Cascade Simulator</h1>
              <p className="text-[9px] text-text-tertiary font-mono">NASA SBAM v4.0 · Johnson 2001 · J2+Drag Propagation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {simStats && (
              <span className="text-[10px] text-text-tertiary font-mono">
                Step {simStats.elapsed_steps}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-[6px] h-[6px] rounded-full ${wsColor} ${wsStatus === "open" ? "" : "animate-pulse"}`} />
              <span className="text-[10px] font-mono text-text-tertiary">{wsStatus.toUpperCase()}</span>
            </div>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ IDLE STATE — CENTER CTA ═══ */}
      <AnimatePresence>
        {phase === "idle" && fragmentCount === 0 && (
          <motion.div key="idle-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center pointer-events-auto">
              <div className="w-20 h-20 rounded-full border border-white/[0.08] bg-surface-elevated/50 flex items-center justify-center mx-auto mb-6">
                <Crosshair size={36} className="text-text-tertiary/60" />
              </div>
              <p className="text-[14px] text-text-secondary mb-1">Configure parameters & trigger a collision</p>
              <p className="text-[11px] text-text-tertiary">to simulate the Kessler cascade effect</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ARMING OVERLAY ═══ */}
      <AnimatePresence>
        {phase === "arming" && (
          <motion.div key="arming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[30] flex items-center justify-center"
            style={{ background: "rgba(2,8,23,0.85)" }}>
            {/* Scan lines */}
            <div className="absolute inset-0 pointer-events-none opacity-15"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.06) 2px, rgba(239,68,68,0.06) 4px)", backgroundSize: "100% 4px" }} />

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center relative z-10 max-w-md">
              {/* Target reticle */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-2 border-status-critical/40 animate-pulse" />
                <div className="absolute inset-3 rounded-full border border-status-critical/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target size={40} className="text-status-critical" />
                </div>
                {/* Rotating ring */}
                <div className="absolute inset-[-4px] rounded-full border border-dashed border-status-critical/30 animate-[spin_3s_linear_infinite]" />
              </div>

              <div className="text-[10px] font-bold text-status-critical tracking-[0.3em] mb-3 animate-pulse">
                INITIATING COLLISION EVENT
              </div>

              <div className="text-[13px] text-text-secondary mb-2">
                Target: <span className="text-text-primary font-bold">{config.target}</span>
              </div>
              <div className="text-[12px] text-text-tertiary mb-8">
                {config.projectile_mass_kg} kg at {config.relative_velocity_km_s} km/s
              </div>

              {/* Progress bar */}
              <div className="w-64 mx-auto mb-6">
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full"
                    style={{ width: `${armingProgress * 100}%` }}
                    transition={{ duration: 0.05 }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-mono">
                  <span className="text-status-critical">{Math.floor((1 - armingProgress) * 3)}s</span>
                  <span className="text-text-tertiary">ARMING</span>
                </div>
              </div>

              <button onClick={cancelArming}
                className="px-6 py-2.5 rounded-xl text-[12px] font-medium text-text-tertiary border border-white/[0.08] hover:border-white/20 hover:text-text-primary transition-all">
                Cancel (ESC)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONFIG PANEL — LEFT SIDE ═══ */}
      <AnimatePresence>
        {phase !== "arming" && (
          <motion.div key="config"
            initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-20 bottom-6 z-20 w-72">
            <div className="glass-surface rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Panel header — clickable to collapse */}
              <button onClick={() => setShowConfig(c => !c)}
                className="w-full flex items-center justify-between px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-text-tertiary" />
                  <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider">Parameters</span>
                </div>
                {showConfig ? <ChevronDown size={12} className="text-text-tertiary" /> : <ChevronUp size={12} className="text-text-tertiary" />}
              </button>

              <AnimatePresence>
                {showConfig && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="px-5 py-4 space-y-4">
                      {/* Target selector */}
                      <div>
                        <span className="text-[11px] text-text-secondary font-medium block mb-1.5">Target Object</span>
                        <select value={config.target}
                          onChange={(e) => setConfig((c) => ({ ...c, target: e.target.value }))}
                          disabled={phase === "cascade"}
                          className="w-full bg-surface-elevated border border-white/[0.06] rounded-xl px-3 py-2.5 text-[12px] text-text-primary focus:border-accent-blue outline-none disabled:opacity-40 transition-colors">
                          {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.alt}</option>)}
                        </select>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-text-tertiary font-mono">{targetInfo.type}</span>
                          <span className="w-px h-2.5 bg-divider" />
                          <span className="text-[9px] text-text-tertiary font-mono">{targetInfo.alt}</span>
                        </div>
                      </div>

                      {/* Mass slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] text-text-secondary font-medium">Projectile Mass</span>
                          <span className="text-[11px] text-text-primary font-mono font-bold">{config.projectile_mass_kg.toLocaleString()} kg</span>
                        </div>
                        <input type="range" min="10" max="5000" step="10"
                          value={config.projectile_mass_kg}
                          onChange={(e) => setConfig((c) => ({ ...c, projectile_mass_kg: +e.target.value }))}
                          disabled={phase === "cascade"}
                          className="w-full accent-accent-blue disabled:opacity-40" />
                        <div className="flex justify-between text-[9px] text-text-tertiary font-mono mt-0.5">
                          <span>10 kg</span><span>5,000 kg</span>
                        </div>
                      </div>

                      {/* Velocity slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] text-text-secondary font-medium">Relative Velocity</span>
                          <span className="text-[11px] text-text-primary font-mono font-bold">{config.relative_velocity_km_s} km/s</span>
                        </div>
                        <input type="range" min="0.5" max="15" step="0.1"
                          value={config.relative_velocity_km_s}
                          onChange={(e) => setConfig((c) => ({ ...c, relative_velocity_km_s: +e.target.value }))}
                          disabled={phase === "cascade"}
                          className="w-full accent-accent-blue disabled:opacity-40" />
                        <div className="flex justify-between text-[9px] text-text-tertiary font-mono mt-0.5">
                          <span>0.5 km/s</span><span>15 km/s</span>
                        </div>
                      </div>

                      {/* Estimated impact energy */}
                      <div className="px-3 py-2.5 bg-surface-elevated/50 rounded-lg border border-white/[0.04]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-text-tertiary">Impact Energy</span>
                          <span className="text-status-warning font-mono font-bold">
                            {(0.5 * config.projectile_mass_kg * Math.pow(config.relative_velocity_km_s * 1000, 2) / 1e6).toFixed(1)} MJ
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="text-text-tertiary">Est. Fragments</span>
                          <span className="text-status-critical font-mono font-bold">
                            ~{Math.round(0.1 * Math.pow(config.projectile_mass_kg, 0.75) * 100).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="px-5 py-3 border-t border-white/[0.04]">
                {phase === "idle" ? (
                  <button onClick={startArming}
                    className="w-full py-3 rounded-xl font-semibold text-[13px] btn-primary flex items-center justify-center gap-2
                      shadow-[0_4px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.35)]
                      !bg-gradient-to-r !from-red-600 !to-orange-600 hover:!from-red-500 hover:!to-orange-500 transition-all">
                    <Flame size={16} /> Trigger Collision
                  </button>
                ) : phase === "cascade" ? (
                  <div className="flex gap-2">
                    <button onClick={handleStop}
                      className="flex-1 py-3 rounded-xl font-semibold text-[12px] bg-surface-elevated border border-status-critical/30 text-status-critical hover:bg-status-critical/10 transition-all flex items-center justify-center gap-2">
                      <Square size={12} /> Stop
                    </button>
                    {solutions.length === 0 && (
                      <button onClick={fetchSolutions}
                        className="px-4 py-3 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success hover:bg-status-success/20 transition-all flex items-center gap-2 text-[12px] font-medium">
                        <Zap size={14} /> Solutions
                      </button>
                    )}
                    {solutions.length > 0 && (
                      <button onClick={() => setShowSolutions(s => !s)}
                        className="px-4 py-3 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success hover:bg-status-success/20 transition-all flex items-center gap-2 text-[12px] font-medium">
                        <Shield size={14} /> {showSolutions ? "Hide" : "View"}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LIVE STATS PANEL — RIGHT ═══ */}
      <AnimatePresence>
        {isActive && simStats && (
          <motion.div key="stats"
            initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-4 top-20 z-20 w-64">
            <div className={`glass-surface rounded-2xl p-5 shadow-2xl shadow-black/50 border ${cascadeIntensity > 0.5 ? "border-status-critical/30" : "border-white/[0.06]"}`}>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-status-critical mb-4 flex items-center gap-2">
                <AlertTriangle size={11} className="animate-pulse" /> Cascade Statistics
              </h3>

              {/* Big fragment counter */}
              <div className="text-center mb-4">
                <div className="text-[38px] font-bold font-mono tabular-nums text-status-critical leading-none">
                  {(simStats.total_fragments ?? fragmentCount).toLocaleString()}
                </div>
                <div className="text-[10px] text-text-tertiary mt-1">total fragments generated</div>
                <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden mt-3">
                  <motion.div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 rounded-full"
                    animate={{ width: `${cascadeIntensity * 100}%` }}
                    transition={{ duration: 0.5 }} />
                </div>
              </div>

              <div className="space-y-2.5 text-[11px]">
                {[
                  ["Active", simStats.active_fragments?.toLocaleString() ?? "—", "text-status-warning"],
                  ["Cascade Events", simStats.total_cascade_events?.toLocaleString() ?? "—", "text-accent-blue"],
                  ["Max Generation", simStats.max_generation ?? 0, "text-accent-teal"],
                  ["Elapsed Steps", simStats.elapsed_steps ?? 0, "text-text-secondary"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-text-tertiary">{label}</span>
                    <span className={`font-mono font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Zone density */}
              {simStats.zone_density && Object.keys(simStats.zone_density).length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-2">Altitude Distribution</div>
                  <div className="space-y-1.5">
                    {Object.entries(simStats.zone_density)
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([zone, count]) => (
                        <ZoneDensityBar key={zone} zone={zone} count={count} maxCount={maxZoneCount} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ EVENT FEED — BOTTOM RIGHT ═══ */}
      <AnimatePresence>
        {isActive && cascadeEvents.length > 0 && showEvents && (
          <motion.div key="events"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="absolute right-4 bottom-6 z-20 w-64">
            <div className="glass-surface rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Radio size={10} className="text-status-critical animate-pulse" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Live Feed</span>
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">{cascadeEvents.length}</span>
              </div>
              <div className="px-4 py-3 space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                <AnimatePresence>
                  {cascadeEvents.slice(0, 20).map((ev, i) => (
                    <motion.div key={`${ev.timestamp}-${i}`}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12 }}
                      className="flex gap-1.5 items-center text-[10px] font-mono py-0.5">
                      <span className="w-[5px] h-[5px] rounded-full bg-status-critical/60 shrink-0" />
                      <span className="text-status-critical font-bold shrink-0">G{ev.generation}</span>
                      <span className="text-text-tertiary truncate flex-1">{ev.victim_satellite || ev.target}</span>
                      <span className="text-status-warning shrink-0">+{(ev.new_fragments || ev.fragments_generated || 0)}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SOLUTIONS OVERLAY ═══ */}
      <AnimatePresence>
        {showSolutions && solutions.length > 0 && (
          <motion.div key="solutions-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[25] flex items-center justify-center"
            style={{ background: "rgba(2,8,23,0.8)" }}
            onClick={() => setShowSolutions(false)}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl w-full px-6"
              onClick={(e) => e.stopPropagation()}>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-success/10 border border-status-success/20 text-[10px] font-bold text-status-success tracking-widest mb-4">
                  <ShieldAlert size={12} /> COUNTERMEASURES COMPUTED
                </div>
                <h2 className="text-[28px] font-bold text-white tracking-tight mb-2">Hohmann Deorbit Solutions</h2>
                <p className="text-[13px] text-text-secondary">Optimal ΔV burns to clear debris from critical orbital zones</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-hide">
                {solutions.map((sol, i) => (
                  <SolutionCard key={`${sol.zone}-${i}`} sol={sol} index={i} />
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-4 mt-6">
                <button onClick={fetchSolutions}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-status-success border border-status-success/20 hover:bg-status-success/10 transition-all">
                  <Zap size={13} /> Recalculate
                </button>
                <button onClick={() => setShowSolutions(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-medium text-text-tertiary border border-white/[0.08] hover:border-white/20 hover:text-text-primary transition-all">
                  Close (S)
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PHYSICS MODEL BADGE ═══ */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-3 text-[9px] text-text-tertiary/50 font-mono">
          <span>N = 0.1·M⁰·⁷⁵·Lc⁻¹·⁷¹</span>
          <span className="w-px h-2.5 bg-white/[0.04]" />
          <span>J2 + Exp. Drag</span>
          <span className="w-px h-2.5 bg-white/[0.04]" />
          <span>Hansen 2006 ΔV</span>
        </div>
      </div>

      {/* ═══ KEYBOARD HINTS ═══ */}
      {phase === "idle" && fragmentCount === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="absolute bottom-6 right-4 z-10 flex items-center gap-4 text-[9px] text-text-tertiary/40 font-mono">
          <span>R reset</span>
          <span>S solutions</span>
          <span>ESC cancel</span>
        </motion.div>
      )}
    </div>
  );
}
