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
  ArrowRight,
  Activity,
  Globe,
  Zap,
  Satellite,
  Shield,
  Layers,
  BarChart3,
  Target,
  Radio,
} from "lucide-react";

/* ─── Subtle Background ─── */
const Background = () => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-surface-bg" />
    {/* Very subtle gradient blobs */}
    <div className="absolute -top-40 left-1/4 w-[800px] h-[800px] bg-accent-blue/[0.03] rounded-full blur-[150px]" />
    <div className="absolute bottom-[-200px] right-1/4 w-[700px] h-[700px] bg-accent-teal/[0.03] rounded-full blur-[150px]" />
  </div>
);

/* ─── Navigation Bar ─── */
const Navbar = () => (
  <motion.nav
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-8 pointer-events-auto"
    style={{
      background: 'linear-gradient(to bottom, rgba(15,17,21,0.9) 0%, rgba(15,17,21,0) 100%)',
    }}
  >
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-accent-blue flex items-center justify-center shadow-[0_2px_8px_rgba(76,139,245,0.3)]">
        <span className="text-white text-[12px] font-bold">O</span>
      </div>
      <span className="text-[16px] font-semibold text-text-primary tracking-tight">Orbital</span>
    </div>

    <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-text-secondary">
      <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
      <a href="#specs" className="hover:text-text-primary transition-colors">Specifications</a>
      <a href="#cta" className="hover:text-text-primary transition-colors">Get Started</a>
    </div>

    <Link to="/dashboard">
      <button className="btn-primary text-[12px] py-2 px-4 rounded-lg">
        Launch Console <ArrowRight size={14} />
      </button>
    </Link>
  </motion.nav>
);

/* ─── Feature Card ─── */
const FeatureCard = ({ icon: Icon, title, desc, delay = 0 }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const spotlight = useMotionTemplate`
    radial-gradient(
      400px circle at ${mouseX}px ${mouseY}px,
      rgba(76,139,245,0.06),
      transparent 70%
    )
  `;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      className="group relative rounded-2xl border border-white/[0.06] bg-surface-panel/50 overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20"
    >
      {/* Spotlight on hover */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: spotlight }}
      />

      <div className="relative p-7 flex flex-col h-full z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/[0.08] border border-accent-blue/[0.12] flex items-center justify-center group-hover:bg-accent-blue/[0.12] transition-colors">
            <Icon size={20} className="text-accent-blue" strokeWidth={1.8} />
          </div>
        </div>

        <h3 className="text-[16px] font-semibold text-text-primary mb-2 group-hover:text-white transition-colors">
          {title}
        </h3>

        <p className="text-[13px] text-text-secondary leading-relaxed flex-1">
          {desc}
        </p>

        <div className="mt-5 flex items-center gap-2 text-[12px] font-medium text-accent-blue opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0">
          Learn more <ArrowRight size={13} />
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Stat Card ─── */
const StatCard = ({ value, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    className="text-center"
  >
    <div className="text-[32px] font-bold text-text-primary tracking-tight">{value}</div>
    <div className="text-[13px] text-text-secondary mt-1">{label}</div>
  </motion.div>
);

/* ─── Page Link Card ─── */
const PageCard = ({ to, icon: Icon, title, desc, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    <Link to={to} className="block">
      <div className="group p-6 rounded-2xl border border-white/[0.06] bg-surface-panel/30 hover:bg-surface-panel/60 hover:border-white/[0.1] transition-all duration-200 cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/[0.08] flex items-center justify-center">
            <Icon size={20} className="text-accent-blue" strokeWidth={1.8} />
          </div>
          <ArrowRight size={16} className="text-text-tertiary group-hover:text-accent-blue group-hover:translate-x-1 transition-all" />
        </div>
        <h4 className="text-[15px] font-semibold text-text-primary mb-1 group-hover:text-white transition-colors">{title}</h4>
        <p className="text-[13px] text-text-secondary leading-relaxed">{desc}</p>
      </div>
    </Link>
  </motion.div>
);

/* ═══════════════════════════════════════════
   MAIN LANDING
   ═══════════════════════════════════════════ */

export default function Landing() {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className="bg-surface-bg min-h-screen text-text-primary overflow-x-hidden overflow-y-auto font-sans"
      style={{ height: '100vh', overflowY: 'auto' }}
    >
      <Background />
      <Navbar />

      {/* ── SECTION 1: HERO ── */}
      <div className="relative z-10 h-screen">
        <HeroReveal />

        {/* Hero Content Overlay */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] font-medium text-text-secondary mb-8 backdrop-blur-sm">
              <span className="w-[5px] h-[5px] rounded-full bg-status-success" />
              Operational — Tracking 29,000+ objects
            </div>

            <h1 className="text-[clamp(36px,6vw,72px)] font-bold text-white leading-[1.05] tracking-tight mb-6">
              Orbital Awareness,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-teal">
                Reimagined
              </span>
            </h1>

            <p className="text-[18px] text-text-secondary leading-relaxed max-w-xl mx-auto mb-10">
              Real-time collision avoidance and debris tracking for the mega-constellation era.
              Professional-grade space situational awareness.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-auto">
              <Link to="/dashboard">
                <button className="btn-primary px-8 py-3.5 text-[14px] rounded-xl shadow-[0_4px_20px_rgba(76,139,245,0.25)]">
                  Open Console <ArrowRight size={16} />
                </button>
              </Link>
              <Link to="/demo">
                <button className="btn-ghost px-8 py-3.5 text-[14px] rounded-xl">
                  <Globe size={16} /> Run Simulation
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[11px] text-text-tertiary font-medium tracking-wider">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-white/[0.15] flex items-start justify-center p-1">
            <motion.div
              className="w-1 h-2 rounded-full bg-text-secondary"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── SECTION 2: STATS ── */}
      <section className="relative z-20 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <StatCard value="29K+" label="Objects Tracked" delay={0} />
            <StatCard value="<1ms" label="Latency" delay={0.05} />
            <StatCard value="SGP4" label="Propagation" delay={0.1} />
            <StatCard value="99.9%" label="Uptime" delay={0.15} />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── SECTION 3: FEATURES ── */}
      <section id="features" className="relative z-20 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <h2 className="text-[28px] font-bold text-text-primary mb-3">Capabilities</h2>
            <p className="text-[15px] text-text-secondary max-w-xl">
              Professional tools for orbital monitoring, threat assessment, and constellation management.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              delay={0}
              icon={Radio}
              title="Real-Time Tracking"
              desc="Physics-grade SGP4 orbital propagation with live TLE ingestion and deterministic replay for post-event analysis."
            />
            <FeatureCard
              delay={0.08}
              icon={Zap}
              title="Cascade Simulation"
              desc="Kessler debris modeling with probabilistic density maps, orbit denial zones, and chain reaction forecasting."
            />
            <FeatureCard
              delay={0.16}
              icon={Satellite}
              title="Constellation Monitor"
              desc="Continuous tracking for mega-constellations with anomaly detection, orbit drift alerts, and health scoring."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <FeatureCard
              delay={0.2}
              icon={Shield}
              title="Risk Assessment"
              desc="Automated conjunction analysis with probability-of-collision calculations and actionable avoidance recommendations."
            />
            <FeatureCard
              delay={0.24}
              icon={Layers}
              title="Mission Architecture"
              desc="Built for high-frequency computations with efficient caching, real-time dashboards, and zero UI performance collapse."
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 4: EXPLORE PAGES ── */}
      <section id="specs" className="relative z-20 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <h2 className="text-[28px] font-bold text-text-primary mb-3">Explore the Platform</h2>
            <p className="text-[15px] text-text-secondary max-w-xl">
              Navigate to any module within the orbital command system.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <PageCard to="/dashboard" icon={Globe} title="Dashboard" desc="Global telemetry overview with 3D visualization and real-time tracking." delay={0} />
            <PageCard to="/live" icon={Activity} title="Live Monitor" desc="Real-time satellite feed with position updates and status monitoring." delay={0.06} />
            <PageCard to="/analyze" icon={Target} title="Mission Control" desc="Risk analysis console for conjunction assessment and avoidance planning." delay={0.12} />
            <PageCard to="/demo" icon={BarChart3} title="Simulation" desc="Demo environment for testing scenarios and exploring capabilities." delay={0.18} />
            <PageCard to="/kessler" icon={Zap} title="Kessler Simulator" desc="Debris cascade simulation modeling chain reaction scenarios." delay={0.24} />
          </div>
        </div>
      </section>

      {/* ── SECTION 5: CTA ── */}
      <section id="cta" className="relative z-20 py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[36px] font-bold text-text-primary mb-5 tracking-tight">
              Ready for launch?
            </h2>
            <p className="text-[16px] text-text-secondary mb-10 max-w-lg mx-auto leading-relaxed">
              Access the orbital command console and start monitoring space objects in real-time.
            </p>
            <Link to="/dashboard">
              <button className="btn-primary px-10 py-4 text-[15px] rounded-xl shadow-[0_4px_20px_rgba(76,139,245,0.25)]">
                Launch Console <ArrowRight size={18} />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-20 border-t border-white/[0.04] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-[13px] text-text-secondary">
            <div className="w-[5px] h-[5px] rounded-full bg-status-success" />
            <span>All Systems Operational</span>
          </div>

          <div className="flex items-center gap-8 text-[13px] text-text-tertiary">
            <Link to="/dashboard" className="hover:text-text-primary transition-colors">Console</Link>
            <Link to="/live" className="hover:text-text-primary transition-colors">Tracking</Link>
            <Link to="/analyze" className="hover:text-text-primary transition-colors">Analysis</Link>
            <Link to="/demo" className="hover:text-text-primary transition-colors">Demo</Link>
          </div>

          <div className="text-[12px] text-text-tertiary">
            © 2026 Orbital Systems
          </div>
        </div>
      </footer>
    </div>
  );
}
