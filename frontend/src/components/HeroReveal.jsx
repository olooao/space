import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// 1. IMPORT YOUR LOCAL IMAGES
// Ensure these files exist in "frontend/src/assets/hero/"
import baseImgAsset from "../assets/hero/base.png";
import revealImgAsset from "../assets/hero/Reveal.png"; 

export default function HeroReveal() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const updateMouse = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", updateMouse);
    return () => window.removeEventListener("mousemove", updateMouse);
  }, []);

  // Flashlight Size
  const maskSize = isHovered ? 400 : 40; 

  return (
    <div 
      className="relative h-screen w-full overflow-hidden bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LAYER 1: BASE (The "Boring" Background - Always Visible) */}
      <div className="absolute inset-0 z-0">
         {/* Removed opacity/grayscale so you can verify the image works */}
         <img src={baseImgAsset} className="h-full w-full object-cover" alt="Base Layer" />
         
         {/* Optional: Slight tint to make text pop, but lighter than before */}
         <div className="absolute inset-0 bg-black/40" /> 
      </div>

      {/* LAYER 2: REVEAL (The "Cool" Image - Hidden except at mouse) */}
      <motion.div 
        className="absolute inset-0 z-10 bg-transparent"
        animate={{
          WebkitMaskPosition: `${mousePosition.x - maskSize/2}px ${mousePosition.y - maskSize/2}px`,
          WebkitMaskSize: `${maskSize}px ${maskSize}px`,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.1 }}
        style={{
          WebkitMaskImage: "url('/mask.svg')",
          // MASK LOGIC: Center (Black/0%) is VISIBLE. Edge (Transparent/100%) is INVISIBLE.
          // This creates a "Spotlight" effect on the Top Layer.
          maskImage: `radial-gradient(circle ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)` 
        }}
      >
          <img src={revealImgAsset} className="h-full w-full object-cover" alt="Reveal Layer" />
      </motion.div>

      {/* TEXT CONTENT */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mix-blend-overlay opacity-90">
          ASRIDE
        </h1>
        <p className="text-sm md:text-xl font-mono text-blue-400 mt-4 tracking-[0.5em] uppercase">
          Orbital Defense System
        </p>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce text-slate-500">
        <span className="text-xs uppercase tracking-widest">Scroll to Intercept</span>
      </div>
    </div>
  );
}