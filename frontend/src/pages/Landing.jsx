import { Link } from "react-router-dom";
import HeroReveal from "../components/HeroReveal"; // <--- FIXED: No curly braces
import { ShieldAlert, Activity, Globe, Zap } from "lucide-react";

// Landing Page Component
export default function Landing() {
  return (
    <div className="bg-slate-950 min-h-screen text-slate-200 selection:bg-blue-500/30">
      
      {/* SECTION 1: HERO */}
      {/* This component will now load correctly */}
      <HeroReveal />

      {/* SECTION 2: THE "TRY THIS" CTA */}
      <section className="relative z-30 -mt-20 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card bg-slate-900/80 backdrop-blur-xl border border-white/10 p-12 rounded-3xl shadow-2xl shadow-blue-900/20 text-center">
            
            <h2 className="text-4xl font-bold text-white mb-6">
              Space Situational Awareness <br/>
              <span className="text-blue-500">Reimagined.</span>
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Experience real-time collision avoidance, Kessler syndrome simulation, and orbital mechanics in a defense-grade dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/dashboard" 
                className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_40px_rgba(37,99,235,0.7)] flex items-center gap-3"
              >
                <Activity className="animate-pulse" />
                <span>Initialize Dashboard</span>
                <span className="absolute -top-2 -right-2 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
              </Link>
              
              <Link 
                to="/demo" 
                className="px-8 py-4 bg-transparent border border-white/10 hover:bg-white/5 text-slate-300 font-bold rounded-xl transition-all flex items-center gap-3"
              >
                <Globe size={20} />
                View Live Demo
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURES GRID */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
            {[
                { icon: <ShieldAlert className="text-red-500" />, title: "Collision Physics", desc: "Real-time SGP4 propagation using Skyfield engines." },
                { icon: <Zap className="text-amber-500" />, title: "Kessler Simulation", desc: "Simulate orbital decay and debris chain reactions." },
                { icon: <Activity className="text-blue-500" />, title: "Live Telemetry", desc: "Track active constellations (Starlink, GPS, Iridium)." },
            ].map((f, i) => (
                <div key={i} className="p-8 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-blue-500/30 transition-colors group">
                    <div className="mb-4 p-3 bg-slate-950 rounded-lg w-fit group-hover:scale-110 transition-transform">{f.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
            ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 text-center text-slate-600 text-sm font-mono uppercase tracking-widest">
        ASRIDE SYSTEM v2.1.0 // SECURE CONNECTION
      </footer>

    </div>
  );
}