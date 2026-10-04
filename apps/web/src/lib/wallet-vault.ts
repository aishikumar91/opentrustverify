const VAULT_KEY = "otv_wallet_vault_v1";
const WATCH_KEY = "otv_watch_addresses_v1";
const BOOK_KEY = "otv_address_book_v1";
const APPS_KEY = "otv_connected_apps_v1";

export interface VaultRecord {
  address: string;
  ciphertext: string;
  createdAt: string;
}

export interface WatchAddress {
  address: string;
  label: string;
  createdAt: string;
}

export interface AddressBookEntry {
  address: string;
  label: string;
  network: string;
}

export interface ConnectedApp {
  origin: string;
  name: string;
  account: string;
  network: string;
  permissions: string[];
  lastActivity: string;
}

let unlockedMnemonic: string | null = null;

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function lockVault(): void {
  unlockedMnemonic = null;
}

export function unlockedPhrase(): string | null {
  return unlockedMnemonic;
}

export function rememberPhrase(phrase: string): void {
  unlockedMnemonic = phrase;
}

export function hasVault(): boolean {
  return readVaultRecord() != null;
}

export function readVaultRecord(): VaultRecord | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VaultRecord;
    if (!parsed.ciphertext || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function sealPhrase(phrase: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(phrase)));
  const packed = new Uint8Array(salt.length + iv.length + cipher.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipher, salt.length + iv.length);
  return bytesToB64(packed);
}

export async function openPhrase(ciphertext: string, password: string): Promise<string> {
  const packed = b64ToBytes(ciphertext);
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const cipher = packed.slice(28);
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

export function saveVault(record: VaultRecord): void {
  localStorage.setItem(VAULT_KEY, JSON.stringify(record));
}

export function readList<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function watchAddresses(): WatchAddress[] {
  return readList<WatchAddress>(WATCH_KEY);
}

export function saveWatchAddresses(entries: WatchAddress[]): void {
  localStorage.setItem(WATCH_KEY, JSON.stringify(entries));
}

export function addressBook(): AddressBookEntry[] {
  return readList<AddressBookEntry>(BOOK_KEY);
}

export function saveAddressBook(entries: AddressBookEntry[]): void {
  localStorage.setItem(BOOK_KEY, JSON.stringify(entries));
}

export function connectedApps(): ConnectedApp[] {
  return readList<ConnectedApp>(APPS_KEY);
}

export function saveConnectedApps(entries: ConnectedApp[]): void {
  localStorage.setItem(APPS_KEY, JSON.stringify(entries));
}
