import React, { useEffect, useState } from 'react';
import axios from 'axios';
import EarthSVG from '../EarthSVG';
import { AlertTriangle, Crosshair, Zap, Shield } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

export default function LiveMonitor() {
    const [events, setEvents] = useState([]);
    const [visData, setVisData] = useState([]);

    useEffect(() => {
        const interval = setInterval(fetchFeed, 2000);
        fetchFeed();
        return () => clearInterval(interval);
    }, []);

    const fetchFeed = async () => {
        try {
            const res = await axios.get(`${API_URL}/simulation/feed`);
            setEvents(res.data.events);
            
            // Map events to visualization format for EarthSVG
            // We reuse the 'satellites' prop logic but styled differently
            const markers = res.data.events.map(e => ({
                lat: e.lat,
                lon: e.lon,
                name: e.primary,
                type: 'EVENT',
                risk: e.probability
            }));
            setVisData(markers);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <header className="flex justify-between items-end border-b border-white/5 pb-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        <ActivityIcon />
                        Global Threat Monitor
                    </h2>
                    <p className="text-xs text-red-400 font-mono flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        LIVE COLLISION AVOIDANCE FEED - CLASSIFIED LEVEL 4
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
                {/* FEED PANEL */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-180px)]">
                    
                    {/* STATS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-4 rounded-xl border-l-4 border-red-500">
                             <div className="text-xs text-slate-400 uppercase font-bold">Threat Level</div>
                             <div className="text-2xl font-mono text-white font-bold tracking-tighter">CRITICAL</div>
                        </div>
                        <div className="glass-card p-4 rounded-xl border-l-4 border-blue-500">
                             <div className="text-xs text-slate-400 uppercase font-bold">Active Tracks</div>
                             <div className="text-2xl font-mono text-white font-bold tracking-tighter">24,591</div>
                        </div>
                    </div>

                    {/* SCROLLING LIST */}
                    <div className="glass-card rounded-xl p-4 flex-grow overflow-hidden flex flex-col">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Shield size={14} className="text-slate-500"/> Real-time Intercepts
                        </h3>
                        
                        <div className="overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                            {events.map((e) => (
                                <div key={e.id} className="bg-slate-900/50 border border-white/5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 font-mono">{e.primary}</span>
                                        <span className={`text-[10px] px-1.5 rounded font-bold ${e.probability > 80 ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {e.probability.toFixed(0)}% PROB
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                        <Crosshair size={12} />
                                        <span>vs {e.secondary}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between items-end border-t border-white/5 pt-2">
                                        <div>
                                            <span className="block text-[9px] text-slate-500 uppercase">Miss Distance</span>
                                            <span className="text-sm font-mono text-white">{e.miss_distance.toFixed(3)} km</span>
                                        </div>
                                         <div className="text-right">
                                            <span className="block text-[9px] text-slate-500 uppercase">Time to Impact</span>
                                            <span className="text-sm font-mono text-red-400 animate-pulse">{e.time_to_impact}s</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAIN VISUALIZATION for MONITOR */}
                <div className="lg:col-span-8 h-full">
                     <div className="glass-card rounded-2xl overflow-hidden relative w-full h-full border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(220,38,38,0.05)_100%)] pointer-events-none"></div>
                         
                         {/* Radar Scan Line Effect */}
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-30 animate-scan pointer-events-none z-20"></div>

                         <div className="w-full h-full bg-slate-950">
                            {/* We can reuse EarthSVG but maybe we need to tweak it to accept 'events' prop or map events to satellites */}
                            {/* For now, just pass as satellites but they won't have paths, just points */}
                            <EarthSVG satellites={visData} />
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
}

function ActivityIcon() {
    return (
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    )
}
