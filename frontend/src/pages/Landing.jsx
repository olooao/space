import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import HeroReveal from "../components/HeroReveal"; 
import { ShieldAlert, Activity, Globe, Zap, ChevronDown, Satellite } from "lucide-react";

// --- COMPONENT: PARALLAX STARFIELD ---
const StarField = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Layer 1: Distant Stars (Static/Slow) */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse-slow"></div>
      
      {/* Layer 2: Floating Particles (CSS Animation would be here, simplified for React) */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full opacity-30"
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: Math.random() * window.innerHeight,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: [null, Math.random() * -100], 
            opacity: [0.2, 0.5, 0.2] 
          }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{ width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px' }}
        />
      ))}
    </div>
  );
};

// --- COMPONENT: FEATURE CARD ---
const FeatureCard = ({ icon, title, desc, delay }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: delay, ease: "easeOut" }}
            className="group relative p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:bg-slate-800/60 overflow-hidden"
        >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
                <div className="mb-6 p-4 bg-slate-950/50 rounded-xl w-fit border border-white/5 group-hover:scale-110 group-hover:border-blue-500/30 transition-transform duration-300 shadow-lg shadow-black/50">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide group-hover:text-blue-200 transition-colors">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-light">{desc}</p>
            </div>
        </motion.div>
    );
}

// --- MAIN LANDING PAGE ---
export default function Landing() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Parallax: Content moves slower than scroll
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  
  return (
    <div ref={containerRef} className="bg-slate-950 min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* SECTION 1: HERO (THE "REVEAL") */}
      <div className="relative z-10">
         <HeroReveal />
      </div>

      {/* GRADIENT FADE BETWEEN HERO AND CONTENT */}
      <div className="relative z-20 -mt-32 h-32 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none" />

      {/* CONTENT WRAPPER */}
      <div className="relative z-20 bg-slate-950">
        <StarField />
        
        {/* SECTION 2: THE "MISSION BRIEF" CTA */}
        <section className="relative pt-10 pb-32 px-6">
            <div className="max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    viewport={{ once: true }}
                    className="relative glass-card bg-slate-900/30 backdrop-blur-md border border-white/10 p-12 md:p-20 rounded-[3rem] shadow-2xl shadow-black overflow-hidden"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                    <div className="relative z-10 text-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono tracking-[0.2em] uppercase mb-8"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            System v2.1.0 Ready
                        </motion.div>

                        <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                            Orbital Security <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-white animate-pulse-slow">
                                Has Evolved.
                            </span>
                        </h2>
                        
                        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                            Deploy military-grade tracking, Kessler simulation, and collision avoidance logic in a unified command interface.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link to="/dashboard">
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group relative px-10 py-5 bg-blue-600 text-white font-bold rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_0_60px_rgba(37,99,235,0.5)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <Activity size={20} />
                                        <span className="tracking-wider">INITIALIZE SYSTEM</span>
                                    </div>
                                </motion.button>
                            </Link>
                            
                            <Link to="/demo">
                                <motion.button 
                                    whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.3)" }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-10 py-5 bg-transparent border border-white/10 text-slate-300 font-bold rounded-2xl flex items-center gap-3 hover:bg-white/5 transition-colors"
                                >
                                    <Globe size={20} />
                                    <span className="tracking-wider">LIVE DEMO</span>
                                </motion.button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>

        {/* SECTION 3: FEATURES GRID */}
        <section className="pb-32 px-6 max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
                <FeatureCard 
                    delay={0}
                    icon={<ShieldAlert className="text-red-400" size={32} />} 
                    title="Real-Time SGP4" 
                    desc="Physics-accurate propagation engine using latest Celestrak TLE data for sub-meter tracking precision." 
                />
                <FeatureCard 
                    delay={0.2}
                    icon={<Zap className="text-amber-400" size={32} />} 
                    title="Kessler Event Sim" 
                    desc="Advanced particle modeling to simulate debris cascade scenarios and orbital denial events." 
                />
                <FeatureCard 
                    delay={0.4}
                    icon={<Satellite className="text-cyan-400" size={32} />} 
                    title="Constellation Monitor" 
                    desc="Live telemetry tracking for mega-constellations including Starlink, OneWeb, and GPS III." 
                />
            </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/5 py-12">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>ASRIDE NETWORK: SECURE</span>
                </div>
                <div>
                    © 2026 ORBITAL DEFENSE SYSTEMS
                </div>
            </div>
        </footer>
      </div>

    </div>
  );
}