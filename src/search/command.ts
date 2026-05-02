import * as child_process from "child_process";
import { checkAbort, createAbortError } from "../abort";

export const ENHANCED_SEARCH_TIMEOUT_MS = 8_000;
const ENHANCED_SEARCH_MAX_OUTPUT_BYTES = 256_000;
const UNSAFE_CONTROL_CHARS_PATTERN = /[\0\r\n]/;

const BLOCKED_PROVIDER_ARGS = new Set([
  "collection",
  "context",
  "update",
  "embed",
  "cleanup",
  "bench",
  "mcp",
  "skill",
  "remove",
  "rename",
  "install",
  "--pull",
  "--force",
  "--reindex",
  "--index",
  "--clean",
  "--clean-orphans",
  "--switch-model",
  "--add",
  "--serve",
  "--tui",
]);

function truncateOutput(text: string): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= ENHANCED_SEARCH_MAX_OUTPUT_BYTES) return text;
  return `${buf.slice(0, ENHANCED_SEARCH_MAX_OUTPUT_BYTES).toString("utf-8")}\n[truncated]`;
}

export function sanitizeExecutable(raw: string, fallback: string): string {
  const executable = raw.trim() || fallback;
  if (!executable || UNSAFE_CONTROL_CHARS_PATTERN.test(executable)) return fallback;
  return executable;
}


function assertReadOnlyProviderInvocation(executable: string, args: string[]): string | null {
  if (!executable || UNSAFE_CONTROL_CHARS_PATTERN.test(executable)) {
    return "Enhanced search executable contains unsupported control characters.";
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const lowered = arg.toLowerCase();
    if ((index === 0 || lowered.startsWith("--")) && BLOCKED_PROVIDER_ARGS.has(lowered)) {
      return `Enhanced search argument is blocked: ${arg}`;
    }
  }
  return null;
}

export function runFixedCommand(
  executable: string,
  args: string[],
  signal?: AbortSignal,
  cwd?: string,
  timeoutMs = ENHANCED_SEARCH_TIMEOUT_MS,
  envOverrides: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  checkAbort(signal);
  const blockedReason = assertReadOnlyProviderInvocation(executable, args);
  if (blockedReason) {
    return Promise.resolve({ stdout: "", stderr: blockedReason, exitCode: 126, timedOut: false });
  }

  return new Promise((resolve, reject) => {
    let proc: child_process.ChildProcess;
    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const finish = (result: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: truncateOutput(result.stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
        stderr: truncateOutput(result.stderr.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
      });
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { proc.kill("SIGTERM"); } catch {}
      reject(createAbortError(signal));
    };

    try {
      proc = child_process.spawn(executable, args, {
        cwd,
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          ...envOverrides,
          NO_COLOR: "1",
        },
      });
    } catch (error) {
      resolve({ stdout: "", stderr: error instanceof Error ? error.message : String(error), exitCode: 127, timedOut: false });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill("SIGKILL"); } catch {}
    }, timeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });
    proc.stdout?.on("data", (chunk: Buffer) => { if (!signal?.aborted) stdout += chunk.toString("utf-8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { if (!signal?.aborted) stderr += chunk.toString("utf-8"); });
    proc.on("error", (error) => {
      finish({ stdout, stderr: error.message || stderr, exitCode: 127, timedOut });
    });
    proc.on("close", (code) => {
      finish({ stdout, stderr, exitCode: code, timedOut });
    });
  });
}

export async function isExecutableAvailable(executable: string, signal?: AbortSignal): Promise<boolean> {
  const result = await runFixedCommand(sanitizeExecutable(executable, executable), ["--version"], signal, undefined, 2_000).catch(() => null);
  return Boolean(result && !result.timedOut && result.exitCode === 0);
}
