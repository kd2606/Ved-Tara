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
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#f5f0e8] overflow-hidden font-sans">
      {/* Overlay Noise */}
      <svg className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-50 opacity-[0.04] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence baseFrequency="0.8" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
        </filter>
        <rect filter="url(#noiseFilter)" height="100%" width="100%" />
      </svg>

      {/* Aurora Background */}
      <motion.div 
        className="absolute inset-[-20%] z-0 opacity-30 blur-[120px]"
        style={{
          background: `
            radial-gradient(circle at 30% 20%, #0d9488 0%, transparent 40%),
            radial-gradient(circle at 70% 30%, #4338ca 0%, transparent 45%),
            radial-gradient(circle at 40% 80%, #fb923c 0%, transparent 40%)
          `
        }}
        animate={{ scale: [1, 1.1], x: ["0%", "-2%"], y: ["0%", "2%"] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-40">
        <div className={`${instrumentSerif.className} text-2xl text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
          Ved &amp; Tara
        </div>
        <div className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70 backdrop-blur-md">
          On-Device Space
        </div>
      </header>

      {/* Main Content */}
      <motion.main 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: [0.0, 0.0, 0.2, 1] }}
        className="relative z-20 flex flex-col items-center text-center px-4 w-full max-w-5xl mt-12"
      >
        <h1 className={`${instrumentSerif.className} text-5xl md:text-7xl text-white mb-6 font-normal`}>
          Your mind's quiet place.
        </h1>
        <p className="text-lg text-white/60 max-w-xl mx-auto mb-16 font-light leading-relaxed">
          Meet Ved &amp; Tara. An empathetic AI confidant that listens to understand, not to fix. Running entirely on your device.
        </p>

        {/* Space Key Section */}
        {hasPin !== null && (
          <div className="mb-20">
            <div className="text-xs tracking-widest uppercase text-white/40 mb-4">
              {hasPin ? "Enter your Space Key" : "Create your Space Key"}
            </div>
            <motion.div 
              animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex gap-4 justify-center"
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
                  className="w-16 h-16 bg-white/5 backdrop-blur-xl border border-white/10 text-white text-2xl text-center rounded-2xl focus:ring-0 focus:bg-white/10 focus:border-white/30 focus:shadow-[0_0_20px_rgba(255,255,255,0.1)] outline-none transition-all duration-300"
                />
              ))}
            </motion.div>
            {errorMsg && <p className="text-red-400 text-xs mt-4 tracking-wider">{errorMsg}</p>}
          </div>
        )}

        {/* Product Specifications Badges */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full">
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-full px-5 py-2.5">
            <span className="text-lg">🔒</span>
            <div className="text-left">
              <div className="text-sm text-white/80 font-medium">AES-GCM Encryption</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Your data never leaves</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-full px-5 py-2.5">
            <span className="text-lg">⚡</span>
            <div className="text-left">
              <div className="text-sm text-white/80 font-medium">Phi-3.5 Neural Engine</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Local AI</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-full px-5 py-2.5">
            <span className="text-lg">🚫</span>
            <div className="text-left">
              <div className="text-sm text-white/80 font-medium">Zero-Server Architecture</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Absolute Privacy</div>
            </div>
          </div>
        </div>
      </motion.main>

      {/* Footer link */}
      <div className="absolute bottom-8 z-40">
        <button 
          onClick={() => setModalState(modalState === "forgot" ? "none" : "forgot")}
          className="text-xs text-white/30 hover:text-white/70 transition-colors uppercase tracking-widest font-light"
        >
          Forgot Key or Start Fresh?
        </button>
      </div>

      {/* Authentication Modals for Recovery & Fresh Start */}
      <AnimatePresence>
        {modalState !== "none" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <div className="relative w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center">
              
              <button 
                onClick={() => { setModalState("none"); setErrorMsg(""); }}
                className="absolute top-4 right-6 text-foreground/40 hover:text-white text-xl"
              >
                &times;
              </button>

              {modalState === "show_recovery" && (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-light text-white tracking-wider">Recovery Key</h2>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <p className="text-sm text-red-200/80 font-light mb-2">
                      Because your data is strictly local, we cannot reset your PIN if you lose it.
                    </p>
                    <p className="text-sm text-white/80 font-light">
                      Please save this Recovery Key somewhere safe:
                    </p>
                  </div>
                  
                  <div className="glass-panel py-4 px-2 rounded-xl border border-white/10">
                    <code className="text-xl font-mono text-white tracking-widest">{generatedRecoveryKey}</code>
                  </div>
                  
                  <button 
                    onClick={handleGoToSpace}
                    className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 tracking-widest text-sm transition-colors"
                  >
                    I HAVE SAVED IT
                  </button>
                </div>
              )}

              {modalState === "forgot" && (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-light text-white tracking-wider">Recover Access</h2>
                  <p className="text-sm text-white/50 font-light">Enter your 12-character Recovery Key.</p>
                  
                  <input
                    type="text"
                    value={recoveryKeyInput}
                    onChange={(e) => setRecoveryKeyInput(e.target.value)}
                    placeholder="VT-XXXX-XXXX-XXXX"
                    className="w-full glass-panel bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-3 text-center font-mono text-lg text-white outline-none uppercase focus:border-white/40 transition-colors"
                    autoFocus
                  />
                  
                  {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
                  
                  <button 
                    onClick={handleForgotKey}
                    disabled={recoveryKeyInput.length < 12}
                    className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 tracking-widest text-sm transition-colors disabled:opacity-50"
                  >
                    VERIFY KEY
                  </button>

                  <div className="pt-4 border-t border-white/10 mt-4">
                    <button 
                      onClick={() => setModalState("fresh_start")}
                      className="text-xs text-red-400/60 hover:text-red-400 tracking-wider"
                    >
                      Lost both? Start Fresh.
                    </button>
                  </div>
                </div>
              )}

              {modalState === "fresh_start" && (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-light text-red-400 tracking-wider">Start Fresh</h2>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left">
                    <p className="text-sm text-red-200/90 font-light">
                      Sometimes, letting go and starting over is exactly what we need.
                    </p>
                    <p className="text-sm text-red-200/70 font-light mt-4">
                      This will permanently erase your completely encrypted space. This action cannot be undone. If you are certain, please type <strong>ERASE</strong> below.
                    </p>
                  </div>
                  
                  <input
                    type="text"
                    value={eraseInput}
                    onChange={(e) => setEraseInput(e.target.value)}
                    placeholder="Type ERASE"
                    className="w-full glass-panel bg-transparent border border-red-500/30 focus:border-red-500 rounded-xl px-4 py-3 text-center font-mono text-lg text-white outline-none"
                    autoFocus
                  />
                  
                  <button 
                    onClick={handleStartFresh}
                    disabled={eraseInput !== "ERASE"}
                    className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl py-3 tracking-widest text-sm transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    PERMANENTLY ERASE SPACE
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
