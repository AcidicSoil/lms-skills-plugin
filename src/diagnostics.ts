let nextRequestId = 0;

const DEBUG_LOGGING = /^(1|true|yes|debug)$/i.test(
  process.env.LMS_SKILLS_DEBUG ?? "",
);
const SLOW_STEP_MS = Number(process.env.LMS_SKILLS_SLOW_STEP_MS ?? 250);
const SLOW_RUNTIME_MS = Number(process.env.LMS_SKILLS_SLOW_RUNTIME_MS ?? 500);

export interface DiagnosticEvent {
  event: string;
  requestId?: string;
  tool?: string;
  step?: string;
  elapsedMs?: number;
  level?: "debug" | "info" | "warn" | "error";
  [key: string]: unknown;
}

export function createRequestId(prefix = "req"): string {
  nextRequestId = (nextRequestId + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${nextRequestId.toString(36)}`;
}

function shouldLog(event: DiagnosticEvent): boolean {
  if (DEBUG_LOGGING) return true;

  switch (event.event) {
    case "tool_start":
    case "tool_complete":
    case "tool_error":
    case "step_error":
    case "skill_not_found":
    case "skill_resolved":
    case "read_skill_file_result":
    case "list_skills_exact_result":
    case "run_command_safety_check":
    case "run_command_result":
    case "runtime_exec_error":
    case "runtime_exec_abort":
    case "runtime_exec_spawn_error":
      return true;
    case "step_complete":
      return typeof event.elapsedMs === "number" && event.elapsedMs >= SLOW_STEP_MS;
    case "runtime_exec_complete":
      return (
        event.timedOut === true ||
        event.exitCode !== 0 ||
        (typeof event.elapsedMs === "number" && event.elapsedMs >= SLOW_RUNTIME_MS)
      );
    default:
      return false;
  }
}

function compactEvent(event: DiagnosticEvent): DiagnosticEvent {
  const compact: DiagnosticEvent = {
    ts: new Date().toISOString(),
    plugin: "lms-skills",
    level: event.level ?? inferLevel(event),
    ...event,
  };

  if (!DEBUG_LOGGING) {
    delete compact.stack;
    if (compact.error && typeof compact.error === "object") {
      const error = compact.error as Record<string, unknown>;
      compact.error = {
        name: error.name,
        message: error.message,
      };
    }
  }

  return compact;
}

function inferLevel(event: DiagnosticEvent): "debug" | "info" | "warn" | "error" {
  if (event.event.endsWith("_error") || event.event === "tool_error") return "error";
  if (event.event.includes("abort") || event.timedOut === true) return "warn";
  if (event.event === "step_complete" || event.event.startsWith("runtime_")) {
    return DEBUG_LOGGING ? "debug" : "info";
  }
  return "info";
}

export function logDiagnostic(event: DiagnosticEvent): void {
  if (!shouldLog(event)) return;

  const payload = compactEvent(event);
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
      ...(DEBUG_LOGGING ? { stack: error.stack } : {}),
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
  logDiagnostic({ event: "step_start", requestId, tool, step, level: "debug", ...extra });
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
