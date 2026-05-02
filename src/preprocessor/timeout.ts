export function createTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let settled = false;

  const abort = () => {
    if (settled) return;
    settled = true;
    controller.abort(parent?.reason ?? new Error("Prompt preprocessor scan timed out."));
  };

  if (parent?.aborted) abort();
  parent?.addEventListener("abort", abort, { once: true });

  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      settled = true;
      clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    },
  };
}
