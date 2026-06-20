"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Instrument_Serif } from "next/font/google";
import { getSetting, saveSetting, wipeDatabase } from "@/lib/db";
import { hashPIN, generateRecoveryKey, deriveKeyFromPIN } from "@/lib/crypto";

const instrumentSerif = Instrument_Serif({ 
  weight: "400", 
  style: "italic", 
  subsets: ["latin"] 
});

type ModalState = "none" | "show_recovery" | "forgot" | "fresh_start";

export default function LandingPage() {
  const router = useRouter();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  
  const [modalState, setModalState] = useState<ModalState>("none");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState("");
  const [eraseInput, setEraseInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const checkPin = async () => {
      const storedHash = await getSetting("vt_pin_hash");
      setHasPin(!!storedHash);
    };
    checkPin();
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    
    setErrorMsg("");
    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
    
    if (index === 3 && value) {
      const fullPin = newDigits.join("");
      if (fullPin.length === 4) {
        submitAuth(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setPinDigits(['', '', '', '']);
    inputRefs[0].current?.focus();
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submitAuth = async (pin: string) => {
    if (hasPin) {
      const storedHash = await getSetting("vt_pin_hash");
      const inputHash = await hashPIN(pin);
      if (storedHash === inputHash) {
        await deriveKeyFromPIN(pin);
        router.push("/space");
      } else {
        triggerError("Incorrect Space Key.");
      }
    } else {
      const hash = await hashPIN(pin);
      await saveSetting("vt_pin_hash", hash);
      await deriveKeyFromPIN(pin);
      
      const recKey = generateRecoveryKey();
      const recHash = await hashPIN(recKey);
      await saveSetting("vt_recovery_hash", recHash);
      
      setGeneratedRecoveryKey(recKey);
      setModalState("show_recovery");
    }
  };

  const handleForgotKey = async () => {
    const storedRecHash = await getSetting("vt_recovery_hash");
    if (!storedRecHash) {
      setErrorMsg("No recovery key found.");
      return;
    }
    const inputHash = await hashPIN(recoveryKeyInput.trim().toUpperCase());
    if (storedRecHash === inputHash) {
      setHasPin(false); // Reset so they can create a new pin
      setModalState("none");
      setRecoveryKeyInput("");
      setErrorMsg("");
      setPinDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } else {
      setErrorMsg("Invalid Recovery Key.");
    }
  };

  const handleStartFresh = async () => {
    if (eraseInput === "ERASE") {
      await wipeDatabase();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleGoToSpace = () => {
    router.push("/space");
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-screen bg-[#0A0A0A] text-[#E0E0E0] overflow-y-auto overflow-x-hidden font-sans">
      
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-40 max-w-5xl mx-auto">
        <div className={`${instrumentSerif.className} text-3xl text-white tracking-wide`}>
          Ved &amp; Tara
        </div>
        <div className="border border-[#333333] rounded-full px-4 py-1.5 text-[10px] tracking-widest text-white/50 uppercase">
          On-Device Space
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-6 pb-32 flex flex-col items-start text-left mt-16 md:mt-24 space-y-32">
        
        {/* Section 1: Hero & The Vault */}
        <section className="w-full flex flex-col items-start">
          <h1 className={`${instrumentSerif.className} text-6xl md:text-8xl text-white mb-6 font-normal tracking-tight`}>
            Ved &amp; Tara.
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mb-6 font-light leading-snug">
            The first AI companion physically incapable of betraying you.
          </p>
          <p className="text-sm text-white/50 max-w-xl mb-12 font-light leading-relaxed">
            A 100% on-device, zero-cloud emotional safe space. Your most vulnerable conversations are mathematically encrypted and never leave your screen.
          </p>

          {/* Space Key Section */}
          {hasPin !== null && (
            <div className="w-full max-w-sm border border-[#333333] p-8 bg-[#111111]">
              <div className="text-[10px] tracking-widest uppercase text-white/40 mb-6">
                {hasPin ? "Enter your Space Key" : "Create your Space Key"}
              </div>
              <motion.div 
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex gap-4"
              >
                {pinDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-14 h-14 bg-[#0A0A0A] border border-[#333333] text-white text-xl text-center focus:ring-0 focus:border-white focus:bg-[#111111] transition-colors outline-none rounded-none"
                  />
                ))}
              </motion.div>
              {errorMsg && <p className="text-red-500 text-xs mt-6 tracking-wider uppercase">{errorMsg}</p>}
              
              <div className="mt-8 pt-6 border-t border-[#333333]">
                <button 
                  onClick={() => setModalState(modalState === "forgot" ? "none" : "forgot")}
                  className="text-[10px] text-white/30 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Forgot Key or Start Fresh?
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: The Aim */}
        <section className="w-full border-t border-[#333333] pt-12">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-6">The Aim</h2>
          <p className="text-2xl md:text-3xl text-white/90 font-light leading-relaxed max-w-3xl">
            To provide a judgment-free, emotionally intelligent sanctuary. We believe that true empathy shouldn't come at the cost of your digital privacy.
          </p>
        </section>

        {/* Section 3: Target Audience & Age Category */}
        <section className="w-full border-t border-[#333333] pt-12">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-6">Who Is This For?</h2>
          <p className="text-lg text-white/70 font-light leading-relaxed max-w-2xl">
            Designed meticulously for modern Gen-Z and young professionals (Ages 16-30). Built for those who navigate high-stress lives, crave deep emotional connection, and demand absolute ownership of their data on premium devices.
          </p>
        </section>

        {/* Section 4: The Endgame */}
        <section className="w-full border-t border-[#333333] pt-12">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-6">The Endgame</h2>
          <p className="text-lg text-white/70 font-light leading-relaxed max-w-2xl">
            To prove that the future of AI is local. We are democratizing offline-first multimodal AI, bringing real-time voice, memory, and profound empathy directly to the edge, bypassing corporate cloud servers entirely.
          </p>
        </section>

        {/* Section 5: About The Creator */}
        <section className="w-full border-t border-[#333333] pt-12">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-6">About The Creator</h2>
          <p className="text-lg text-white/70 font-light leading-relaxed max-w-2xl">
            Engineered by <span className="text-white">Krrish Dewangan</span>, a computer science developer from Amity Raipur pushing the boundaries of local AI and privacy-first architecture. Ved &amp; Tara was born out of a passion for combining deep technical execution with genuine human empathy.
          </p>
        </section>

      </main>

      {/* Authentication Modals for Recovery & Fresh Start */}
      <AnimatePresence>
        {modalState !== "none" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A] p-4"
          >
            <div className="relative w-full max-w-md bg-[#111111] p-10 border border-[#333333] flex flex-col items-start text-left">
              
              <button 
                onClick={() => { setModalState("none"); setErrorMsg(""); }}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors text-xl leading-none"
              >
                &times;
              </button>

              {modalState === "show_recovery" && (
                <div className="w-full space-y-8">
                  <h2 className="text-lg uppercase tracking-widest text-white">Recovery Key</h2>
                  <div className="border border-rose-500/30 p-6 bg-[#0A0A0A]">
                    <p className="text-xs text-rose-500/80 uppercase tracking-widest mb-4">Warning</p>
                    <p className="text-sm text-white/60 font-light leading-relaxed mb-4">
                      Because your data is strictly local, we cannot reset your PIN if you lose it.
                    </p>
                    <p className="text-sm text-white/80 font-light">
                      Please save this Recovery Key somewhere safe:
                    </p>
                  </div>
                  
                  <div className="py-6 px-4 bg-[#0A0A0A] border border-[#333333] text-center">
                    <code className="text-2xl font-mono text-white tracking-[0.2em]">{generatedRecoveryKey}</code>
                  </div>
                  
                  <button 
                    onClick={handleGoToSpace}
                    className="w-full bg-white hover:bg-[#E0E0E0] text-black py-4 uppercase tracking-widest text-xs font-bold transition-colors"
                  >
                    I Have Saved It
                  </button>
                </div>
              )}

              {modalState === "forgot" && (
                <div className="w-full space-y-8">
                  <div>
                    <h2 className="text-lg uppercase tracking-widest text-white mb-2">Recover Access</h2>
                    <p className="text-sm text-white/50 font-light">Enter your 12-character Recovery Key.</p>
                  </div>
                  
                  <input
                    type="text"
                    value={recoveryKeyInput}
                    onChange={(e) => setRecoveryKeyInput(e.target.value)}
                    placeholder="VT-XXXX-XXXX-XXXX"
                    className="w-full bg-[#0A0A0A] border border-[#333333] px-6 py-4 text-center font-mono text-xl text-white outline-none uppercase focus:border-white transition-colors"
                    autoFocus
                  />
                  
                  {errorMsg && <p className="text-rose-500 text-xs uppercase tracking-widest">{errorMsg}</p>}
                  
                  <button 
                    onClick={handleForgotKey}
                    disabled={recoveryKeyInput.length < 12}
                    className="w-full bg-white hover:bg-[#E0E0E0] text-black py-4 uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    Verify Key
                  </button>

                  <div className="pt-6 border-t border-[#333333] mt-8">
                    <button 
                      onClick={() => setModalState("fresh_start")}
                      className="text-[10px] text-rose-500/60 hover:text-rose-500 uppercase tracking-widest transition-colors"
                    >
                      Lost both? Start Fresh.
                    </button>
                  </div>
                </div>
              )}

              {modalState === "fresh_start" && (
                <div className="w-full space-y-8">
                  <h2 className="text-lg uppercase tracking-widest text-rose-500">Start Fresh</h2>
                  <div className="border border-rose-500/30 p-6 bg-[#0A0A0A]">
                    <p className="text-sm text-rose-500/90 font-light leading-relaxed">
                      Sometimes, letting go and starting over is exactly what we need.
                    </p>
                    <p className="text-sm text-white/60 font-light leading-relaxed mt-4">
                      This will permanently erase your completely encrypted space. This action cannot be undone. If you are certain, please type <strong className="text-white">ERASE</strong> below.
                    </p>
                  </div>
                  
                  <input
                    type="text"
                    value={eraseInput}
                    onChange={(e) => setEraseInput(e.target.value)}
                    placeholder="Type ERASE"
                    className="w-full bg-[#0A0A0A] border border-rose-500/30 focus:border-rose-500 px-6 py-4 text-center font-mono text-xl text-white outline-none transition-colors"
                    autoFocus
                  />
                  
                  <button 
                    onClick={handleStartFresh}
                    disabled={eraseInput !== "ERASE"}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    Permanently Erase Space
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
