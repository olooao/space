/**
 * KesslerSimulator.jsx — Full-page Kessler cascade simulation interface.
 * Restyled for the professional design system.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, AlertTriangle, Activity, Zap,
  ShieldAlert, ChevronRight, RotateCcw, Square
} from "lucide-react";
import Globe3D from "../components/Globe3D";
import { useKessler } from "../hooks/useKessler";
import { useAppStore } from "../store/appStore";

function StatBlock({ label, value, color = "text-text-primary" }) {
  return (
    <div className="bg-surface-elevated border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1">
      <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</span>
      <span className={`text-[18px] font-bold font-mono ${color}`}>{value ?? "—"}</span>
    </div>
  );
}

function ZoneDensityBar({ zone, count, maxCount }) {
  const pct = maxCount > 0 ? Math.min((count / maxCount) * 100, 100) : 0;
  const color = pct > 70 ? "bg-status-critical" : pct > 40 ? "bg-status-warning" : "bg-accent-blue";
  return (
    <div className="flex items-center gap-2.5 text-[11px]">
      <span className="text-text-tertiary w-28 shrink-0 truncate font-mono">{zone}</span>
      <div className="flex-1 h-1.5 bg-surface-bg rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-10 text-right font-mono ${pct > 70 ? "text-status-critical" : "text-text-secondary"}`}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function SolutionCard({ sol }) {
  const styles = {
    CRITICAL: "border-status-critical/20 bg-status-critical/[0.06] text-status-critical",
    HIGH: "border-status-warning/20 bg-status-warning/[0.06] text-status-warning",
    MEDIUM: "border-status-success/20 bg-status-success/[0.06] text-status-success",
  };
  return (
    <div className={`border rounded-xl p-3 ${styles[sol.priority] || styles.MEDIUM}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-[11px] font-mono font-bold">{sol.zone}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06]">{sol.priority}</span>
      </div>
      <p className="text-[12px] text-text-secondary">
        Deorbit: <strong className="text-text-primary">{sol.delta_v_m_s} m/s</strong> → {sol.target_altitude_km} km
      </p>
      <p className="text-[11px] text-text-tertiary mt-0.5">
        {sol.fragment_count.toLocaleString()} fragments · ~{sol.estimated_clearance_years}yr
      </p>
    </div>
  );
}

function CascadeEventRow({ event, index }) {
  return (
    <motion.div
      key={`${event.timestamp}-${index}`}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-2 items-start text-[11px] font-mono border-l-2 border-status-critical/30 pl-2 py-0.5"
    >
      <span className="text-status-critical font-bold shrink-0">GEN {event.generation}</span>
      <span className="text-text-secondary truncate flex-1">{event.victim_satellite || event.target}</span>
      <span className="text-status-warning shrink-0">+{(event.new_fragments || event.fragments_generated || 0).toLocaleString()}</span>
    </motion.div>
  );
}

const TARGET_OPTIONS = ["ISS (ZARYA)", "TIANGONG (CSS)", "HST", "STARLINK-1007", "NOAA 19"];

export default function KesslerSimulator() {
  const fragments = useAppStore((s) => s.fragments);
  const cascadeEvents = useAppStore((s) => s.cascadeEvents);
  const clearCascade = useAppStore((s) => s.clearCascade);

  const { simStats, solutions, wsStatus, triggerCascade, stopCascade, fetchSolutions } = useKessler(true);

  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState({
    target: "ISS (ZARYA)",
    projectile_mass_kg: 900,
    relative_velocity_km_s: 10.2,
  });

  const handleTrigger = useCallback(async () => {
    try {
      setIsRunning(true);
      await triggerCascade(config);
      setTimeout(fetchSolutions, 10000);
    } catch (err) {
      console.error("Trigger failed:", err);
      setIsRunning(false);
    }
  }, [config, triggerCascade, fetchSolutions]);

  const handleStop = useCallback(async () => {
    await stopCascade();
    setIsRunning(false);
  }, [stopCascade]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    clearCascade();
  }, [clearCascade]);

  const maxZoneCount = simStats?.zone_density ? Math.max(...Object.values(simStats.zone_density), 1) : 1;

  const wsColor =
    wsStatus === "open" ? "text-status-success" :
      wsStatus === "connecting" ? "text-status-warning" :
        wsStatus === "error" ? "text-status-critical" : "text-text-tertiary";

  return (
    <div className="flex flex-col h-full bg-surface-bg text-text-primary overflow-hidden font-sans pl-16">

      {/* Header */}
      <header className="h-14 border-b border-divider flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Flame size={18} className={isRunning ? "text-status-critical animate-pulse" : "text-text-tertiary"} />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight">Kessler Cascade Simulator</h1>
            <p className="text-[10px] text-text-tertiary">NASA Breakup Model v4.0 · Johnson 2001</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className={wsColor + " font-mono font-medium"}>
            {wsStatus.toUpperCase()}
          </span>
          {simStats && <span className="text-text-tertiary font-mono">Step {simStats.elapsed_steps}</span>}
          <button onClick={handleReset} className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary transition-colors">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Globe */}
        <div className="flex-1 relative">
          <Globe3D
            satellites={[]}
            constellation={[]}
            debrisFragments={fragments}
            kesslerMode={isRunning || fragments.length > 0}
            className="w-full h-full"
          />

          {!isRunning && fragments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Flame size={40} className="mx-auto mb-4 text-text-tertiary/50" />
                <p className="text-text-secondary text-[13px]">Configure parameters and trigger a collision</p>
                <p className="text-text-tertiary text-[11px] mt-1">to begin the cascade simulation</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-[360px] border-l border-divider bg-surface-panel/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-hide">

            {/* Parameters */}
            <section>
              <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={11} /> Parameters
              </h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[12px] text-text-secondary font-medium">Target Object</span>
                  <select
                    value={config.target}
                    onChange={(e) => setConfig((c) => ({ ...c, target: e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 bg-surface-elevated border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] text-text-primary focus:border-accent-blue outline-none disabled:opacity-50 transition-colors"
                  >
                    {TARGET_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>

                <label className="block">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-text-secondary font-medium">Projectile Mass</span>
                    <span className="text-[11px] text-text-primary font-mono">{config.projectile_mass_kg} kg</span>
                  </div>
                  <input
                    type="range" min="10" max="5000" step="10"
                    value={config.projectile_mass_kg}
                    onChange={(e) => setConfig((c) => ({ ...c, projectile_mass_kg: +e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 accent-accent-blue disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] text-text-secondary font-medium">Relative Velocity</span>
                    <span className="text-[11px] text-text-primary font-mono">{config.relative_velocity_km_s} km/s</span>
                  </div>
                  <input
                    type="range" min="0.5" max="15" step="0.1"
                    value={config.relative_velocity_km_s}
                    onChange={(e) => setConfig((c) => ({ ...c, relative_velocity_km_s: +e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 accent-accent-blue disabled:opacity-50"
                  />
                </label>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={isRunning ? handleStop : handleTrigger}
                  className={`flex-1 py-3 rounded-xl font-semibold text-[12px] transition-all flex items-center justify-center gap-2 ${isRunning
                      ? "bg-surface-elevated border border-status-critical/30 text-status-critical hover:bg-status-critical/10"
                      : "btn-primary"
                    }`}
                >
                  {isRunning ? (<><Square size={12} /> Stop</>) : (<><Flame size={14} /> Trigger Collision</>)}
                </button>

                {solutions.length === 0 && isRunning && (
                  <button onClick={fetchSolutions} className="px-3 py-3 rounded-xl bg-status-success/10 border border-status-success/20 text-status-success hover:bg-status-success/20 transition-all" title="Compute countermeasures">
                    <Zap size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* Stats */}
            {simStats && (
              <section>
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle size={11} /> Statistics
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatBlock label="Total Fragments" value={simStats.total_fragments?.toLocaleString()} color="text-status-critical" />
                  <StatBlock label="Active" value={simStats.active_fragments?.toLocaleString()} color="text-status-warning" />
                  <StatBlock label="Cascade Events" value={simStats.total_cascade_events?.toLocaleString()} color="text-accent-blue" />
                  <StatBlock label="Max Generation" value={simStats.max_generation ?? 0} color="text-accent-teal" />
                </div>
              </section>
            )}

            {/* Zone Density */}
            {simStats?.zone_density && (
              <section>
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4">Altitude Density</h2>
                <div className="space-y-2">
                  {Object.entries(simStats.zone_density)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([zone, count]) => (
                      <ZoneDensityBar key={zone} zone={zone} count={count} maxCount={maxZoneCount} />
                    ))}
                </div>
              </section>
            )}

            {/* Solutions */}
            {solutions.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldAlert size={11} /> Countermeasures
                </h2>
                <div className="space-y-2">
                  {solutions.map((sol, i) => <SolutionCard key={`${sol.zone}-${i}`} sol={sol} />)}
                </div>
                <button onClick={fetchSolutions} className="w-full mt-3 py-2 rounded-lg text-[11px] font-medium text-status-success border border-status-success/20 hover:bg-status-success/10 transition-all flex items-center justify-center gap-1.5">
                  <Zap size={11} /> Recalculate
                </button>
              </section>
            )}

            {/* Event Log */}
            {cascadeEvents.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChevronRight size={11} /> Event Log <span className="text-text-tertiary">({cascadeEvents.length})</span>
                </h2>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                  <AnimatePresence>
                    {cascadeEvents.slice(0, 30).map((ev, i) => (
                      <CascadeEventRow key={`${ev.timestamp}-${i}`} event={ev} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Physics Notes */}
            <section className="pb-4">
              <div className="bg-surface-elevated border border-white/[0.04] rounded-xl p-4">
                <p className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mb-2">Physics Model</p>
                {[
                  "Fragment count: N = 0.1 × M^0.75 × Lc^-1.71",
                  "Char. length: power-law CDF (min 10cm)",
                  "A/m ratio: log-normal (SBAM Table 2)",
                  "ΔV: Hansen 2006 log-normal distribution",
                  "Propagation: J2 + exponential drag model",
                  "Cascade threshold: 0.5km miss distance",
                ].map((note) => (
                  <p key={note} className="text-[10px] text-text-tertiary font-mono">{note}</p>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
