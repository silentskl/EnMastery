function bytesToBase64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function base64ToBytes(value: string) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
async function aesKey(master: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`english-mastery:settings:${master}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
export async function encryptManagedSecret(value: string, master: string) {
  if (!master) throw new Error("SETTINGS_MASTER_KEY is not configured");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(master), new TextEncoder().encode(value));
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}
export async function decryptManagedSecret(ciphertext: string, iv: string, master: string) {
  if (!master) throw new Error("SETTINGS_MASTER_KEY is not configured");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await aesKey(master), base64ToBytes(ciphertext));
  return new TextDecoder().decode(plain);
}
export function secretHint(value: string) {
  const v = value.trim();
  if (!v) return "";
  const tail = v.slice(-4);
  return `••••${tail}`;
}
