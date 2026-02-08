import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { DebrisEngine } from "./components/debrisEngine";

const MAP_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function EarthSVG({
  satellites = [],
  constellation = [],
  kessler = false,
}) {
  const width = 800;
  const height = 450;

  // ----------------------------
  // STATE
  // ----------------------------
  const [rotation, setRotation] = useState([0, -20]);
  const [scale, setScale] = useState(260);
  const [worldData, setWorldData] = useState(null);

  const [kesslerMode, setKesslerMode] = useState(false);
  const [collisionFlash, setCollisionFlash] = useState(false);

  // ----------------------------
  // REFS
  // ----------------------------
  const rotationRef = useRef([0, -20]);
  const isInteracting = useRef(false);
  const svgRef = useRef(null);

  const engineRef = useRef(new DebrisEngine());
  const debrisRef = useRef([]);
  const explosionsRef = useRef([]);

  // ----------------------------
  // STARS (STABLE, NOT RANDOM EACH RENDER)
  // ----------------------------
  const stars = useMemo(() => {
    const rng = d3.randomLcg(0.42); // deterministic
    return Array.from({ length: 320 }).map((_, i) => {
      const cx = rng() * width;
      const cy = rng() * height;

      const r = rng() * 1.2 + 0.25;
      const opacity = rng() * 0.6 + 0.2;

      // subtle variety, but stable
      const tint =
        rng() > 0.94 ? "#a5f3fc" : rng() > 0.9 ? "#ddd6fe" : "#ffffff";

      const twinkle = i % 6 === 0;
      const twinkleDuration = `${rng() * 2.2 + 2.4}s`;

      return { cx, cy, r, opacity, tint, twinkle, twinkleDuration };
    });
  }, []);

  // ----------------------------
  // GRAVITY GRID (COOL BUT CHEAP)
  // ----------------------------
  const gravityGridPath = useMemo(() => {
    const context = d3.path();
    const cx = width / 2;
    const cy = height / 2;

    const spacing = 55;
    const distortion = 0.42;
    const range = 260;

    const transform = (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const f = 1 - distortion * Math.exp(-(r * r) / (range * range));
      return [cx + dx * f, cy + dy * f];
    };

    for (let x = -120; x <= width + 120; x += spacing) {
      let first = true;
      for (let y = -120; y <= height + 120; y += 18) {
        const [tx, ty] = transform(x, y);
        if (first) {
          context.moveTo(tx, ty);
          first = false;
        } else {
          context.lineTo(tx, ty);
        }
      }
    }

    for (let y = -120; y <= height + 120; y += spacing) {
      let first = true;
      for (let x = -120; x <= width + 120; x += 18) {
        const [tx, ty] = transform(x, y);
        if (first) {
          context.moveTo(tx, ty);
          first = false;
        } else {
          context.lineTo(tx, ty);
        }
      }
    }

    return context.toString();
  }, []);

  // ----------------------------
  // LOAD MAP
  // ----------------------------
  useEffect(() => {
    let mounted = true;

    fetch(MAP_URL)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const countries = topojson.feature(data, data.objects.countries);
        setWorldData(countries);
      })
      .catch((err) => console.error("Map Load Failure:", err));

    return () => {
      mounted = false;
    };
  }, []);

  // ----------------------------
  // PROJECTION
  // ----------------------------
  const projection = useMemo(() => {
    return d3
      .geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate(rotation);
  }, [scale, rotation]);

  const path = useMemo(() => d3.geoPath(projection), [projection]);
  const graticule = useMemo(() => d3.geoGraticule(), []);

  // ----------------------------
  // FIXED: toggleKessler handler
  // ----------------------------
  const setKesslerActive = useCallback(
    (active) => {
      engineRef.current.init(active);
      debrisRef.current = engineRef.current.getDebris();
      explosionsRef.current = engineRef.current.getExplosions();

      if (active) {
        setCollisionFlash(true);
        setTimeout(() => setCollisionFlash(false), 220);
      } else {
        setCollisionFlash(false);
      }

      setKesslerMode(active);
    },
    [setKesslerMode]
  );

  // Sync prop -> state
  useEffect(() => {
    if (kessler !== kesslerMode) setKesslerActive(kessler);
  }, [kessler, kesslerMode, setKesslerActive]);

  // ----------------------------
  // DRAG ROTATION
  // ----------------------------
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const drag = d3
      .drag()
      .on("start", () => {
        isInteracting.current = true;
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
        const [r1, r2] = rotationRef.current;
        const sensitivity = 75 / scale;
        rotationRef.current = [
          r1 + event.dx * sensitivity,
          r2 - event.dy * sensitivity,
        ];
        setRotation([...rotationRef.current]);
      })
      .on("end", () => {
        svg.style("cursor", "grab");
        setTimeout(() => {
          isInteracting.current = false;
        }, 1300);
      });

    svg.call(drag);
  }, [scale]);

  // ----------------------------
  // ZOOM (CTRL + WHEEL)
  // ----------------------------
  const handleWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();

    const zoomSensitivity = 0.55;
    const newScale = Math.max(120, Math.min(820, scale - e.deltaY * zoomSensitivity));
    setScale(newScale);
  };

  const zoomIn = (e) => {
    e.stopPropagation();
    setScale((s) => Math.min(820, s * 1.18));
  };

  const zoomOut = (e) => {
    e.stopPropagation();
    setScale((s) => Math.max(120, s / 1.18));
  };

  // ----------------------------
  // MAIN LOOP (D3 TIMER)
  // ----------------------------
  useEffect(() => {
    const timer = d3.timer(() => {
      if (isInteracting.current) return;

      const validSats = satellites.filter(Boolean);

      // Tracking
      if (validSats.length > 0) {
        const getLon = (s) =>
          s?.lon !== undefined ? s.lon : s?.lng !== undefined ? s.lng : 0;

        let centerLon = 0;

        if (validSats.length === 1) {
          centerLon = getLon(validSats[0]);
        } else {
          let lng1 = getLon(validSats[0]);
          let lng2 = getLon(validSats[1]);

          let diff = lng2 - lng1;
          if (diff > 180) lng2 -= 360;
          if (diff < -180) lng2 += 360;

          centerLon = (lng1 + lng2) / 2;
        }

        const targetLon = -centerLon;
        const targetLat = -10;

        let distLon = targetLon - rotationRef.current[0];
        while (distLon > 180) distLon -= 360;
        while (distLon < -180) distLon += 360;

        const distLat = targetLat - rotationRef.current[1];

        // Smoother, more premium feel
        rotationRef.current[0] += distLon * 0.018;
        rotationRef.current[1] += distLat * 0.018;
      } else {
        rotationRef.current[0] += 0.03; // calm idle spin
      }

      // Debris update
      if (kesslerMode) {
        const { collisionOccurred } = engineRef.current.step(1, validSats);
        
        // Sync refs for rendering
        debrisRef.current = engineRef.current.getDebris();
        explosionsRef.current = engineRef.current.getExplosions();

        if (collisionOccurred) {
          setCollisionFlash(true);
          setTimeout(() => setCollisionFlash(false), 140);
        }
      }

      setRotation([...rotationRef.current]);
    });

    return () => timer.stop();
  }, [satellites, kesslerMode]);

  // ----------------------------
  // CONNECTION + DISTANCE LABEL
  // ----------------------------
  const validSats = satellites.filter(Boolean);
  let distanceLabel = null;
  let connectionElement = null;

  if (validSats.length === 2 && worldData) {
    const s1 = validSats[0];
    const s2 = validSats[1];

    const p1 = [s1.lon ?? s1.lng, s1.lat];
    const p2 = [s2.lon ?? s2.lng, s2.lat];

    const lineString = { type: "LineString", coordinates: [p1, p2] };
    const d = path(lineString);

    const interpolator = d3.geoInterpolate(p1, p2);
    const midGeo = interpolator(0.5);
    const midProjected = projection(midGeo);

    const distKm = d3.geoDistance(p1, p2) * 6371;

    if (d) {
      connectionElement = (
        <path
          d={d}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeDasharray="3,3"
          opacity="0.9"
        />
      );

      if (midProjected) {
        distanceLabel = (
          <g transform={`translate(${midProjected[0]}, ${midProjected[1] - 18})`}>
            <rect
              x="-52"
              y="-12"
              width="104"
              height="20"
              fill="rgba(2, 6, 23, 0.85)"
              rx="6"
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="0.7"
            />
            <text
              textAnchor="middle"
              fill="#67e8f9"
              fontSize="10"
              dy="2"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                letterSpacing: "0.08em",
              }}
            >
              {Math.round(distKm).toLocaleString()} KM
            </text>
          </g>
        );
      }
    }
  }

  // Parallax for stars
  const parallaxX = (rotation[0] % 360) * 0.08;
  const parallaxY = (rotation[1] % 180) * 0.08;

  return (
    <div
      className={[
        "relative w-full h-full overflow-hidden rounded-2xl",
        "bg-slate-950 border border-white/10",
        "shadow-[0_40px_120px_rgba(0,0,0,0.55)]",
        collisionFlash ? "ring-4 ring-red-500/70 ring-inset" : "",
      ].join(" ")}
    >
      {/* HUD FRAME + GRAIN */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.06),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.06] bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')]" />
        <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-cyan-400/30" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-cyan-400/30" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-cyan-400/30" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-cyan-400/30" />
      </div>

      {/* RED ALERT (LESS MEME, MORE CINEMATIC) */}
      {collisionFlash && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-red-500/25 mix-blend-hard-light" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <div className="mx-auto max-w-[92%] rounded-2xl border border-red-400/40 bg-black/70 backdrop-blur-xl px-8 py-8 shadow-2xl">
              <div className="text-center">
                <div className="text-[11px] font-mono tracking-[0.35em] text-red-300 uppercase">
                  Critical Event
                </div>
                <div className="mt-3 text-5xl md:text-6xl font-black tracking-tight text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.35)]">
                  IMPACT DETECTED
                </div>
                <div className="mt-3 text-sm md:text-base font-mono text-red-200/80 tracking-widest">
                  STRUCTURAL FAILURE RISK: HIGH
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 items-end">
        <button
          onClick={() => setKesslerActive(!kesslerMode)}
          className={[
            "mb-4 px-3 py-1 text-[10px] font-black rounded-lg border backdrop-blur-xl transition-all uppercase tracking-widest",
            kesslerMode
              ? "bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.25)]"
              : "bg-slate-900/60 border-white/10 text-slate-300 hover:text-white hover:border-white/25",
          ].join(" ")}
        >
          {kesslerMode ? "KESSLER MODE: ACTIVE" : "ENABLE DEBRIS SIM"}
        </button>

        <button
          onClick={zoomIn}
          className="w-9 h-9 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-xl text-lg font-black transition-transform active:scale-95"
        >
          +
        </button>

        <button
          onClick={zoomOut}
          className="w-9 h-9 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-xl text-lg font-black transition-transform active:scale-95"
        >
          –
        </button>
      </div>

      {/* READOUT */}
      <div className="absolute top-6 right-6 z-30 hidden md:block">
        <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/45 p-3 rounded-xl border border-white/5 backdrop-blur-xl shadow-xl">
          <div className="flex justify-between gap-6">
            <span>SOLAR FLUX</span>
            <span className="text-amber-300">NORMAL</span>
          </div>
          <div className="flex justify-between gap-6">
            <span>GEOMAG</span>
            <span className="text-emerald-300">STABLE</span>
          </div>
          <div className="flex justify-between gap-6">
            <span>TRACKING</span>
            <span className="text-cyan-300">{validSats.length} ASSETS</span>
          </div>
          <div className="flex justify-between gap-6">
            <span>ZOOM</span>
            <span className="text-slate-200">{Math.round(scale)}</span>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", cursor: "grab" }}
        onWheel={handleWheel}
      >
        <defs>
          {/* Premium glow */}
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="starGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Ocean */}
          <radialGradient id="oceanGradient" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="55%" stopColor="#0b1226" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>

          {/* Terminator */}
          <linearGradient
            id="nightShadow"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="50%"
            gradientTransform="rotate(35)"
          >
            <stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <stop offset="44%" stopColor="transparent" stopOpacity="0" />
            <stop offset="62%" stopColor="#000000" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
          </linearGradient>

          {/* Specular */}
          <radialGradient id="sunReflection" cx="28%" cy="26%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Atmos */}
          <radialGradient id="atmosRing" cx="50%" cy="50%" r="50%">
            <stop offset="76%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="90%" stopColor="#60a5fa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.18" />
          </radialGradient>

          {/* Milky way */}
          <linearGradient id="milkyWay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
          </linearGradient>

          {/* Sun */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Arrow markers */}
          <marker
            id="arrow-0"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
          </marker>

          <marker
            id="arrow-1"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* SPACE */}
        <g className="deep-space">
          {/* gravity grid */}
          <path
            d={gravityGridPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.6"
            strokeOpacity="0.09"
            className="pointer-events-none"
          />

          {/* milky way */}
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={width}
            ry={150}
            fill="url(#milkyWay)"
            transform={`rotate(-30, ${width / 2}, ${height / 2})`}
            filter="url(#glow)"
            opacity="0.9"
          />

          {/* stars (parallax) */}
          <g transform={`translate(${parallaxX}, ${parallaxY})`}>
            {stars.map((s, i) => (
              <circle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                fill={s.tint}
                opacity={s.opacity}
                filter={i % 9 === 0 ? "url(#starGlow)" : "none"}
              >
                {s.twinkle && (
                  <animate
                    attributeName="opacity"
                    values={`${s.opacity};${s.opacity * 0.25};${s.opacity}`}
                    dur={s.twinkleDuration}
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            ))}
          </g>

          {/* sun */}
          <g transform="translate(110, 86)">
            <circle r="52" fill="url(#sunGlow)" filter="url(#glow)" opacity="0.9" />
            <circle r="18" fill="#fff" opacity="0.7" filter="url(#glow)" />
          </g>
        </g>

        {/* EARTH */}
        <g>
          {/* Atmosphere */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={projection.scale() * 1.13}
            fill="url(#atmosRing)"
            style={{ pointerEvents: "none" }}
          />

          {/* Ocean */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={projection.scale()}
            fill="url(#oceanGradient)"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="1"
            filter="url(#glow)"
          />

          {/* Specular */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={projection.scale()}
            fill="url(#sunReflection)"
            style={{ pointerEvents: "none" }}
          />

          {/* Orbit rings (subtle, premium) */}
          <g className="pointer-events-none opacity-35">
            <circle
              cx={width / 2}
              cy={height / 2}
              r={projection.scale() * (1 + 400 / 6371)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="0.6"
              strokeDasharray="3,3"
            />
            <circle
              cx={width / 2}
              cy={height / 2}
              r={projection.scale() * (1 + 20200 / 6371)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="0.6"
              strokeDasharray="5,5"
              opacity="0.6"
            />
            <circle
              cx={width / 2}
              cy={height / 2}
              r={projection.scale() * (1 + 35786 / 6371)}
              fill="none"
              stroke="#fb7185"
              strokeWidth="0.6"
              strokeDasharray="7,7"
              opacity="0.35"
            />
          </g>

          {/* Graticule */}
          <path
            d={path(graticule())}
            fill="none"
            stroke="#334155"
            strokeWidth="0.6"
            strokeOpacity="0.25"
          />

          {/* Continents */}
          <g>
            {worldData &&
              worldData.features.map((d, i) => (
                <path
                  key={i}
                  d={path(d)}
                  fill="#0f172a"
                  stroke="rgba(148,163,184,0.22)"
                  strokeWidth="0.55"
                />
              ))}
          </g>

          {/* Night shadow */}
          <circle
            cx={width / 2}
            cy={height / 2}
            r={projection.scale()}
            fill="url(#nightShadow)"
            style={{ pointerEvents: "none", mixBlendMode: "multiply" }}
            opacity="0.65"
          />

          {/* Trajectories */}
          <g>
            {satellites.map((sat, i) => {
              if (!sat || !sat.path) return null;
              const lineData = { type: "LineString", coordinates: sat.path };
              const d = path(lineData);
              if (!d) return null;

              return (
                <path
                  key={`traj-${i}`}
                  d={d}
                  fill="none"
                  stroke={i === 0 ? "#60a5fa" : "#fbbf24"}
                  strokeWidth="2"
                  strokeOpacity="0.85"
                  filter="url(#glow)"
                />
              );
            })}
          </g>

          {/* Debris */}
          <g className="pointer-events-none">
            {debrisRef.current.map((d, i) => {
              const p = projection([d.lon, d.lat]);
              if (!p) return null;

              const isBig = d.size > 0.7;
              const glowColor = d.heat ? "#fb7185" : isBig ? "#ef4444" : "#cbd5e1";

              return (
                <g key={d.id} transform={`translate(${p[0]}, ${p[1]}) rotate(${d.spin})`}>
                  <circle
                    r={isBig ? 5 : 2.5}
                    fill={glowColor}
                    opacity={0.18}
                    filter="url(#glow)"
                  />
                  {isBig ? (
                    <path
                      d="M-3,-2 L3,-1 L2,3 L-3,2 Z"
                      fill={d.heat ? "#fb7185" : "#b91c1c"}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="0.8"
                      opacity="0.9"
                    />
                  ) : (
                    <circle r={1} fill="#94a3b8" opacity="0.85" />
                  )}
                </g>
              );
            })}
          </g>

          {/* Explosions */}
          <g className="pointer-events-none">
            {explosionsRef.current.map((ex) => {
              const p = projection([ex.lon, ex.lat]);
              if (!p) return null;

              const ageFactor = 1 - ex.age / 46;
              const radius = ex.age * 4.2;

              const c = ex.type === "kinetic" ? "#fbbf24" : "#fb7185";

              return (
                <g key={ex.id} transform={`translate(${p[0]}, ${p[1]})`}>
                  <circle
                    r={radius}
                    fill="none"
                    stroke={c}
                    strokeWidth="3"
                    opacity={ageFactor * 0.8}
                  />
                  <circle
                    r={radius * 0.55}
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    opacity={ageFactor * 0.5}
                  />
                  <circle
                    r={16 * ageFactor}
                    fill="white"
                    filter="url(#glow)"
                    opacity={ageFactor * 0.55}
                  />
                </g>
              );
            })}
          </g>

          {/* Constellation */}
          <g className="pointer-events-none">
            {constellation.map((sat, i) => {
              const p = projection([sat.lon, sat.lat]);
              if (!p) return null;

              const isStarlink = sat.name?.includes("STARLINK");
              const color = isStarlink ? "#06b6d4" : "#fbbf24";

              return (
                <g key={`cons-${i}`}>
                  <circle cx={p[0]} cy={p[1]} r={1.1} fill={color} opacity="0.65" />
                  {i % 14 === 0 && (
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={2}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.6"
                      opacity="0.5"
                    >
                      <animate attributeName="r" from="1" to="4" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          {/* Connection */}
          {connectionElement}
          {distanceLabel}

          {/* Satellites */}
          <g>
            {validSats.map((sat, i) => {
              const lon = sat.lon !== undefined ? sat.lon : sat.lng;
              const lat = sat.lat;
              const projected = projection([lon, lat]);
              if (!projected) return null;

              const color = i === 0 ? "#38bdf8" : "#fbbf24";
              const label = i === 0 ? "TARGET" : "ASSET";

              // Velocity vector
              let velocityVector = null;

              if (sat.path && sat.path.length >= 2) {
                const len = sat.path.length;
                const pCurr = projection(sat.path[len - 1]);
                const pPrev = projection(sat.path[len - 2]);

                if (pCurr && pPrev) {
                  const dx = pCurr[0] - pPrev[0];
                  const dy = pCurr[1] - pPrev[1];
                  const mag = Math.sqrt(dx * dx + dy * dy);

                  const visualLen = sat.velocity_kms ? sat.velocity_kms * 2 : mag * 4;

                  const nx = mag > 0 ? dx / mag : 0;
                  const ny = mag > 0 ? dy / mag : 0;

                  velocityVector = (
                    <line
                      x1={0}
                      y1={0}
                      x2={nx * visualLen}
                      y2={ny * visualLen}
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.9"
                      filter="url(#glow)"
                      markerEnd={`url(#arrow-${i})`}
                    />
                  );
                }
              }

              return (
                <g key={i} transform={`translate(${projected[0]}, ${projected[1]})`}>
                  {velocityVector}

                  {/* radar pulse */}
                  <circle r="16" fill={color} opacity="0.08" stroke={color} strokeWidth="1">
                    <animate attributeName="r" from="10" to="34" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.55" to="0" dur="1.6s" repeatCount="indefinite" />
                  </circle>

                  {/* core */}
                  <circle r="4" fill="#fff" />
                  <circle r="7" fill="none" stroke={color} strokeWidth="2" />

                  {/* label */}
                  <g transform="translate(16, -18)">
                    <path
                      d="M0,0 L12,-6 L78,-6 L78,12 L12,12 L0,0"
                      fill="rgba(2, 6, 23, 0.88)"
                      stroke={color}
                      strokeWidth="0.7"
                    />
                    <text
                      x="16"
                      y="5"
                      textAnchor="start"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontWeight="900"
                      fontFamily="ui-sans-serif"
                    >
                      {label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
