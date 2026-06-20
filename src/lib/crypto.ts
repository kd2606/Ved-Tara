// src/lib/crypto.ts
let inMemoryKey: CryptoKey | null = null;

export const hasKey = (): boolean => {
  return inMemoryKey !== null;
};

export const clearKey = (): void => {
  inMemoryKey = null;
};

export async function deriveKeyFromPIN(pin: string): Promise<void> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // We use a static salt to ensure the key is deterministic for the same PIN
  const salt = encoder.encode("VedTaraSpaceKeySalt");

  inMemoryKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // Must not be extractable
    ["encrypt", "decrypt"]
  );

  // Clean up any old vulnerable key that might exist
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("vt_crypto_key");
  }
}

export async function encryptText(text: string): Promise<{ cipherText: string; iv: string }> {
  if (!inMemoryKey) {
    throw new Error("Encryption key not found. Please unlock the space.");
  }
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    inMemoryKey,
    encodedText
  );

  // Convert ArrayBuffer to Base64
  const cipherText = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivStr = btoa(String.fromCharCode(...iv));

  return { cipherText, iv: ivStr };
}

export async function decryptText(cipherText: string, ivStr: string): Promise<string> {
  if (!inMemoryKey) {
    throw new Error("Encryption key not found. Please unlock the space.");
  }
  
  // Convert Base64 back to Uint8Array
  const encryptedBytes = new Uint8Array(atob(cipherText).split("").map((c) => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivStr).split("").map((c) => c.charCodeAt(0)));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    inMemoryKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decrypted);
}

export async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(12);
  window.crypto.getRandomValues(array);
  
  let key = '';
  for (let i = 0; i < 12; i++) {
    key += chars[array[i] % chars.length];
    if (i === 3 || i === 7) key += '-';
  }
  return `VT-${key}`; // e.g. VT-A7X9-B2V1-9PLO
}
