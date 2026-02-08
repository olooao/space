import { useState, useEffect } from "react";
import { 
  motion, 
  useMotionValue, 
  useSpring, 
  useMotionTemplate, 
  useTransform 
} from "framer-motion";

// IMPORT YOUR LOCAL IMAGES
import baseImgAsset from "../assets/hero/base.png";
import revealImgAsset from "../assets/hero/Reveal.png"; 

export default function HeroReveal() {
  const [isHovered, setIsHovered] = useState(false);

  // --- 1. FLUID PHYSICS ENGINE (The "Heavy" Feel) ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // CONFIG EXPLANATION:
  // mass: 1.2 -> Heavier object feels more "premium"
  // stiffness: 200 -> Loose connection to cursor
  // damping: 50 -> High resistance (stops smoothly like hydraulics)
  const physicsConfig = { damping: 50, stiffness: 200, mass: 1.2 };
  
  const smoothX = useSpring(mouseX, physicsConfig);
  const smoothY = useSpring(mouseY, physicsConfig);

  // --- 2. PARALLAX EFFECT (Depth) ---
  // When mouse moves right (0 -> window width), image moves left (-15px)
  // We use the SMOOTH values so the parallax is also fluid
  const moveX = useTransform(smoothX, [0, window.innerWidth], [15, -15]);
  const moveY = useTransform(smoothY, [0, window.innerHeight], [15, -15]);

  // Track Mouse
  useEffect(() => {
    const updateMouse = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", updateMouse);
    return () => window.removeEventListener("mousemove", updateMouse);
  }, []);

  // --- 3. DYNAMIC APERTURE (Size) ---
  const targetSize = isHovered ? 500 : 100; // Larger reveal for better view
  const size = useSpring(targetSize, { damping: 30, stiffness: 150 });
  
  useEffect(() => { size.set(targetSize) }, [targetSize]);

  // --- 4. THE SOFT MASK ---
  // 0% -> 100% gradient creates the softest possible edge fade
  const maskImage = useMotionTemplate`radial-gradient(circle ${size}px at ${smoothX}px ${smoothY}px, black 0%, transparent 100%)`;

  return (
    <div 
      className="relative h-screen w-full overflow-hidden bg-slate-950 cursor-crosshair"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LAYER 1: BASE (Technical Wireframe) */}
      <motion.div 
        className="absolute inset-0 z-0"
        style={{ x: moveX, y: moveY, scale: 1.05 }} // Apply Parallax
      >
         <img 
            src={baseImgAsset} 
            className="h-full w-full object-cover opacity-100 grayscale contrast-125" 
            alt="Base Layer" 
         />
         {/* Cinematic Noise Overlay */}
         <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} 
         />
      </motion.div>

      {/* LAYER 2: REVEAL (Reality) */}
      <motion.div 
        className="absolute inset-0 z-10 bg-transparent will-change-[mask-image]"
        style={{
          maskImage,
          WebkitMaskImage: maskImage, 
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          x: moveX, y: moveY, scale: 1.05 // Sync Parallax so they stay aligned
        }}
      >
          <img 
            src={revealImgAsset} 
            className="h-full w-full object-cover brightness-110 saturate-120" 
            alt="Reveal Layer" 
          />
      </motion.div>

      {/* FOOTER HUD */}
      <div className="absolute bottom-12 w-full px-12 flex justify-between items-end z-20 pointer-events-none text-xs font-mono text-slate-500">
        <div className="flex flex-col gap-1">
            <span>COORDINATES</span>
            <span className="text-slate-300">34.0522° N, 118.2437° W</span>
        </div>
    
        <div className="flex flex-col gap-1 text-right">
            <span>SYSTEM STATUS</span>
            <span className="text-green-400">ONLINE</span>
        </div>
      </div>
    </div>
  );
}