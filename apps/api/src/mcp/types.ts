export interface ToolConfig {
  timeoutMs: number;
  retries: number;
  /** null = never cached (e.g. a real-time chain read or a decode of caller-specific bytes). */
  cacheTtlMs: number | null;
}

export interface McpTool<TInput = unknown, TOutput = unknown> {
  name: string;
  config: ToolConfig;
  run(input: TInput): Promise<TOutput>;
  /** Used once retries are exhausted — e.g. degrade to a lower-confidence local computation. */
  fallback?: (input: TInput) => Promise<TOutput>;
}

export interface ToolCallResult<T = unknown> {
  tool: string;
  ok: boolean;
  output: T | null;
  error: string | null;
  cached: boolean;
  latencyMs: number;
  attempts: number;
}
