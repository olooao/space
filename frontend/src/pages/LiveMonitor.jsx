import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { AlertTriangle, Satellite, Crosshair, ShieldAlert, Activity, WifiOff, X, ChevronDown, Filter, Zap, Clock, Target } from 'lucide-react'
import { API_BASE_URL } from '../config/api'
import { motion, AnimatePresence } from 'framer-motion'
import { SATELLITE_DATABASE, generateMockAlerts } from '../data/satellites'
import { useAppStore } from '../store/appStore'

/* ═══════════════════ RISK GAUGE ═══════════════════ */
function RiskGauge({ value, size = 48 }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color = value >= 80 ? '#EF4444' : value >= 50 ? '#F59E0B' : value >= 20 ? '#4C8BF5' : '#22C55E';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold font-mono" style={{ color }}>{Math.round(value)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════ STAT PILL ═══════════════════ */
function StatPill({ icon: Icon, label, value, color = 'text-text-primary' }) {
  return (
    <div className="glass-surface rounded-xl px-4 py-3 flex items-center gap-3">
      <Icon size={15} className="text-text-tertiary" />
      <div>
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
        <div className={`text-[16px] font-bold font-mono ${color}`}>{value}</div>
      </div>
    </div>
  );
}

/* ═══════════════════ RISK DETAIL PANEL ═══════════════════ */
function RiskDetailPanel({ alert, onClose }) {
  if (!alert) return null;
  const prob = typeof alert.probability === 'number' ? alert.probability : parseFloat(alert.probability);
  const riskLevel = prob >= 80 ? 'CRITICAL' : prob >= 50 ? 'HIGH' : prob >= 20 ? 'MODERATE' : 'LOW';
  const riskColor = prob >= 80 ? 'text-status-critical' : prob >= 50 ? 'text-status-warning' : prob >= 20 ? 'text-accent-blue' : 'text-status-success';
  const riskBg = prob >= 80 ? 'bg-status-critical/10 border-status-critical/20' : prob >= 50 ? 'bg-status-warning/10 border-status-warning/20' : prob >= 20 ? 'bg-accent-blue/10 border-accent-blue/20' : 'bg-status-success/10 border-status-success/20';

  const primaryInfo = SATELLITE_DATABASE.find(s => s.name === alert.primary_asset);
  const secondaryInfo = SATELLITE_DATABASE.find(s => s.name === alert.secondary_asset);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[620px] bg-surface-panel border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-divider">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border mb-3 ${riskBg}`}>
              <ShieldAlert size={12} /> {riskLevel} RISK
            </div>
            <h2 className="text-[18px] font-bold text-text-primary">{alert.primary_asset}</h2>
            <p className="text-[13px] text-text-secondary mt-0.5 flex items-center gap-1.5">
              <Crosshair size={12} /> Conjunction with <strong className="text-text-primary">{alert.secondary_asset}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-text-tertiary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Main Content */}
        <div className="px-6 py-5">
          {/* Risk Gauge + Key Stats */}
          <div className="flex items-center gap-6 mb-6">
            <RiskGauge value={prob} size={80} />
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Collision Probability</div>
                <div className={`text-[22px] font-bold font-mono ${riskColor}`}>{prob.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Miss Distance</div>
                <div className="text-[22px] font-bold font-mono text-text-primary">
                  {typeof alert.miss_distance === 'number' ? alert.miss_distance.toFixed(3) : alert.miss_distance}
                  <span className="text-[12px] text-text-tertiary ml-1">km</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Time to TCA</div>
                <div className="text-[22px] font-bold font-mono text-text-primary">
                  T-{alert.time_to_impact}<span className="text-[12px] text-text-tertiary ml-1">s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-[10px] text-text-tertiary mb-1.5">
              <span>Risk Level</span>
              <span>{prob.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${prob >= 80 ? 'bg-status-critical' : prob >= 50 ? 'bg-status-warning' : 'bg-accent-blue'}`}
                initial={{ width: 0 }}
                animate={{ width: `${prob}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Object Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Primary */}
            <div className="bg-surface-elevated rounded-xl p-4 border border-white/[0.04]">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Satellite size={11} /> Primary Object
              </div>
              <div className="text-[14px] font-semibold text-text-primary mb-2">{alert.primary_asset}</div>
              {primaryInfo ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-text-tertiary">Type</span><span className="text-text-secondary">{primaryInfo.type}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Regime</span><span className="text-text-secondary">{primaryInfo.regime}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Altitude</span><span className="text-text-secondary font-mono">{primaryInfo.altitude} km</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Inclination</span><span className="text-text-secondary font-mono">{primaryInfo.inclination}°</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Operator</span><span className="text-text-secondary">{primaryInfo.operator}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Mass</span><span className="text-text-secondary font-mono">{primaryInfo.mass?.toLocaleString()} kg</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Status</span>
                    <span className={`font-medium ${primaryInfo.status === 'operational' ? 'text-status-success' : primaryInfo.status === 'debris' ? 'text-status-critical' : 'text-status-warning'}`}>
                      {primaryInfo.status}
                    </span>
                  </div>
                </div>
              ) : <span className="text-[11px] text-text-tertiary">No catalog data</span>}
            </div>

            {/* Secondary */}
            <div className="bg-surface-elevated rounded-xl p-4 border border-white/[0.04]">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Crosshair size={11} /> Threat Object
              </div>
              <div className="text-[14px] font-semibold text-text-primary mb-2">{alert.secondary_asset}</div>
              {secondaryInfo ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between"><span className="text-text-tertiary">Type</span><span className="text-text-secondary">{secondaryInfo.type}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Regime</span><span className="text-text-secondary">{secondaryInfo.regime}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Altitude</span><span className="text-text-secondary font-mono">{secondaryInfo.altitude} km</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Inclination</span><span className="text-text-secondary font-mono">{secondaryInfo.inclination}°</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Operator</span><span className="text-text-secondary">{secondaryInfo.operator}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Mass</span><span className="text-text-secondary font-mono">{secondaryInfo.mass?.toLocaleString()} kg</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Status</span>
                    <span className={`font-medium ${secondaryInfo.status === 'operational' ? 'text-status-success' : secondaryInfo.status === 'debris' ? 'text-status-critical' : 'text-status-warning'}`}>
                      {secondaryInfo.status}
                    </span>
                  </div>
                </div>
              ) : <span className="text-[11px] text-text-tertiary">No catalog data</span>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-divider flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">Event ID: {alert.id || 'N/A'}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] font-medium text-text-secondary bg-surface-elevated hover:bg-surface-hover border border-white/[0.06] transition-all">
              Dismiss
            </button>
            <button className="px-4 py-2 rounded-lg text-[12px] font-medium btn-primary">
              <Zap size={13} className="inline mr-1.5" /> Compute Avoidance
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════ INLINE EXPAND PANEL ═══════════════════ */
function InlineDetail({ alert }) {
  const prob = typeof alert.probability === 'number' ? alert.probability : parseFloat(alert.probability);
  const primaryInfo = SATELLITE_DATABASE.find(s => s.name === alert.primary_asset);
  const secondaryInfo = SATELLITE_DATABASE.find(s => s.name === alert.secondary_asset);
  const relVel = (7.2 + (prob / 100) * 5.8).toFixed(1);
  const energy = ((primaryInfo?.mass || 500) * Math.pow(parseFloat(relVel), 2) / 2 / 1e6).toFixed(1);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 overflow-hidden"
    >
      <div className="grid grid-cols-4 gap-3 pt-3 mt-3 border-t border-divider">
        {/* Mini Gauge + Risk */}
        <div className="flex items-center gap-3">
          <RiskGauge value={prob} size={40} />
          <div>
            <div className="text-[10px] text-text-tertiary uppercase">Risk Score</div>
            <div className={`text-[15px] font-bold font-mono ${prob >= 80 ? 'text-status-critical' : prob >= 50 ? 'text-status-warning' : 'text-accent-blue'}`}>{prob.toFixed(1)}%</div>
          </div>
        </div>

        {/* Relative Velocity */}
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Rel. Velocity</div>
          <div className="text-[14px] font-bold font-mono text-text-primary">{relVel} <span className="text-[10px] text-text-tertiary">km/s</span></div>
        </div>

        {/* Collision Energy */}
        <div>
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Impact Energy</div>
          <div className="text-[14px] font-bold font-mono text-text-primary">{energy} <span className="text-[10px] text-text-tertiary">MJ</span></div>
        </div>

        {/* Objects Summary */}
        <div className="flex gap-4">
          <div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Primary</div>
            <div className="text-[11px] text-text-secondary">{primaryInfo?.type || 'Unknown'} · {primaryInfo?.regime || '—'}</div>
            <div className="text-[10px] text-text-tertiary font-mono">{primaryInfo?.altitude || '—'} km · {primaryInfo?.mass?.toLocaleString() || '—'} kg</div>
          </div>
          <div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Threat</div>
            <div className="text-[11px] text-text-secondary">{secondaryInfo?.type || 'Unknown'} · {secondaryInfo?.regime || '—'}</div>
            <div className="text-[10px] text-text-tertiary font-mono">{secondaryInfo?.altitude || '—'} km · {secondaryInfo?.mass?.toLocaleString() || '—'} kg</div>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-divider">
        <span className="text-[10px] text-text-tertiary font-mono">ID: {alert.id || 'N/A'}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-accent-blue flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <Target size={10} /> Click row for full analysis
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ DEMO DATA GENERATOR ═══════════════════ */
function generateDemoAlerts() {
  const pairs = [
    ['ISS (ZARYA)', 'COSMOS 2251 DEB'],
    ['STARLINK-1007', 'FENGYUN 1C DEB'],
    ['NOAA 19', 'SL-16 R/B'],
    ['HST', 'IRIDIUM 33 DEB'],
    ['TIANGONG', 'ENVISAT'],
    ['SENTINEL-2A', 'FENGYUN 1C DEB'],
    ['LANDSAT 9', 'SL-16 R/B'],
    ['GPS BIIR-2', 'COSMOS 2251 DEB'],
    ['NOAA 20', 'IRIDIUM 33 DEB'],
    ['TERRA', 'ENVISAT'],
    ['AQUA', 'SL-16 R/B'],
    ['GOES-16', 'MOLNIYA 3-50'],
  ];
  return pairs.map(([primary, secondary], i) => ({
    id: `CDM-${String(2024001 + i).padStart(7, '0')}`,
    primary_asset: primary,
    secondary_asset: secondary,
    miss_distance: +(Math.random() * 8 + 0.05).toFixed(3),
    probability: +(Math.random() * 100).toFixed(1),
    time_to_impact: Math.floor(Math.random() * 14400 + 60),
    lat: (Math.random() * 160 - 80).toFixed(2),
    lon: (Math.random() * 360).toFixed(2),
  })).sort((a, b) => b.probability - a.probability);
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
export default function LiveMonitor() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState("NOMINAL")
  const [dataSource, setDataSource] = useState("unknown")
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [filter, setFilter] = useState('all')
  const settings = useAppStore(s => s.settings)

  useEffect(() => {
    let channel = null

    const fetchData = async () => {
      try {
        const result = await supabase.from('risk_events').select('*').order('created_at', { ascending: false }).limit(20)
        if (!result.error && result.data && result.data.length > 0) {
          setAlerts(result.data)
          setDataSource("supabase")
          setLoading(false)
          channel = supabase
            .channel('risk_events_live')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'risk_events' }, (payload) => {
              const newAlert = payload.new
              if (newAlert.probability > 80) { setSystemStatus("CRITICAL"); setTimeout(() => setSystemStatus("NOMINAL"), 3000); }
              setAlerts((prev) => [newAlert, ...prev].slice(0, 50))
            })
            .subscribe()
          return
        }
      } catch (e) { }

      try {
        const res = await fetch(`${API_BASE_URL}/collision/feed`)
        const data = await res.json()
        if (data.events && data.events.length > 0) {
          const normalized = data.events.map((e, i) => ({
            id: e.id || `EVT-${i}`, primary_asset: e.primary_asset || e.primary, secondary_asset: e.secondary_asset || e.secondary,
            lat: e.lat, lon: e.lon, miss_distance: e.miss_distance, probability: e.probability, time_to_impact: e.time_to_impact,
          }))
          setAlerts(normalized)
          setDataSource("api")
          setLoading(false)
          return
        }
      } catch (e) { }

      // Fallback: Demo data
      setAlerts(generateDemoAlerts())
      setDataSource("demo")
      setLoading(false)
    }

    fetchData()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // ── Derived stats ──
  const stats = useMemo(() => {
    const critical = alerts.filter(a => a.probability >= 80).length;
    const warning = alerts.filter(a => a.probability >= 50 && a.probability < 80).length;
    const avgMiss = alerts.length ? (alerts.reduce((s, a) => s + (typeof a.miss_distance === 'number' ? a.miss_distance : 0), 0) / alerts.length).toFixed(2) : '—';
    return { total: alerts.length, critical, warning, avgMiss };
  }, [alerts]);

  // ── Filtered alerts ──
  const filteredAlerts = useMemo(() => {
    if (filter === 'critical') return alerts.filter(a => a.probability >= 80);
    if (filter === 'warning') return alerts.filter(a => a.probability >= 50 && a.probability < 80);
    if (filter === 'nominal') return alerts.filter(a => a.probability < 50);
    return alerts;
  }, [alerts, filter]);

  const getRiskColor = (p) => p >= 80 ? 'text-status-critical' : p >= 50 ? 'text-status-warning' : 'text-accent-blue';
  const getRiskBg = (p) => p >= 80 ? 'border-l-status-critical bg-status-critical/[0.04]' : p >= 50 ? 'border-l-status-warning bg-status-warning/[0.04]' : 'border-l-accent-blue/50 bg-accent-blue/[0.02]';

  const filterTabs = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'critical', label: 'Critical', count: stats.critical, color: 'text-status-critical' },
    { key: 'warning', label: 'High', count: stats.warning, color: 'text-status-warning' },
    { key: 'nominal', label: 'Nominal', count: stats.total - stats.critical - stats.warning, color: 'text-accent-blue' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-surface-bg text-text-primary font-sans pl-16">

      {/* ── HEADER ── */}
      <header className={`px-8 py-5 border-b border-divider flex justify-between items-center transition-colors duration-300 ${systemStatus === 'CRITICAL' ? 'bg-status-critical/[0.03]' : ''}`}>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight flex items-center gap-3">
            <Activity size={20} className={systemStatus === 'CRITICAL' ? "text-status-critical animate-pulse" : "text-status-success"} />
            Live Conjunction Feed
          </h1>
          <div className="flex gap-4 mt-1 text-[12px] text-text-secondary">
            <span className="flex items-center gap-2">
              <span className={`w-[6px] h-[6px] rounded-full ${dataSource === 'demo' ? 'bg-status-warning' : 'bg-status-success'}`} />
              {dataSource === 'supabase' ? 'Realtime' : dataSource === 'api' ? 'API' : dataSource === 'demo' ? 'Demo Data' : 'Connecting...'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} /> Updated just now
            </span>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-xl text-[12px] font-bold border ${systemStatus === 'CRITICAL'
          ? 'border-status-critical/30 text-status-critical bg-status-critical/10'
          : 'border-status-success/20 text-status-success bg-status-success/10'}`}>
          {systemStatus}
        </div>
      </header>

      {/* ── STATS ROW ── */}
      <div className="px-8 py-5 border-b border-divider">
        <div className="flex gap-3">
          <StatPill icon={AlertTriangle} label="Total Events" value={stats.total} />
          <StatPill icon={ShieldAlert} label="Critical" value={stats.critical} color={stats.critical > 0 ? 'text-status-critical' : 'text-status-success'} />
          <StatPill icon={Target} label="Avg Miss Dist" value={`${stats.avgMiss} km`} color="text-text-primary" />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-6xl mx-auto px-8 py-6">

        {loading && (
          <div className="text-center py-20 text-text-secondary">
            <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto mb-4" />
            Initializing orbital data feed...
          </div>
        )}

        {!loading && (
          <>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-surface-panel rounded-xl p-1 border border-white/[0.04] w-fit">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 ${filter === tab.key
                    ? 'bg-white/[0.08] text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                >
                  {tab.label}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${filter === tab.key ? 'bg-white/[0.08]' : 'bg-white/[0.04]'
                    } ${tab.color || ''}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Column Headers */}
            {filteredAlerts.length > 0 && (
              <div className="grid grid-cols-12 text-[10px] text-text-tertiary uppercase tracking-wider font-semibold px-5 mb-2">
                <div className="col-span-4">Objects</div>
                <div className="col-span-2 text-center">Miss Distance</div>
                <div className="col-span-2 text-center">Time to TCA</div>
                <div className="col-span-3 text-right">Risk</div>
                <div className="col-span-1"></div>
              </div>
            )}

            {/* Alert Rows */}
            <div className="space-y-1.5">
              {filteredAlerts.map((alert, index) => {
                const prob = typeof alert.probability === 'number' ? alert.probability : parseFloat(alert.probability);
                const isHovered = hoveredId === (alert.id || index);

                return (
                  <motion.div
                    key={alert.id || index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025, duration: 0.3 }}
                    className={`relative grid grid-cols-12 items-center px-5 py-4 border-l-[3px] rounded-xl cursor-pointer transition-all duration-200 ${getRiskBg(prob)} ${isHovered ? 'bg-white/[0.04] shadow-lg shadow-black/10' : 'hover:bg-white/[0.02]'}`}
                    onMouseEnter={() => setHoveredId(alert.id || index)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    {/* Objects */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2.5">
                        <Satellite size={14} className="text-text-secondary" />
                        <div>
                          <div className="text-[13px] font-semibold text-text-primary">{alert.primary_asset}</div>
                          <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                            <Crosshair size={10} /> {alert.secondary_asset}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Miss Distance */}
                    <div className="col-span-2 text-center">
                      <span className="text-[15px] font-bold font-mono text-text-primary">
                        {typeof alert.miss_distance === 'number' ? alert.miss_distance.toFixed(3) : alert.miss_distance}
                      </span>
                      <span className="text-[10px] text-text-tertiary ml-1">km</span>
                    </div>

                    {/* Time */}
                    <div className="col-span-2 text-center">
                      <span className={`font-mono text-[13px] ${alert.time_to_impact < 300 ? 'text-status-critical font-bold' : 'text-text-secondary'}`}>
                        T-{alert.time_to_impact < 3600 ? `${Math.floor(alert.time_to_impact / 60)}m ${alert.time_to_impact % 60}s` : `${(alert.time_to_impact / 3600).toFixed(1)}h`}
                      </span>
                    </div>

                    {/* Risk + Badge */}
                    <div className="col-span-3 flex items-center justify-end gap-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${prob >= 80 ? 'text-status-critical bg-status-critical/10 border-status-critical/20' :
                        prob >= 50 ? 'text-status-warning bg-status-warning/10 border-status-warning/20' :
                          prob >= 20 ? 'text-accent-blue bg-accent-blue/10 border-accent-blue/20' :
                            'text-status-success bg-status-success/10 border-status-success/20'
                        }`}>
                        {prob >= 80 ? 'CRITICAL' : prob >= 50 ? 'HIGH' : prob >= 20 ? 'MODERATE' : 'LOW'}
                      </span>
                      <span className={`text-[16px] font-bold font-mono min-w-[52px] text-right ${getRiskColor(prob)}`}>
                        {prob.toFixed(1)}%
                      </span>
                    </div>

                    {/* Expand Icon */}
                    <div className="col-span-1 flex justify-end items-center gap-2">
                      {prob >= 80 && <ShieldAlert size={16} className="text-status-critical" />}
                      <ChevronDown size={14} className={`text-text-tertiary transition-all duration-200 ${isHovered ? 'opacity-100 rotate-180' : 'opacity-0'}`} />
                    </div>

                    {/* Inline Expand Detail (below row, inside content) */}
                    <AnimatePresence>
                      {isHovered && <InlineDetail alert={alert} />}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {filteredAlerts.length === 0 && (
              <div className="text-center py-16">
                <Filter size={32} className="mx-auto mb-3 text-text-tertiary/50" />
                <p className="text-[14px] text-text-tertiary">No events match the "{filter}" filter</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Click Detail Modal ── */}
      <AnimatePresence>
        {selectedAlert && <RiskDetailPanel alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
      </AnimatePresence>
    </div>
  )
}
