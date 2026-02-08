import { useState, useEffect } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Activity, Radio, PlayCircle, 
  Settings, ChevronRight, Command, 
  ChevronsLeft, ChevronsRight // New Icons for toggle
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
    <div className="font-mono text-[10px] text-slate-500 tracking-widest mt-1 whitespace-nowrap">
      UTC {time.toISOString().split('T')[1].split('.')[0]}
    </div>
  );
};

export default function Navbar() {
  const location = useLocation();

  // --- STATE MANAGEMENT ---
  const [isCollapsed, setIsCollapsed] = useState(false); // User preference (Locked vs Unlocked)
  const [isHovered, setIsHovered] = useState(false);     // Mouse interaction

  // The Navbar is "Expanded" if: User hasn't collapsed it OR User is hovering over it
  const showFullNav = !isCollapsed || isHovered;
  
  const links = [
    { to: "/dashboard", label: "Risk Command", icon: <LayoutDashboard size={18} /> },
    { to: "/live", label: "Global Monitor", icon: <Activity size={18} /> },
    { to: "/demo", label: "Mission Sim", icon: <PlayCircle size={18} /> },
    { to: "/constellation", label: "Fleet Intel", icon: <Radio size={18} /> },
  ];

  return (
    <motion.nav 
      // --- ANIMATION CONFIG ---
      initial={false}
      animate={{ width: showFullNav ? 256 : 80 }} // 256px (w-64) vs 80px (w-20)
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      
      // --- INTERACTION ---
      onMouseEnter={() => setIsCollapsed(true) && setIsHovered(true)} // Keep logic simple
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      
      className="fixed left-0 top-0 bottom-0 bg-slate-950 border-r border-white/5 flex flex-col z-50 shadow-2xl shadow-black overflow-hidden"
    >
      
      {/* --- BRAND HEADER --- */}
      <div className="h-24 flex flex-col justify-center px-5 border-b border-white/5 bg-slate-900/20 backdrop-blur-sm relative shrink-0">
        
        <div className="flex items-center gap-3 relative z-10">
          {/* Logo - Always Visible */}
          <div className="relative shrink-0">
             <img 
                src={logoAsset} 
                alt="Logo" 
                className="w-10 h-10 rounded-lg object-contain bg-slate-900 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
             />
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-slate-950 animate-pulse" />
          </div>
          
          {/* Text - Hides when collapsed */}
          <AnimatePresence>
            {showFullNav && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                 <h1 className="text-lg font-bold text-white tracking-tight leading-none flex items-center gap-2 whitespace-nowrap">
                    ASRIDE <span className="text-[9px] bg-white/10 px-1 rounded text-slate-300 font-normal">v2.0</span>
                 </h1>
                 <MissionClock />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- COLLAPSE TOGGLE BUTTON --- */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-2 right-2 text-slate-600 hover:text-white transition-colors"
        >
            {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>

      </div>

      {/* --- NAVIGATION LINKS --- */}
      <div className="flex-grow py-8 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        
        {/* Section Label */}
        {showFullNav && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="px-3 mb-2 whitespace-nowrap"
            >
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Main Modules</span>
            </motion.div>
        )}
        
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className="relative block group"
            >
              {/* ACTIVE BACKGROUND */}
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
                {/* Icon - Always Visible */}
                <span className={`transition-colors shrink-0 ${isActive ? "text-blue-400" : "group-hover:text-white"}`}>
                    {link.icon}
                </span>
                
                {/* Label - Hides when collapsed */}
                <AnimatePresence>
                    {showFullNav && (
                        <motion.span 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-sm font-medium tracking-wide whitespace-nowrap"
                        >
                            {link.label}
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Live Indicator (Only on Global Monitor) */}
                {link.label === "Global Monitor" && showFullNav && (
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="ml-auto flex items-center gap-2"
                    >
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                       </span>
                    </motion.div>
                 )}
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* --- FOOTER: OPERATOR & SYSTEM --- */}
      <div className="p-4 border-t border-white/5 bg-slate-900/30 backdrop-blur-md shrink-0">
        
        {/* OPERATOR PROFILE */}
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group overflow-hidden">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors shrink-0">
                <Command size={14} className="text-slate-300" />
            </div>
            
            <AnimatePresence>
                {showFullNav && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="text-xs font-bold text-white truncate">CMDR. SHEPARD</div>
                        <div className="text-[10px] text-slate-500 truncate">Clearance: Level 5</div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {showFullNav && <Settings size={14} className="ml-auto text-slate-600 group-hover:text-white" />}
        </div>

        {/* SYSTEM STATUS WIDGET (Only visible when expanded) */}
        <AnimatePresence>
            {showFullNav && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-black/40 rounded-lg p-3 border border-white/5 relative overflow-hidden"
                >
                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-scan" style={{backgroundSize: '100% 3px'}} />
                    
                    <div className="flex justify-between items-center mb-2 relative z-10">
                        <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">Uplink Status</span>
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <Activity size={10} /> 98%
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative z-10">
                        <div className="w-[98%] h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </motion.nav>
  );
}