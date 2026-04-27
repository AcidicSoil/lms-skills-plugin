import type { RuntimeTargetName } from "./environment";
import { detectHostPlatform } from "./environment";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeExecOptions } from "./runtime/types";

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
  environment?: RuntimeTargetName;
}

export interface ExecOptions extends RuntimeExecOptions {
  target?: RuntimeTargetName;
}

export function detectPlatform(): Platform {
  return detectHostPlatform();
}

export function inferTargetFromCwd(cwd?: string): RuntimeTargetName | null {
  if (!cwd) return null;
  if (cwd.startsWith("WSL:") || cwd.startsWith("/")) return "wsl";
  if (cwd.startsWith("Windows:") || /^[A-Za-z]:[\\/]/.test(cwd)) return "windows";
  if (cwd.startsWith("\\\\wsl$\\") || cwd.startsWith("\\\\wsl.localhost\\")) return "wsl";
  return null;
}

function stripDisplayPath(cwd?: string): string | undefined {
  if (!cwd) return undefined;
  if (cwd.startsWith("WSL:")) return cwd.slice(4);
  if (cwd.startsWith("Windows:")) return cwd.slice("Windows:".length);
  return cwd;
}

export async function execCommandForTarget(
  registry: RuntimeRegistry,
  target: RuntimeTargetName,
  command: string,
  options: RuntimeExecOptions = {},
): Promise<ExecResult> {
  const result = await registry.getRuntime(target).exec(command, {
    ...options,
    cwd: stripDisplayPath(options.cwd),
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    shell: result.shell,
    platform: detectPlatform(),
    environment: result.environment,
  };
}

export async function execCommand(
  command: string,
  options: ExecOptions,
  registry: RuntimeRegistry,
  defaultTarget: RuntimeTargetName,
): Promise<ExecResult> {
  const target = options.target ?? inferTargetFromCwd(options.cwd) ?? defaultTarget;
  return execCommandForTarget(registry, target, command, options);
}

export function resolveShell(): ShellInfo {
  const platform = detectPlatform();
  if (platform === "windows") {
    return { path: "powershell.exe/cmd.exe", args: [], platform };
  }
  return { path: "bash", args: ["-lc"], platform };
}
