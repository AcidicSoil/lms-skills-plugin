import * as child_process from "child_process";
import * as os from "os";
import * as path from "path";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_OUTPUT_BYTES,
  EXEC_MAX_TIMEOUT_MS,
} from "../constants";
import { detectHostPlatform } from "../environment";
import { checkAbort, createAbortError } from "../abort";
import type {
  RuntimeAdapter,
  RuntimeDirectoryEntry,
  RuntimeExecOptions,
  RuntimeExecResult,
  RuntimeFileStat,
} from "./types";

export interface WslRuntimeOptions {
  distro?: string;
  shellPath?: string;
}

export interface WslProbeResult {
  available: boolean;
  error?: string;
}

function normalizeOutput(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function truncate(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= maxBytes) return text;
  return (
    buf.slice(0, maxBytes).toString("utf-8") +
    `\n[truncated - output exceeded ${maxBytes} bytes]`
  );
}

function quoteBash(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function commandArgs(command: string, distro?: string, shellPath = "bash"): string[] {
  const host = detectHostPlatform();
  const shellArgs = [shellPath, "-lc", command];
  if (host === "windows") {
    return [
      ...(distro && distro.trim() ? ["-d", distro.trim()] : []),
      "--",
      ...shellArgs,
    ];
  }
  return ["-lc", command];
}

function commandExecutable(): string {
  return detectHostPlatform() === "windows" ? "wsl.exe" : "bash";
}

function execRaw(
  command: string,
  options: RuntimeExecOptions = {},
  runtimeOptions: WslRuntimeOptions = {},
): Promise<RuntimeExecResult> {
  checkAbort(options.signal);
  return new Promise((resolve, reject) => {
    const executable = commandExecutable();
    const shell = runtimeOptions.shellPath?.trim() || "bash";
    const timeoutMs = Math.min(
      options.timeoutMs ?? EXEC_DEFAULT_TIMEOUT_MS,
      EXEC_MAX_TIMEOUT_MS,
    );
    const wrappedCommand = options.cwd
      ? `cd ${quoteBash(options.cwd)} && ${command}`
      : command;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
      ...(options.env ?? {}),
    };

    let proc: child_process.ChildProcess;
    try {
      proc = child_process.spawn(
        executable,
        commandArgs(wrappedCommand, runtimeOptions.distro, shell),
        { env, windowsHide: true },
      );
    } catch (err) {
      resolve({
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        timedOut: false,
        shell,
        platform: detectHostPlatform(), environment: "wsl",
      });
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

    proc.stdout?.on("data", (chunk: Buffer) => {
      checkAbort(options.signal);
      stdout += chunk.toString("utf-8");
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      checkAbort(options.signal);
      stderr += chunk.toString("utf-8");
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (options.signal?.aborted) {
        reject(createAbortError(options.signal));
        return;
      }
      resolve({
        stdout: truncate(normalizeOutput(stdout), EXEC_MAX_OUTPUT_BYTES),
        stderr: truncate(normalizeOutput(stderr), EXEC_MAX_OUTPUT_BYTES),
        exitCode: code ?? 1,
        timedOut,
        shell,
        platform: detectHostPlatform(), environment: "wsl",
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (options.signal?.aborted) {
        reject(createAbortError(options.signal));
        return;
      }
      resolve({
        stdout: "",
        stderr: err.message,
        exitCode: 1,
        timedOut: false,
        shell,
        platform: detectHostPlatform(), environment: "wsl",
      });
    });
  });
}

export async function probeWsl(
  options: WslRuntimeOptions = {},
): Promise<WslProbeResult> {
  const result = await execRaw("printf ok", { timeoutMs: 5_000 }, options);
  if (result.exitCode === 0 && result.stdout.trim() === "ok") {
    return { available: true };
  }
  return {
    available: false,
    error: result.stderr || result.stdout || "WSL probe failed.",
  };
}

export async function getWslHome(
  options: WslRuntimeOptions = {},
  signal?: AbortSignal,
): Promise<string> {
  checkAbort(signal);
  if (detectHostPlatform() === "linux") return os.homedir();
  const result = await execRaw("printf %s \"$HOME\"", { timeoutMs: 5_000, signal }, options);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Unable to resolve WSL home directory.");
  }
  return result.stdout.trim();
}

export async function execWslCommand(
  command: string,
  options: RuntimeExecOptions = {},
  runtimeOptions: WslRuntimeOptions = {},
): Promise<RuntimeExecResult> {
  return execRaw(command, options, runtimeOptions);
}

export function createWslRuntime(options: WslRuntimeOptions = {}): RuntimeAdapter {
  let cachedHome: Promise<string> | null = null;
  const shell = options.shellPath?.trim() || "bash";

  async function home(signal?: AbortSignal): Promise<string> {
    checkAbort(signal);
    cachedHome ??= getWslHome(options, signal);
    return cachedHome;
  }

  async function expandPath(rawPath: string, signal?: AbortSignal): Promise<string> {
    checkAbort(signal);
    const trimmed = rawPath.trim();
    const homeDir = await home(signal);
    checkAbort(signal);
    const expanded = trimmed.replace(/^~(?=\/|$)/, homeDir);
    if (path.posix.isAbsolute(expanded)) return path.posix.normalize(expanded);
    return path.posix.normalize(path.posix.join(homeDir, expanded));
  }

  async function stat(filePath: string, signal?: AbortSignal): Promise<RuntimeFileStat> {
    const resolved = await expandPath(filePath, signal);
    const result = await execRaw(
      `if [ -f ${quoteBash(resolved)} ]; then printf 'file:%s' "$(wc -c < ${quoteBash(resolved)})"; elif [ -d ${quoteBash(resolved)} ]; then printf 'dir:0'; else exit 2; fi`,
      { signal },
      options,
    );
    if (result.exitCode !== 0) throw new Error(result.stderr || `Path not found: ${resolved}`);
    const [type, sizeRaw] = result.stdout.trim().split(":");
    const size = Number(sizeRaw) || 0;
    return {
      size,
      sizeBytes: size,
      isFile: type === "file",
      isDirectory: type === "dir",
    };
  }

  return {
    target: "wsl",
    label: "WSL",
    displayName: "WSL",
    shell,
    expandPath,
    async exists(filePath, signal) {
      const resolved = await expandPath(filePath, signal);
      const result = await execRaw(`test -e ${quoteBash(resolved)}`, { signal }, options);
      return result.exitCode === 0;
    },
    stat,
    async readFile(filePath, signal) {
      const resolved = await expandPath(filePath, signal);
      const result = await execRaw(`cat ${quoteBash(resolved)}`, { signal }, options);
      if (result.exitCode !== 0) throw new Error(result.stderr || `Unable to read file: ${resolved}`);
      return result.stdout;
    },
    async readDir(dirPath, signal): Promise<RuntimeDirectoryEntry[]> {
      const resolved = await expandPath(dirPath, signal);
      const script = `python3 - <<'PY'\nimport json, os\nroot=${JSON.stringify(resolved)}\nout=[]\nfor name in os.listdir(root):\n    p=os.path.join(root,name)\n    if os.path.isdir(p): out.append({'name':name,'type':'directory'})\n    elif os.path.isfile(p): out.append({'name':name,'type':'file','sizeBytes':os.path.getsize(p)})\nprint(json.dumps(out))\nPY`;
      const result = await execRaw(script, { signal }, options);
      if (result.exitCode !== 0) throw new Error(result.stderr || `Unable to list directory: ${resolved}`);
      return JSON.parse(result.stdout) as RuntimeDirectoryEntry[];
    },
    exec(command, execOptions) {
      return execRaw(command, execOptions, options);
    },
  };
}
