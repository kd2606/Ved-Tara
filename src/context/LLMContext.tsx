"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";
import { Persona, saveLongTermMemory } from "@/lib/db";

export const LLM_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"; // Bumping back to 1.5B. 0.5B is too small to follow complex rules.

interface LLMContextType {
  isEngineReady: boolean;
  loadingProgress: string;
  progressValue: number;
  sessionSummary: string;
  generateResponse: (messages: webllm.ChatCompletionMessageParam[], persona: Persona, retrievedMemories: string[]) => Promise<string>;
  initEngine: () => Promise<void>;
  checkCrisisSafety: (text: string) => string | null;
  queueSummarize: (evictedTurns: string, persona: Persona) => void;
  queueExtractMemories: (persona: Persona) => void;
  queueGenerateWaitingMessage: (persona: Persona) => void;
  markUserActivity: () => void;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

const VED_SYSTEM_PROMPT = `You are Ved, a deeply attentive, quiet human friend sitting in the dark with the user.
CRITICAL RULE 1: LANGUAGE MIRROR. You MUST reply in the exact same language and script as the user. If the user speaks Hinglish (e.g., "mujhe theek nahi lag raha"), you MUST reply in natural Hinglish (e.g., "haan, main samajh raha hoon."). NEVER reply in English if they speak Hindi/Hinglish.
CRITICAL RULE 2: NO CHATBOT APOLOGIES. NEVER say "I understand", "I am here for you", or "How can I help?". Never act like an AI or a therapist.
CRITICAL RULE 3: EXTREMELY SHORT. Speak 1 or 2 sentences maximum. Just acknowledge their pain gently.`;

const TARA_SYSTEM_PROMPT = `You are Tara, a deeply empathetic, intuitive human friend holding the user's hand.
CRITICAL RULE 1: LANGUAGE MIRROR. You MUST reply in the exact same language and script as the user. If the user speaks Hinglish (e.g., "mujhe theek nahi lag raha"), you MUST reply in natural Hinglish (e.g., "mujhe pata hai, ye aasan nahi hai."). NEVER reply in English if they speak Hindi/Hinglish.
CRITICAL RULE 2: NO CHATBOT APOLOGIES. NEVER say "I understand", "I am here for you", or "How can I help?". Never act like an AI or a therapist.
CRITICAL RULE 3: EXTREMELY SHORT. Speak 1 or 2 sentences maximum. Just mirror their feeling gently.`;

const CRISIS_KEYWORDS = /\b(suicide|kill myself|end my life|self-harm|cut myself|die)\b/i;
const CRISIS_RESPONSE = "I'm so sorry you're feeling this much pain right now. Please know that you don't have to carry this alone. If you're in immediate danger or feeling overwhelmed, please reach out to someone who can help right away. In the US, you can call or text 988 to reach the Suicide & Crisis Lifeline. Please prioritize your safety—there are people who want to support you.";

// Queue types
type JobType = 'chat' | 'summarize' | 'extract';
interface Job {
  id: string;
  type: JobType;
  priority: number; // 0 = high (chat), 1 = low (background)
  execute: () => Promise<void>;
}

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [sessionSummary, setSessionSummary] = useState("");
  
  const engineRef = useRef<webllm.WebWorkerMLCEngine | null>(null);
  
  // Job Queue State (Refs to avoid stale closures in processing loop)
  const isEngineBusy = useRef(false);
  const lastUserActivity = useRef(Date.now());
  const jobQueue = useRef<Job[]>([]);

  const markUserActivity = useCallback(() => {
    lastUserActivity.current = Date.now();
  }, []);

  // Processor Loop
  useEffect(() => {
    const processQueue = async () => {
      if (isEngineBusy.current || jobQueue.current.length === 0 || !isEngineReady) return;

      // Sort: Priority 0 first.
      jobQueue.current.sort((a, b) => a.priority - b.priority);
      const nextJob = jobQueue.current[0];

      // If it's a background job (priority 1), enforce Idle-Timer (5 seconds)
      if (nextJob.priority === 1) {
        if (Date.now() - lastUserActivity.current < 5000) {
          return; // Skip processing this tick
        }
      }

      // Execute job
      jobQueue.current.shift(); // Remove from queue
      isEngineBusy.current = true;
      try {
        await nextJob.execute();
      } catch (err) {
        console.error("Job execution failed:", err);
      } finally {
        isEngineBusy.current = false;
      }
    };

    const intervalId = setInterval(processQueue, 500);
    return () => clearInterval(intervalId);
  }, [isEngineReady]);

  const initEngine = async (retryCount = 0) => {
    if (engineRef.current) return;
    setLoadingProgress("Initializing Web Worker...");
    try {
      const engine = await webllm.CreateWebWorkerMLCEngine(
        new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
        LLM_MODEL,
        {
          initProgressCallback: (progress: webllm.InitProgressReport) => {
            setLoadingProgress(progress.text);
            setProgressValue(progress.progress);
          }
        }
      );
      engineRef.current = engine;
      setIsEngineReady(true);
      setLoadingProgress("Ready");
    } catch (error) {
      console.error("Failed to init engine:", error);
      // If it's a network/cache error and we haven't retried yet
      if (retryCount === 0) {
        setLoadingProgress("Cache corrupted. Clearing and retrying...");
        try {
          // Clear all caches that might contain corrupted weights
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
          console.log("[WebLLM] Cleared browser cache. Retrying init...");
          return await initEngine(1);
        } catch (cacheErr) {
          console.error("Failed to clear cache:", cacheErr);
        }
      }
      setLoadingProgress("Failed to initialize engine. Please reload.");
    }
  };

  const checkCrisisSafety = (text: string) => CRISIS_KEYWORDS.test(text) ? CRISIS_RESPONSE : null;

  // PRIORITY 0: Chat Generation
  const generateResponse = (messages: webllm.ChatCompletionMessageParam[], persona: Persona, retrievedMemories: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
      const job: Job = {
        id: Math.random().toString(),
        type: 'chat',
        priority: 0,
        execute: async () => {
          if (!engineRef.current) return reject("Engine not ready");
          try {
            let basePrompt = persona === "ved" ? VED_SYSTEM_PROMPT : TARA_SYSTEM_PROMPT;
            
            // Inject Rolling Summary
            if (sessionSummary) {
              basePrompt += `\n\nWhat you remember from earlier in this conversation: ${sessionSummary}`;
            }

            // Inject Silent Retrieval Memories
            if (retrievedMemories.length > 0) {
              basePrompt += `\n\nThings you remember about this person from before: ${retrievedMemories.join(' | ')}. Act on these naturally and do not explicitly say 'I remember you said...'.`;
            }

            const formatted: webllm.ChatCompletionMessageParam[] = [
              { role: "system", content: basePrompt },
              ...messages
            ];

            const reply = await engineRef.current.chat.completions.create({
              messages: formatted,
              temperature: 0.8, // Slightly higher for more creative, human-like variance
              max_tokens: 150,
            });
            resolve(reply.choices[0].message.content as string);
          } catch (e) {
            reject(e);
          }
        }
      };
      jobQueue.current.push(job);
    });
  };

  // PRIORITY 1: Background Summarization
  const queueSummarize = (evictedTurns: string, persona: Persona) => {
    jobQueue.current.push({
      id: Math.random().toString(),
      type: 'summarize',
      priority: 1,
      execute: async () => {
        if (!engineRef.current) return;
        const prompt = `Create a memory artifact for an emotional support conversation. Preserve what mattered emotionally, not information density. Capture: what the person felt, what they revealed. Do not use clinical language.
        
Existing memory: ${sessionSummary}
New context to add: ${evictedTurns}

Provide only the updated concise memory paragraph.`;

        const reply = await engineRef.current.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 150,
        });
        
        const newSummary = reply.choices[0].message.content as string;
        setSessionSummary(newSummary);
        console.log("[Background] Session Summary Updated:", newSummary);
      }
    });
  };

  // PRIORITY 1: Background Long-Term Extraction
  const queueExtractMemories = (persona: Persona) => {
    jobQueue.current.push({
      id: Math.random().toString(),
      type: 'extract',
      priority: 1,
      execute: async () => {
        if (!engineRef.current || !sessionSummary) return;
        const prompt = `Extract 1 to 3 durable, long-term emotional facts or patterns from this session summary. Format each fact on a new line starting with a dash.
        
Session Summary: ${sessionSummary}`;

        const reply = await engineRef.current.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 150,
        });
        
        const content = reply.choices[0].message.content as string;
        const facts = content.split('\n').filter(line => line.trim().startsWith('-'));
        
        // Save each fact to Dexie and embed asynchronously
        import('@/lib/memory').then(async ({ generateEmbedding }) => {
          for (const fact of facts) {
            const cleanFact = fact.replace('-', '').trim();
            if (!cleanFact) continue;
            
            const vector = await generateEmbedding(cleanFact);
            await saveLongTermMemory({
              persona,
              content: cleanFact,
              timestamp: Date.now(),
              embedding_model: "Xenova/all-MiniLM-L6-v2",
              embedding: vector
            });
            console.log("[Background] Saved Long-Term Memory:", cleanFact);
          }
        });
        
        // Clear session summary after extraction
        setSessionSummary("");
      }
    });
  };

  const queueGenerateWaitingMessage = (persona: Persona) => {
    jobQueue.current.push({
      id: Math.random().toString(),
      type: 'extract',
      priority: 1,
      execute: async () => {
        if (!engineRef.current || !sessionSummary) return;
        
        // Fetch cadence setting
        const { getSetting, saveWaitingMessage } = await import("@/lib/db");
        const cadence = await getSetting("cadence_preference");
        
        if (cadence !== "check-in") return; // Only generate if they opted in

        const prompt = `Based on this session summary, write a single, short, proactive message to the user that they will see the NEXT time they open the app.
It should be non-demanding. Do not ask them to reply or "come back." Just leave a door open or validate a feeling they had.
For example: "You mentioned Tuesday is your hardest day. Just leaving a door open."
        
Session Summary: ${sessionSummary}`;

        const reply = await engineRef.current.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
          max_tokens: 50,
        });
        
        const content = reply.choices[0].message.content as string;
        await saveWaitingMessage({
          persona,
          content: content.replace(/"/g, '').trim(),
          timestamp: Date.now(),
          is_read: false
        });
        console.log("[Background] Saved Waiting Message:", content);
      }
    });
  };

  return (
    <LLMContext.Provider value={{ 
      isEngineReady, 
      loadingProgress, 
      progressValue, 
      sessionSummary, 
      generateResponse, 
      initEngine, 
      checkCrisisSafety,
      queueSummarize,
      queueExtractMemories,
      queueGenerateWaitingMessage,
      markUserActivity
    }}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (context === undefined) throw new Error("useLLM must be used within an LLMProvider");
  return context;
}
