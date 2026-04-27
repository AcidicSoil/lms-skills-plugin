import type { RuntimeTargetName } from "../environment";
import type { Platform } from "../executor";

export interface RuntimeFileStat {
  size: number;
  sizeBytes: number;
  isFile: boolean;
  isDirectory: boolean;
}

export interface RuntimeDirectoryEntry {
  name: string;
  type: "file" | "directory";
  sizeBytes?: number;
}

export interface RuntimeExecOptions {
  cwd?: string;
  timeoutMs?: number;
  shellPath?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
}

export interface RuntimeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  shell: string;
  platform: Platform;
  environment: RuntimeTargetName;
}

export interface RuntimeAdapter {
  target: RuntimeTargetName;
  label: "Windows" | "WSL";
  displayName: "Windows" | "WSL";
  shell: string;
  expandPath(rawPath: string, signal?: AbortSignal): Promise<string>;
  exists(filePath: string, signal?: AbortSignal): Promise<boolean>;
  stat(filePath: string, signal?: AbortSignal): Promise<RuntimeFileStat>;
  readFile(filePath: string, signal?: AbortSignal): Promise<string>;
  readDir(dirPath: string, signal?: AbortSignal): Promise<RuntimeDirectoryEntry[]>;
  exec(command: string, options?: RuntimeExecOptions): Promise<RuntimeExecResult>;
}
