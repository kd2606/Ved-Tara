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
    return <div className={cn("w-8 h-8 rounded-full opacity-0", className)} />;
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
    <div className={cn("relative flex items-center justify-center w-8 h-8", className)}>
      {/* Outer Glow */}
      <motion.div
        animate={isProcessing ? "processing" : "idle"}
        variants={variants}
        className="absolute w-full h-full rounded-full blur-md opacity-50"
        style={{
          background: "var(--orb-gradient-2)",
        }}
      />
      
      {/* Inner Core */}
      <motion.div
        animate={isProcessing ? "processing" : "idle"}
        variants={{
          idle: {
            scale: [1, 1.1, 1],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          },
          processing: {
            scale: [1, 1.2, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          },
        }}
        className="relative w-3/4 h-3/4 rounded-full"
        style={{
          background: "radial-gradient(circle at center, var(--orb-gradient-1) 0%, var(--orb-gradient-2) 80%, transparent 100%)",
          boxShadow: "0 0 10px var(--orb-gradient-1)",
        }}
      />
      
      {/* Center Highlight */}
      <motion.div
        animate={{
          opacity: isProcessing ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: isProcessing ? 1 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-1/3 h-1/3 rounded-full bg-white blur-[1px]"
      />
    </div>
  );
}
