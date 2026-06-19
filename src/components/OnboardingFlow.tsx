"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CompanionOrb } from "./CompanionOrb";
import { Persona, saveSetting } from "@/lib/db";
import { useTheme } from "@/context/ThemeContext";
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });

interface OnboardingFlowProps {
  progress: number; // 0 to 1
  onComplete: (initialMessage: string, persona: Persona) => void;
  startDownload: () => void;
}

export function OnboardingFlow({ progress, onComplete, startDownload }: OnboardingFlowProps) {
  const { activePersona, setActivePersona } = useTheme();
  const [hasStarted, setHasStarted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [phase, setPhase] = useState(0);

  // Map progress to phases
  useEffect(() => {
    if (!hasStarted) {
      setPhase(0);
    } else if (progress < 0.1) {
      setPhase(1);
    } else if (progress < 0.5) {
      setPhase(2);
    } else if (progress < 0.8) {
      setPhase(3);
    } else if (progress < 0.95) {
      setPhase(4); // Cadence Choice
    } else {
      setPhase(5); // Persona Choice
    }
  }, [progress, hasStarted]);

  const handleStart = () => {
    setHasStarted(true);
    startDownload();
  };

  const handleCadenceSelection = async (cadence: string) => {
    await saveSetting("cadence_preference", cadence);
    if (progress >= 0.95) {
      setPhase(5);
    }
  };

  const handleComplete = () => {
    onComplete(inputValue, activePersona);
  };

  const getPhase2Text = () => {
    if (progress < 0.23) return "I’m an AI. I live entirely on your device. Nothing you say to me will ever leave it.";
    if (progress < 0.36) return "I’ll listen first. I won’t rush to fix things.";
    return "Choosing to be heard is brave. Thank you for being here.";
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-transparent">
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl px-6 h-full">

        <div className="h-48 flex items-center justify-center text-center w-full">
          <AnimatePresence mode="wait">
            {phase === 0 && (
              <motion.div
                key="phase0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 flex flex-col items-center"
              >
                <h1 className={`${instrumentSerif.className} text-4xl text-white/90 font-normal`}>
                  Welcome to a safe space.
                </h1>
                <button 
                  onClick={handleStart}
                  className="px-8 py-3 rounded-full hover:bg-white/10 transition-colors border border-white/10 bg-[#1c1c1c] text-sm tracking-widest text-white/70 shadow-2xl"
                >
                  AWAKEN COMPANION
                </button>
              </motion.div>
            )}

            {phase === 1 && (
              <motion.p
                key="phase1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="text-xl font-light text-foreground/80 tracking-wide"
              >
                Hi. Before we begin, I want to be honest with you about what I am, and what I’m not.
              </motion.p>
            )}

            {phase === 2 && (
              <motion.p
                key={getPhase2Text()} 
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 1 }}
                className="text-xl font-light text-foreground/80 tracking-wide max-w-md"
              >
                {getPhase2Text()}
              </motion.p>
            )}

            {phase === 3 && (
              <motion.div
                key="phase3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="w-full space-y-8 flex flex-col items-center"
              >
                <p className={`${instrumentSerif.className} text-3xl text-white/80`}>
                  While I’m getting settled, would you tell me what brought you here today?
                </p>
                <div className="w-full max-w-lg relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="I'm feeling..."
                    className="w-full bg-[#1c1c1c] rounded-2xl px-6 py-4 border border-white/5 outline-none text-foreground/90 placeholder:text-foreground/30 font-light shadow-2xl transition-colors focus:border-white/20"
                  />
                </div>
              </motion.div>
            )}

            {phase === 4 && (
              <motion.div
                key="phase4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="w-full space-y-8 flex flex-col items-center"
              >
                <p className={`${instrumentSerif.className} text-3xl text-white/80 max-w-md`}>
                  How often do you want me to be part of your life?
                </p>
                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <button 
                    onClick={() => handleCadenceSelection("on-demand")}
                    className="px-6 py-4 rounded-xl hover:bg-white/10 transition-colors border border-white/5 bg-[#1c1c1c] shadow-2xl text-sm tracking-wide text-foreground/90"
                  >
                    I'll reach out when I need you
                  </button>
                  <button 
                    onClick={() => handleCadenceSelection("check-in")}
                    className="px-6 py-4 rounded-xl hover:bg-white/10 transition-colors border border-white/5 bg-[#1c1c1c] shadow-2xl text-sm tracking-wide text-foreground/90"
                  >
                    Occasional check-ins
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 5 && (
              <motion.div
                key="phase5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full space-y-8 flex flex-col items-center"
              >
                <div className="space-y-2">
                  <h2 className={`${instrumentSerif.className} text-4xl text-white/90`}>I am ready.</h2>
                  <p className="text-[10px] text-foreground/40 tracking-widest font-medium uppercase mt-2">CHOOSE YOUR COMPANION</p>
                </div>

                <div className="flex items-center rounded-full p-2 border border-white/10 bg-[#1c1c1c] shadow-2xl">
                  <button
                    onClick={() => setActivePersona("ved")}
                    className={`relative px-8 py-3 rounded-full text-sm font-medium transition-all duration-500 ${
                      activePersona === "ved" ? "text-white" : "text-foreground/40 hover:text-foreground/70"
                    }`}
                  >
                    {activePersona === "ved" && (
                      <motion.div
                        layoutId="active-onboarding-pill"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                      />
                    )}
                    <span className="relative z-10 tracking-widest">VED</span>
                  </button>
                  <button
                    onClick={() => setActivePersona("tara")}
                    className={`relative px-8 py-3 rounded-full text-sm font-medium transition-all duration-500 ${
                      activePersona === "tara" ? "text-white" : "text-foreground/40 hover:text-foreground/70"
                    }`}
                  >
                    {activePersona === "tara" && (
                      <motion.div
                        layoutId="active-onboarding-pill"
                        className="absolute inset-0 bg-white/10 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
                      />
                    )}
                    <span className="relative z-10 tracking-widest">TARA</span>
                  </button>
                </div>

                <button 
                  onClick={handleComplete}
                  className="text-xs tracking-widest text-foreground/50 hover:text-white transition-colors uppercase py-2 font-bold"
                >
                  Enter Space
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {hasStarted && phase < 5 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-10 text-[10px] text-foreground/30 uppercase tracking-widest font-mono"
          >
            {phase === 1 && "Establishing secure local connection..."}
            {phase === 2 && "Downloading foundational weights..."}
            {phase === 3 && "Finalizing neural pathways..."}
            {phase === 4 && "Configuring ethical boundaries..."}
          </motion.div>
        )}
      </div>
    </div>
  );
}
