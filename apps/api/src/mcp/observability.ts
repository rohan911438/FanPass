export interface ToolLogEntry {
  traceId: string;
  tool: string;
  ok: boolean;
  cached: boolean;
  attempts: number;
  latencyMs: number;
  error?: string;
}

/** One line per tool call, keyed by traceId — a request's full tool-call trace is `grep traceId`. */
export function logToolCall(entry: ToolLogEntry): void {
  const line = `[mcp] trace=${entry.traceId} tool=${entry.tool} ok=${entry.ok} cached=${entry.cached} attempts=${entry.attempts} latencyMs=${entry.latencyMs}${entry.error ? ` error=${entry.error}` : ""}`;
  if (entry.ok) console.log(line);
  else console.error(line);
}
