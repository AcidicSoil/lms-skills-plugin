import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_OUTPUT_BYTES,
} from "./constants";
import type { ExecutionEnvironment } from "./types";
import { resolveEnvironmentPath } from "./pathPolicy";

export type Platform = "windows" | "macos" | "linux";

export interface ShellInfo {
  path: string;
  args: string[];
  platform: Platform;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  shell: string;
  platform: Platform;
  environment: ExecutionEnvironment;
  terminationIncomplete?: boolean;
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  shellPath?: string;
  windowsShell?: "powershell" | "cmd";
  env?: Record<string, string>;
  executionEnvironment?: ExecutionEnvironment;
  wslDistribution?: string;
  spawn?: typeof childProcess.spawn;
}

export interface ExecProgramOptions {
  cwd: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  executionEnvironment?: ExecutionEnvironment;
  wslDistribution?: string;
  stdin?: string | Buffer;
  spawn?: typeof childProcess.spawn;
}

export interface ExecutionSpec {
  program: string;
  args: string[];
  cwd?: string;
  platform: Platform;
  environment: ExecutionEnvironment;
  shell: string;
}

export function detectPlatform(): Platform {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "linux";
}

export function resolveShell(override?: string, windowsShell?: "powershell" | "cmd"): ShellInfo {
  const platform = detectPlatform();
  if (override?.trim()) {
    const p = override.trim();
    const lower = p.toLowerCase();
    const isPowerShell = lower.endsWith("powershell.exe") || lower.endsWith("pwsh.exe") || lower.endsWith("pwsh");
    return { path: p, args: isPowerShell ? ["-NoProfile", "-NonInteractive", "-Command"] : ["-c"], platform };
  }
  if (platform === "windows") {
    if ((windowsShell ?? "cmd") === "cmd") return { path: "cmd.exe", args: ["/c"], platform };
    for (const p of ["C:\\Program Files\\PowerShell\\7\\pwsh.exe", "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"]) {
      if (fs.existsSync(p)) return { path: p, args: ["-NoProfile", "-NonInteractive", "-Command"], platform };
    }
    return { path: "cmd.exe", args: ["/c"], platform };
  }
  if (process.env.SHELL && fs.existsSync(process.env.SHELL)) return { path: process.env.SHELL, args: ["-c"], platform };
  for (const sh of ["/bin/bash", "/usr/bin/bash", "/bin/sh", "/usr/bin/sh", "/usr/local/bin/bash", "/usr/local/bin/zsh", "/bin/zsh"]) {
    if (fs.existsSync(sh)) return { path: sh, args: ["-c"], platform };
  }
  return { path: "/bin/sh", args: ["-c"], platform };
}

export function resolveCwd(cwd?: string): string {
  if (!cwd?.trim()) throw new Error("A valid working directory is required.");
  const expanded = cwd.replace(/^~(?=[/\\]|$)/, os.homedir());
  if (!fs.existsSync(expanded) || !fs.statSync(expanded).isDirectory()) {
    throw new Error(`Working directory does not exist or is not a directory: ${cwd}`);
  }
  return expanded;
}

export function buildExecutionSpec(command: string, options: ExecOptions = {}): ExecutionSpec {
  const environment = options.executionEnvironment ?? "host";
  if (environment === "wsl") {
    const validation = resolveEnvironmentPath(options.cwd ?? "", "wsl");
    if (!validation.ok || !validation.resolvedPath) throw new Error(validation.error ?? "Invalid WSL working directory.");
    const args: string[] = [];
    if (options.wslDistribution) args.push("--distribution", options.wslDistribution);
    args.push("--cd", validation.resolvedPath, "--exec", "/bin/sh", "-lc", command);
    return { program: "wsl.exe", args, platform: "windows", environment, shell: "/bin/sh" };
  }
  const shellInfo = resolveShell(options.shellPath, options.windowsShell);
  const cwd = resolveCwd(options.cwd);
  const isPowerShell = /(?:powershell|pwsh)(?:\.exe)?$/i.test(shellInfo.path);
  const finalCommand = isPowerShell ? `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ${command}` : command;
  return { program: shellInfo.path, args: [...shellInfo.args, finalCommand], cwd, platform: shellInfo.platform, environment, shell: shellInfo.path };
}

function truncate(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const buf = Buffer.from(normalized, "utf8");
  return buf.length <= EXEC_MAX_OUTPUT_BYTES
    ? normalized
    : `${buf.subarray(0, EXEC_MAX_OUTPUT_BYTES).toString("utf8")}\n[truncated - output exceeded ${EXEC_MAX_OUTPUT_BYTES} bytes]`;
}

export function execCommand(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  let spec: ExecutionSpec;
  try {
    spec = buildExecutionSpec(command, options);
  } catch (error) {
    const platform = detectPlatform();
    return Promise.resolve({ stdout: "", stderr: error instanceof Error ? error.message : String(error), exitCode: 1, timedOut: false, shell: "", platform, environment: options.executionEnvironment ?? "host" });
  }
  return new Promise((resolve) => {
    const timeoutMs = Math.min(Math.max(options.timeoutMs ?? EXEC_DEFAULT_TIMEOUT_MS, 1), EXEC_MAX_TIMEOUT_MS);
    const env: NodeJS.ProcessEnv = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", ...(options.env ?? {}) };
    let proc: childProcess.ChildProcess;
    try {
      proc = (options.spawn ?? childProcess.spawn)(spec.program, spec.args, { cwd: spec.cwd, env, windowsHide: true, detached: spec.platform !== "windows" });
    } catch (error) {
      resolve({ stdout: "", stderr: error instanceof Error ? error.message : String(error), exitCode: 1, timedOut: false, shell: spec.shell, platform: spec.platform, environment: spec.environment });
      return;
    }
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let terminationIncomplete = false;
    proc.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (spec.platform === "windows" && proc.pid) childProcess.spawn("taskkill", ["/pid", String(proc.pid), "/t", "/f"], { windowsHide: true });
        else if (proc.pid) process.kill(-proc.pid, "SIGKILL");
        else proc.kill("SIGKILL");
      } catch {
        terminationIncomplete = true;
        try { proc.kill("SIGKILL"); } catch { terminationIncomplete = true; }
      }
    }, timeoutMs);
    let settled = false;
    const finish = (exitCode: number, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout: truncate(stdout), stderr: truncate(error ?? stderr), exitCode, timedOut, shell: spec.shell, platform: spec.platform, environment: spec.environment, ...(timedOut ? { terminationIncomplete } : {}) });
    };
    proc.on("close", (code) => finish(code ?? 1));
    proc.on("error", (error) => finish(1, error.message));
  });
}

export function execProgram(
  program: string,
  args: string[],
  options: ExecProgramOptions,
): Promise<ExecResult> {
  const environment = options.executionEnvironment ?? "host";
  let spawnProgram = program;
  let spawnArgs = args;
  let cwd: string | undefined;
  let platform = detectPlatform();

  try {
    if (environment === "wsl") {
      const validation = resolveEnvironmentPath(options.cwd, "wsl");
      if (!validation.ok || !validation.resolvedPath) {
        throw new Error(validation.error ?? "Invalid WSL working directory.");
      }
      spawnProgram = "wsl.exe";
      spawnArgs = [];
      if (options.wslDistribution) {
        spawnArgs.push("--distribution", options.wslDistribution);
      }
      spawnArgs.push("--cd", validation.resolvedPath, "--exec", program, ...args);
      platform = "windows";
    } else {
      cwd = resolveCwd(options.cwd);
    }
  } catch (error) {
    return Promise.resolve({
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      timedOut: false,
      shell: program,
      platform,
      environment,
    });
  }

  return new Promise((resolve) => {
    const timeoutMs = Math.min(
      Math.max(options.timeoutMs ?? EXEC_DEFAULT_TIMEOUT_MS, 1),
      EXEC_MAX_TIMEOUT_MS,
    );
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
      ...(options.env ?? {}),
    };
    let proc: childProcess.ChildProcess;
    try {
      proc = (options.spawn ?? childProcess.spawn)(spawnProgram, spawnArgs, {
        cwd,
        env,
        windowsHide: true,
        detached: platform !== "windows",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        timedOut: false,
        shell: program,
        platform,
        environment,
      });
      return;
    }

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let terminationIncomplete = false;
    proc.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
    if (options.stdin !== undefined) {
      proc.stdin?.end(options.stdin);
    } else {
      proc.stdin?.end();
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (platform === "windows" && proc.pid) {
          childProcess.spawn("taskkill", ["/pid", String(proc.pid), "/t", "/f"], { windowsHide: true });
        } else if (proc.pid) {
          process.kill(-proc.pid, "SIGKILL");
        } else {
          proc.kill("SIGKILL");
        }
      } catch {
        terminationIncomplete = true;
        try { proc.kill("SIGKILL"); } catch { terminationIncomplete = true; }
      }
    }, timeoutMs);

    let settled = false;
    const finish = (exitCode: number, error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout: truncate(stdout),
        stderr: truncate(error ?? stderr),
        exitCode,
        timedOut,
        shell: program,
        platform,
        environment,
        ...(timedOut ? { terminationIncomplete } : {}),
      });
    };
    proc.on("close", (code) => finish(code ?? 1));
    proc.on("error", (error) => finish(1, error.message));
  });
}
