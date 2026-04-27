let nextRequestId = 0;

export interface DiagnosticEvent {
  event: string;
  requestId?: string;
  tool?: string;
  step?: string;
  elapsedMs?: number;
  [key: string]: unknown;
}

export function createRequestId(prefix = "req"): string {
  nextRequestId = (nextRequestId + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${nextRequestId.toString(36)}`;
}

export function logDiagnostic(event: DiagnosticEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    plugin: "lms-skills",
    ...event,
  };
  try {
    console.log(`[lms-skills] ${JSON.stringify(payload)}`);
  } catch {
    console.log(
      `[lms-skills] ${payload.event}${payload.requestId ? ` requestId=${payload.requestId}` : ""}`,
    );
  }
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

export async function timedStep<T>(
  requestId: string,
  tool: string,
  step: string,
  fn: () => Promise<T>,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const startedAt = Date.now();
  logDiagnostic({ event: "step_start", requestId, tool, step, ...extra });
  try {
    const result = await fn();
    logDiagnostic({
      event: "step_complete",
      requestId,
      tool,
      step,
      elapsedMs: Date.now() - startedAt,
      ...extra,
    });
    return result;
  } catch (error) {
    logDiagnostic({
      event: "step_error",
      requestId,
      tool,
      step,
      elapsedMs: Date.now() - startedAt,
      error: serializeError(error),
      ...extra,
    });
    throw error;
  }
}
