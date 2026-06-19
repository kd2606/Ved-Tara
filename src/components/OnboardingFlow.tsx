"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Persona } from "@/lib/db";
import { useTheme } from "@/context/ThemeContext";
import { Instrument_Serif } from "next/font/google";
import { ArrowRight } from "lucide-react";

const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });

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
      {step === "selection" && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
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

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 h-full">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="step-welcome"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
              transition={{ duration: 1.5 }}
              className="flex flex-col items-center text-center space-y-16"
            >
              <h1 className={`${instrumentSerif.className} text-5xl md:text-7xl text-white/90 font-normal tracking-tight`}>
                Welcome to a safe space.
              </h1>
              
              <button 
                onClick={handleStart}
                className="px-10 py-4 rounded-full border border-white/20 hover:border-white/50 bg-black/50 hover:bg-white/5 text-[10px] tracking-[0.2em] text-white/70 hover:text-white transition-all duration-500 uppercase"
              >
                Awaken Companion
              </button>
            </motion.div>
          )}

          {step === "selection" && (
            <motion.div
              key="step-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="flex flex-col items-center w-full space-y-16 mt-12"
            >
              <h2 className={`${instrumentSerif.className} text-4xl md:text-5xl text-white/90`}>
                Choose your companion.
              </h2>

              <div className="flex gap-6 w-full max-w-2xl justify-center">
                {/* VED CARD */}
                <button
                  onClick={() => setActivePersona("ved")}
                  className={`relative flex flex-col items-center justify-center w-64 h-64 border transition-all duration-500 group ${
                    activePersona === "ved" 
                      ? "bg-[#141414] border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.03)]" 
                      : "bg-[#0f0f0f] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`text-2xl tracking-[0.4em] font-light transition-colors ${activePersona === "ved" ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                    VED
                  </div>
                  <div className="text-[10px] italic font-serif text-white/30 mt-4 tracking-widest">
                    The Stillness.
                  </div>
                  {activePersona === "ved" && (
                    <motion.div layoutId="selection-border" className="absolute inset-0 border border-white/20 pointer-events-none" transition={{duration: 0.5}} />
                  )}
                </button>

                {/* TARA CARD */}
                <button
                  onClick={() => setActivePersona("tara")}
                  className={`relative flex flex-col items-center justify-center w-64 h-64 border transition-all duration-500 group ${
                    activePersona === "tara" 
                      ? "bg-[#141414] border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.03)]" 
                      : "bg-[#0f0f0f] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className={`text-2xl tracking-[0.4em] font-light transition-colors ${activePersona === "tara" ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                    TARA
                  </div>
                  <div className="text-[10px] italic font-serif text-white/30 mt-4 tracking-widest">
                    The Essence.
                  </div>
                  {activePersona === "tara" && (
                    <motion.div layoutId="selection-border" className="absolute inset-0 border border-white/20 pointer-events-none" transition={{duration: 0.5}} />
                  )}
                </button>
              </div>

              <div className="h-16 flex items-center justify-center pt-8">
                {isDownloading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-[1px] bg-white/10 overflow-hidden relative">
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-white/50"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progressText}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <span className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-mono">
                      Awakening Neural Engine... {progressText}%
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={handleComplete}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-white/90 transition-colors text-[10px] tracking-[0.2em] font-bold uppercase"
                  >
                    Enter Sanctuary <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
