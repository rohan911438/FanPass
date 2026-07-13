const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiRequestError(res.status, body?.error ?? `Request failed with ${res.status}`, body?.details);
  }
  return body;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`);
  return parseJsonOrThrow(res);
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { method: "POST", body: formData });
  return parseJsonOrThrow(res);
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res);
}
