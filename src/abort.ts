export function createAbortError(signal?: AbortSignal): Error {
  const reason = signal?.reason;
  if (reason instanceof Error) return reason;
  const error = new Error(reason ? String(reason) : "Aborted");
  error.name = "AbortError";
  return error;
}

export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError(signal);
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "AbortError" || error.message === "Aborted";
  }
  return false;
}
