import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api";
import { SATELLITE_DATABASE, CONSTELLATIONS, ORBIT_REGIMES, generateMockAlerts, generateDemoPositions } from "../data/satellites";

import Globe3D from "../components/Globe3D";
import TopStatusBar from "../components/TopStatusBar";
import BottomTelemetryBar from "../components/BottomTelemetryBar";
import RightControlPanel from "../components/RightControlPanel";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ArrowRight, Satellite, AlertTriangle, Radio, Shield, Activity, Zap, Globe, ChevronRight, X } from "lucide-react";

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function AnimatedCount({ value, duration = 1.5 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value) || 0;
    const start = display;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = (now - startTime) / (duration * 1000);
      if (elapsed >= 1) { setDisplay(target); return; }
      const ease = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(start + diff * ease));
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

/* ═══════════════════════════════════════════
   STAT CARD (Top floating cards)
   ═══════════════════════════════════════════ */
function StatCard({ icon: Icon, label, value, suffix, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-surface rounded-2xl px-4 py-3.5 min-w-[140px] pointer-events-auto"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={13} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="text-[11px] text-text-tertiary font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[22px] font-bold text-text-primary tabular-nums tracking-tight">
          {typeof value === 'number' ? <AnimatedCount value={value} /> : value}
        </span>
        {suffix && <span className="text-[11px] text-text-tertiary">{suffix}</span>}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   CONJUNCTION ALERT CARD
   ═══════════════════════════════════════════ */
function AlertCard({ alert, index, onSelect }) {
  const risk = parseFloat(alert.probability);
  const riskColor = risk > 60 ? 'text-status-critical' : risk > 30 ? 'text-status-warning' : 'text-accent-blue';
  const riskBg = risk > 60 ? 'bg-status-critical/10 border-status-critical/20' : risk > 30 ? 'bg-status-warning/10 border-status-warning/20' : 'bg-accent-blue/[0.06] border-accent-blue/20';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => onSelect(alert.primary)}
      className="p-3 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-all group border border-transparent hover:border-white/[0.06]"
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className={riskColor} />
          <span className="text-[12px] font-semibold text-text-primary group-hover:text-white transition-colors">{alert.primary}</span>
        </div>
        <span className={`text-[11px] font-bold ${riskColor} px-2 py-0.5 rounded-md border ${riskBg}`}>
          {alert.probability}%
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-text-tertiary">
        <span>vs {alert.secondary}</span>
        <span>·</span>
        <span>{alert.missDistance} km</span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   SATELLITE LIST PANEL (Bottom Left)
   ═══════════════════════════════════════════ */
function SatellitePanel({ satellites, selectedName, onSelect, regimeFilter, onRegimeFilter }) {
  const filtered = regimeFilter
    ? satellites.filter(s => s.regime === regimeFilter)
    : satellites;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      className="absolute bottom-24 left-20 z-20 pointer-events-auto w-[280px] max-h-[360px]"
    >
      <div className="glass-surface rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite size={14} className="text-accent-blue" />
            <span className="text-[13px] font-semibold text-text-primary">Tracked Objects</span>
          </div>
          <span className="text-[11px] text-text-tertiary font-mono">{filtered.length}</span>
        </div>

        {/* Regime Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-divider">
          <button
            onClick={() => onRegimeFilter(null)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${!regimeFilter ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            ALL
          </button>
          {Object.keys(ORBIT_REGIMES).map(r => (
            <button
              key={r}
              onClick={() => onRegimeFilter(regimeFilter === r ? null : r)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${regimeFilter === r ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Satellite List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide max-h-[220px]">
          {filtered.map((sat, i) => {
            const statusColor = sat.status === 'operational' ? 'bg-status-success'
              : sat.status === 'debris' ? 'bg-status-critical'
                : 'bg-status-warning';

            return (
              <div
                key={sat.name}
                onClick={() => onSelect(sat.name)}
                className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-all border-l-2 ${selectedName === sat.name
                  ? 'bg-accent-blue/[0.08] border-l-accent-blue'
                  : 'border-l-transparent hover:bg-white/[0.02]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${statusColor}`} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-text-primary truncate">{sat.name}</div>
                    <div className="text-[10px] text-text-tertiary">{sat.type} · {sat.altitude} km</div>
                  </div>
                </div>
                <span className="text-[10px] text-text-tertiary shrink-0 ml-2">{sat.regime}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const [satellites, setSatellites] = useState([]);
  const [activeAssets, setActiveAssets] = useState([]);
  const [selectedSat, setSelectedSat] = useState("ISS (ZARYA)");
  const [regimeFilter, setRegimeFilter] = useState(null);

  const [constellation, setConstellation] = useState(null);
  const [constellationData, setConstellationData] = useState([]);
  const [isKessler, setIsKessler] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const searchResultsRef = useRef(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);

  const satDb = useMemo(() => SATELLITE_DATABASE, []);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
      if (e.key === "/" && !e.ctrlKey) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(''); }
      if (e.key === "l" && !e.ctrlKey && !e.metaKey) setIsLive(prev => !prev);
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) setIsDemoMode(prev => !prev);
      if (e.key === "a" && !e.ctrlKey && !e.metaKey) setShowAlerts(prev => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Data Init ───
  useEffect(() => {
    if (isDemoMode) {
      setSatellites(satDb.map(s => s.name));
      setAlerts(generateMockAlerts());
    } else {
      axios.get(API_ENDPOINTS.satellites)
        .then(res => setSatellites(res.data.satellites || []))
        .catch(() => setSatellites(satDb.map(s => s.name)));

      axios.get(API_ENDPOINTS.alertFeed)
        .then(res => setAlerts(res.data.events || []))
        .catch(() => setAlerts(generateMockAlerts()));
    }
  }, [isDemoMode, satDb]);

  // ─── Live Updates ───
  const updatePositions = useCallback(() => {
    if (isDemoMode) {
      const time = Date.now() / 1000;
      const positions = generateDemoPositions(satDb, time);
      setActiveAssets(positions);
    } else {
      axios.post(API_ENDPOINTS.analyzeRisk, {
        obj1_name: selectedSat, obj2_name: "NOAA 19",
        distance_km: 0, velocity_kms: 7.8
      }).then(res => {
        const data = res.data;
        if (data.obj1_pos) {
          setActiveAssets([{ ...data.obj1_pos, name: selectedSat, velocity: data.velocity_kms }]);
        }
      }).catch(() => { });
    }
  }, [isDemoMode, selectedSat, satDb]);

  useEffect(() => {
    let interval;
    if (isLive) {
      updatePositions();
      interval = setInterval(updatePositions, isDemoMode ? 800 : 3000);
    }
    return () => clearInterval(interval);
  }, [isLive, isDemoMode, updatePositions]);

  // ─── Constellation ───
  const handleConstellation = async (name) => {
    if (constellation === name) { setConstellation(null); setConstellationData([]); return; }
    setConstellation(name);
    if (isDemoMode) {
      const info = CONSTELLATIONS.find(c => c.name === name);
      const count = Math.min(info?.count || 100, 200);
      setConstellationData(Array.from({ length: count }).map((_, i) => ({
        name: `${name}-${i}`, lat: (Math.random() * 160) - 80, lon: Math.random() * 360, alt: 0.1
      })));
    } else {
      try {
        const res = await axios.get(API_ENDPOINTS.constellation(name));
        setConstellationData(res.data.satellites);
      } catch (e) { console.error(e); }
    }
  };

  // ─── Search ───
  const allSearchable = useMemo(() => {
    const names = satDb.map(s => s.name);
    satellites.forEach(s => { if (!names.includes(s)) names.push(s); });
    return names;
  }, [satDb, satellites]);

  const filteredSatellites = searchQuery
    ? allSearchable.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : allSearchable;

  // ─── Stats ───
  const totalTracked = satellites.length + constellationData.length;
  const activeAlerts = alerts.filter(a => parseFloat(a.probability) > 30).length;
  const criticalAlerts = alerts.filter(a => parseFloat(a.probability) > 60).length;

  const selectedSatData = activeAssets.find(a => a.name === selectedSat);
  const selectedSatInfo = satDb.find(s => s.name === selectedSat);

  return (
    <>
      {/* ── Globe Canvas ── */}
      <div className="absolute inset-0 z-0">
        <Globe3D
          satellites={activeAssets}
          constellation={constellationData}
          kesslerMode={isKessler}
          showPaths={showPaths}
          showGrid={showGrid}
          showAtmosphere={showAtmosphere}
          className="w-full h-full"
        />
      </div>

      {/* ── Top Status Bar ── */}
      <TopStatusBar
        isDemoMode={isDemoMode}
        satellitesCount={totalTracked}
        onSearchOpen={() => setSearchOpen(true)}
      />

      {/* ── Stat Cards (Top Left, under TopBar) ── */}
      <div className="absolute top-16 left-20 z-20 flex items-start gap-3">
        <StatCard icon={Satellite} label="Objects" value={totalTracked} color="bg-accent-blue" delay={0.1} />
        <StatCard icon={Shield} label="Alerts" value={activeAlerts} color={criticalAlerts > 0 ? "bg-status-critical" : "bg-status-success"} delay={0.15} />
        <StatCard icon={Activity} label="Uptime" value="99.9" suffix="%" color="bg-accent-teal" delay={0.2} />
      </div>

      {/* ── Conjunction Alerts (Bottom Right) ── */}
      <AnimatePresence>
        {showAlerts && alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-6 right-6 z-20 w-[280px] pointer-events-auto"
          >
            <div className="glass-surface rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-divider flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-status-warning" />
                  <span className="text-[13px] font-semibold text-text-primary">Conjunctions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-text-tertiary">{alerts.length}</span>
                  <button onClick={() => setShowAlerts(false)} className="p-1 rounded-md hover:bg-white/[0.06] text-text-tertiary transition-colors">
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto scrollbar-hide">
                {alerts.slice(0, 5).map((alert, i) => (
                  <AlertCard key={alert.id} alert={alert} index={i} onSelect={setSelectedSat} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Satellite List Panel (Bottom Left) ── */}
      <SatellitePanel
        satellites={satDb}
        selectedName={selectedSat}
        onSelect={setSelectedSat}
        regimeFilter={regimeFilter}
        onRegimeFilter={setRegimeFilter}
      />

      {/* ── Right Control Panel ── */}
      <RightControlPanel
        onConstellationChange={handleConstellation}
        activeConstellation={constellation}
        kesslerMode={isKessler}
        setKesslerMode={setIsKessler}
        showPaths={showPaths}
        setShowPaths={setShowPaths}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
      />

      {/* ── Bottom Telemetry for selected satellite ── */}
      <BottomTelemetryBar targetData={selectedSatData || activeAssets[0]} />

      {/* ── Command Palette (Search) ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] pointer-events-auto"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchIndex(0); }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-[520px] bg-surface-panel border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-divider">
                <Search size={18} className="text-text-tertiary shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchIndex(0); }}
                  onKeyDown={e => {
                    const max = Math.min(filteredSatellites.length, 12);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSearchIndex(prev => {
                        const next = prev < max - 1 ? prev + 1 : 0;
                        searchResultsRef.current?.children[next + 1]?.scrollIntoView({ block: 'nearest' });
                        return next;
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSearchIndex(prev => {
                        const next = prev > 0 ? prev - 1 : max - 1;
                        searchResultsRef.current?.children[next + 1]?.scrollIntoView({ block: 'nearest' });
                        return next;
                      });
                    } else if (e.key === 'Enter' && max > 0) {
                      e.preventDefault();
                      const selected = filteredSatellites[searchIndex];
                      if (selected) {
                        setSelectedSat(selected);
                        setSearchOpen(false);
                        setSearchQuery('');
                        setSearchIndex(0);
                      }
                    } else if (e.key === 'Escape') {
                      setSearchOpen(false);
                      setSearchQuery('');
                      setSearchIndex(0);
                    }
                  }}
                  placeholder="Search satellites, debris, constellations..."
                  className="flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-tertiary font-sans"
                />
                <kbd className="text-[10px] text-text-tertiary bg-surface-elevated px-2 py-1 rounded-md font-mono border border-white/[0.06] shrink-0">ESC</kbd>
              </div>

              {/* Results */}
              <div ref={searchResultsRef} className="max-h-[320px] overflow-y-auto scrollbar-hide">
                {filteredSatellites.length > 0 ? (
                  <>
                    <div className="px-5 pt-3 pb-1.5">
                      <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                        {searchQuery ? `${filteredSatellites.length} Results` : `All Objects (${allSearchable.length})`}
                      </span>
                    </div>
                    {filteredSatellites.slice(0, 12).map((s, i) => {
                      const info = satDb.find(sat => sat.name === s);
                      const statusColor = info?.status === 'operational' ? 'bg-status-success' : info?.status === 'debris' ? 'bg-status-critical' : 'bg-status-warning';
                      const isSelected = i === searchIndex;

                      return (
                        <motion.div
                          key={s}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`flex items-center justify-between px-5 py-2.5 mx-2 rounded-lg cursor-pointer group transition-colors ${isSelected ? 'bg-accent-blue/[0.1] ring-1 ring-accent-blue/20' : 'hover:bg-white/[0.04]'
                            }`}
                          onMouseEnter={() => setSearchIndex(i)}
                          onClick={() => {
                            setSelectedSat(s);
                            setSearchOpen(false);
                            setSearchQuery('');
                            setSearchIndex(0);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${statusColor} ${isSelected ? 'scale-125' : 'group-hover:scale-125'} transition-transform`} />
                            <div className="min-w-0">
                              <span className={`text-[13px] font-medium block truncate transition-colors ${isSelected ? 'text-white' : 'text-text-primary group-hover:text-white'}`}>{s}</span>
                              {info && <span className="text-[11px] text-text-tertiary">{info.type} · {info.regime} · {info.altitude} km</span>}
                            </div>
                          </div>
                          <ArrowRight size={14} className={`shrink-0 transition-all ${isSelected ? 'text-accent-blue opacity-100 translate-x-0' : 'text-text-tertiary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-accent-blue'}`} />
                        </motion.div>
                      );
                    })}
                  </>
                ) : (
                  <div className="px-5 py-8 flex flex-col items-center gap-2">
                    <Search size={24} className="text-text-tertiary" />
                    <span className="text-[13px] text-text-tertiary">No objects matching "{searchQuery}"</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-divider flex items-center gap-4 text-[11px] text-text-tertiary">
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">↵</kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">↑↓</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-white/[0.06]">esc</kbd> close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}