import React, { useEffect, useState, useRef, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const MAP_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function EarthSVG({ satellites = [], constellation = [], kessler = false }) {
  const width = 800;
  const height = 450;
  
  // State
  const [rotation, setRotation] = useState([0, -20]);
  const [scale, setScale] = useState(260); // Base scale
  const [worldData, setWorldData] = useState(null);

  // Refs
  const rotationRef = useRef([0, -20]); 
  const isInteracting = useRef(false);
  const svgRef = useRef(null);
  const debrisRef = useRef([]); // Stores debris physics state
  const explosionsRef = useRef([]); // Stores active explosion particles
  const [kesslerMode, setKesslerMode] = useState(false);
  const [collisionFlash, setCollisionFlash] = useState(false);

  // Sync external kessler prop with internal state if needed, or primarily use the prop logic
  useEffect(() => {
    if (kessler !== kesslerMode) {
        toggleKessler(kessler);
    }
  }, [kessler]);

  // Toggle Kessler Mode
  const toggleKessler = (active) => {
    if (active) {
        // Init Debris Field
        debrisRef.current = Array.from({ length: 1200 }).map(() => ({
            lon: Math.random() * 360,
            lat: (Math.random() - 0.5) * 160,
            alt: 400 + Math.random() * 2000, // LEO to MEO
            velocity: 0.1 + Math.random() * 0.2, // Deg per frame
            inc: (Math.random() - 0.5) * 180, // Inclination
            phase: Math.random() * Math.PI * 2
        }));
        setCollisionFlash(true);
        setTimeout(() => setCollisionFlash(false), 500); // Quick flash
    } else {
        debrisRef.current = [];
        setCollisionFlash(false);
    }
    setKesslerMode(active);
  };

  // --- MODULE 1: DEEP SPACE (Visuals) ---
  
  // 1. Procedural Starfield
  const stars = useMemo(() => {
    return Array.from({ length: 250 }).map((_, i) => ({
      cx: Math.random() * 800, // Absolute coords to ensure visibility
      cy: Math.random() * 450,
      r: Math.random() * 1.5 + 0.2,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleDuration: Math.random() * 3 + 2 + "s"
    }));
  }, []);

  // Gravity "Spacetime" Grid
  const gravityGridPath = useMemo(() => {
    const context = d3.path();
    const cx = 400, cy = 225;
    const spacing = 50; 
    const distortion = 0.4; // Strength of the gravity well
    const range = 250;     // Radius of the well

    const transform = (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx*dx + dy*dy);
        // Exponential pullback simulating gravity well dip
        const f = 1 - distortion * Math.exp(-(r*r)/(range*range));
        return [cx + dx * f, cy + dy * f];
    };

    // Verticals
    for (let x = -100; x <= 900; x += spacing) {
        let first = true;
        for (let y = -100; y <= 550; y += 20) {
            const [tx, ty] = transform(x, y);
            if (first) { context.moveTo(tx, ty); first = false; }
            else { context.lineTo(tx, ty); }
        }
    }
    // Horizontals
    for (let y = -100; y <= 550; y += spacing) {
        let first = true;
        for (let x = -100; x <= 900; x += 20) {
            const [tx, ty] = transform(x, y);
            if (first) { context.moveTo(tx, ty); first = false; }
            else { context.lineTo(tx, ty); }
        }
    }
    return context.toString();
  }, []);

  // 1. Data Ingestion
  useEffect(() => {
    fetch(MAP_URL)
      .then((res) => res.json())
      .then((data) => {
        const countries = topojson.feature(data, data.objects.countries);
        setWorldData(countries);
      })
      .catch(err => console.error("Map Load Failure:", err));
  }, []);

  // 2. Physics: Projection
  const projection = d3.geoOrthographic()
    .scale(scale)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .rotate(rotation);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule(); 
  
  // Custom Drag Behavior (Rotation)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // Drag to Rotate
    const drag = d3.drag()
      .on("start", () => {
        isInteracting.current = true;
        svg.style("cursor", "grabbing");
      })
      .on("drag", (event) => {
         const [r1, r2] = rotationRef.current;
         const sensitivity = 75 / scale; 
         rotationRef.current = [r1 + event.dx * sensitivity, r2 - event.dy * sensitivity];
         setRotation([...rotationRef.current]);
      })
      .on("end", () => {
        svg.style("cursor", "grab");
        setTimeout(() => { isInteracting.current = false; }, 2000);
      });

    svg.call(drag);
  }, [scale]);

  // Zoom Handler (Ctrl + Wheel)
  const handleWheel = (e) => {
      // Only zoom if CTRL key is pressed, per request
      if (e.ctrlKey) {
          e.preventDefault(); 
          const zoomSensitivity = 0.5;
          const newScale = Math.max(80, Math.min(800, scale - e.deltaY * zoomSensitivity));
          setScale(newScale);
      }
      // Otherwise allow normal page scroll
  };
  
  // Manual Zoom Controls
  const zoomIn = (e) => { e.stopPropagation(); setScale(Math.min(800, scale * 1.2)); }
  const zoomOut = (e) => { e.stopPropagation(); setScale(Math.max(80, scale / 1.2)); }

  // 4. Render Loop: Auto-Rotation & Tracking
  useEffect(() => {
    const timer = d3.timer(() => {
      if (isInteracting.current) return;

      const validSats = satellites.filter(s => s);
      
      if (validSats.length > 0) {
        // Smart Tracking Logic
        let centerLon = 0;
        let getLon = (s) => (s && s.lon !== undefined) ? s.lon : (s && s.lng !== undefined ? s.lng : 0);

        if (validSats.length === 1) {
            centerLon = getLon(validSats[0]);
        } else {
            let lng1 = getLon(validSats[0]);
            let lng2 = getLon(validSats[1]);
            // Handle date line crossing
            let diff = lng2 - lng1;
            if (diff > 180) lng2 -= 360;
            if (diff < -180) lng2 += 360;
            centerLon = (lng1 + lng2) / 2;
        }

        const targetLon = -centerLon; 
        const targetLat = -10; 

        // Smooth Interpolation
        let distLon = targetLon - rotationRef.current[0];
        while (distLon > 180) distLon -= 360;
        while (distLon < -180) distLon += 360;
        
        let distLat = targetLat - rotationRef.current[1];

        rotationRef.current[0] += distLon * 0.02; // Slower tracking
        rotationRef.current[1] += distLat * 0.02;
      } else {
        // Idle Spin
        rotationRef.current[0] += 0.05; 
      }
      
      // Update Debris (Kessler Mode)
      if (debrisRef.current.length > 0) {
          debrisRef.current.forEach(d => {
              // Simple Orbital Dynamics (Precession)
              d.lon += d.velocity;
              // Oscillation for "Orbit" appearance
              d.lat = Math.sin((d.lon * Math.PI / 180) + d.phase) * d.inc;
          });

          // Collision Detection (Check against Satellite 0)
          if (validSats.length > 0) {
              const target = validSats[0];
              const tLon = target.lon ?? target.lng;
              const tLat = target.lat;
              
              // Simple Euclidean Distance check in Lat/Lon space for performance
              // (Scientific accuracy would use Haversine, but this is 60fps anim)
              // Only check if we are remotely close to avoid loop heaviness? 
              // Actually, simply iterating 400 points is cheap in JS.
              
              let hit = false;
              for (let d of debrisRef.current) {
                  const dist = Math.sqrt(Math.pow(d.lon - tLon, 2) + Math.pow(d.lat - tLat, 2));
                  if (dist < 2.5) { // Threshold ~2.5 degrees
                      hit = true;
                      
                      // Add Explosion VFX
                      explosionsRef.current.push({
                          id: Math.random(),
                          lon: tLon, // Hit at target location
                          lat: tLat,
                          age: 0,
                          type: Math.random() > 0.5 ? 'kinetic' : 'thermal'
                      });

                      // "Chain Reaction": Spawn bits
                      for(let k=0; k<5; k++) {
                           debrisRef.current.push({
                               lon: d.lon, lat: d.lat,
                               velocity: (Math.random() - 0.5) * 2,
                               inc: d.inc + (Math.random()-0.5) * 10,
                               phase: Math.random() * 10
                           });
                      }
                      
                      // Push original debris away
                      d.velocity *= -1;
                      break; 
                  }
              }

              if (hit) {
                  setCollisionFlash(true);
                  // Reset flash after 100ms
                  setTimeout(() => setCollisionFlash(false), 150);
              }
          }
      }
      
      // Update Explosions
      if (explosionsRef.current.length > 0) {
        explosionsRef.current.forEach(ex => ex.age += 1);
        explosionsRef.current = explosionsRef.current.filter(ex => ex.age < 50);
      }
      
      setRotation([...rotationRef.current]);
    });

    return () => timer.stop();
  }, [satellites, scale, kesslerMode]);

  const validSats = satellites.filter(s => s);
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
            <path d={d} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3,3" className="orbit-line animate-pulse" />
        );
        if (midProjected) {
             distanceLabel = (
                <g transform={`translate(${midProjected[0]}, ${midProjected[1] - 20})`}>
                    <rect x="-45" y="-12" width="90" height="18" fill="rgba(15, 23, 42, 0.9)" rx="4" stroke="#334155" strokeWidth="0.5" />
                    <text textAnchor="middle" fill="#38bdf8" fontSize="10" dy="1" style={{fontFamily: "var(--font-mono)", fontWeight: "bold"}}>
                        {Math.round(distKm).toLocaleString()} km
                    </text>
                </g>
             );
        }
      }
  }

  // Calculate Parallax for Stars
  // We divide rotation by a large factor so stars move slower than the globe
  const parallaxX = (rotation[0] % 360) * 0.1;
  const parallaxY = (rotation[1] % 180) * 0.1;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 rounded-2xl group transition-all duration-75 ${collisionFlash ? "ring-4 ring-red-500 ring-inset bg-red-900/40 translate-x-1" : ""}`}>
        <style>{`
            @keyframes shake {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                10% { transform: translate(-1px, -2px) rotate(-1deg); }
                20% { transform: translate(-3px, 0px) rotate(1deg); }
                30% { transform: translate(3px, 2px) rotate(0deg); }
                40% { transform: translate(1px, -1px) rotate(1deg); }
                50% { transform: translate(-1px, 2px) rotate(-1deg); }
                60% { transform: translate(-3px, 1px) rotate(0deg); }
                70% { transform: translate(3px, 1px) rotate(-1deg); }
                80% { transform: translate(-1px, -1px) rotate(1deg); }
                90% { transform: translate(1px, 2px) rotate(0deg); }
                100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .shake-anim { animation: shake 0.5s infinite; }
        `}</style>
        
        {/* RED ALERT OVERLAY */}
        {collisionFlash && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-red-600/30 mix-blend-hard-light shake-anim">
                <div className="border-y-8 border-red-600 w-full bg-black/80 backdrop-blur-md py-12 flex flex-col items-center justify-center shadow-2xl">
                     <h1 className="text-8xl font-black text-red-500 tracking-[1rem] animate-pulse drop-shadow-[0_0_25px_rgba(220,38,38,0.8)]">
                        IMPACT DETECTED
                    </h1>
                    <div className="text-red-400 font-mono text-xl mt-4 animate-bounce">CRITICAL STRUCTURAL FAILURE IMMINENT</div>
                </div>
            </div>
        )}

        {/* Zoom Controls (Always Visible now per user request) */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 items-end">
             {/* Kessler Toggle */}
             <button 
                onClick={toggleKessler} 
                className={`mb-4 px-3 py-1 text-xs font-bold rounded border backdrop-blur transition-all uppercase tracking-wider
                    ${kesslerMode 
                        ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                        : "bg-slate-800/80 border-white/10 text-slate-400 hover:text-white hover:border-white/30"
                    }`}
            >
                {kesslerMode ? "⚠ KESSLER SYNDROME ACTIVE" : "ENABLE DEBRIS SIM"}
            </button>

            <button onClick={zoomIn} className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur text-lg font-bold transition-transform active:scale-95">+</button>
            <button onClick={zoomOut} className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur text-lg font-bold transition-transform active:scale-95">-</button>
        </div>

        {/* Environmental Readout Overlay */}
        <div className="absolute top-6 right-6 z-20 hidden md:block">
            <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/50 p-2 rounded border border-white/5 backdrop-blur-sm shadow-xl">
                <div className="flex justify-between gap-4"><span>SOLAR POS</span> <span className="text-amber-400">12° RA</span></div>
                <div className="flex justify-between gap-4"><span>FLUX</span> <span className="text-amber-400">NORMAL</span></div>
                <div className="flex justify-between gap-4"><span>GEOMAGNETIC</span> <span className="text-green-400">STABLE</span></div>
                <div className="flex justify-between gap-4"><span>OZONE</span> <span className="text-blue-400">98%</span></div>
            </div>
        </div>

        <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${width} ${height}`} 
            style={{display: "block", cursor: "grab"}}
            onWheel={handleWheel}
        >
        <defs>
            {/* Glow Filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="blur" /> {/* Reduced slightly from 15 for sharpness */}
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Ocean Gradient */}
            <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#020617" />
                <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
            
            {/* Day/Night Shadow Terminator */}
            <linearGradient id="nightShadow" x1="0%" y1="0%" x2="100%" y2="50%" gradientTransform="rotate(45)">
                 <stop offset="0%" stopColor="transparent" stopOpacity="0" />
                 <stop offset="40%" stopColor="transparent" stopOpacity="0" />
                 <stop offset="60%" stopColor="#000000" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
            </linearGradient>

            {/* Sun Specular */}
            <radialGradient id="sunReflection" cx="25%" cy="25%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>

            {/* Atmosphere Ring */}
            <radialGradient id="atmosRing" cx="50%" cy="50%" r="50%">
                <stop offset="80%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="90%" stopColor="#60a5fa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.2" />
            </radialGradient>

             {/* Milky Way Gradient */}
             <linearGradient id="milkyWay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c1d95" stopOpacity="0" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
            </linearGradient>
            
            {/* The Sun Glow */}
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
                <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>
            
            {/* Markers for Vectors */}
            <marker id="arrow-0" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-1" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
        </defs>

        {/* --- DEEP SPACE LAYER --- */}
        <g className="deep-space p-4">
             {/* 0. Gravity Well Grid (Einsteinian "Dip") */}
             <path 
                d={gravityGridPath} 
                fill="none" 
                stroke="#64748b" 
                strokeWidth="0.5" 
                strokeOpacity="0.1" 
                className="pointer-events-none"
             />

             {/* 1. The Milky Way Band */}
             <ellipse 
                cx={width/2} cy={height/2} 
                rx={width} ry={150} 
                fill="url(#milkyWay)" 
                transform="rotate(-30, 400, 225)" 
                filter="url(#glow)"
             />

             {/* 2. Parallax Starfield */}
             <g transform={`translate(${parallaxX}, ${parallaxY})`}>
                {stars.map((star, i) => (
                    <circle 
                        key={i} 
                        cx={star.cx} 
                        cy={star.cy} 
                        r={star.r} 
                        fill={Math.random() > 0.9 ? "#a5f3fc" : "white"} 
                        opacity={star.opacity}
                        filter={Math.random() > 0.8 ? "url(#starGlow)" : "none"}
                    >
                        {/* Simulation of Twinkle */}
                        {(i % 5 === 0) && (
                            <animate 
                                attributeName="opacity" 
                                values={`${star.opacity};${star.opacity * 0.3};${star.opacity}`} 
                                dur={star.twinkleDuration} 
                                repeatCount="indefinite" 
                            />
                        )}
                    </circle>
                ))}
             </g>

             {/* 3. The Sun (Static Source relative to Space) */}
             <g transform="translate(100, 80)">
                <circle r="50" fill="url(#sunGlow)" filter="url(#glow)" opacity="0.9" />
                <circle r="20" fill="#fff" opacity="0.8" filter="url(#glow)" />
             </g>
        </g>

        {/* --- EARTH LAYER --- */}
        <g>
            {/* Atmosphere Outer Glow (Ozone) */}
            <circle 
                cx={width / 2} cy={height / 2} 
                r={projection.scale() * 1.15} 
                fill="url(#atmosRing)" 
                style={{pointerEvents: "none"}}
            />

            {/* Earth Body (Ocean) */}
            <circle 
                cx={width / 2} cy={height / 2} 
                r={projection.scale()} 
                fill="url(#oceanGradient)" 
                stroke="#334155" 
                strokeWidth="1" 
                filter="url(#glow)" 
            />
            
            {/* Atmosphere Specular Reflection */}
            <circle 
                cx={width / 2} cy={height / 2} 
                r={projection.scale()} 
                fill="url(#sunReflection)" 
                style={{pointerEvents: "none"}}
            />

            {/* --- ORBITAL ALTITUDE RINGS (Scale Reference) --- */}
            <g className="altitude-rings pointer-events-none opacity-40">
                {/* LEO (~400km) */}
                <circle cx={width/2} cy={height/2} r={projection.scale() * (1 + 400/6371)} 
                    fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x={width/2} y={height/2 - projection.scale() * (1 + 400/6371) - 2} textAnchor="middle" fill="#22d3ee" fontSize="8" opacity="0.7">LEO</text>

                {/* GPS / MEO (~20,200km) */}
                 <circle cx={width/2} cy={height/2} r={projection.scale() * (1 + 20200/6371)} 
                    fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="5,5" />
                <text x={width/2} y={height/2 - projection.scale() * (1 + 20200/6371) - 2} textAnchor="middle" fill="#f59e0b" fontSize="8" opacity="0.7">MEO</text>

                {/* GEO (~35,786km) */}
                <circle cx={width/2} cy={height/2} r={projection.scale() * (1 + 35786/6371)} 
                    fill="none" stroke="#f472b6" strokeWidth="0.5" strokeDasharray="7,7" />
                <text x={width/2} y={height/2 - projection.scale() * (1 + 35786/6371) - 2} textAnchor="middle" fill="#f472b6" fontSize="8" opacity="0.7">GEO</text>
            </g>

            {/* Grid (Graticule) */}
            <path d={path(graticule())} fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* Continents (Land) */}
            <g>
                {worldData && worldData.features.map((d, i) => (
                    <path 
                        key={i} 
                        d={path(d)} 
                        fill="#1e293b" 
                        stroke="#475569" 
                        strokeWidth="0.5" 
                        className="transition-colors duration-500 hover:fill-slate-700"
                    />
                ))}
            </g>

            {/* --- SOLAR TERMINATOR SHADOW (DAY/NIGHT CYCLE) --- */}
            {/* A fixed gradient overlay that sits on top of the rotating earth map but below clouds/sats */}
            <circle 
                cx={width / 2} cy={height / 2} 
                r={projection.scale()} 
                fill="url(#nightShadow)" 
                style={{pointerEvents: "none", mixBlendMode: "multiply"}} 
                opacity="0.6"
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
                            stroke={i === 0 ? "#60a5fa" : "#fbbf24"} // Blue / Amber
                            strokeWidth="2"
                            strokeOpacity="0.8"
                            filter="url(#glow)"
                        />
                    );
                })}
            </g>

            {/* DEBRIS CLOUD (Kessler Layer) */}
            <g className="debris-layer pointer-events-none">
                {debrisRef.current.map((d, i) => {
                    // Check if debris is visible (on near side)
                    const p = projection([d.lon, d.lat]);
                    if (!p) return null; // Behind earth
                    
                    // Enhanced Debris Effect
                    const isBig = i % 50 === 0;
                    return (
                        <g key={`debris-${i}`} transform={`translate(${p[0]}, ${p[1]})`}>
                            {/* Glow */}
                            <circle r={isBig ? 5 : 2} fill={isBig ? "#ef4444" : "#cbd5e1"} opacity="0.4" filter="url(#glow)" />
                            {/* Core */}
                            {isBig ? (
                                <path d="M-3,-3 L3,-1 L1,3 L-3,1 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1">
                                    <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur={`${2 + Math.random()}s`} repeatCount="indefinite" />
                                </path>
                            ) : (
                                <circle r={1} fill="#94a3b8" />
                            )}
                        </g>
                    );
                })}
            </g>

            
            {/* EXPLOSIONS LAYER */}
            <g className="explosions pointer-events-none">
                {explosionsRef.current.map((ex) => {
                     const p = projection([ex.lon, ex.lat]);
                     if (!p) return null;
                     
                     const ageFactor = 1 - (ex.age / 50); // 1 -> 0
                     const radius = ex.age * 4; // Expand

                     return (
                        <g key={ex.id} transform={`translate(${p[0]}, ${p[1]})`}>
                             {/* Shockwave Outer */}
                             <circle 
                                r={radius} 
                                fill="none" 
                                stroke={ex.type === 'kinetic' ? "#fbbf24" : "#ef4444"} 
                                strokeWidth="3" 
                                opacity={ageFactor} 
                             />
                             {/* Shockwave Inner */}
                             <circle 
                                r={radius * 0.5} 
                                fill="none" 
                                stroke="white" 
                                strokeWidth="1" 
                                opacity={ageFactor} 
                             />
                             {/* Core Flash */}
                             <circle r={15 * ageFactor} fill="white" filter="url(#glow)" opacity={ageFactor} />
                             
                             {/* Spikes */}
                             <g transform={`rotate(${ex.age * 15})`}>
                                 <line x1="0" y1="-20" x2="0" y2="20" stroke="white" strokeWidth="2" opacity={ageFactor} />
                                 <line x1="-20" y1="0" x2="20" y2="0" stroke="white" strokeWidth="2" opacity={ageFactor} />
                             </g>
                        </g>
                     );
                })}
            </g>

            {/* CONSTELLATION LAYER */}
            <g className="constellation-layer pointer-events-none">
                {constellation.map((sat, i) => {
                     const p = projection([sat.lon, sat.lat]);
                     if (!p) return null;
                     
                     // Determine style based on name
                     const isStarlink = sat.name?.includes("STARLINK");
                     const color = isStarlink ? "#06b6d4" : "#fbbf24"; // Cyan or Amber
                     
                     return (
                        <g key={`cons-${i}`}>
                            <circle 
                                cx={p[0]} cy={p[1]} 
                                r={1.2} 
                                fill={color}
                                fillOpacity="0.8"
                            />
                             {/* Occasional twinkle for large fleets */}
                             {i % 10 === 0 && (
                                <circle cx={p[0]} cy={p[1]} r={2} fill="none" stroke={color} strokeWidth="0.5" opacity="0.5">
                                    <animate attributeName="r" from="1" to="4" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                                </circle>
                             )}
                        </g>
                     );
                })}
            </g>

            {/* Connection Line */}
            {connectionElement}
            {distanceLabel}

            {/* Satellites */}
            <g>
                {validSats.map((sat, i) => {
                    const lon = sat.lon !== undefined ? sat.lon : sat.lng;
                    const lat = sat.lat;
                    const projected = projection([lon, lat]);
                    if (!projected) return null; 
                    
                    // --- LIVE EVENT (SIMULATION MARKER) ---
                    if (sat.type === 'EVENT') {
                        const isCrit = sat.risk > 80;
                        const eventColor = isCrit ? "#ef4444" : "#f59e0b";
                        return (
                             <g key={`evt-${i}`} transform={`translate(${projected[0]}, ${projected[1]})`}>
                                {/* Pulse */}
                                <circle r="20" fill="none" stroke={eventColor} strokeWidth="1" strokeOpacity="0.5">
                                    <animate attributeName="r" from="5" to="30" dur="1s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite" />
                                </circle>
                                {/* Crosshair */}
                                <line x1="-5" y1="0" x2="5" y2="0" stroke={eventColor} strokeWidth="1" />
                                <line x1="0" y1="-5" x2="0" y2="5" stroke={eventColor} strokeWidth="1" />
                                
                                <text y="-10" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                                    {sat.name}
                                </text>
                            </g>
                        )
                    }

                    const color = i === 0 ? "#3b82f6" : "#f59e0b";
                    const label = i === 0 ? "TARGET" : "ASSET 2";
                    
                    // Velocity Vector Logic
                    let velocityVector = null;
                    if (sat.path && sat.path.length >= 2) {
                        const len = sat.path.length;
                        const pCurr = projection(sat.path[len-1]); // Current 
                        const pPrev = projection(sat.path[len-2]); // Previous
                        
                        if (pCurr && pPrev) {
                            // Raw delta
                            const dx = pCurr[0] - pPrev[0];
                            const dy = pCurr[1] - pPrev[1];
                            const mag = Math.sqrt(dx*dx + dy*dy);
                            
                            // Visualize speed: user data "velocity_kms" if available, else derive from path delta
                            // If velocity_kms is provided (e.g. 7.5 km/s), we scale it.
                            // If path steps are consistent, 'mag' is proportional to speed * timestep.
                            
                            // Using user's formula suggestion if data exists, otherwise visual magnitude
                            const visualLen = (sat.velocity_kms ? sat.velocity_kms * 2 : mag * 4); 
                            
                            // Normalize direction
                            const nx = mag > 0 ? dx / mag : 0;
                            const ny = mag > 0 ? dy / mag : 0;
                            
                            // Vector Line
                            velocityVector = (
                                <line 
                                    x1={0} y1={0} 
                                    x2={nx * visualLen} y2={ny * visualLen} 
                                    stroke={color} 
                                    strokeWidth="2" 
                                    strokeOpacity="0.9"
                                    filter="url(#glow)"
                                    markerEnd={`url(#arrow-${i})`}
                                />
                            );
                        }
                    }

                    return (
                        <g key={i} transform={`translate(${projected[0]}, ${projected[1]})`} style={{cursor: "pointer"}}>
                            
                            {/* Velocity Vector */}
                            {velocityVector}

                            {/* Radar Pulse */}
                            <circle r="16" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1" strokeOpacity="0.5">
                                <animate attributeName="r" from="12" to="32" dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            
                            {/* Satellite Dot */}
                            <circle r="4" fill="#fff" />
                            <circle r="6" fill="none" stroke={color} strokeWidth="2" />
                            
                            {/* Label */}
                           {/* Fancy HUD Label */}
                            <g transform="translate(15, -15)">
                                <path d="M0,0 L10,-5 L60,-5 L60,10 L10,10 L0,0" fill="rgba(15, 23, 42, 0.9)" stroke={color} strokeWidth="0.5" />
                                <text x="15" y="4" textAnchor="start" fill="#e2e8f0" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
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
