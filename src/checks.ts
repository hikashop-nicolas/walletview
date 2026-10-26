// Remembers a successful signature check, so the next time the same file opens it already shows as
// signed. The key is a hash of the file itself: a changed file never inherits a result. Only the
// outcome is stored, never the file.

import type { VerifyOutcome } from "./model";

const STORAGE_KEY = "walletview:checks";
const MAX_ENTRIES = 100;

export interface StoredCheck {
  outcome: VerifyOutcome;
  at: number;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function readAll(): Record<string, StoredCheck> {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, StoredCheck>) : {};
  } catch {
    return {};
  }
}

export function loadCheck(id: string): StoredCheck | null {
  const hit = readAll()[id];
  return hit && hit.outcome?.status === "ok" && Array.isArray(hit.outcome.message) && typeof hit.at === "number" ? hit : null;
}

export function saveCheck(id: string, outcome: VerifyOutcome): void {
  if (outcome.status !== "ok") return;
  try {
    const all = readAll();
    delete all[id];
    all[id] = { outcome, at: Date.now() };
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    // storage full or blocked: the check still worked, it just will not be remembered
  }
}
