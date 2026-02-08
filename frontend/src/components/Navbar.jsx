import { useState, useEffect } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Activity, Radio, PlayCircle, 
  Settings, LogOut, ChevronRight, Command 
} from 'lucide-react';

// 1. IMPORT YOUR LOGO
import logoAsset from '../assets/logo.png'; 

// --- CLOCK COMPONENT ---
const MissionClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="font-mono text-[10px] text-slate-500 tracking-widest mt-1">
      UTC {time.toISOString().split('T')[1].split('.')[0]}
    </div>
  );
};

export default function Navbar() {
  const location = useLocation();
  
  const links = [
    { to: "/dashboard", label: "Risk Command", icon: <LayoutDashboard size={18} /> },
    { to: "/live", label: "Global Monitor", icon: <Activity size={18} /> },
    { to: "/demo", label: "Mission Sim", icon: <PlayCircle size={18} /> },
    { to: "/constellation", label: "Fleet Intel", icon: <Radio size={18} /> },
  ];

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-slate-950 border-r border-white/5 flex flex-col z-50 shadow-2xl shadow-black">
      
      {/* --- BRAND HEADER --- */}
      <div className="h-24 flex flex-col justify-center px-6 border-b border-white/5 bg-slate-900/20 backdrop-blur-sm relative overflow-hidden group">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
             <img 
                src={logoAsset} 
                alt="Logo" 
                className="w-10 h-10 rounded-lg object-contain bg-slate-900 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
             />
             {/* Ping animation on logo */}
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-slate-950 animate-pulse" />
          </div>
          
          <div className="hidden md:block">
             <h1 className="text-lg font-bold text-white tracking-tight leading-none flex items-center gap-2">
                ASRIDE <span className="text-[9px] bg-white/10 px-1 rounded text-slate-300 font-normal">v2.0</span>
            </h1>
            <MissionClock />
          </div>
        </div>
      </div>

      {/* --- NAVIGATION LINKS --- */}
      <div className="flex-grow py-8 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 hidden md:block">
            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Main Modules</span>
        </div>
        
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className="relative block group"
            >
              {/* ACTIVE BACKGROUND (Motion Layout) */}
              {isActive && (
                <motion.div 
                    layoutId="activeNav"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent rounded-lg border-l-2 border-blue-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
              )}

              <div className={`relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
                isActive ? "text-blue-100" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
                <span className={`transition-colors ${isActive ? "text-blue-400" : "group-hover:text-white"}`}>
                    {link.icon}
                </span>
                
                <span className="hidden md:block text-sm font-medium tracking-wide">
                    {link.label}
                </span>

                {/* Live Indicator Dot */}
                {link.label === "Global Monitor" && (
                   <div className="hidden md:flex ml-auto items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                   </div>
                )}
                
                {/* Hover Arrow */}
                {!isActive && (
                    <ChevronRight size={14} className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 hidden md:block text-slate-500" />
                )}
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* --- FOOTER: OPERATOR & SYSTEM --- */}
      <div className="p-4 border-t border-white/5 bg-slate-900/30 backdrop-blur-md">
        
        {/* OPERATOR PROFILE */}
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                <Command size={14} className="text-slate-300" />
            </div>
            <div className="hidden md:block overflow-hidden">
                <div className="text-xs font-bold text-white truncate">CMDR. SHEPARD</div>
                <div className="text-[10px] text-slate-500 truncate">Clearance: Level 5</div>
            </div>
            <Settings size={14} className="ml-auto text-slate-600 group-hover:text-white hidden md:block" />
        </div>

        {/* SYSTEM STATUS WIDGET */}
        <div className="hidden md:block bg-black/40 rounded-lg p-3 border border-white/5 relative overflow-hidden">
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan" style={{backgroundSize: '100% 3px'}} />
            
            <div className="flex justify-between items-center mb-2 relative z-10">
                <span className="text-[10px] uppercase font-bold text-slate-500">Uplink Status</span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Activity size={10} /> 98%
                </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative z-10">
                <div className="w-[98%] h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
        </div>

      </div>
    </nav>
  );
}