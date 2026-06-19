import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DecryptedMessage } from '@/lib/db';

interface MessageBubbleProps {
  message: DecryptedMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const personaColor = message.persona === 'ved' ? 'text-[#8aa1a1] border-[#8aa1a1]' : 'text-[#d89696] border-[#d89696]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex w-full mb-8",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {isUser ? (
        <div className="max-w-[80%] px-6 py-4 bg-[#1c1c1c] rounded-2xl rounded-tr-md text-foreground/90 text-sm leading-relaxed tracking-wide font-light border border-white/5 shadow-md">
          {message.content}
        </div>
      ) : (
        <div className={cn("max-w-[80%] pl-4 border-l-2", personaColor)}>
          <span className="text-[10px] uppercase tracking-widest block mb-2 font-bold opacity-80">
            {message.persona}
          </span>
          <p className="text-foreground/90 text-sm leading-relaxed tracking-wide font-light">
            {message.content}
          </p>
        </div>
      )}
    </motion.div>
  );
}
