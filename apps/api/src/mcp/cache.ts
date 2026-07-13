import { sha256Hex } from "@/utils/hash";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/** Buffers/bigints don't survive JSON.stringify usefully — hash/stringify them instead of inlining bytes. */
function replacer(_key: string, value: unknown): unknown {
  if (Buffer.isBuffer(value)) return `buffer:${sha256Hex(value)}`;
  if (typeof value === "bigint") return value.toString();
  return value;
}

function keyFor(tool: string, input: unknown): string {
  return `${tool}:${JSON.stringify(input, replacer)}`;
}

export function getCached<T>(tool: string, input: unknown): T | undefined {
  const entry = store.get(keyFor(tool, input));
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.value as T;
}

export function setCached(tool: string, input: unknown, value: unknown, ttlMs: number): void {
  store.set(keyFor(tool, input), { value, expiresAt: Date.now() + ttlMs });
}
