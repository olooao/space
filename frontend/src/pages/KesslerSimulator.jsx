/**
 * KesslerSimulator.jsx — Full-page Kessler cascade simulation interface.
 *
 * Left: Large Three.js globe showing debris fragments in real-time
 * Right: Control panel with simulation parameters, stats, countermeasures, event log
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

// ---- Subcomponents ----

function StatBlock({ label, value, color = "text-slate-100" }) {
  return (
    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xl font-black font-mono ${color}`}>{value ?? "—"}</span>
    </div>
  );
}

function ZoneDensityBar({ zone, count, maxCount }) {
  const pct = maxCount > 0 ? Math.min((count / maxCount) * 100, 100) : 0;
  const color = pct > 70 ? "from-red-500 to-red-400"
              : pct > 40 ? "from-amber-500 to-amber-400"
              : "from-cyan-700 to-cyan-500";
  return (
    <div className="flex items-center gap-2.5 text-[10px] font-mono">
      <span className="text-slate-500 w-28 shrink-0 truncate">{zone}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-10 text-right ${pct > 70 ? "text-red-400" : "text-slate-400"}`}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function SolutionCard({ sol }) {
  const priorityStyles = {
    CRITICAL: "border-red-600/50 bg-red-950/30 text-red-400",
    HIGH:     "border-amber-600/50 bg-amber-950/20 text-amber-400",
    MEDIUM:   "border-emerald-700/50 bg-emerald-950/20 text-emerald-400",
  };
  return (
    <div className={`border rounded-xl p-3 ${priorityStyles[sol.priority] || priorityStyles.MEDIUM}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-[10px] font-mono font-bold">{sol.zone}</span>
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
          sol.priority === "CRITICAL" ? "border-red-600/60 bg-red-600/20"
          : sol.priority === "HIGH" ? "border-amber-600/60 bg-amber-600/20"
          : "border-emerald-600/60 bg-emerald-600/20"
        }`}>
          {sol.priority}
        </span>
      </div>
      <p className="text-[11px] text-slate-300">
        Deorbit burn: <strong className="text-white">{sol.delta_v_m_s} m/s</strong>
        {" "}→ {sol.target_altitude_km} km
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">
        {sol.fragment_count.toLocaleString()} fragments · ~{sol.estimated_clearance_years}yr clearance
      </p>
    </div>
  );
}

function CascadeEventRow({ event, index }) {
  return (
    <motion.div
      key={`${event.timestamp}-${index}`}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2 items-start text-[10px] font-mono border-l-2 border-red-500/40 pl-2 py-0.5"
    >
      <span className="text-red-400 font-bold shrink-0">GEN {event.generation}</span>
      <span className="text-slate-300 truncate flex-1">
        {event.victim_satellite || event.target}
      </span>
      <span className="text-amber-400 shrink-0">+{(event.new_fragments || event.fragments_generated || 0).toLocaleString()}</span>
    </motion.div>
  );
}

// ---- Main Page ----

const TARGET_OPTIONS = [
  "ISS (ZARYA)",
  "TIANGONG (CSS)",
  "HST",
  "STARLINK-1007",
  "NOAA 19",
];

export default function KesslerSimulator() {
  const fragments = useAppStore((s) => s.fragments);
  const cascadeEvents = useAppStore((s) => s.cascadeEvents);
  const clearCascade = useAppStore((s) => s.clearCascade);

  const { simStats, solutions, wsStatus, triggerCascade, stopCascade, fetchSolutions } =
    useKessler(true);

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
      // Auto-fetch solutions after 10 seconds
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

  // Compute max zone count for bar scaling
  const maxZoneCount = simStats?.zone_density
    ? Math.max(...Object.values(simStats.zone_density), 1)
    : 1;

  const wsColor =
    wsStatus === "open"       ? "text-emerald-400" :
    wsStatus === "connecting"  ? "text-amber-400" :
    wsStatus === "error"       ? "text-red-400"
                               : "text-slate-500";

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">

      {/* ---- Header ---- */}
      <header className="h-14 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Flame size={20} className={isRunning ? "text-red-500 animate-pulse" : "text-slate-500"} />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">
              Kessler Cascade Simulator
            </h1>
            <p className="text-[9px] text-slate-500 font-mono">
              NASA Standard Breakup Model v4.0 · Johnson 2001 · Real orbital mechanics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className={wsColor}>
            WS: {wsStatus.toUpperCase()}
          </span>
          {simStats && (
            <span className="text-slate-500">
              STEP {simStats.elapsed_steps}
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors"
          >
            <RotateCcw size={12} /> RESET
          </button>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="flex flex-1 overflow-hidden">

        {/* Globe — takes available width */}
        <div className="flex-1 relative">
          <Globe3D
            satellites={[]}
            constellation={[]}
            debrisFragments={fragments}
            kesslerMode={isRunning || fragments.length > 0}
            className="w-full h-full"
          />

          {/* Info overlay on globe */}
          {!isRunning && fragments.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Flame size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-mono text-sm">
                  Configure parameters and trigger a collision
                </p>
                <p className="text-slate-700 font-mono text-xs mt-1">
                  to begin the Kessler cascade simulation
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ---- Control Sidebar ---- */}
        <aside className="w-96 border-l border-white/5 bg-slate-950/80 backdrop-blur flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

            {/* PARAMETERS */}
            <section>
              <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={10} /> SIMULATION PARAMETERS
              </h2>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] text-slate-400 font-mono">Target Object</span>
                  <select
                    value={config.target}
                    onChange={(e) => setConfig((c) => ({ ...c, target: e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500/50 outline-none disabled:opacity-50"
                  >
                    {TARGET_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Projectile Mass</span>
                    <span className="text-[10px] text-amber-400 font-mono">{config.projectile_mass_kg} kg</span>
                  </div>
                  <input
                    type="range"
                    min="10" max="5000" step="10"
                    value={config.projectile_mass_kg}
                    onChange={(e) => setConfig((c) => ({ ...c, projectile_mass_kg: +e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 accent-red-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>10 kg</span><span>5000 kg</span>
                  </div>
                </label>

                <label className="block">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Relative Velocity</span>
                    <span className="text-[10px] text-amber-400 font-mono">{config.relative_velocity_km_s} km/s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5" max="15" step="0.1"
                    value={config.relative_velocity_km_s}
                    onChange={(e) => setConfig((c) => ({ ...c, relative_velocity_km_s: +e.target.value }))}
                    disabled={isRunning}
                    className="w-full mt-1.5 accent-red-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>0.5 km/s</span><span>15 km/s</span>
                  </div>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={isRunning ? handleStop : handleTrigger}
                  className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isRunning
                      ? "bg-slate-800 border border-red-500/40 text-red-400 hover:bg-red-950/40"
                      : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.35)]"
                  }`}
                >
                  {isRunning ? (
                    <><Square size={12} /> STOP CASCADE</>
                  ) : (
                    <><Flame size={14} /> TRIGGER COLLISION</>
                  )}
                </button>

                {solutions.length === 0 && isRunning && (
                  <button
                    onClick={fetchSolutions}
                    className="px-3 py-3 rounded-xl bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs hover:bg-emerald-900/50 transition-all"
                    title="Compute countermeasures"
                  >
                    <Zap size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* LIVE STATISTICS */}
            {simStats && (
              <section>
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle size={10} /> CASCADE STATISTICS
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatBlock
                    label="Total Fragments"
                    value={simStats.total_fragments?.toLocaleString()}
                    color="text-red-400"
                  />
                  <StatBlock
                    label="Active"
                    value={simStats.active_fragments?.toLocaleString()}
                    color="text-amber-400"
                  />
                  <StatBlock
                    label="Cascade Events"
                    value={simStats.total_cascade_events?.toLocaleString()}
                    color="text-orange-400"
                  />
                  <StatBlock
                    label="Max Generation"
                    value={simStats.max_generation ?? 0}
                    color="text-purple-400"
                  />
                </div>
              </section>
            )}

            {/* ALTITUDE ZONE DENSITY */}
            {simStats?.zone_density && (
              <section>
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
                  ALTITUDE ZONE DENSITY
                </h2>
                <div className="space-y-2">
                  {Object.entries(simStats.zone_density)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([zone, count]) => (
                      <ZoneDensityBar
                        key={zone}
                        zone={zone}
                        count={count}
                        maxCount={maxZoneCount}
                      />
                    ))}
                  {Object.values(simStats.zone_density).every((c) => c === 0) && (
                    <p className="text-[10px] text-slate-600 font-mono">
                      No fragments in tracked zones yet…
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* COUNTERMEASURE SOLUTIONS */}
            {solutions.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldAlert size={10} /> COUNTERMEASURES
                </h2>
                <div className="space-y-2">
                  {solutions.map((sol, i) => (
                    <SolutionCard key={`${sol.zone}-${i}`} sol={sol} />
                  ))}
                </div>
                <button
                  onClick={fetchSolutions}
                  className="w-full mt-3 py-2 rounded-lg text-[10px] font-mono text-emerald-500 border border-emerald-900/50 hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Zap size={10} /> RECALCULATE SOLUTIONS
                </button>
              </section>
            )}

            {/* CASCADE EVENT LOG */}
            {cascadeEvents.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ChevronRight size={10} /> CASCADE EVENT LOG
                  <span className="text-slate-600">({cascadeEvents.length})</span>
                </h2>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  <AnimatePresence>
                    {cascadeEvents.slice(0, 30).map((ev, i) => (
                      <CascadeEventRow key={`${ev.timestamp}-${i}`} event={ev} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Physics notes */}
            <section className="pb-4">
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-1.5">
                <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest mb-2">Physics Model</p>
                {[
                  "Fragment count: N = 0.1 × M^0.75 × Lc^-1.71",
                  "Char. length: power-law CDF (min 10cm)",
                  "A/m ratio: log-normal (SBAM Table 2)",
                  "ΔV: Hansen 2006 log-normal distribution",
                  "Propagation: J2 + exponential drag model",
                  "Cascade threshold: 0.5km miss distance",
                ].map((note) => (
                  <p key={note} className="text-[9px] text-slate-500 font-mono">{note}</p>
                ))}
              </div>
            </section>

          </div>
        </aside>
      </div>
    </div>
  );
}
