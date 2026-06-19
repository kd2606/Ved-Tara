// src/lib/db.ts
import Dexie, { type EntityTable } from 'dexie';
import { encryptText, decryptText } from './crypto';

export type Role = 'user' | 'ai';
export type Persona = 'ved' | 'tara';

export interface EncryptedMessage {
  id?: number;
  persona: Persona;
  role: Role;
  encrypted_content: string;
  iv: string;
  timestamp: number;
  embedding_model?: string;
  embedding?: number[];
}

export interface DecryptedMessage {
  id?: number;
  persona: Persona;
  role: Role;
  content: string;
  timestamp: number;
  embedding_model?: string;
  embedding?: number[];
}

export interface EncryptedMemory {
  id?: number;
  persona: Persona;
  encrypted_content: string;
  iv: string;
  timestamp: number;
  embedding_model?: string;
  embedding?: number[];
}

export interface DecryptedMemory {
  id?: number;
  persona: Persona;
  content: string;
  timestamp: number;
  embedding_model?: string;
  embedding?: number[];
}

export interface Setting {
  key: string;
  value: string;
}

export interface EncryptedWaitingMessage {
  id?: number;
  persona: Persona;
  encrypted_content: string;
  iv: string;
  timestamp: number;
  is_read: number; // 0 or 1, Dexie handles numbers better for boolean indexing
}

export interface DecryptedWaitingMessage {
  id?: number;
  persona: Persona;
  content: string;
  timestamp: number;
  is_read: boolean;
}

const db = new Dexie('VedTaraDB') as Dexie & {
  messages: EntityTable<EncryptedMessage, 'id'>;
  long_term_memories: EntityTable<EncryptedMemory, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  waiting_messages: EntityTable<EncryptedWaitingMessage, 'id'>;
};

db.version(1).stores({
  messages: '++id, persona, role, timestamp'
});

db.version(2).stores({
  messages: '++id, persona, role, timestamp, embedding_model'
});

db.version(3).stores({
  messages: '++id, persona, role, timestamp, embedding_model',
  long_term_memories: '++id, persona, timestamp'
});

db.version(4).stores({
  messages: '++id, persona, role, timestamp, embedding_model',
  long_term_memories: '++id, persona, timestamp',
  settings: 'key',
  waiting_messages: '++id, persona, timestamp, is_read'
}).upgrade(tx => {});

// Helper functions for reading/writing with automatic encryption
export async function saveMessage(msg: DecryptedMessage): Promise<any> {
  const { cipherText, iv } = await encryptText(msg.content);
  
  return db.messages.add({
    persona: msg.persona,
    role: msg.role,
    encrypted_content: cipherText,
    iv,
    timestamp: msg.timestamp,
    embedding_model: msg.embedding_model,
    embedding: msg.embedding
  });
}

export async function fetchMessages(persona: Persona): Promise<DecryptedMessage[]> {
  const encryptedMsgs = await db.messages.where('persona').equals(persona).sortBy('timestamp');
  
  const decryptedMsgs = await Promise.all(
    encryptedMsgs.map(async (msg) => {
      let content = "";
      try {
         content = await decryptText(msg.encrypted_content, msg.iv);
      } catch(e) {
         content = "[Decryption Failed]";
      }
      return {
        id: msg.id,
        persona: msg.persona,
        role: msg.role,
        content,
        timestamp: msg.timestamp,
        embedding_model: msg.embedding_model,
        embedding: msg.embedding
      };
    })
  );
  
  return decryptedMsgs;
}

export async function saveLongTermMemory(mem: DecryptedMemory): Promise<any> {
  const { cipherText, iv } = await encryptText(mem.content);
  return db.long_term_memories.add({
    persona: mem.persona,
    encrypted_content: cipherText,
    iv,
    timestamp: mem.timestamp,
    embedding_model: mem.embedding_model,
    embedding: mem.embedding
  });
}

export async function fetchLongTermMemories(persona: Persona): Promise<DecryptedMemory[]> {
  const encryptedMems = await db.long_term_memories.where('persona').equals(persona).sortBy('timestamp');
  
  const decryptedMems = await Promise.all(
    encryptedMems.map(async (mem) => {
      let content = "";
      try {
         content = await decryptText(mem.encrypted_content, mem.iv);
      } catch(e) {
         content = "[Decryption Failed]";
      }
      return {
        id: mem.id,
        persona: mem.persona,
        content,
        timestamp: mem.timestamp,
        embedding_model: mem.embedding_model,
        embedding: mem.embedding
      };
    })
  );
  
  return decryptedMems;
}

export async function saveSetting(key: string, value: string): Promise<any> {
  return db.settings.put({ key, value });
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

export async function saveWaitingMessage(msg: Omit<DecryptedWaitingMessage, 'id'>): Promise<any> {
  const { cipherText, iv } = await encryptText(msg.content);
  return db.waiting_messages.add({
    persona: msg.persona,
    encrypted_content: cipherText,
    iv,
    timestamp: msg.timestamp,
    is_read: msg.is_read ? 1 : 0
  });
}

export async function fetchUnreadWaitingMessage(persona: Persona): Promise<DecryptedWaitingMessage | null> {
  // Dexie query for unread messages.
  // Note: we can just fetch all unread and filter, or just use filter since we don't expect many.
  const encryptedMsgs = await db.waiting_messages.toArray();
  const unreadMsgs = encryptedMsgs.filter(m => m.persona === persona && m.is_read === 0).sort((a,b) => a.timestamp - b.timestamp);
  
  if (unreadMsgs.length === 0) return null;
  
  // Return the most recent unread one
  const msg = unreadMsgs[unreadMsgs.length - 1];
  try {
    const content = await decryptText(msg.encrypted_content, msg.iv);
    return {
      id: msg.id,
      persona: msg.persona,
      content,
      timestamp: msg.timestamp,
      is_read: msg.is_read === 1
    };
  } catch (e) {
    return null;
  }
}

export async function markWaitingMessageRead(id: number): Promise<void> {
  await db.waiting_messages.update(id, { is_read: 1 });
}

export async function wipeDatabase(): Promise<void> {
  await db.delete();
}

export { db };
