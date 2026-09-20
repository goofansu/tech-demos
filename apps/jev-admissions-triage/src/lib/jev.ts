import type { ApiStatus, EvaluateError, EvaluateRequest, EvaluateResponse } from "./types";

export async function fetchStatus(): Promise<ApiStatus> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error(`status ${res.status}`);
  return (await res.json()) as ApiStatus;
}

export async function evaluate(
  request: EvaluateRequest,
  options?: { signal?: AbortSignal },
): Promise<EvaluateResponse> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: options?.signal,
  });
  const data = (await res.json().catch(() => ({ error: "Jev returned a response we couldn't read." }))) as
    | EvaluateResponse
    | EvaluateError;
  if (!res.ok || "error" in data) {
    const err = data as EvaluateError;
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return data;
}
