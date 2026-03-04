/**
 * MissionDemo.jsx — Cinematic simulation demonstrating the ASRIDE solution
 * to the Kessler Syndrome.
 *
 * Auto-playing chapters walk the audience through:
 *   1. The problem (crowded LEO)
 *   2. A conjunction threat
 *   3. Catastrophic collision & cascade (failure path)
 *   4. Rewind — the ASRIDE alternative
 *   5. Autonomous detection & evasion (success path)
 *   6. Summary: Detect → Evade → Prevent
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Globe3D from "../components/Globe3D";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Play, Pause, RotateCcw, SkipForward,
  AlertTriangle, Shield, Zap, Radio,
  Globe, Activity, ShieldCheck, Flame,
} from "lucide-react";
import { SATELLITE_DATABASE, generateDemoPositions } from "../data/satellites";

/* ═══════════════════════════════════════════
   CHAPTERS
   ═══════════════════════════════════════════ */
const CHAPTERS = [
  { id: "intro", duration: null, headline: "The Kessler Syndrome", subtitle: "A chain reaction of orbital collisions that could render space unusable for generations." },
  { id: "problem", duration: 10000, headline: "A Crowded Frontier", subtitle: "Over 29,000 tracked objects orbit Earth at 28,000 km/h. Every launch adds more. The collision risk grows exponentially." },
  { id: "threat", duration: 10000, headline: "Conjunction Detected", subtitle: "ISS (ZARYA) and COSMOS 2251 debris converging at 10.5 km/s. Miss distance: 120 meters." },
  { id: "impact", duration: 12000, headline: "Catastrophic Impact", subtitle: "Without intervention, a single collision generates over 1,200 fragments — each a future projectile." },
  { id: "rewind", duration: 5000, headline: "But what if...", subtitle: "We could see it coming. And act." },
  { id: "detect", duration: 9000, headline: "Autonomous Detection", subtitle: "ASRIDE propagates every orbit 72 hours ahead. The conjunction is flagged at 94% collision probability." },
  { id: "evade", duration: 10000, headline: "Precision Evasion", subtitle: "Clohessy-Wiltshire optimal maneuver computed in milliseconds. A 0.32 m/s burn changes everything." },
  { id: "summary", duration: null, headline: "The Answer to Kessler", subtitle: "Prevent. Detect. Evade. ASRIDE is the autonomous guardian of orbital space." },
];

/* ═══════════════════════════════════════════
   SCENE DATA
   ═══════════════════════════════════════════ */
const ISS_POS = { name: "ISS (ZARYA)", lat: 45.2, lon: -73.5, alt_km: 408, velocity: 7.66, type: "Station", status: "operational" };
const COSMOS_POS = { name: "COSMOS 2251 DEB", lat: 44.8, lon: -71.2, alt_km: 790, velocity: 7.44, type: "Debris", status: "debris", risk_level: "RED" };

const EVASION_DATA = {
  primary: "ISS (ZARYA)", secondary: "COSMOS 2251 DEB",
  original_trajectory: [[-100,25,408],[-90,30,408],[-80,36,408],[-73,42,408],[-65,47,408],[-55,49,408],[-45,48,408],[-35,44,408],[-25,38,408],[-15,30,408],[-5,22,408]],
  evasion_trajectory: [[-100,25,408],[-90,30,408],[-80,36,410],[-73,44,415],[-65,50,422],[-55,54,426],[-45,54,423],[-35,50,418],[-25,44,413],[-15,36,410],[-5,28,408]],
  burn_point: { lat: 42, lon: -73, alt_km: 408 }, magnitude_m_s: 0.32,
};

function generateDebris(count, center) {
  return Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, spread = Math.random() * 25 + 2;
    return { lat: center.lat + Math.cos(a) * spread * (0.5 + Math.random()), lon: center.lon + Math.sin(a) * spread * 1.2, alt_km: center.alt_km + (Math.random() - 0.5) * 350, generation: Math.floor(Math.random() * 3), mass: Math.random() * 8 + 0.1, am_ratio: 0.01 + Math.random() * 0.3 };
  });
}

/* ═══════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════ */
function useCounter(target, duration = 2000, active = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const start = Date.now();
    const id = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

function useTypewriter(text, speed = 30, active = true) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return displayed;
}

/* ═══════════════════════════════════════════
   ANIMATED STAT ROW (counts up from 0)
   ═══════════════════════════════════════════ */
const PROBLEM_STATS = [
  { label: "Tracked Objects", target: 29000, suffix: "+", color: "text-accent-blue" },
  { label: "Close Approaches / Day", target: 2600, prefix: "~", color: "text-status-warning" },
  { label: "Active Satellites", target: 7500, suffix: "+", color: "text-status-success" },
  { label: "Debris > 10cm", target: 36500, suffix: "+", color: "text-status-critical" },
  { label: "Untrackable < 1cm", target: 130, suffix: "M+", color: "text-text-tertiary" },
];

function AnimatedStatRow({ stat, delay, active }) {
  const val = useCounter(stat.target, 2000, active);
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} className="flex justify-between items-center">
      <span className="text-[11px] text-text-secondary">{stat.label}</span>
      <span className={`text-[15px] font-bold font-mono tabular-nums ${stat.color}`}>
        {stat.prefix || ""}{val.toLocaleString()}{stat.suffix || ""}
      </span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   TCA COUNTDOWN
   ═══════════════════════════════════════════ */
function TCACountdown({ active }) {
  const [secs, setSecs] = useState(2852);
  useEffect(() => {
    if (!active) { setSecs(2852); return; }
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 100);
    return () => clearInterval(id);
  }, [active]);
  const m = Math.floor(secs / 60), s = secs % 60;
  const display = `T-${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-surface-elevated/80 rounded-lg border border-white/[0.06]">
      <span className="w-[5px] h-[5px] rounded-full bg-status-critical animate-pulse" />
      <span className="text-[10px] text-text-tertiary uppercase tracking-wider">TCA</span>
      <span className={`text-[16px] font-bold font-mono tabular-nums ${secs < 600 ? "text-status-critical" : "text-status-warning"}`}>{display}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function MissionDemo() {
  const [chapter, setChapter] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const allDebrisRef = useRef([]);
  const containerRef = useRef(null);

  const ch = CHAPTERS[chapter];
  const chId = ch.id;

  /* ─── Typewriter narration ─── */
  const narration = useTypewriter(ch.subtitle, 25, chId !== "intro" && chId !== "summary" && chId !== "rewind");

  /* ─── Auto-advance ─── */
  useEffect(() => {
    if (!playing || !ch.duration) return;
    setElapsed(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      if (e >= ch.duration) { clearInterval(timer); if (chapter < CHAPTERS.length - 1) setChapter(c => c + 1); else setPlaying(false); }
    }, 50);
    return () => clearInterval(timer);
  }, [chapter, playing]);

  /* ─── Orbit animation ─── */
  useEffect(() => {
    if (!playing && chId !== "problem" && chId !== "summary") return;
    const id = setInterval(() => setSimTime(t => t + 0.02), 100);
    return () => clearInterval(id);
  }, [playing, chId]);

  /* ─── Pre-generate debris ─── */
  useEffect(() => {
    if (chId === "impact") allDebrisRef.current = generateDebris(1205, { lat: 45, lon: -72.5, alt_km: 600 });
    else allDebrisRef.current = [];
  }, [chId]);

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); if (chId === "intro") { setChapter(1); setPlaying(true); setSimTime(0); } else setPlaying(p => !p); }
      if (e.code === "ArrowRight") { e.preventDefault(); if (chapter < CHAPTERS.length - 1) { setChapter(c => c + 1); setElapsed(0); } }
      if (e.code === "ArrowLeft") { e.preventDefault(); if (chapter > 0) { setChapter(c => c - 1); setElapsed(0); } }
      if (e.code === "KeyR") { e.preventDefault(); setChapter(0); setPlaying(false); setElapsed(0); setSimTime(0); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chapter, chId]);

  /* ─── Screen shake on impact ─── */
  const shakeClass = chId === "impact" && elapsed < 1200 ? "animate-[shake_0.1s_ease-in-out_6]" : "";

  /* ─── Derived scene data ─── */
  const baseSats = useMemo(() => generateDemoPositions(SATELLITE_DATABASE, simTime), [simTime]);

  const satellites = useMemo(() => {
    switch (chId) {
      case "intro": return [];
      case "problem": case "summary": return baseSats;
      case "threat": case "detect": case "evade":
        return baseSats.map(s => {
          if (s.name === "ISS (ZARYA)") return { ...s, ...ISS_POS };
          if (s.name === "COSMOS 2251 DEB") return { ...s, ...COSMOS_POS, risk_level: "RED" };
          return s;
        });
      case "impact": return baseSats.filter(s => s.name !== "ISS (ZARYA)" && s.name !== "COSMOS 2251 DEB");
      case "rewind": return [];
      default: return baseSats;
    }
  }, [chId, baseSats]);

  const conjunctions = useMemo(() => (chId === "threat" || chId === "detect") ? [{ sat1: ISS_POS, sat2: COSMOS_POS }] : [], [chId]);
  const evasionManeuvers = useMemo(() => chId === "evade" ? [EVASION_DATA] : [], [chId]);
  const selectedSatellite = useMemo(() => (chId === "threat" || chId === "detect" || chId === "evade") ? ISS_POS : null, [chId]);

  const debrisFragments = useMemo(() => {
    if (chId !== "impact" || !allDebrisRef.current.length) return [];
    const p = Math.min(elapsed / (ch.duration || 10000), 1);
    return allDebrisRef.current.slice(0, Math.max(Math.floor(p * 1205), 10));
  }, [chId, elapsed]);

  const kesslerMode = chId === "impact";
  const riskPercent = useCounter(94, 5000, chId === "threat" || chId === "detect");
  const fragmentCount = useCounter(1205, 8000, chId === "impact");

  /* ─── Controls ─── */
  const startDemo = useCallback(() => { setChapter(1); setPlaying(true); setSimTime(0); }, []);
  const resetDemo = useCallback(() => { setChapter(0); setPlaying(false); setElapsed(0); setSimTime(0); }, []);
  const togglePlay = useCallback(() => setPlaying(p => !p), []);
  const skipForward = useCallback(() => { if (chapter < CHAPTERS.length - 1) { setChapter(c => c + 1); setElapsed(0); } }, [chapter]);
  const goToChapter = useCallback((idx) => { setChapter(idx); setElapsed(0); setPlaying(idx > 0 && idx < CHAPTERS.length - 1); }, []);

  const progress = ch.duration ? Math.min(elapsed / ch.duration, 1) : 0;

  return (
    <div ref={containerRef} className={`h-full w-full relative overflow-hidden bg-[#020817] font-sans text-text-primary ${shakeClass}`}>
      {/* Animated vignette glow — pulses red on impact, green on evade */}
      <div className={`absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000 ${chId === "impact" ? "opacity-100" : chId === "threat" ? "opacity-60" : "opacity-0"}`}
        style={{ boxShadow: "inset 0 0 150px rgba(239,68,68,0.15), inset 0 0 60px rgba(239,68,68,0.08)" }} />
      <div className={`absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000 ${chId === "evade" ? "opacity-100" : "opacity-0"}`}
        style={{ boxShadow: "inset 0 0 120px rgba(34,197,94,0.1), inset 0 0 50px rgba(34,197,94,0.06)" }} />
      <div className={`absolute inset-0 z-[1] pointer-events-none transition-opacity duration-1000 ${chId === "detect" ? "opacity-100" : "opacity-0"}`}
        style={{ boxShadow: "inset 0 0 100px rgba(76,139,245,0.1), inset 0 0 40px rgba(76,139,245,0.06)" }} />

      {/* ═══ GLOBE ═══ */}
      <Globe3D satellites={satellites} conjunctions={conjunctions} evasionManeuvers={evasionManeuvers} debrisFragments={debrisFragments}
        selectedSatellite={selectedSatellite} kesslerMode={kesslerMode} showPaths={chId === "problem" || chId === "summary"}
        showGrid={chId !== "intro" && chId !== "rewind"} showAtmosphere showGroundTracks={false} className="absolute inset-0" />

      {/* ═══ INTRO ═══ */}
      <AnimatePresence>
        {chId === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
            style={{ background: "radial-gradient(ellipse at center, rgba(2,8,23,0.6) 0%, rgba(2,8,23,0.93) 70%)" }}>
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/80 to-transparent" />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }} className="text-center max-w-2xl px-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-status-critical/10 border border-status-critical/20 text-[11px] font-bold text-status-critical tracking-widest mb-8">
                <AlertTriangle size={12} /> SIMULATION SCENARIO
              </motion.div>
              <h1 className="text-[clamp(36px,5.5vw,64px)] font-bold text-white leading-[1.05] tracking-tight mb-6">
                The Kessler{" "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400">Syndrome</span>
              </h1>
              <p className="text-[17px] text-text-secondary leading-relaxed max-w-lg mx-auto mb-14">{ch.subtitle}</p>
              <motion.button onClick={startDemo} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                className="btn-primary px-12 py-[18px] text-[16px] rounded-2xl shadow-[0_4px_40px_rgba(76,139,245,0.35)] flex items-center gap-3 mx-auto">
                <Play size={20} /> Begin Simulation
              </motion.button>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                className="mt-8 flex items-center justify-center gap-6 text-[11px] text-text-tertiary font-mono">
                <span>SPACE to start</span><span className="w-px h-3 bg-divider" /><span>ARROWS to navigate</span><span className="w-px h-3 bg-divider" /><span>R to reset</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CHAPTER HEADLINE BANNER ═══ */}
      <AnimatePresence mode="wait">
        {chId !== "intro" && chId !== "summary" && chId !== "rewind" && (
          <motion.div key={`banner-${chId}`} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.5 }}
            className="absolute top-16 left-0 right-0 flex justify-center z-20 pointer-events-none px-20">
            <div className="glass-surface rounded-2xl px-8 py-5 shadow-2xl shadow-black/60 text-center max-w-xl">
              <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-text-tertiary mb-2">Chapter {chapter} of {CHAPTERS.length - 1}</div>
              <h2 className={`text-[22px] font-bold tracking-tight mb-2 ${
                chId === "impact" ? "text-status-critical" : chId === "evade" ? "text-status-success" : chId === "detect" ? "text-accent-blue" : "text-text-primary"
              }`}>{ch.headline}</h2>
              <p className="text-[12px] text-text-secondary leading-relaxed max-w-md min-h-[36px]">
                {narration}<span className="inline-block w-[2px] h-[14px] bg-text-secondary ml-0.5 animate-pulse" />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ REWIND ═══ */}
      <AnimatePresence>
        {chId === "rewind" && (
          <motion.div key="rewind" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[25] flex items-center justify-center" style={{ background: "rgba(2,8,23,0.92)" }}>
            {/* Scan lines effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(76,139,245,0.05) 2px, rgba(76,139,245,0.05) 4px)", backgroundSize: "100% 4px" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }} className="text-center relative z-10">
              <RotateCcw size={48} className="text-accent-blue mx-auto mb-6 animate-spin" style={{ animationDuration: "3s" }} />
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="text-[42px] font-bold text-white mb-4 tracking-tight">But what if...</motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                className="text-[20px] text-accent-blue font-medium">we could see it coming?</motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SIDE PANELS ═══ */}
      <AnimatePresence>
        {/* Problem stats with animated counters */}
        {chId === "problem" && (
          <motion.div key="p-stats" initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="absolute left-24 top-1/2 -translate-y-1/2 z-20 w-72">
            <div className="glass-surface rounded-2xl p-6 shadow-2xl shadow-black/40 space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-2 mb-1">
                <Activity size={12} /> Space Environment
              </h3>
              {PROBLEM_STATS.map((stat, i) => (
                <AnimatedStatRow key={stat.label} stat={stat} delay={0.6 + i * 0.2} active={chId === "problem"} />
              ))}
              <div className="pt-2 mt-2 border-t border-divider text-center">
                <span className="text-[10px] text-text-tertiary font-mono">Sources: ESA Space Debris Office, NASA ODPO</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Threat/Detect risk panel */}
        {(chId === "threat" || chId === "detect") && (
          <motion.div key="risk-panel" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-72">
            <div className={`glass-surface rounded-2xl p-5 shadow-2xl shadow-black/40 border ${chId === "detect" ? "border-accent-blue/30" : "border-status-critical/30"}`}>
              {chId === "detect" && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-accent-blue/10 border border-accent-blue/20 rounded-lg">
                  <span className="w-[6px] h-[6px] rounded-full bg-accent-blue animate-pulse" />
                  <span className="text-[11px] font-bold text-accent-blue tracking-widest">ASRIDE ACTIVE</span>
                </motion.div>
              )}
              {chId === "threat" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1] }} transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-status-critical/10 border border-status-critical/20 rounded-lg">
                  <AlertTriangle size={12} className="text-status-critical" />
                  <span className="text-[11px] font-bold text-status-critical tracking-widest">WARNING</span>
                </motion.div>
              )}
              <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${chId === "detect" ? "text-accent-blue" : "text-status-critical"}`}>
                <AlertTriangle size={12} /> Conjunction Alert
              </h3>
              {/* Risk gauge */}
              <div className="flex justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="-rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={riskPercent > 70 ? "#EF4444" : riskPercent > 40 ? "#F59E0B" : "#4C8BF5"}
                      strokeWidth="5" strokeLinecap="round" strokeDasharray={264} strokeDashoffset={264 - (riskPercent / 100) * 264}
                      style={{ transition: "stroke-dashoffset 0.3s ease" }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-[26px] font-bold font-mono tabular-nums ${riskPercent > 70 ? "text-status-critical" : "text-status-warning"}`}>{riskPercent}%</span>
                    <span className="text-[8px] font-bold text-text-tertiary tracking-widest mt-0.5">COLLISION RISK</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 text-[11px]">
                {[["Primary", "ISS (ZARYA)", "text-text-primary font-medium"],
                  ["Secondary", "COSMOS 2251 DEB", "text-status-critical font-medium"],
                  ["Rel. Velocity", "10.5 km/s", "text-text-primary font-mono"],
                  ["Miss Distance", "0.120 km", "text-status-critical font-mono font-bold"],
                  ["Impact Energy", "34.7 MJ", "text-status-warning font-mono"],
                ].map(([l, v, c]) => <div key={l} className="flex justify-between"><span className="text-text-tertiary">{l}</span><span className={c}>{v}</span></div>)}
              </div>
              <TCACountdown active={chId === "threat" || chId === "detect"} />
              {chId === "detect" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 }}
                  className="mt-3 px-3 py-2.5 bg-status-success/10 border border-status-success/20 rounded-lg">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-status-success">
                    <Zap size={12} className="animate-pulse" /> Computing Optimal Evasion...
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Impact cascade panel */}
        {chId === "impact" && (
          <motion.div key="impact-stats" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.8 }}
            className="absolute right-8 bottom-28 z-20 w-72">
            <div className="glass-surface rounded-2xl p-5 shadow-2xl shadow-black/40 border border-status-critical/30">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-status-critical mb-3 flex items-center gap-2">
                <Flame size={12} className="animate-pulse" /> Cascade in Progress
              </h3>
              <div className="text-[42px] font-bold font-mono tabular-nums text-status-critical mb-0.5 leading-none">{fragmentCount.toLocaleString()}</div>
              <div className="text-[11px] text-text-tertiary mb-4">trackable fragments generated</div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden mb-4">
                <motion.div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${Math.min((fragmentCount / 1205) * 100, 100)}%` }} transition={{ duration: 0.3 }} />
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-text-tertiary">Objects Destroyed</span><span className="text-status-critical font-mono font-bold">2</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Zone Denied</span><span className="text-status-warning font-mono">380–850 km</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Secondary Collisions</span><span className="text-status-critical font-mono font-bold">6</span></div>
                <div className="flex justify-between"><span className="text-text-tertiary">Clearance Time</span><span className="text-text-primary font-mono">25+ years</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Evade panel */}
        {chId === "evade" && (
          <motion.div key="evade-panel" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }}
            transition={{ delay: 0.3, duration: 0.6 }} className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-72">
            <div className="glass-surface rounded-2xl p-5 shadow-2xl shadow-black/40 border border-status-success/30">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-status-success mb-4 flex items-center gap-2">
                <ShieldCheck size={12} /> Evasion Maneuver
              </h3>
              <div className="space-y-3 text-[11px]">
                {[["Maneuver", "Prograde Burn", "text-text-primary"], ["Delta-V", "+0.32 m/s", "text-status-success font-bold"],
                  ["Burn Duration", "4.8 s", "text-text-primary"], ["Fuel Cost", "0.14 kg", "text-text-primary"], ["Optimizer", "CW 6x6 STM", "text-accent-blue"],
                ].map(([l, v, c]) => <div key={l} className="flex justify-between"><span className="text-text-tertiary">{l}</span><span className={`font-mono ${c}`}>{v}</span></div>)}
                <div className="h-px bg-divider" />
                {[["New Miss Distance", "25.0 km", "text-status-success font-bold"], ["Post-Maneuver Pc", "< 0.001%", "text-status-success font-bold"],
                ].map(([l, v, c]) => <div key={l} className="flex justify-between"><span className="text-text-tertiary">{l}</span><span className={`font-mono ${c}`}>{v}</span></div>)}
              </div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 4 }}
                className="mt-5 px-4 py-4 bg-status-success/10 border border-status-success/30 rounded-xl text-center">
                <ShieldCheck size={24} className="text-status-success mx-auto mb-2" />
                <div className="text-[15px] font-bold text-status-success">COLLISION AVOIDED</div>
                <div className="text-[10px] text-text-tertiary mt-1">Zero debris generated &middot; Orbit is stable</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SUMMARY ═══ */}
      <AnimatePresence>
        {chId === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 flex items-center justify-center"
            style={{ background: "radial-gradient(ellipse at center, rgba(2,8,23,0.5) 0%, rgba(2,8,23,0.9) 60%)" }}>
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="text-center max-w-3xl px-6">
              <h2 className="text-[40px] font-bold text-white tracking-tight mb-3">
                The Answer to{" "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-accent-teal to-status-success">Kessler</span>
              </h2>
              <p className="text-[15px] text-text-secondary max-w-lg mx-auto mb-12">{ch.subtitle}</p>
              <div className="grid grid-cols-3 gap-5 mb-12 max-w-2xl mx-auto">
                {[{ icon: Radio, title: "Detect", desc: "SGP4 orbit propagation. 72-hour look-ahead. Real-time conjunction screening across all tracked objects.", color: "text-accent-blue", border: "border-accent-blue/20", bg: "bg-accent-blue/[0.06]" },
                  { icon: Shield, title: "Evade", desc: "Clohessy-Wiltshire optimal maneuvers. Sub-m/s burns computed in milliseconds. Autonomous execution.", color: "text-status-success", border: "border-status-success/20", bg: "bg-status-success/[0.06]" },
                  { icon: Flame, title: "Prevent", desc: "NASA SBAM cascade modeling. Hohmann deorbit solutions. Active debris removal prioritization.", color: "text-status-warning", border: "border-status-warning/20", bg: "bg-status-warning/[0.06]" },
                ].map((p, i) => (
                  <motion.div key={p.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }} className={`glass-surface rounded-2xl p-6 border ${p.border} text-left`}>
                    <div className={`w-11 h-11 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center mb-4`}>
                      <p.icon size={22} className={p.color} />
                    </div>
                    <h3 className={`text-[17px] font-bold ${p.color} mb-2`}>{p.title}</h3>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{p.desc}</p>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                className="flex items-center justify-center gap-12 mb-12">
                {[{ value: "< 1 ms", label: "Computation" }, { value: "0.32 m/s", label: "LEO Avoidance" }, { value: "72 hr", label: "Look-Ahead" }, { value: "99.9%", label: "Prevention Rate" }].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-[22px] font-bold font-mono text-text-primary">{s.value}</div>
                    <div className="text-[10px] text-text-tertiary mt-1">{s.label}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
                className="flex items-center justify-center gap-4">
                <Link to="/dashboard"><motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="btn-primary px-8 py-3.5 text-[14px] rounded-xl shadow-[0_4px_20px_rgba(76,139,245,0.25)] flex items-center gap-2">
                  <Globe size={16} /> Open Console</motion.button></Link>
                <Link to="/kessler"><button className="btn-ghost px-8 py-3.5 text-[14px] rounded-xl flex items-center gap-2"><Flame size={16} /> Kessler Simulator</button></Link>
                <button onClick={resetDemo} className="btn-ghost px-6 py-3.5 text-[14px] rounded-xl flex items-center gap-2 text-text-tertiary"><RotateCcw size={16} /> Replay</button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PLAYBACK TIMELINE ═══ */}
      {chId !== "intro" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
          <div className="glass-surface rounded-2xl px-5 py-3 shadow-2xl shadow-black/50 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {[{ icon: playing ? Pause : Play, onClick: togglePlay, disabled: false },
                { icon: SkipForward, onClick: skipForward, disabled: chapter >= CHAPTERS.length - 1 },
                { icon: RotateCcw, onClick: resetDemo, disabled: false },
              ].map(({ icon: Icon, onClick, disabled }, i) => (
                <button key={i} onClick={onClick} disabled={disabled}
                  className="w-8 h-8 rounded-lg bg-surface-elevated border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30">
                  <Icon size={14} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {CHAPTERS.slice(1).map((c, i) => {
                const idx = i + 1, cur = chapter === idx, past = chapter > idx;
                const dot = cur ? (c.id === "impact" ? "bg-status-critical" : c.id === "evade" ? "bg-status-success" : c.id === "rewind" ? "bg-text-secondary" : "bg-accent-blue")
                  : past ? "bg-text-tertiary" : "bg-white/[0.08]";
                return <button key={c.id} onClick={() => goToChapter(idx)} className="p-1" title={c.headline}>
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${dot} ${cur ? "scale-150 ring-2 ring-white/20" : "hover:scale-125"}`} />
                </button>;
              })}
            </div>
            <div className="pl-3 border-l border-divider min-w-[120px]">
              <div className="text-[10px] text-text-tertiary font-mono">{chapter}/{CHAPTERS.length - 1}</div>
              <div className="text-[11px] text-text-secondary font-medium truncate">{ch.headline}</div>
            </div>
            {ch.duration && (
              <div className="w-24 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-200 ${chId === "impact" ? "bg-status-critical" : chId === "evade" ? "bg-status-success" : "bg-accent-blue"}`}
                  style={{ width: `${progress * 100}%` }} />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ IMPACT FLASH ═══ */}
      <AnimatePresence>
        {chId === "impact" && elapsed < 1200 && (
          <motion.div key="flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }}
            className="absolute inset-0 z-40 pointer-events-none" style={{ background: "radial-gradient(circle at 55% 40%, rgba(255,140,0,0.8) 0%, rgba(255,255,255,0.6) 30%, transparent 70%)" }} />
        )}
      </AnimatePresence>
    </div>
  );
}
