"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useLLM } from "@/context/LLMContext";
import { CompanionOrb } from "@/components/CompanionOrb";
import { MessageList } from "@/components/MessageList";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Settings, Power, Plus, ArrowUp } from "lucide-react";
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });
import { 
  saveMessage, 
  fetchMessages, 
  DecryptedMessage, 
  Persona,
  fetchUnreadWaitingMessage,
  markWaitingMessageRead,
  DecryptedWaitingMessage,
  wipeDatabase
} from "@/lib/db";
import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";

export default function ChatScreen() {
  const router = useRouter();
  
  useEffect(() => {
    if (sessionStorage.getItem("vt_unlocked") !== "true") {
      router.replace("/");
    }
  }, [router]);

  const { activePersona, togglePersona } = useTheme();
  const { 
    isEngineReady, 
    progressValue, 
    initEngine, 
    generateResponse, 
    checkCrisisSafety, 
    queueSummarize, 
    queueExtractMemories,
    queueGenerateWaitingMessage, 
    markUserActivity 
  } = useLLM();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  
  const [sessionMemories, setSessionMemories] = useState<string[]>([]);
  const [waitingMessage, setWaitingMessage] = useState<DecryptedWaitingMessage | null>(null);
  
  const summarizedCountRef = useRef<number>(0);

  useEffect(() => {
    const loadState = async () => {
      const msgs = await fetchMessages(activePersona);
      setMessages(msgs);
      if (msgs.length > 0 && !isOnboardingComplete) {
        setIsOnboardingComplete(true);
        summarizedCountRef.current = Math.max(0, msgs.length - 12);
        
        // Check for "Waiting for You" message
        const unread = await fetchUnreadWaitingMessage(activePersona);
        if (unread) {
          const TWELVE_HOURS = 12 * 60 * 60 * 1000;
          if (Date.now() - unread.timestamp > TWELVE_HOURS) {
             setWaitingMessage(unread);
          }
        }
      }
    };
    loadState();
    const interval = setInterval(loadState, 1000);
    return () => clearInterval(interval);
  }, [activePersona, isOnboardingComplete]);

  const processMessage = async (text: string, personaToUse: Persona) => {
    setIsProcessing(true);
    markUserActivity();
    
    await saveMessage({
      persona: personaToUse,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });

    let retrievedContext: string[] = sessionMemories;

    if (messages.length === 0) {
      try {
        const { searchSimilarMemories } = await import("@/lib/memory");
        const similar = await searchSimilarMemories(text, personaToUse);
        retrievedContext = similar.map(m => m.content);
        setSessionMemories(retrievedContext);
      } catch (e) {
        console.error("Silent retrieval failed:", e);
      }
    }

    import("@/lib/memory").then(({ generateEmbedding }) => {
      generateEmbedding(text).catch(console.error);
    });

    const crisisResponse = checkCrisisSafety(text);
    if (crisisResponse) {
      await saveMessage({
        persona: personaToUse,
        role: 'ai',
        content: crisisResponse,
        timestamp: Date.now(),
      });
      setIsProcessing(false);
      return;
    }

    const workingContextMsgs = messages.slice(-10);
    
    if (messages.length >= 12) {
      const unsummarizedOldMsgs = messages.slice(summarizedCountRef.current, messages.length - 10);
      if (unsummarizedOldMsgs.length >= 2) {
        const turnsToSummarize = unsummarizedOldMsgs.map(m => `${m.role}: ${m.content}`).join("\n");
        queueSummarize(turnsToSummarize, personaToUse);
        summarizedCountRef.current += unsummarizedOldMsgs.length;
      }
    }

    const contextMessages: ChatCompletionMessageParam[] = workingContextMsgs.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));
    contextMessages.push({ role: 'user', content: text });

    try {
      const replyText = await generateResponse(contextMessages, personaToUse, retrievedContext);
      await saveMessage({
        persona: personaToUse,
        role: 'ai',
        content: replyText,
        timestamp: Date.now(),
      });

      import("@/lib/memory").then(({ generateEmbedding }) => {
        generateEmbedding(replyText).catch(console.error);
      });
    } catch (error) {
      console.error("Inference error:", error);
      await saveMessage({
        persona: personaToUse,
        role: 'ai',
        content: "*An error occurred while connecting to my thoughts. Please try again.*",
        timestamp: Date.now(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing || !isEngineReady) return;
    const text = inputValue.trim();
    setInputValue("");
    await processMessage(text, activePersona);
  };

  const handleOnboardingComplete = async (initialMessage: string, chosenPersona: Persona) => {
    setIsOnboardingComplete(true);
    if (initialMessage.trim()) {
      await processMessage(initialMessage, chosenPersona);
    }
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session?")) {
      queueExtractMemories(activePersona);
      queueGenerateWaitingMessage(activePersona);
      alert("Session ended. I will remember our time today.");
      sessionStorage.removeItem("vt_unlocked");
      router.replace("/");
    }
  };

  const handleDismissWaitingMessage = async () => {
    if (waitingMessage && waitingMessage.id) {
      await markWaitingMessageRead(waitingMessage.id);
      
      await saveMessage({
        persona: activePersona,
        role: 'ai',
        content: waitingMessage.content,
        timestamp: Date.now(),
      });
      
      setWaitingMessage(null);
    }
  };

  if (messages.length === 0 && !isOnboardingComplete) {
    return (
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0a0a]">
        <svg className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
          <filter id="chatNoise">
            <feTurbulence baseFrequency="0.9" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
          </filter>
          <rect filter="url(#chatNoise)" height="100%" width="100%" />
        </svg>
        <OnboardingFlow 
          progress={progressValue} 
          onComplete={handleOnboardingComplete}
          startDownload={initEngine} 
        />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between bg-[#0a0a0a] overflow-hidden font-sans">
      {/* Deep dark noise background */}
      <svg className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-0 opacity-[0.03] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
        <filter id="chatNoise">
          <feTurbulence baseFrequency="0.9" numOctaves={3} stitchTiles="stitch" type="fractalNoise" />
        </filter>
        <rect filter="url(#chatNoise)" height="100%" width="100%" />
      </svg>

      {/* Top Navbar */}
      <header className="z-10 flex w-full items-center justify-between px-8 py-6 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="font-serif italic text-2xl text-white/90 tracking-wide pl-2">Ved &amp; Tara</span>
        </div>

        <nav className="hidden md:flex gap-12 text-[10px] uppercase tracking-widest font-medium text-white/40">
          <button className="hover:text-white transition-colors">Sanctuary</button>
          <button className="text-white border-b border-white/30 pb-1">Presence</button>
          <button className="hover:text-white transition-colors">Essence</button>
        </nav>

        <button 
          onClick={handleEndSession}
          className="text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors"
        >
          END SESSION
        </button>
      </header>

      {/* Main Content Area */}
      <div className="z-10 flex flex-1 flex-col items-center w-full max-w-4xl overflow-hidden relative">
        <AnimatePresence mode="wait">
          {waitingMessage ? (
            <motion.div 
              key="waiting-message"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 1 }}
              className="flex-1 w-full flex flex-col items-center justify-center -mt-20"
            >
              <CompanionOrb isProcessing={false} className="mb-12 scale-125" />
              <div className="max-w-md text-center space-y-8">
                <p className="text-2xl font-light text-foreground/90 leading-relaxed italic tracking-wide">
                  "{waitingMessage.content}"
                </p>
                <button 
                  onClick={handleDismissWaitingMessage}
                  className="px-8 py-3 rounded-full hover:bg-white/10 transition-colors border border-white/20 text-sm tracking-widest text-foreground/70 hover:text-white"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-interface"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 w-full flex flex-col items-center overflow-hidden"
            >
              <MessageList messages={messages} isProcessing={isProcessing} activePersona={activePersona} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Input Bar */}
      <div className="z-20 w-full max-w-3xl absolute bottom-0 left-1/2 -translate-x-1/2 pb-8 pt-10 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
        <form onSubmit={handleSend} className="relative w-full px-4">
          <div className="relative flex items-center bg-[#141414] rounded-full border border-white/5 shadow-2xl px-4 py-3 group focus-within:border-white/10 transition-colors">
            <button 
              type="button" 
              onClick={() => togglePersona()}
              className={`text-[10px] uppercase tracking-widest font-bold transition-colors px-2 mr-2 border-r border-white/10 pr-4 ${activePersona === 'ved' ? 'text-white/70 hover:text-white' : 'text-white/70 hover:text-white'}`}
              title={`Switch to ${activePersona === 'ved' ? 'Tara' : 'Ved'}`}
            >
              {activePersona}
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                markUserActivity();
              }}
              placeholder={isEngineReady ? "Share what's on your mind..." : "Engine is initializing..."}
              disabled={!isEngineReady || !!waitingMessage}
              className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-foreground/90 placeholder:text-white/20 font-light disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing || !isEngineReady || !!waitingMessage}
              className={`p-2 rounded-full transition-all duration-300 ${
                inputValue.trim() && !isProcessing && isEngineReady && !waitingMessage
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-white/5 text-white/20"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="mt-4 text-center">
          <p className="text-[10px] text-white/20 tracking-wider font-medium">
            Ved &amp; Tara are listening.
          </p>
        </div>
      </div>
    </main>
  );
}
