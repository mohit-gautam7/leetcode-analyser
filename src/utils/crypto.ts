import CryptoJS from 'crypto-js';

const KEY = 'cs-ai-secure-key-v1';

export function encryptApiKey(apiKey: string): string {
  if (!apiKey) return '';
  return CryptoJS.AES.encrypt(apiKey, KEY).toString();
}

export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
}
