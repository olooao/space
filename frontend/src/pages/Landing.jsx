import { useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import HeroReveal from "../components/HeroReveal";
import {
  ShieldAlert,
  Activity,
  Globe,
  Zap,
  Satellite,
  Crosshair,
  Terminal,
  Cpu,
  Radar,
  Orbit,
  Layers,
} from "lucide-react";

/* =============================================================================
   SPACE BACKGROUND LAYERS
============================================================================= */

const Starfield = () => {
  // Pure CSS star layers (cheap + fast)
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Deep base */}
      <div className="absolute inset-0 bg-slate-950" />

      {/* Nebula blobs */}
      <div className="absolute -top-40 left-1/4 w-[900px] h-[900px] bg-blue-600/10 rounded-full blur-[140px] mix-blend-screen animate-pulse-slow" />
      <div className="absolute bottom-[-300px] right-1/4 w-[850px] h-[850px] bg-cyan-500/10 rounded-full blur-[150px] mix-blend-screen" />
      <div className="absolute top-1/3 right-[-250px] w-[700px] h-[700px] bg-indigo-500/10 rounded-full blur-[160px] mix-blend-screen" />

      {/* Stars */}
      <div className="absolute inset-0 opacity-[0.25] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 opacity-[0.14] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:60px_60px]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:120px_120px]" />

      {/* Subtle noise */}
      <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />

      {/* Scanline */}
      <motion.div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(59,130,246,0.15), transparent)",
        }}
        animate={{ y: ["-20%", "120%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.9)_90%)]" />
    </div>
  );
};

const OrbitLines = () => {
  return (
    <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden opacity-[0.35]">
      <div className="absolute top-1/2 left-1/2 w-[1100px] h-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10" />
      <div className="absolute top-1/2 left-1/2 w-[650px] h-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/10" />

      {/* Diagonal grid */}
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:80px_80px]" />
    </div>
  );
};

/* =============================================================================
   TELEMETRY TICKER (SEAMLESS LOOP)
============================================================================= */

const TelemetryTicker = () => {
  const items = useMemo(
    () => [
      "SYSTEM: ONLINE",
      "STARLINK-1092: TRACKING",
      "ISS: NOMINAL",
      "DEBRIS-99: CONJUNCTION WARNING",
      "NOAA-19: LINK ESTABLISHED",
      "GPS-III: ORBIT STABLE",
      "DEFCON: 5",
      "LATENCY: 12ms",
      "PROPAGATION: SGP4",
      "THREAT MODEL: ACTIVE",
      "UPLINK: SECURE",
    ],
    []
  );

  const strip = [...items, ...items];

  return (
    <div className="w-full bg-slate-950/70 border-y border-white/5 backdrop-blur-xl overflow-hidden py-2 flex relative z-30">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      <motion.div
        className="flex gap-12 whitespace-nowrap will-change-transform"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
      >
        {strip.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 tracking-widest uppercase"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.includes("WARNING")
                  ? "bg-red-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* =============================================================================
   FEATURE CARD (SPACE HUD + SPOTLIGHT + SCAN)
============================================================================= */

const FeatureCard = ({ icon, title, desc, delay, tag }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const spotlight = useMotionTemplate`
    radial-gradient(
      650px circle at ${mouseX}px ${mouseY}px,
      rgba(56,189,248,0.18),
      transparent 70%
    )
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      className="group relative border border-white/10 bg-slate-900/30 rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />

      {/* Scan shimmer */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.08), transparent 65%)",
        }}
        animate={{ x: ["-60%", "60%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner */}
      <div className="relative p-8 h-full flex flex-col z-10">
        {/* Top row */}
        <div className="flex items-start justify-between gap-6 mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/50 border border-white/10 group-hover:scale-110 group-hover:border-cyan-400/40 transition-all duration-300">
            <div className="text-slate-200 group-hover:text-cyan-300 transition-colors">
              {icon}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] font-mono tracking-widest uppercase text-slate-500">
              {tag}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
              <Crosshair size={12} />
              <span className="text-[9px] font-mono">SYS.{Math.floor(delay * 100)}</span>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-3 tracking-wide">
          {title}
        </h3>

        <p className="text-slate-400 text-sm leading-relaxed font-light">
          {desc}
        </p>

        {/* Footer HUD */}
        <div className="mt-auto pt-7 flex items-center justify-between">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="ml-4 text-[10px] font-mono text-slate-600">
            READY
          </div>
        </div>
      </div>

      {/* Outer glow */}
      <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition duration-300 shadow-[0_0_70px_rgba(34,211,238,0.10)]" />
    </motion.div>
  );
};

/* =============================================================================
   MAIN LANDING
============================================================================= */

export default function Landing() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  // Parallax on orbit lines
  const orbitY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const orbitOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <div
      ref={containerRef}
      className="bg-slate-950 min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden"
    >
      {/* GLOBAL SPACE BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <Starfield />
        <motion.div style={{ y: orbitY, opacity: orbitOpacity }}>
          <OrbitLines />
        </motion.div>
      </div>

      {/* SECTION 1: HERO REVEAL */}
      <div className="relative z-10 h-screen">
        <HeroReveal />
      </div>

      {/* CINEMATIC TRANSITION */}
      <div className="relative z-20 -mt-32 h-56 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950" />
        <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:100px_100px]" />
      </div>

      {/* CONTENT */}
      <div className="relative z-20 bg-transparent min-h-screen flex flex-col">
        {/* SECTION 2: MISSION CONTROL TERMINAL */}
        <section className="relative py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "circOut" }}
              viewport={{ once: true }}
              className="relative bg-slate-900/25 backdrop-blur-2xl border border-white/10 rounded-[2.2rem] overflow-hidden shadow-[0_50px_140px_rgba(0,0,0,0.55)]"
            >
              {/* Terminal Header */}
              <div className="h-12 border-b border-white/5 bg-white/5 flex items-center px-6 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>

                <div className="ml-4 text-[10px] font-mono text-slate-500 tracking-widest flex-1 text-center">
                  RESTRICTED ACCESS // ASRIDE.OS.V3
                </div>

                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-slate-600 tracking-widest">
                  <Radar size={14} />
                  LIVE
                </div>
              </div>

              <div className="p-12 md:p-20 text-center relative">
                {/* HUD corners */}
                <div className="absolute top-6 left-6 w-5 h-5 border-t border-l border-cyan-400/30" />
                <div className="absolute top-6 right-6 w-5 h-5 border-t border-r border-cyan-400/30" />
                <div className="absolute bottom-6 left-6 w-5 h-5 border-b border-l border-cyan-400/30" />
                <div className="absolute bottom-6 right-6 w-5 h-5 border-b border-r border-cyan-400/30" />

                {/* Status pill */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-[10px] font-mono tracking-widest uppercase mb-10"
                >
                  <Cpu size={12} className="animate-spin-slow" />
                  <span>Autonomous Net Active</span>
                </motion.div>

                <h2 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                  ORBITAL
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-blue-400 to-slate-900">
                    SUPREMACY
                  </span>
                </h2>

                <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                  Autonomous collision avoidance for the mega-constellation era.
                  Track debris, predict conjunctions, and prevent cascade failure
                  scenarios at scale.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                  <Link to="/dashboard">
                    <button className="relative group px-8 py-4 bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-black rounded-xl overflow-hidden transition-all hover:scale-[1.04] active:scale-95 shadow-[0_0_70px_rgba(34,211,238,0.25)]">
                      <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')]" />
                      <div className="relative flex items-center gap-3">
                        <Terminal size={18} />
                        <span>ENTER CONSOLE</span>
                      </div>
                    </button>
                  </Link>

                  <Link to="/demo">
                    <button className="px-8 py-4 bg-transparent border border-white/10 text-slate-200 font-bold rounded-xl flex items-center gap-3 hover:bg-white/5 hover:border-white/20 transition-all">
                      <Globe size={18} />
                      <span>SIMULATION</span>
                    </button>
                  </Link>
                </div>

                {/* Mini stats */}
                <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {[
                    { k: "Objects Tracked", v: "29,000+" },
                    { k: "Conjunction Alerts", v: "Real-time" },
                    { k: "Propagation", v: "SGP4 + TLE" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-slate-950/30 backdrop-blur-xl p-5"
                    >
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        {s.k}
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* bottom glow */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </section>

        {/* TELEMETRY */}
        <TelemetryTicker />

        {/* SECTION 3: FEATURES */}
        <section className="py-24 px-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
            <div>
              <h3 className="text-3xl font-bold text-white mb-2">
                Technical Specifications
              </h3>
              <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                Cleared for Public Release
              </p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-slate-500 font-mono text-xs">
                BUILD: 2026.04.12.RC3
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              delay={0}
              tag="PROPAGATION"
              icon={<Orbit size={24} />}
              title="Real-Time SGP4"
              desc="Physics-grade orbital propagation with live TLE ingestion and deterministic replay for post-event analysis."
            />
            <FeatureCard
              delay={0.1}
              tag="THREAT MODEL"
              icon={<Zap size={24} />}
              title="Kessler Event Simulation"
              desc="Cascade debris modeling with probabilistic density maps, orbit denial zones, and chain reaction forecasting."
            />
            <FeatureCard
              delay={0.2}
              tag="TELEMETRY"
              icon={<Satellite size={24} />}
              title="Constellation Monitor"
              desc="Continuous tracking for mega-constellations with anomaly detection, orbit drift alerts, and health flags."
            />
          </div>

          {/* Extra bento row */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <FeatureCard
              delay={0.25}
              tag="SECURITY"
              icon={<ShieldAlert size={24} />}
              title="Secure Command Layer"
              desc="Defense-grade console access with audit trails, signed actions, and mission history snapshots."
            />
            <FeatureCard
              delay={0.3}
              tag="ARCHITECTURE"
              icon={<Layers size={24} />}
              title="Mission-Scale Runtime"
              desc="Built for high-frequency calculations, caching, and real-time dashboards without UI performance collapse."
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-auto border-t border-white/5 py-12 bg-slate-950/30 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs font-mono uppercase tracking-widest">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <Activity size={12} className="text-emerald-500" />
              <span>SYSTEM NOMINAL</span>
            </div>

            <div className="flex gap-8">
              <span className="hover:text-white cursor-pointer transition-colors">
                Documentation
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                API Status
              </span>
              <span className="hover:text-white cursor-pointer transition-colors">
                Legal
              </span>
            </div>

            <div>© 2026 ASRIDE DEFENSE</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
