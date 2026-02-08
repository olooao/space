import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Activity, ShieldAlert, Globe, Radio, Search, Bell,
  PlayCircle, PauseCircle, AlertTriangle, 
  Cpu, Crosshair, Zap, Settings, LogOut, Command
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- IMPORT THE 2D TACTICAL ENGINE ---
import EarthSVG from "../EarthSVG";

const API_URL = "http://127.0.0.1:8000";

// --- MOCK DATA ENGINE (FOR SIMULATION MODE) ---
const generateMockTelemetry = () => ({
  distance: 120 + Math.random() * 50,
  velocity: 7.6 + Math.random() * 0.1,
  risk: 15 + Math.random() * 20,
  tca: 3600 - Math.random() * 100
});

const generateLogEntry = (id) => {
  const types = ["INFO", "WARN", "CRIT"];
  const msgs = ["Orbit propagation updated", "TCA variance detected", "SGP4 convergence stable", "Link margin nominal", "Solar flux spike ignored"];
  return {
    id,
    timestamp: new Date().toISOString().split("T")[1].split(".")[0],
    type: types[Math.floor(Math.random() * types.length)],
    message: msgs[Math.floor(Math.random() * msgs.length)]
  };
};

// --- SUBCOMPONENTS ---

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-emerald-950/50 text-emerald-400 border-emerald-900",
    warning: "bg-amber-950/50 text-amber-400 border-amber-900",
    danger: "bg-red-950/50 text-red-400 border-red-900",
    outline: "bg-transparent border-slate-700 text-slate-400"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, unit, trend, icon: Icon, color = "blue" }) => (
  <div className="bg-slate-900/50 border border-white/5 p-4 rounded-xl flex items-start justify-between group hover:border-white/10 transition-colors">
    <div>
      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold text-slate-100 font-mono`}>{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
      {trend && <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">▲ {trend}</p>}
    </div>
    <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400 group-hover:text-${color}-300`}>
      <Icon size={18} />
    </div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active 
        ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    }`}
  >
    <Icon size={16} />
    <span>{label}</span>
    {active && <motion.div layoutId="sidebar-active" className="ml-auto w-1 h-1 rounded-full bg-blue-400 box-shadow-glow" />}
  </button>
);

// --- MAIN DASHBOARD COMPONENT ---

export default function Dashboard() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isDemoMode, setIsDemoMode] = useState(false); 
  const [isLive, setIsLive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Data
  const [telemetry, setTelemetry] = useState({ distance: 0, velocity: 0, risk: 0, tca: 0 });
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [activeAssets, setActiveAssets] = useState([]);
  
  // Controls
  const [selection, setSelection] = useState({ obj1: "ISS (ZARYA)", obj2: "NOAA 19" });
  const [constellation, setConstellation] = useState(null);
  const [constellationData, setConstellationData] = useState([]);
  const [isKessler, setIsKessler] = useState(false);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !e.ctrlKey) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "l" && !e.ctrlKey && !e.metaKey) { setIsLive(prev => !prev); }
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) { setIsDemoMode(prev => !prev); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- DATA FETCHING ---
  
  // 1. Initial Satellite List
  useEffect(() => {
    if (isDemoMode) {
      setSatellites(["ISS (ZARYA)", "NOAA 19", "STARLINK-1007", "TIANGONG", "HST", "COSMOS 2251"]);
    } else {
      axios.get(`${API_URL}/satellites`)
        .then(res => setSatellites(res.data.satellites))
        .catch(err => console.warn("API Offline, switching to cached list"));
    }
  }, [isDemoMode]);

  // 2. Risk Analysis Engine
  const runAnalysis = useCallback(async () => {
    if (isDemoMode) {
      // SIMULATION LOGIC
      const mock = generateMockTelemetry();
      setTelemetry(mock);
      
      setHistory(prev => {
        const newEntry = { timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), risk_score: mock.risk };
        return [...prev.slice(-19), newEntry];
      });
      
      setLogs(prev => [generateLogEntry(Date.now()), ...prev.slice(0, 10)]);
      
      // Update Positions (Mock)
      const time = Date.now() / 1000;
      setActiveAssets([
        { name: selection.obj1, lat: Math.sin(time * 0.5) * 45, lon: (time * 10) % 360, alt: 0.1, path: [] },
        { name: selection.obj2, lat: Math.cos(time * 0.3) * 45, lon: (time * 5 + 180) % 360, alt: 0.12, path: [] }
      ]);

    } else {
      // REAL API CALL
      try {
        const res = await axios.post(`${API_URL}/analyze-risk`, {
          obj1_name: selection.obj1,
          obj2_name: selection.obj2,
          distance_km: 0, velocity_kms: 7.8 
        });
        const data = res.data;
        
        setTelemetry({
          distance: data.distance_calculated,
          velocity: data.velocity_kms || 7.8,
          risk: data.risk_score,
          tca: data.tca || 0
        });

        if (data.obj1_pos && data.obj2_pos) {
          // Normalize API data to format needed by EarthSVG
          setActiveAssets([
             { ...data.obj1_pos, name: selection.obj1 }, 
             { ...data.obj2_pos, name: selection.obj2 }
          ]);
        }
        
        setHistory(prev => {
            const newEntry = { timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), risk_score: data.risk_score };
            return [...prev.slice(-19), newEntry];
        });

      } catch (err) {
        console.error("Link Lost", err);
        setIsLive(false); 
      }
    }
  }, [isDemoMode, selection]);

  // Polling Loop
  useEffect(() => {
    let interval;
    if (isLive) {
      runAnalysis(); 
      interval = setInterval(runAnalysis, isDemoMode ? 1000 : 3000);
    }
    return () => clearInterval(interval);
  }, [isLive, isDemoMode, runAnalysis]);

  // --- HANDLERS ---
  const handleConstellation = async (name) => {
    if (constellation === name) {
      setConstellation(null);
      setConstellationData([]);
      return;
    }
    setConstellation(name);
    if (isDemoMode) {
      // Generate fake fleet
      setConstellationData(Array.from({length: 100}).map((_, i) => ({
        name: `${name}-${i}`, 
        lat: (Math.random()*160)-80, 
        lon: Math.random()*360,
        alt: 0.1
      })));
    } else {
      try {
        const res = await axios.get(`${API_URL}/constellation/${name}`);
        setConstellationData(res.data.satellites);
      } catch (e) { console.error(e); }
    }
  };

  const threat = (() => {
    if (telemetry.risk > 80) return { label: "CRITICAL", color: "red" };
    if (telemetry.risk > 50) return { label: "ELEVATED", color: "amber" };
    return { label: "NOMINAL", color: "emerald" };
  })();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/5 bg-slate-900/30 flex items-center justify-between px-6 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
             {/* Search */}
             <div 
                className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-400 w-64 cursor-text hover:border-white/20 transition-colors"
                onClick={() => setSearchOpen(true)}
             >
                <Search size={12} />
                <span>Search objects (ID, Name)...</span>
                <span className="ml-auto bg-slate-800 px-1.5 rounded text-[9px] border border-slate-700">/</span>
             </div>
             
             {/* Status Badge */}
             <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isDemoMode ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}>
                   {isDemoMode ? "SIMULATION MODE" : "LIVE FEED"}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors"><Bell size={18} /></button>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               NETWORK: SECURE
            </div>
          </div>
        </header>

        {/* CONTENT GRID - Added relative positioning for Framer Motion scroll fix */}
        <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden relative">
           
           {/* ROW 1: METRICS */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Threat Level" value={threat.label} icon={ShieldAlert} color={threat.color} />
              <StatCard label="Active Alerts" value="0" trend="Stable" icon={AlertTriangle} color="amber" />
              <StatCard label="Tracked Objects" value={satellites.length || "Loading..."} unit="objs" icon={Crosshair} color="blue" />
              <StatCard label="System Load" value="12%" unit="cpu" icon={Cpu} color="emerald" />
           </div>

           {/* ROW 2: MAIN OPS AREA */}
           <div className="grid grid-cols-12 gap-6 h-[600px]">
              
              {/* LEFT: CONTROLS */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                 <div className="glass-card rounded-xl p-5 border border-white/5 bg-slate-900/40 flex flex-col h-full">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Radio size={14} /> Mission Control
                    </h3>
                    
                    <div className="space-y-4 flex-1">
                       <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Primary Asset</label>
                          <select 
                            className="w-full bg-slate-950 border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                            value={selection.obj1}
                            onChange={(e) => setSelection({...selection, obj1: e.target.value})}
                          >
                             {satellites.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>
                       
                       <div className="flex justify-center py-1">
                          <div className="h-8 w-[1px] bg-white/10"></div>
                       </div>

                       <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Secondary Object</label>
                          <select 
                            className="w-full bg-slate-950 border border-white/10 rounded p-2 text-sm text-white focus:border-red-500 outline-none"
                            value={selection.obj2}
                            onChange={(e) => setSelection({...selection, obj2: e.target.value})}
                          >
                             {satellites.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                       </div>

                       <div className="pt-4 space-y-2">
                          <button 
                            onClick={() => setIsLive(!isLive)}
                            className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                isLive 
                                ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20" 
                                : "bg-emerald-500 text-slate-900 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            }`}
                          >
                             {isLive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                             {isLive ? "Abort Tracking" : "Initialize Link"}
                          </button>
                          
                          <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={() => handleConstellation("STARLINK")}
                                className={`py-2 rounded text-[10px] font-bold border transition-all ${constellation === "STARLINK" ? "bg-blue-500 text-white border-blue-400" : "bg-slate-800 border-white/5 text-slate-400"}`}
                             >
                                STARLINK
                             </button>
                             <button 
                                onClick={() => setIsKessler(!isKessler)}
                                className={`py-2 rounded text-[10px] font-bold border transition-all ${isKessler ? "bg-red-600 text-white border-red-500 animate-pulse" : "bg-slate-800 border-white/5 text-slate-400"}`}
                             >
                                KESSLER SIM
                             </button>
                          </div>
                       </div>
                    </div>

                    {/* MINI LOGS */}
                    <div className="mt-4 pt-4 border-t border-white/5 h-48 flex flex-col">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500">System Logs</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       </div>
                       <div className="flex-1 overflow-hidden relative font-mono text-[10px] space-y-1 opacity-70">
                          <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                             {logs.map((log) => (
                                <div key={log.id} className="flex gap-2 mb-1">
                                   <span className="text-slate-500">{log.timestamp}</span>
                                   <span className={log.type === 'CRIT' ? 'text-red-400' : 'text-blue-400'}>{log.type}</span>
                                   <span className="text-slate-300 truncate">{log.message}</span>
                                </div>
                             ))}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* CENTER: TACTICAL 2D MAP */}
              <div className="col-span-12 lg:col-span-6 relative group">
                 <div className="absolute inset-0 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black bg-slate-950">
                    
                    {/* THE 2D SVG COMPONENT (Correctly Rendered) */}
                    <EarthSVG 
                        satellites={activeAssets} 
                        constellation={constellationData} 
                        kessler={isKessler} 
                    />
                    
                    {/* OVERLAYS */}
                    <div className="absolute top-4 left-4 pointer-events-none">
                       <Badge variant={isLive ? "success" : "default"}>
                          {isLive ? "● LIVE FEED" : "○ OFFLINE"}
                       </Badge>
                    </div>

                    {/* TARGET HUD INFO */}
                    {activeAssets.length > 0 && (
                        <div className="absolute bottom-6 left-6 pointer-events-none">
                            <div className="bg-slate-900/80 backdrop-blur border border-white/10 p-3 rounded-lg w-48 space-y-2">
                                <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                    <span className="text-[10px] font-bold text-blue-400">TARGET LOCK</span>
                                    <span className="text-[10px] font-mono text-white">{activeAssets[0].name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <span className="text-slate-500">LATITUDE</span>
                                    <span className="text-right font-mono text-slate-300">{activeAssets[0].lat?.toFixed(2) || "0.00"}°</span>
                                    <span className="text-slate-500">ALTITUDE</span>
                                    <span className="text-right font-mono text-slate-300">{activeAssets[0].alt ? (activeAssets[0].alt * 6371).toFixed(0) : "400"} km</span>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
              </div>

              {/* RIGHT: ANALYTICS */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                 
                 {/* RISK */}
                 <div className="glass-card p-5 rounded-xl border border-white/5 bg-slate-900/40">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Collision Probability</h3>
                    <div className="flex items-center justify-center py-2 relative">
                       <svg className="w-32 h-32 transform -rotate-90">
                           <circle cx="64" cy="64" r="56" fill="none" stroke="#1e293b" strokeWidth="8" />
                           <circle 
                                cx="64" cy="64" r="56" fill="none" 
                                stroke={threat.color === 'red' ? '#ef4444' : threat.color === 'amber' ? '#f59e0b' : '#10b981'} 
                                strokeWidth="8" 
                                strokeDasharray={351}
                                strokeDashoffset={351 - (351 * telemetry.risk) / 100}
                                className="transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                           />
                       </svg>
                       <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-bold text-white font-mono">{telemetry.risk.toFixed(1)}%</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Pc</span>
                       </div>
                    </div>
                    
                    <div className="mt-4 bg-slate-950/50 rounded p-2 text-center border border-white/5">
                        <span className="text-[9px] text-slate-500 uppercase block mb-1">Time to Closest Approach</span>
                        <span className="text-xl font-mono text-white font-bold">
                           {Math.floor(telemetry.tca / 60)}m {Math.floor(telemetry.tca % 60)}s
                        </span>
                    </div>
                 </div>

                 {/* ACTIONS */}
                 <div className="glass-card p-5 rounded-xl border border-white/5 bg-slate-900/40 flex-1 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recommended Actions</h3>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto">
                        {telemetry.risk > 50 && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse-slow">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-red-400 uppercase">Collision Avoidance</span>
                                    <span className="text-[9px] bg-red-500 text-white px-1 rounded">URGENT</span>
                                </div>
                                <p className="text-[10px] text-slate-300 leading-relaxed">
                                    Maneuver required. Suggested burn: Prograde 2.5m/s.
                                </p>
                            </div>
                        )}
                        <div className="p-3 bg-slate-800/30 border border-white/5 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group">
                             <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase group-hover:text-blue-300">Update Ephemeris</span>
                                    <Zap size={10} className="text-slate-500" />
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Request high-precision orbital data from JSpOC.
                                </p>
                        </div>
                    </div>
                 </div>

              </div>
           </div>

           {/* ROW 3: CHART */}
           <div className="mt-6 h-64 glass-card rounded-xl border border-white/5 bg-slate-900/40 p-5">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Trend Analysis (24h)</h3>
                  <div className="flex gap-2">
                      <Badge variant="outline">Pc &gt; 1%</Badge>
                      <Badge variant="outline">Radial Miss &lt; 1km</Badge>
                  </div>
              </div>
              <div className="w-full h-full pb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                        <defs>
                            <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#475569" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#475569" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#94a3b8' }}
                        />
                        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right',  value: 'WARN', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right',  value: 'CRIT', fill: '#ef4444', fontSize: 10 }} />
                        <Area type="monotone" dataKey="risk_score" stroke="#3b82f6" strokeWidth={2} fill="url(#chartColor)" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

        </div>
      </main>

      {/* SEARCH OVERLAY (CMD+K) */}
      <AnimatePresence>
        {searchOpen && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
                onClick={() => setSearchOpen(false)}
            >
                <motion.div 
                    initial={{ scale: 0.95, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
                    className="w-[600px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 p-4 border-b border-white/5">
                        <Search size={18} className="text-slate-400" />
                        <input 
                            autoFocus
                            placeholder="Search satellites, debris IDs, or orbital regimes..." 
                            className="bg-transparent text-white w-full outline-none text-sm placeholder:text-slate-600" 
                        />
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">ESC</span>
                    </div>
                    <div className="p-2">
                        <p className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase">Recent Assets</p>
                        {satellites.slice(0,3).map(s => (
                            <div key={s} className="px-3 py-2 hover:bg-white/5 rounded-lg flex items-center justify-between group cursor-pointer">
                                <span className="text-sm text-slate-300 group-hover:text-white">{s}</span>
                                <span className="text-[10px] text-slate-600 group-hover:text-blue-400">LEO</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}