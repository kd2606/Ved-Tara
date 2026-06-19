"use client";

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { DecryptedMessage, Persona } from '@/lib/db';
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"] });

interface MessageListProps {
  messages: DecryptedMessage[];
  isProcessing?: boolean;
  activePersona?: Persona;
}

export function MessageList({ messages, isProcessing = false, activePersona = 'ved' }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-6 no-scrollbar relative z-20 mask-image-fade-edges">
      <div className="max-w-3xl mx-auto w-full flex flex-col justify-end min-h-full pb-32 pt-16">
        
        <div className="w-full text-center py-12 mb-8">
          <h1 className={`${instrumentSerif.className} text-4xl text-white/70 mb-2 font-normal`}>A quiet space.</h1>
          <p className="text-sm text-white/30 font-light tracking-wide">We are here, listening.</p>
        </div>

        {messages.map((message) => (
          <MessageBubble key={message.id || message.timestamp} message={message} />
        ))}
        
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex w-full mb-8 justify-start"
            >
              <div className={`max-w-[80%] pl-4 border-l-2 ${activePersona === 'ved' ? 'border-[#8aa1a1]' : 'border-[#d89696]'}`}>
                <span className={`text-[10px] uppercase tracking-widest block mb-2 font-bold opacity-80 ${activePersona === 'ved' ? 'text-[#8aa1a1]' : 'text-[#d89696]'}`}>
                  {activePersona}
                </span>
                <p className="text-foreground/50 text-2xl tracking-widest font-serif leading-none mt-1">...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
