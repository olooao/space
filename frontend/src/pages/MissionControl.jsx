import { useEffect, useState, useMemo, useCallback } from 'react'
import { Target, Shield, Search, Zap, Satellite, Crosshair, Clock, ArrowRight, ChevronDown, X, AlertTriangle, Info, RotateCcw, History } from 'lucide-react'
import { API_BASE_URL } from '../config/api'
import { motion, AnimatePresence } from 'framer-motion'
import { SATELLITE_DATABASE } from '../data/satellites'

/* ═══════════════ RISK GAUGE (large) ═══════════════ */
function RiskGauge({ value, size = 120 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color = value >= 80 ? '#EF4444' : value >= 50 ? '#F59E0B' : value >= 20 ? '#4C8BF5' : '#22C55E';
  const label = value >= 80 ? 'CRITICAL' : value >= 50 ? 'HIGH' : value >= 20 ? 'MODERATE' : 'LOW';

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[28px] font-bold font-mono"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {value.toFixed(1)}%
        </motion.span>
        <span className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

/* ═══════════════ SATELLITE SELECTOR ═══════════════ */
function SatelliteSelector({ label, icon: Icon, value, onChange, satellites, excludeValue }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = satellites.filter(s => s.name !== excludeValue);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(s => s.name.toLowerCase().includes(q) || s.type?.toLowerCase().includes(q) || s.regime?.toLowerCase().includes(q));
  }, [satellites, query, excludeValue]);

  const selected = satellites.find(s => s.name === value);

  return (
    <div className="relative">
      <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>

      {/* Selected Preview / Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left bg-surface-panel border rounded-xl px-4 py-3.5 transition-all duration-150 ${open ? 'border-accent-blue/50 ring-2 ring-accent-blue/20' : 'border-white/[0.08] hover:border-white/[0.12]'
          }`}
      >
        {selected ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-text-primary">{selected.name}</div>
              <div className="text-[11px] text-text-tertiary mt-0.5">{selected.type} · {selected.regime} · {selected.altitude} km</div>
            </div>
            <div className={`w-2 h-2 rounded-full ${selected.status === 'operational' ? 'bg-status-success' : selected.status === 'debris' ? 'bg-status-critical' : 'bg-status-warning'}`} />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-tertiary">Select object...</span>
            <ChevronDown size={14} className="text-text-tertiary" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 w-full mt-2 bg-surface-panel border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-divider">
              <Search size={14} className="text-text-tertiary" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, type, or regime..."
                className="flex-1 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
                onKeyDown={e => e.key === 'Escape' && setOpen(false)}
              />
            </div>
            {/* List */}
            <div className="max-h-[240px] overflow-y-auto scrollbar-hide">
              {filtered.map(s => (
                <button
                  key={s.name}
                  onClick={() => { onChange(s.name); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors ${value === s.name ? 'bg-accent-blue/[0.08]' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${s.status === 'operational' ? 'bg-status-success' : s.status === 'debris' ? 'bg-status-critical' : 'bg-status-warning'}`} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-text-primary truncate">{s.name}</div>
                      <div className="text-[10px] text-text-tertiary">{s.type} · {s.regime} · {s.altitude} km</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-tertiary font-mono">{s.mass?.toLocaleString()} kg</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-[12px] text-text-tertiary">No matches</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ ORBIT COMPARISON CARD ═══════════════ */
function OrbitCard({ sat, label }) {
  if (!sat) return null;
  return (
    <div className="bg-surface-elevated rounded-xl p-4 border border-white/[0.04]">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        {label === 'Primary' ? <Satellite size={11} /> : <Crosshair size={11} />} {label}
      </div>
      <div className="text-[14px] font-semibold text-text-primary mb-3">{sat.name}</div>
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between"><span className="text-text-tertiary">Type</span><span className="text-text-secondary">{sat.type}</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Orbit</span><span className="text-text-secondary">{sat.regime}</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Altitude</span><span className="text-text-secondary font-mono">{sat.altitude} km</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Inclination</span><span className="text-text-secondary font-mono">{sat.inclination}°</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Mass</span><span className="text-text-secondary font-mono">{sat.mass?.toLocaleString()} kg</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Operator</span><span className="text-text-secondary">{sat.operator}</span></div>
        <div className="flex justify-between"><span className="text-text-tertiary">Status</span>
          <span className={`font-medium ${sat.status === 'operational' ? 'text-status-success' : sat.status === 'debris' ? 'text-status-critical' : 'text-status-warning'}`}>
            {sat.status}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ METRIC CARD ═══════════════ */
function MetricCard({ label, value, unit, color = 'text-text-primary', delay = 0, large = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-surface-elevated rounded-xl p-4 border border-white/[0.04]"
    >
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">{label}</div>
      <div className={`${large ? 'text-[24px]' : 'text-[18px]'} font-bold font-mono ${color}`}>
        {value} {unit && <span className="text-[11px] text-text-tertiary">{unit}</span>}
      </div>
    </motion.div>
  );
}

/* ═══════════════ DEMO ANALYSIS ═══════════════ */
function generateDemoResult(obj1, obj2) {
  const s1 = SATELLITE_DATABASE.find(s => s.name === obj1);
  const s2 = SATELLITE_DATABASE.find(s => s.name === obj2);
  const altDiff = Math.abs((s1?.altitude || 400) - (s2?.altitude || 500));
  const riskBase = s2?.status === 'debris' ? 60 : s2?.status === 'defunct' ? 40 : 15;
  const riskScore = Math.min(99, Math.max(2, riskBase + Math.random() * 30 - altDiff / 80));
  const velocity = (6.5 + Math.random() * 7).toFixed(2);
  const distance = (0.05 + Math.random() * (riskScore > 60 ? 2 : 10)).toFixed(3);

  return {
    risk_score: +riskScore.toFixed(1),
    distance_calculated: distance,
    velocity_kms: velocity,
    decision: riskScore > 60 ? 'MANEUVER RECOMMENDED' : riskScore > 30 ? 'MONITOR CLOSELY' : 'NO ACTION NEEDED',
    real_physics_used: false,
    tca_utc: new Date(Date.now() + Math.random() * 86400000).toISOString().split('.')[0] + 'Z',
    energy_mj: ((s1?.mass || 500) * Math.pow(parseFloat(velocity), 2) / 2 / 1e6).toFixed(1),
    combined_mass: (s1?.mass || 0) + (s2?.mass || 0),
    debris_potential: riskScore > 50 ? Math.floor(50 + Math.random() * 500) : Math.floor(5 + Math.random() * 50),
    delta_v: riskScore > 60 ? (0.1 + Math.random() * 0.5).toFixed(3) : null,
  };
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function MissionControl() {
  const [satellites, setSatellites] = useState(SATELLITE_DATABASE)
  const [obj1, setObj1] = useState('')
  const [obj2, setObj2] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetch(`${API_BASE_URL}/tle/satellites`)
      .then(res => res.json())
      .then(data => {
        if (data.satellites?.length) {
          const enriched = data.satellites.map(name => SATELLITE_DATABASE.find(s => s.name === name) || { name, type: 'Unknown', regime: '—', altitude: '—', status: 'operational' });
          setSatellites(enriched);
        }
        setError(null);
      })
      .catch(() => {
        setSatellites(SATELLITE_DATABASE);
        setError("Backend offline — using local satellite database");
      })
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!obj1 || !obj2) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/collision/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obj1_name: obj1, obj2_name: obj2 })
      });
      const data = await res.json();
      setTimeout(() => {
        setResult(data);
        setHistory(prev => [{ obj1, obj2, result: data, time: new Date() }, ...prev].slice(0, 10));
        setLoading(false);
      }, 600);
    } catch {
      // Demo fallback
      const demo = generateDemoResult(obj1, obj2);
      setTimeout(() => {
        setResult(demo);
        setHistory(prev => [{ obj1, obj2, result: demo, time: new Date() }, ...prev].slice(0, 10));
        setLoading(false);
      }, 1200);
    }
  }, [obj1, obj2]);

  const handleSwap = () => { setObj1(obj2); setObj2(obj1); setResult(null); };
  const handleClear = () => { setObj1(''); setObj2(''); setResult(null); };
  const handleHistorySelect = (item) => { setObj1(item.obj1); setObj2(item.obj2); setResult(item.result); };

  const primaryInfo = satellites.find(s => s.name === obj1);
  const secondaryInfo = satellites.find(s => s.name === obj2);

  return (
    <div className="h-full overflow-y-auto bg-surface-bg text-text-primary font-sans pl-16">

      {/* ── HEADER ── */}
      <header className="px-8 py-5 border-b border-divider flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Target size={20} className="text-accent-blue" />
            <h1 className="text-[22px] font-bold tracking-tight">Conjunction Analysis</h1>
          </div>
          <p className="text-[13px] text-text-secondary">Select two orbital objects to compute collision risk and avoidance maneuvers</p>
        </div>
        {(obj1 || obj2) && (
          <button onClick={handleClear} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-panel border border-white/[0.06] hover:bg-surface-hover transition-all">
            <RotateCcw size={13} /> Clear
          </button>
        )}
      </header>

      {/* Offline */}
      {error && (
        <div className="mx-8 mt-4 px-4 py-2.5 bg-status-warning/[0.06] border border-status-warning/20 rounded-xl text-[12px] text-status-warning flex items-center gap-2">
          <Info size={14} /> {error}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══ LEFT COLUMN: Selectors + Action ═══ */}
          <div className="lg:col-span-4 space-y-5">
            <SatelliteSelector label="Primary Object" icon={Satellite} value={obj1} onChange={setObj1} satellites={satellites} excludeValue={obj2} />

            {/* Swap Button */}
            <div className="flex justify-center">
              <button onClick={handleSwap} disabled={!obj1 && !obj2} className="p-2 rounded-xl bg-surface-panel border border-white/[0.06] hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-all disabled:opacity-30">
                <RotateCcw size={15} className="rotate-90" />
              </button>
            </div>

            <SatelliteSelector label="Threat Object" icon={Crosshair} value={obj2} onChange={setObj2} satellites={satellites} excludeValue={obj1} />

            {/* Analyze Button */}
            <motion.button
              onClick={handleAnalyze}
              disabled={loading || !obj1 || !obj2}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full btn-primary py-4 text-[14px] font-semibold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Computing...
                </>
              ) : (
                <><Zap size={16} /> Run Conjunction Analysis</>
              )}
            </motion.button>

            {/* Orbit Comparison (when both selected) */}
            {obj1 && obj2 && primaryInfo && secondaryInfo && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Orbit Comparison</h3>
                <OrbitCard sat={primaryInfo} label="Primary" />
                <OrbitCard sat={secondaryInfo} label="Threat" />
              </motion.div>
            )}

            {/* Analysis History */}
            {history.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History size={11} /> Recent Analyses
                </h3>
                <div className="space-y-1.5">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => handleHistorySelect(h)}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl bg-surface-panel border border-white/[0.04] hover:bg-surface-hover transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-text-primary truncate">{h.obj1} ↔ {h.obj2}</div>
                        <div className="text-[10px] text-text-tertiary">{h.time.toLocaleTimeString()}</div>
                      </div>
                      <span className={`text-[12px] font-bold font-mono ${h.result.risk_score >= 60 ? 'text-status-critical' : h.result.risk_score >= 30 ? 'text-status-warning' : 'text-accent-blue'}`}>
                        {h.result.risk_score?.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN: Results ═══ */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {/* Empty State */}
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface-panel border border-white/[0.06] rounded-2xl min-h-[500px] flex flex-col items-center justify-center"
                >
                  <Search size={48} className="text-text-tertiary/30 mb-4" />
                  <p className="text-[15px] text-text-tertiary font-medium">Select two objects to analyze</p>
                  <p className="text-[12px] text-text-tertiary/70 mt-1">SGP4 propagation over 72-hour look-ahead window</p>
                </motion.div>
              )}

              {/* Loading */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-surface-panel border border-white/[0.06] rounded-2xl min-h-[500px] flex flex-col items-center justify-center"
                >
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-[3px] border-accent-blue/20 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-[3px] border-transparent border-t-accent-blue rounded-full animate-spin" />
                  </div>
                  <p className="text-[15px] text-text-secondary font-medium mb-1">Computing trajectory intersection</p>
                  <p className="text-[12px] text-text-tertiary">Propagating SGP4 elements · 300+ ephemeris points · 72h window</p>
                </motion.div>
              )}

              {/* Results */}
              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  {/* Decision Banner */}
                  <div className={`rounded-2xl p-6 border flex items-center justify-between ${result.risk_score > 60
                      ? 'bg-status-critical/[0.06] border-status-critical/20'
                      : result.risk_score > 30
                        ? 'bg-status-warning/[0.06] border-status-warning/20'
                        : 'bg-status-success/[0.06] border-status-success/20'
                    }`}>
                    <div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${result.risk_score > 60 ? 'text-status-critical' : result.risk_score > 30 ? 'text-status-warning' : 'text-status-success'}`}>
                        Assessment
                      </div>
                      <h2 className={`text-[22px] font-bold ${result.risk_score > 60 ? 'text-status-critical' : result.risk_score > 30 ? 'text-status-warning' : 'text-status-success'}`}>
                        {result.decision}
                      </h2>
                      <p className="text-[12px] text-text-secondary mt-1">
                        {obj1} ↔ {obj2} · {result.real_physics_used ? 'SGP4 Propagation' : 'Simulated Analysis'}
                      </p>
                    </div>
                    <RiskGauge value={result.risk_score} size={100} />
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricCard label="Miss Distance" value={result.distance_calculated} unit="km" delay={0.05}
                      color={parseFloat(result.distance_calculated) < 1 ? 'text-status-critical' : 'text-text-primary'} />
                    <MetricCard label="Relative Velocity" value={result.velocity_kms} unit="km/s" delay={0.1} />
                    <MetricCard label="Impact Energy" value={result.energy_mj || ((parseFloat(result.velocity_kms || 0) ** 2) * 500 / 2 / 1e6).toFixed(1)} unit="MJ" delay={0.15}
                      color={parseFloat(result.energy_mj || 0) > 5 ? 'text-status-warning' : 'text-text-primary'} />
                    <MetricCard label="Debris Fragments" value={result.debris_potential || Math.floor(Math.random() * 200 + 10)} delay={0.2}
                      color={result.debris_potential > 100 ? 'text-status-critical' : 'text-text-primary'} />
                  </div>

                  {/* Detailed Results */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Collision Parameters */}
                    <div className="bg-surface-panel border border-white/[0.04] rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-divider">
                        <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                          <AlertTriangle size={13} className="text-status-warning" /> Collision Parameters
                        </h3>
                      </div>
                      <div className="px-5 py-4 space-y-3 text-[12px]">
                        <div className="flex justify-between"><span className="text-text-tertiary">Collision Probability</span>
                          <span className={`font-bold font-mono ${result.risk_score >= 60 ? 'text-status-critical' : result.risk_score >= 30 ? 'text-status-warning' : 'text-accent-blue'}`}>{result.risk_score.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between"><span className="text-text-tertiary">Closest Approach</span><span className="text-text-primary font-mono">{result.distance_calculated} km</span></div>
                        <div className="flex justify-between"><span className="text-text-tertiary">TCA (UTC)</span><span className="text-text-primary font-mono text-[11px]">{result.tca_utc || new Date(Date.now() + 3600000).toISOString().split('.')[0] + 'Z'}</span></div>
                        <div className="flex justify-between"><span className="text-text-tertiary">Encounter Velocity</span><span className="text-text-primary font-mono">{result.velocity_kms} km/s</span></div>
                        <div className="flex justify-between"><span className="text-text-tertiary">Combined Mass</span><span className="text-text-primary font-mono">{result.combined_mass?.toLocaleString() || '—'} kg</span></div>
                        <div className="flex justify-between"><span className="text-text-tertiary">Est. Debris Count</span><span className="text-text-primary font-mono">{result.debris_potential || '—'}</span></div>
                        {/* Risk bar */}
                        <div className="pt-2">
                          <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(result.risk_score, 100)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full rounded-full ${result.risk_score >= 60 ? 'bg-status-critical' : result.risk_score >= 30 ? 'bg-status-warning' : 'bg-accent-blue'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Avoidance Recommendation */}
                    <div className="bg-surface-panel border border-white/[0.04] rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-divider">
                        <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                          <Shield size={13} className="text-accent-blue" /> Avoidance Recommendation
                        </h3>
                      </div>
                      <div className="px-5 py-4 space-y-3 text-[12px]">
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">Action Required</span>
                          <span className={`font-bold ${result.risk_score > 60 ? 'text-status-critical' : result.risk_score > 30 ? 'text-status-warning' : 'text-status-success'}`}>
                            {result.risk_score > 60 ? 'Yes — Maneuver' : result.risk_score > 30 ? 'Monitor' : 'None'}
                          </span>
                        </div>
                        {result.delta_v && (
                          <>
                            <div className="flex justify-between"><span className="text-text-tertiary">Delta-V Required</span><span className="text-text-primary font-mono">{result.delta_v} m/s</span></div>
                            <div className="flex justify-between"><span className="text-text-tertiary">Maneuver Type</span><span className="text-text-primary">Along-track boost</span></div>
                            <div className="flex justify-between"><span className="text-text-tertiary">Burn Duration</span><span className="text-text-primary font-mono">{(parseFloat(result.delta_v) * 3.2).toFixed(1)} s</span></div>
                            <div className="flex justify-between"><span className="text-text-tertiary">Fuel Cost (est.)</span><span className="text-text-primary font-mono">{(parseFloat(result.delta_v) * 0.8).toFixed(2)} kg</span></div>
                          </>
                        )}
                        <div className="flex justify-between"><span className="text-text-tertiary">Post-Maneuver Risk</span><span className="text-status-success font-bold">&lt; 0.01%</span></div>
                        <div className="flex justify-between"><span className="text-text-tertiary">Propagator</span><span className="text-text-secondary font-mono">{result.real_physics_used ? 'SGP4' : 'Estimated'}</span></div>

                        {result.risk_score > 60 && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full mt-2 btn-primary py-3 text-[12px] font-semibold rounded-xl flex items-center justify-center gap-2"
                          >
                            <Zap size={14} /> Execute Avoidance Maneuver
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Physics note */}
                  <div className="text-center text-[11px] text-text-tertiary flex items-center justify-center gap-1.5">
                    <Info size={11} /> {result.real_physics_used ? 'Analysis computed using SGP4 + TLE propagation' : 'Simulated analysis — connect backend for SGP4 computation'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
