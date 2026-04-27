import { createAbortError } from "./abort";

export interface TimeoutSignalHandle {
  signal: AbortSignal;
  cleanup: () => void;
}

export function createTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
  label: string,
): TimeoutSignalHandle {
  const controller = new AbortController();
  let settled = false;

  const abortFromParent = () => {
    if (settled) return;
    settled = true;
    controller.abort(parent?.reason ?? createAbortError(parent));
  };

  const abortFromTimeout = () => {
    if (settled) return;
    settled = true;
    const error = new Error(`${label} timed out after ${timeoutMs}ms.`);
    error.name = "TimeoutError";
    controller.abort(error);
  };

  if (parent?.aborted) abortFromParent();
  parent?.addEventListener("abort", abortFromParent, { once: true });

  const timer = setTimeout(abortFromTimeout, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      settled = true;
      clearTimeout(timer);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}
