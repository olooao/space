import { useState, useEffect } from "react";
import axios from "axios";
import EarthSVG from "../EarthSVG";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const API_URL = "http://127.0.0.1:8000";

export default function Dashboard() {
  const [formData, setFormData] = useState({
    obj1_name: "ISS (ZARYA)", 
    obj2_name: "NOAA 19", 
    distance_km: 0,
    velocity_kms: 7.8,
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [satelliteList, setSatelliteList] = useState([]);
  const [activeSatellites, setActiveSatellites] = useState([]); 
  const [isLive, setIsLive] = useState(false);
  
  // Constellation Mode State
  const [constellationMode, setConstellationMode] = useState(null);
  const [constellationData, setConstellationData] = useState([]);
  const [showImpactDetails, setShowImpactDetails] = useState(false);
  const [isKessler, setIsKessler] = useState(false);

  useEffect(() => { 
    fetchHistory(); 
    fetchSatellites();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isLive) {
      checkRisk();
      interval = setInterval(checkRisk, 3000); // 3 second refresh
    }
    return () => clearInterval(interval);
  }, [isLive, formData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchSatellites = async () => {
    try {
      const res = await axios.get(`${API_URL}/satellites`);
      setSatelliteList(res.data.satellites);
    } catch (error) { console.error("Satellite List Error"); }
  };

  const toggleConstellation = async (name) => {
    if (constellationMode === name) {
        setConstellationMode(null);
        setConstellationData([]);
        return;
    }
    try {
        setConstellationMode(name);
        const res = await axios.get(`${API_URL}/constellation/${name}`);
        setConstellationData(res.data.satellites);
    } catch (e) {
        console.error("Constellation Error", e);
    }
  };

  const checkRisk = async () => {
    try {
      const response = await axios.post(`${API_URL}/analyze-risk`, {
        obj1_name: formData.obj1_name,
        obj2_name: formData.obj2_name,
        distance_km: parseFloat(formData.distance_km),
        velocity_kms: parseFloat(formData.velocity_kms),
      });
      
      const data = response.data;
      setResult(data);
      console.log("Telemetry:", data);
      
      if (data.obj1_pos && data.obj2_pos) {
          setActiveSatellites([data.obj1_pos, data.obj2_pos]);
      }
    } catch (error) {
      console.error("Link Lost:", error);
      setIsLive(false); 
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/history`);
      setHistory(res.data.reverse());
    } catch (error) { console.error("History Error"); }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex justify-between items-end border-b border-white/5 pb-4">
        <div>
             <h2 className="text-2xl font-display font-bold text-white">TacOps Dashboard</h2> 
             <p className="text-xs text-slate-400 font-mono">TACTICAL OPERATIONS / SINGLE ASSET ANALYSIS</p>
        </div>
        <div className="flex gap-4 text-xs font-mono font-medium">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                {isLive ? "LIVE TRACKING" : "SYSTEM IDLE"}
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        
        {/* LEFT CONTROL PANEL */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-slate-200 text-sm font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider">
                Target Selection
            </h3>
            
            <div className="space-y-5">
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Primary Asset</label>
                    <div className="relative">
                        <select 
                            name="obj1_name" 
                            value={formData.obj1_name} 
                            onChange={handleChange}
                            className="glass-input w-full p-3 rounded-lg appearance-none cursor-pointer text-sm font-medium"
                        >
                            <option value={formData.obj1_name}>{formData.obj1_name}</option>
                            {satelliteList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Secondary Object</label>
                    <div className="relative">
                        <select 
                            name="obj2_name" 
                            value={formData.obj2_name} 
                            onChange={handleChange}
                            className="glass-input w-full p-3 rounded-lg appearance-none cursor-pointer text-sm font-medium"
                        >
                            <option value={formData.obj2_name}>{formData.obj2_name}</option>
                            {satelliteList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                        onClick={checkRisk} 
                        className="btn-primary"
                        disabled={isLive}
                    >
                        Calculate Risk
                    </button>
                    <button 
                        onClick={() => setIsLive(!isLive)} 
                        className={`rounded-md px-4 py-2 font-medium transition-all ${isLive ? "bg-red-500/20 text-red-400 border border-red-500/30" : "btn-secondary"}`}
                    >
                         {isLive ? "STOP" : "LIVE"}
                    </button>
                </div>
            </div>
          </div>
          
           {/* CONSTELLATION & KESSLER VIEWS */}
           <div className="glass-card rounded-xl p-6">
                 <h3 className="text-slate-200 text-sm font-semibold mb-4 flex items-center gap-2 uppercase tracking-wider">
                    Orbital Fleets
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button 
                        onClick={() => toggleConstellation("ALL STARLINK")}
                        className={`py-2 px-3 rounded text-xs font-bold border transition-all ${
                            constellationMode === "ALL STARLINK" 
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                            : "bg-slate-800 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                    >
                        STARLINK
                    </button>
                    <button 
                        onClick={() => toggleConstellation("GPS SHELL")}
                         className={`py-2 px-3 rounded text-xs font-bold border transition-all ${
                            constellationMode === "GPS SHELL" 
                            ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                            : "bg-slate-800 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                    >
                        GPS
                    </button>
                </div>
                
                {/* KESSLER TOGGLE */}
                <button 
                  onClick={() => setIsKessler(!isKessler)}
                  className={`w-full py-2.5 rounded text-[10px] tracking-widest uppercase font-bold border transition-all flex items-center justify-center gap-2 ${
                    isKessler 
                     ? "bg-red-900/40 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" 
                     : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                  }`}
                >
                   {isKessler ? "⚠ KESSLER SYNDROME ACTIVE" : "SIMULATE CASCADE FAILURE"}
                </button>
           </div>

          {/* ANALYSIS RESULT BOX */}
          <div className="glass-card rounded-xl p-6 flex-grow ">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Risk Analysis</h4>
            
            {result ? (
                <div className="space-y-5">
                    <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                        <span className="text-sm text-slate-400 font-medium">Miss Distance</span>
                        <span className="text-2xl font-bold font-mono text-white">{result.distance_calculated} <span className="text-sm text-slate-500 font-sans">km</span></span>
                    </div>

                    {/* NEW FIELDS FROM BACKEND UPDATE */}
                    {result.obj1_pos && result.obj1_pos.altitude !== undefined && (
                        <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                             <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Target Alt</span>
                                <span className="text-lg font-mono text-white">{result.obj1_pos.altitude.toFixed(0)} <span className="text-xs text-slate-500">km</span></span>
                             </div>
                             <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Closing Speed</span>
                                <span className="text-lg font-mono text-white flex items-center justify-end gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    {result.velocity_kms ? result.velocity_kms.toFixed(2) : 0} <span className="text-xs text-slate-500">km/s</span>
                                </span>
                             </div>
                             {/* TCA UPDATE (Engineer Flex) */}
                             <div className="col-span-2 bg-slate-900 border border-slate-800 rounded p-2 text-center">
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block mb-1">Time to Closest Approach (TCA)</span>
                                <span className={`text-xl font-mono font-bold tracking-tight ${result.tca < 300 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                                    {result.tca ? `T-MINUS ${(result.tca / 60).toFixed(0)}m ${Math.floor(result.tca % 60)}s` : "PASSED"}
                                </span>
                             </div>
                        </div>
                    )}
                    
                    <div className="mt-2 text-center">
                         <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" fill="none" stroke="#1e293b" strokeWidth="8" />
                                <circle 
                                    cx="80" cy="80" r="70" fill="none" 
                                    stroke={result.risk_score > 50 ? "#ef4444" : "#10b981"} 
                                    strokeWidth="8" 
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * result.risk_score) / 100}
                                    className="transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-bold text-white">{result.risk_score.toFixed(0)}%</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">PROBABILITY</span>
                            </div>
                        </div>
                    </div>
                     <div 
                        onClick={() => setShowImpactDetails(!showImpactDetails)}
                        className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 text-center py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide ${
                        result.risk_score > 80 ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 
                        result.risk_score > 50 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                        'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    }`}>
                        {result.decision} 
                        <span className="block text-[9px] opacity-70 font-normal mt-1 uppercase">Impact Analysis &darr;</span>
                    </div>

                    {showImpactDetails && (
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-white/5 text-left animation-fade-in">
                             <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-1">Business Impact</h5>
                             <div className="space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-400">Revenue at Risk</span>
                                    <span className="text-xs font-mono text-white">$450M</span>
                                </div>
                             </div>
                             
                             <div className="space-y-2">
                                <button className="w-full text-left text-xs bg-slate-800 hover:bg-slate-700 p-2 rounded text-blue-300 flex items-center gap-2 transition-colors">
                                    <span className="bg-blue-500/20 text-blue-500 text-[10px] px-1.5 rounded">AUTO</span>
                                    Thruster Burn
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-50">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">System Ready</span>
                </div>
            )}
          </div>
        </div>

        {/* CENTER VISUALIZATION */}
        <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="glass-card rounded-2xl overflow-hidden relative group h-[calc(100vh-140px)] w-full border border-white/10 shadow-2xl shadow-black/50">
                <div className="absolute top-4 left-5 z-10 flex flex-col gap-1 pointer-events-none">
                     <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest bg-slate-900/50 backdrop-blur px-3 py-1 rounded-full border border-white/5 inline-flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Live Orbital View
                    </h3>
                </div>
                
                {/* SVG Component */}
                <div className="w-full h-full bg-slate-950">
                    <EarthSVG satellites={activeSatellites} constellation={constellationData} kessler={isKessler} />
                </div>
            </div>
        </div>

        {/* RIGHT TELEMETRY */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-full">
            <div className="glass-card rounded-xl p-5 h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                   <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Risk Trend</h4>
                </div>
                
                <div className="flex-grow w-full min-h-[250px] relative -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                        <defs>
                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                            dataKey="timestamp" 
                            tick={false} 
                            stroke="#334155" 
                            axisLine={false}
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            stroke="#475569" 
                            tick={{fontSize: 10, fontFamily: "sans-serif", fill: "#64748b"}}
                            width={30}
                            axisLine={false}
                        />
                         <Area 
                            type="monotone" 
                            dataKey="risk_score" 
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#colorRisk)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
