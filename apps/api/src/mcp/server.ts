import { getCached, setCached } from "./cache";
import { logToolCall } from "./observability";
import type { McpTool, ToolCallResult } from "./types";

const tools = new Map<string, McpTool<unknown, unknown>>();

export function registerTool<TInput, TOutput>(tool: McpTool<TInput, TOutput>): void {
  tools.set(tool.name, tool as McpTool<unknown, unknown>);
}

function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${toolName} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function backoff(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200 * 2 ** (attempt - 1)));
}

/**
 * The one entry point every Skill uses to reach a capability — never a vendor SDK directly (see
 * docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 3). Handles caching, bounded retries with backoff, a
 * per-call timeout, and a fallback once retries are exhausted — a failing tool degrades the calling
 * Skill's confidence via a typed error result, it never throws past this boundary.
 */
export async function callTool<TInput, TOutput>(
  name: string,
  input: TInput,
  traceId = "no-trace"
): Promise<ToolCallResult<TOutput>> {
  const start = Date.now();
  const tool = tools.get(name) as McpTool<TInput, TOutput> | undefined;

  if (!tool) {
    const error = `Unknown tool: ${name}`;
    logToolCall({ traceId, tool: name, ok: false, cached: false, attempts: 0, latencyMs: 0, error });
    return { tool: name, ok: false, output: null, error, cached: false, latencyMs: Date.now() - start, attempts: 0 };
  }

  if (tool.config.cacheTtlMs !== null) {
    const cached = getCached<TOutput>(name, input);
    if (cached !== undefined) {
      const latencyMs = Date.now() - start;
      logToolCall({ traceId, tool: name, ok: true, cached: true, attempts: 0, latencyMs });
      return { tool: name, ok: true, output: cached, error: null, cached: true, latencyMs, attempts: 0 };
    }
  }

  let attempts = 0;
  let lastError: unknown;

  while (attempts <= tool.config.retries) {
    attempts++;
    try {
      const output = await withTimeout(tool.run(input), tool.config.timeoutMs, name);
      if (tool.config.cacheTtlMs !== null) setCached(name, input, output, tool.config.cacheTtlMs);
      const latencyMs = Date.now() - start;
      logToolCall({ traceId, tool: name, ok: true, cached: false, attempts, latencyMs });
      return { tool: name, ok: true, output, error: null, cached: false, latencyMs, attempts };
    } catch (error) {
      lastError = error;
      if (attempts <= tool.config.retries) await backoff(attempts);
    }
  }

  if (tool.fallback) {
    try {
      const output = await tool.fallback(input);
      const latencyMs = Date.now() - start;
      logToolCall({ traceId, tool: name, ok: true, cached: false, attempts, latencyMs, error: "used fallback" });
      return { tool: name, ok: true, output, error: null, cached: false, latencyMs, attempts };
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  const latencyMs = Date.now() - start;
  logToolCall({ traceId, tool: name, ok: false, cached: false, attempts, latencyMs, error: message });
  return { tool: name, ok: false, output: null, error: message, cached: false, latencyMs, attempts };
}
