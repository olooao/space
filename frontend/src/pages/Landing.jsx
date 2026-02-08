import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue } from "framer-motion";
import HeroReveal from "../components/HeroReveal"; 
import { ShieldAlert, Activity, Globe, Zap, Satellite, Crosshair, Terminal, Cpu } from "lucide-react";

// --- COMPONENT: LIVE TELEMETRY TICKER ---
const TelemetryTicker = () => {
  const items = [
    "SYSTEM: ONLINE", "STARLINK-1092: TRACKING", "ISS: NOMINAL", 
    "DEBRIS-99: CONJUNCTION WARNING", "NOAA-19: LINK ESTABLISHED", 
    "GPS-III: ORBIT STABLE", "DEFCON: 5", "LATENCY: 12ms"
  ];

  return (
    <div className="w-full bg-slate-950/80 border-y border-white/5 backdrop-blur-sm overflow-hidden py-2 flex relative z-30">
       <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-10" />
       <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-10" />
       
       <motion.div 
         className="flex gap-12 whitespace-nowrap"
         animate={{ x: [0, -1000] }}
         transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
       >
          {[...items, ...items, ...items].map((item, i) => (
             <div key={i} className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 tracking-widest uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${item.includes("WARNING") ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                {item}
             </div>
          ))}
       </motion.div>
    </div>
  );
};

// --- COMPONENT: SPOTLIGHT FEATURE CARD ---
const FeatureCard = ({ icon, title, desc, delay }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: delay, ease: "easeOut" }}
            onMouseMove={handleMouseMove}
            className="group relative border border-white/10 bg-slate-900/40 rounded-2xl overflow-hidden"
        >
            {/* Spotlight Gradient */}
            <motion.div
              className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
              style={{
                background: useMotionTemplate`
                  radial-gradient(
                    650px circle at ${mouseX}px ${mouseY}px,
                    rgba(59, 130, 246, 0.15),
                    transparent 80%
                  )
                `,
              }}
            />
            
            <div className="relative p-8 h-full flex flex-col z-10">
                <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-800/50 border border-white/10 group-hover:scale-110 group-hover:border-blue-500/50 transition-all duration-300">
                    <div className="text-slate-300 group-hover:text-blue-400 transition-colors">
                        {icon}
                    </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-3 tracking-wide">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
                
                {/* Tech Decorator */}
                <div className="mt-auto pt-6 flex justify-between items-end opacity-20 group-hover:opacity-50 transition-opacity">
                    <Crosshair size={12} />
                    <span className="text-[9px] font-mono">SYS.0{Math.floor(delay * 10)}</span>
                </div>
            </div>
        </motion.div>
    );
}

// --- MAIN LANDING PAGE ---
export default function Landing() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  
  return (
    <div ref={containerRef} className="bg-slate-950 min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* SECTION 1: HERO REVEAL */}
      <div className="relative z-10 h-screen">
         <HeroReveal />
      </div>

      {/* GRADIENT TRANSITION */}
      <div className="relative z-20 -mt-32 h-40 bg-gradient-to-b from-transparent via-slate-950 to-slate-950 pointer-events-none" />

      {/* CONTENT LAYER */}
      <div className="relative z-20 bg-slate-950 min-h-screen flex flex-col">
        
        {/* BACKGROUND FX */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px] mix-blend-screen" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
        </div>

        {/* SECTION 2: MISSION CONTROL TERMINAL */}
        <section className="relative py-20 px-6">
            <div className="max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "circOut" }}
                    viewport={{ once: true }}
                    className="relative bg-slate-900/20 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
                >
                    {/* Terminal Header */}
                    <div className="h-12 border-b border-white/5 bg-white/5 flex items-center px-6 gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                        </div>
                        <div className="ml-4 text-[10px] font-mono text-slate-500 tracking-widest flex-1 text-center">
                            RESTRICTED ACCESS // ASRIDE.OS.V2
                        </div>
                    </div>

                    <div className="p-12 md:p-20 text-center relative">
                        {/* HUD Corners */}
                        <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-blue-500/30" />
                        <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-blue-500/30" />
                        <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-blue-500/30" />
                        <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-blue-500/30" />

                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono tracking-widest uppercase mb-10"
                        >
                            <Cpu size={12} className="animate-spin-slow" />
                            <span>Neural Net Active</span>
                        </motion.div>

                        <h2 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                            ORBITAL<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-slate-900">SUPREMACY</span>
                        </h2>
                        
                        <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                            The first <span className="text-white font-medium">autonomous collision avoidance system</span> designed for the mega-constellation era. Secure your assets against Kessler Syndrome.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                            <Link to="/dashboard">
                                <button className="relative group px-8 py-4 bg-blue-600 text-white font-bold rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')] opacity-20" />
                                    <div className="relative flex items-center gap-3">
                                        <Terminal size={18} />
                                        <span>ENTER CONSOLE</span>
                                    </div>
                                </button>
                            </Link>
                            
                            <Link to="/demo">
                                <button className="px-8 py-4 bg-transparent border border-white/10 text-slate-300 font-bold rounded-xl flex items-center gap-3 hover:bg-white/5 hover:border-white/20 transition-all">
                                    <Globe size={18} />
                                    <span>SIMULATION</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>

        {/* TELEMETRY TICKER */}
        <TelemetryTicker />

        {/* SECTION 3: BENTO GRID FEATURES */}
        <section className="py-24 px-6 max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
                <div>
                    <h3 className="text-3xl font-bold text-white mb-2">Technical Specifications</h3>
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Cleared for Public Release</p>
                </div>
                <div className="hidden md:block text-right">
                    <p className="text-slate-500 font-mono text-xs">BUILD: 2026.04.12.RC2</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard 
                    delay={0}
                    icon={<ShieldAlert size={24} />} 
                    title="Real-Time SGP4" 
                    desc="Physics-accurate propagation engine using latest Celestrak TLE data for sub-meter tracking precision." 
                />
                <FeatureCard 
                    delay={0.1}
                    icon={<Zap size={24} />} 
                    title="Kessler Event Sim" 
                    desc="Advanced particle modeling to simulate debris cascade scenarios and orbital denial events." 
                />
                <FeatureCard 
                    delay={0.2}
                    icon={<Satellite size={24} />} 
                    title="Constellation Monitor" 
                    desc="Live telemetry tracking for mega-constellations including Starlink, OneWeb, and GPS III." 
                />
            </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-auto border-t border-white/5 py-12 bg-slate-950">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <Activity size={12} className="text-emerald-500" />
                    <span>SYSTEM NOMINAL</span>
                </div>
                <div className="flex gap-8">
                    <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
                    <span className="hover:text-white cursor-pointer transition-colors">API Status</span>
                    <span className="hover:text-white cursor-pointer transition-colors">Legal</span>
                </div>
                <div>
                    © 2026 ASRIDE DEFENSE
                </div>
            </div>
        </footer>
      </div>
    </div>
  );
}