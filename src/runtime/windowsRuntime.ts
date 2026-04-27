import * as child_process from "child_process";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as os from "os";
import * as path from "path";
import { EXEC_DEFAULT_TIMEOUT_MS, EXEC_MAX_OUTPUT_BYTES, EXEC_MAX_TIMEOUT_MS } from "../constants";
import { checkAbort, createAbortError } from "../abort";
import type { RuntimeAdapter, RuntimeDirectoryEntry, RuntimeExecOptions, RuntimeExecResult, RuntimeFileStat } from "./types";

function resolveWindowsShell(override?: string): string {
  if (override && override.trim()) return override.trim();
  const pwshCore = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
  const pwshBuiltin = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
  if (fsSync.existsSync(pwshCore)) return pwshCore;
  if (fsSync.existsSync(pwshBuiltin)) return pwshBuiltin;
  return "cmd.exe";
}

function shellArgs(shell: string, command: string): string[] {
  const lower = shell.toLowerCase();
  if (lower.endsWith("cmd.exe") || lower === "cmd") return ["/c", command];
  return ["-NoProfile", "-NonInteractive", "-OutputEncoding", "UTF8", "-Command", command];
}

function normalizeOutput(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function truncate(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= maxBytes) return text;
  return buf.slice(0, maxBytes).toString("utf-8") + `\n[truncated - output exceeded ${maxBytes} bytes]`;
}

export function expandWindowsPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  const expanded = trimmed.replace(/^~(?=[/\\]|$)/, os.homedir());
  return path.win32.normalize(expanded);
}

export function execWindowsCommand(
  command: string,
  options: RuntimeExecOptions = {},
  shellPath?: string,
): Promise<RuntimeExecResult> {
  checkAbort(options.signal);
  return new Promise((resolve, reject) => {
    const shell = resolveWindowsShell(shellPath);
    const cwd = options.cwd ? expandWindowsPath(options.cwd) : os.homedir();
    const timeoutMs = Math.min(options.timeoutMs ?? EXEC_DEFAULT_TIMEOUT_MS, EXEC_MAX_TIMEOUT_MS);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
      ...(options.env ?? {}),
    };

    let proc: child_process.ChildProcess;
    try {
      proc = child_process.spawn(shell, shellArgs(shell, command), { cwd, env, windowsHide: true });
    } catch (err) {
      resolve({ stdout: "", stderr: err instanceof Error ? err.message : String(err), exitCode: 1, timedOut: false, shell, platform: "windows", environment: "windows" });
      return;
    }

    const onAbort = () => {
      try { proc.kill("SIGTERM"); } catch {}
      reject(createAbortError(options.signal));
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    proc.stdout?.on("data", (chunk: Buffer) => { if (options.signal?.aborted) return; stdout += chunk.toString("utf-8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { if (options.signal?.aborted) return; stderr += chunk.toString("utf-8"); });
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill("SIGKILL"); } catch {}
    }, timeoutMs);
    proc.on("close", (code) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (options.signal?.aborted) {
        reject(createAbortError(options.signal));
        return;
      }
      resolve({ stdout: truncate(normalizeOutput(stdout), EXEC_MAX_OUTPUT_BYTES), stderr: truncate(normalizeOutput(stderr), EXEC_MAX_OUTPUT_BYTES), exitCode: code ?? 1, timedOut, shell, platform: "windows", environment: "windows" });
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (options.signal?.aborted) {
        reject(createAbortError(options.signal));
        return;
      }
      resolve({ stdout: "", stderr: err.message, exitCode: 1, timedOut: false, shell, platform: "windows", environment: "windows" });
    });
  });
}

export function createWindowsRuntime(shellPath?: string): RuntimeAdapter {
  const shell = resolveWindowsShell(shellPath);
  return {
    target: "windows",
    label: "Windows",
    displayName: "Windows",
    shell,
    async expandPath(rawPath) { return expandWindowsPath(rawPath); },
    async exists(filePath) {
      try { await fs.access(expandWindowsPath(filePath)); return true; } catch { return false; }
    },
    async stat(filePath): Promise<RuntimeFileStat> {
      const stat = await fs.stat(expandWindowsPath(filePath));
      return { size: stat.size, sizeBytes: stat.size, isFile: stat.isFile(), isDirectory: stat.isDirectory() };
    },
    async readFile(filePath) { return fs.readFile(expandWindowsPath(filePath), "utf-8"); },
    async readDir(dirPath): Promise<RuntimeDirectoryEntry[]> {
      const resolvedDir = expandWindowsPath(dirPath);
      const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
      const result: RuntimeDirectoryEntry[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) result.push({ name: entry.name, type: "directory" });
        else if (entry.isFile()) {
          let sizeBytes: number | undefined;
          try { sizeBytes = (await fs.stat(path.win32.join(resolvedDir, entry.name))).size; } catch {}
          result.push({ name: entry.name, type: "file", ...(sizeBytes !== undefined ? { sizeBytes } : {}) });
        }
      }
      return result;
    },
    exec(command, options) { return execWindowsCommand(command, options, shellPath); },
  };
}
