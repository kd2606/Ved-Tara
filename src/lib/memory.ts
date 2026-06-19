// src/lib/memory.ts
import { pipeline, env } from '@huggingface/transformers';

// Important for Next.js and Turbopack to prevent it from looking for local model paths
env.allowLocalModels = false;
import { fetchLongTermMemories, DecryptedMemory, Persona } from './db';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Singleton to avoid re-loading the embedder
class EmbeddingPipeline {
  static task: any = 'feature-extraction';
  static model = MODEL_NAME;
  static instance: any = null;

  static async getInstance(progress_callback?: any) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string, onProgress?: (info: any) => void): Promise<number[]> {
  const embedder = await EmbeddingPipeline.getInstance(onProgress);
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  
  // Convert Float32Array to standard number array for Dexie storage
  return Array.from(output.data);
}

// Simple cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Retrieve the top N similar memories for a given query
export async function searchSimilarMemories(query: string, persona: Persona, topK: number = 3): Promise<DecryptedMemory[]> {
  const queryEmbedding = await generateEmbedding(query);
  const allMemories = await fetchLongTermMemories(persona);
  
  // Filter out memories that don't have embeddings
  const validMemories = allMemories.filter(m => m.embedding && m.embedding.length > 0);
  
  // Calculate similarities
  const scoredMemories = validMemories.map(mem => ({
    memory: mem,
    score: cosineSimilarity(queryEmbedding, mem.embedding!)
  }));
  
  // Sort descending by score
  scoredMemories.sort((a, b) => b.score - a.score);
  
  return scoredMemories.slice(0, topK).map(sm => sm.memory);
}
