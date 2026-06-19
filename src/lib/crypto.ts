// src/lib/crypto.ts
export async function getOrCreateKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem("vt_crypto_key");
  if (storedKey) {
    const jwk = JSON.parse(storedKey);
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // Generate a new key if none exists
  const newKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const jwk = await window.crypto.subtle.exportKey("jwk", newKey);
  localStorage.setItem("vt_crypto_key", JSON.stringify(jwk));
  
  return newKey;
}

export async function encryptText(text: string): Promise<{ cipherText: string; iv: string }> {
  const key = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );

  // Convert ArrayBuffer to Base64
  const cipherText = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivStr = btoa(String.fromCharCode(...iv));

  return { cipherText, iv: ivStr };
}

export async function decryptText(cipherText: string, ivStr: string): Promise<string> {
  const key = await getOrCreateKey();
  
  // Convert Base64 back to Uint8Array
  const encryptedBytes = new Uint8Array(atob(cipherText).split("").map((c) => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(ivStr).split("").map((c) => c.charCodeAt(0)));

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
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
