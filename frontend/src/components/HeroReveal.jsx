import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useTransform
} from "framer-motion";

import baseImgAsset from "../assets/hero/base.png";
import revealImgAsset from "../assets/hero/Reveal.png";

export default function HeroReveal() {
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const physicsConfig = { damping: 50, stiffness: 200, mass: 1.2 };
  const smoothX = useSpring(mouseX, physicsConfig);
  const smoothY = useSpring(mouseY, physicsConfig);

  const moveX = useTransform(smoothX, [0, window.innerWidth], [10, -10]);
  const moveY = useTransform(smoothY, [0, window.innerHeight], [10, -10]);

  useEffect(() => {
    const updateMouse = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", updateMouse);
    return () => window.removeEventListener("mousemove", updateMouse);
  }, []);

  const targetSize = isHovered ? 450 : 80;
  const size = useSpring(targetSize, { damping: 30, stiffness: 150 });

  useEffect(() => { size.set(targetSize) }, [targetSize]);

  const maskImage = useMotionTemplate`radial-gradient(circle ${size}px at ${smoothX}px ${smoothY}px, black 0%, transparent 100%)`;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-surface-bg cursor-crosshair"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Layer */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ x: moveX, y: moveY, scale: 1.04 }}
      >
        <img
          src={baseImgAsset}
          className="h-full w-full object-cover opacity-90 grayscale contrast-110"
          alt="Base"
        />
      </motion.div>

      {/* Reveal Layer */}
      <motion.div
        className="absolute inset-0 z-10 will-change-[mask-image]"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          x: moveX, y: moveY, scale: 1.04
        }}
      >
        <img
          src={revealImgAsset}
          className="h-full w-full object-cover brightness-105 saturate-110"
          alt="Reveal"
        />
      </motion.div>

      {/* Soft vignette */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(15,17,21,0.7)_100%)]" />
    </div>
  );
}