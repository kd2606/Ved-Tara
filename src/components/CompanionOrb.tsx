"use client";

import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface CompanionOrbProps {
  isProcessing?: boolean;
  className?: string;
}

export function CompanionOrb({ isProcessing = false, className }: CompanionOrbProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("w-64 h-64 rounded-full opacity-0", className)} />;
  }

  // Define animation variants for breathing vs processing states
  const variants: Variants = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: [0, 5, -5, 0],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    processing: {
      scale: [1, 1.15, 1],
      rotate: [0, 180, 360],
      opacity: [0.9, 1, 0.9],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className={cn("relative flex items-center justify-center w-64 h-64", className)}>
      {/* Outer Glow */}
      <motion.div
        animate={isProcessing ? "processing" : "idle"}
        variants={variants}
        className="absolute w-full h-full rounded-full blur-[60px] opacity-60"
        style={{
          background: "radial-gradient(circle at center, var(--orb-gradient-1) 0%, var(--orb-gradient-2) 50%, var(--orb-gradient-3) 100%)",
        }}
      />
      
      {/* Inner Core */}
      <motion.div
        animate={isProcessing ? "processing" : "idle"}
        variants={{
          idle: {
            scale: [1, 1.02, 1],
            rotate: [0, -5, 5, 0],
            transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          },
          processing: {
            scale: [1, 1.1, 1],
            rotate: [0, -180, -360],
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          },
        }}
        className="relative w-3/4 h-3/4 rounded-full blur-[20px]"
        style={{
          background: "radial-gradient(circle at center, var(--orb-gradient-2) 0%, var(--orb-gradient-1) 70%, transparent 100%)",
        }}
      />
      
      {/* Center Highlight */}
      <motion.div
        animate={{
          opacity: isProcessing ? [0.6, 1, 0.6] : [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: isProcessing ? 1.5 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-1/3 h-1/3 rounded-full bg-white blur-[15px]"
      />
    </div>
  );
}
