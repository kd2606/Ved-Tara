"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Persona } from "@/lib/db";
import { useTheme } from "@/context/ThemeContext";
import { Instrument_Serif } from "next/font/google";
import { ArrowRight } from "lucide-react";

const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });

// Ultra-premium easing curve (fluid, editorial feel)
const premiumEase = [0.16, 1, 0.3, 1];

// Staggered container variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    }
  },
  exit: {
    opacity: 0,
    filter: "blur(10px)",
    scale: 0.98,
    transition: { duration: 1, ease: premiumEase }
  }
};

// Item variants
const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 1.2, ease: premiumEase } 
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 1.2, ease: premiumEase } 
  }
};

interface OnboardingFlowProps {
  progress: number; // 0 to 1
  onComplete: (initialMessage: string, persona: Persona) => void;
  startDownload: () => void;
}

export function OnboardingFlow({ progress, onComplete, startDownload }: OnboardingFlowProps) {
  const { activePersona, setActivePersona } = useTheme();
  const [hasStarted, setHasStarted] = useState(false);
  const [step, setStep] = useState<"welcome" | "selection">("welcome");

  const handleStart = () => {
    setHasStarted(true);
    startDownload();
    setStep("selection");
  };

  const handleComplete = () => {
    if (progress >= 0.99) {
      onComplete("", activePersona);
    }
  };

  const isDownloading = progress > 0 && progress < 0.99;
  const progressText = Math.round(progress * 100);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[#0a0a0a] text-white">
      {/* Top Header line for cinematic framing */}
      <AnimatePresence>
        {step === "selection" && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: premiumEase, delay: 0.5 }}
            className="absolute top-0 left-0 w-full p-8 flex justify-between items-center border-b border-white/5"
          >
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
            </div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 font-medium">
              Step 02 / 02
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 h-full">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="step-welcome"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="flex flex-col items-center text-center space-y-16"
            >
              <motion.h1 
                variants={itemVariants}
                className={`${instrumentSerif.className} text-5xl md:text-7xl text-white/90 font-normal tracking-tight`}
              >
                Welcome to a safe space.
              </motion.h1>
              
              <motion.button 
                variants={itemVariants}
                onClick={handleStart}
                className="px-10 py-4 rounded-full border border-white/20 hover:border-white/50 bg-black/50 hover:bg-white/5 text-[10px] tracking-[0.2em] text-white/70 hover:text-white transition-all duration-500 uppercase"
              >
                Awaken Companion
              </motion.button>
            </motion.div>
          )}

          {step === "selection" && (
            <motion.div
              key="step-selection"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center w-full space-y-16 mt-12"
            >
              <motion.h2 
                variants={itemVariants}
                className={`${instrumentSerif.className} text-4xl md:text-5xl text-white/90`}
              >
                Choose your companion.
              </motion.h2>

              <div className="flex gap-6 w-full max-w-2xl justify-center">
                {/* VED CARD */}
                <motion.button
                  variants={cardVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActivePersona("ved")}
                  className={`relative flex flex-col items-center justify-center w-64 h-64 border transition-colors duration-500 group ${
                    activePersona === "ved" 
                      ? "bg-[#141414] border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.03)]" 
                      : "bg-[#0f0f0f] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`text-2xl tracking-[0.4em] font-light transition-colors duration-700 ${activePersona === "ved" ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                    VED
                  </div>
                  <div className="text-[10px] italic font-serif text-white/30 mt-4 tracking-widest transition-opacity duration-700">
                    The Stillness.
                  </div>
                  {activePersona === "ved" && (
                    <motion.div layoutId="selection-border" className="absolute inset-0 border border-white/20 pointer-events-none" transition={{duration: 0.8, ease: premiumEase}} />
                  )}
                </motion.button>

                {/* TARA CARD */}
                <motion.button
                  variants={cardVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActivePersona("tara")}
                  className={`relative flex flex-col items-center justify-center w-64 h-64 border transition-colors duration-500 group ${
                    activePersona === "tara" 
                      ? "bg-[#141414] border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.03)]" 
                      : "bg-[#0f0f0f] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`text-2xl tracking-[0.4em] font-light transition-colors duration-700 ${activePersona === "tara" ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                    TARA
                  </div>
                  <div className="text-[10px] italic font-serif text-white/30 mt-4 tracking-widest transition-opacity duration-700">
                    The Essence.
                  </div>
                  {activePersona === "tara" && (
                    <motion.div layoutId="selection-border" className="absolute inset-0 border border-white/20 pointer-events-none" transition={{duration: 0.8, ease: premiumEase}} />
                  )}
                </motion.button>
              </div>

              <motion.div variants={itemVariants} className="h-16 flex items-center justify-center pt-8">
                {isDownloading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-48 h-[1px] bg-white/10 overflow-hidden relative">
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-white/50"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progressText}%` }}
                        transition={{ duration: 0.4, ease: premiumEase }}
                      />
                    </div>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-mono">
                      Awakening Neural Engine... {progressText}%
                    </span>
                  </motion.div>
                ) : (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: premiumEase }}
                    onClick={handleComplete}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-white/90 transition-colors text-[10px] tracking-[0.2em] font-bold uppercase"
                  >
                    Enter Sanctuary <ArrowRight className="w-3 h-3" />
                  </motion.button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
