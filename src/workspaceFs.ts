import * as fs from "fs";
import * as path from "path";
import { execProgram } from "./executor";
import { classifyPath, isContainedPath, resolveEnvironmentPath } from "./pathPolicy";
import type { DirectoryEntry, WorkspaceContext } from "./types";

export interface DirectExecutionRequest {
  environment: "host" | "wsl";
  distribution?: string;
  cwd: string;
  program: string;
  args: string[];
  stdin?: string | Buffer;
}

export interface DirectExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export type DirectExecutionRunner = (request: DirectExecutionRequest) => Promise<DirectExecutionResult>;

export interface WorkspaceFsDependencies {
  runDirect?: DirectExecutionRunner;
  canonicalizeWsl?: (value: string) => Promise<string>;
}

export interface FileReadResult {
  path: string;
  content: string;
  bytes: number;
}

export interface FileWriteResult {
  path: string;
  bytes: number;
}

export interface DirectoryListResult {
  path: string;
  entries: DirectoryEntry[];
}

export interface WorkspaceFileSystem {
  resolvePath(input: string): Promise<string>;
  readFile(input: string): Promise<FileReadResult>;
  writeFile(input: string, content: string): Promise<FileWriteResult>;
  patchFile(input: string, search: string, replacement: string, replaceAll?: boolean): Promise<FileWriteResult>;
  appendFile(input: string, content: string): Promise<FileWriteResult>;
  createDirectory(input: string): Promise<{ path: string }>;
  listDirectory(input?: string, recursive?: boolean): Promise<DirectoryListResult>;
  deleteFile(input: string, recursive?: boolean): Promise<{ path: string }>;
  moveFile(source: string, destination: string, overwrite?: boolean): Promise<{ source: string; destination: string }>;
  renameFile(input: string, newName: string, overwrite?: boolean): Promise<{ source: string; destination: string }>;
}

const defaultRunner: DirectExecutionRunner = async (request) => {
  const result = await execProgram(request.program, request.args, {
    cwd: request.cwd,
    executionEnvironment: request.environment,
    wslDistribution: request.distribution,
    stdin: request.stdin,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
  };
};

function fail(result: DirectExecutionResult, operation: string): never {
  throw new Error(result.stderr.trim() || `${operation} failed with exit code ${result.exitCode}.`);
}

async function canonicalizeHost(value: string): Promise<string> {
  let cursor = value;
  const remainder: string[] = [];
  while (!fs.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    remainder.unshift(path.basename(cursor));
    cursor = parent;
  }
  const base = await fs.promises.realpath(cursor);
  return path.resolve(base, ...remainder);
}

function lexicalResolve(context: WorkspaceContext, input: string): string {
  const raw = input || ".";
  if (context.executionEnvironment === "wsl") {
    const resolved = resolveEnvironmentPath(raw, "wsl", context.nativeRoot);
    if (!resolved.ok || !resolved.resolvedPath) throw new Error(resolved.error || "Invalid workspace path.");
    if (!isContainedPath(context.nativeRoot, resolved.resolvedPath, { platform: "posix" })) {
      throw new Error("Path escapes outside the workspace root.");
    }
    return path.posix.normalize(resolved.resolvedPath);
  }

  const windowsHost = classifyPath(context.nativeRoot) === "windows-drive" || classifyPath(context.nativeRoot) === "wsl-unc";
  const environment = windowsHost ? "host-windows" : "host-posix";
  const resolved = resolveEnvironmentPath(raw, environment, context.nativeRoot);
  if (!resolved.ok || !resolved.resolvedPath) throw new Error(resolved.error || "Invalid workspace path.");
  if (!isContainedPath(context.nativeRoot, resolved.resolvedPath, { platform: windowsHost ? "windows" : "posix" })) {
    throw new Error("Path escapes outside the workspace root.");
  }
  return resolved.resolvedPath;
}

export function createWorkspaceFileSystem(
  context: WorkspaceContext,
  dependencies: WorkspaceFsDependencies = {},
): WorkspaceFileSystem {
  const runDirect = dependencies.runDirect ?? defaultRunner;
  const canonicalizeWsl = dependencies.canonicalizeWsl ?? (async (value: string) => {
    const result = await runDirect({
      environment: "wsl",
      distribution: context.wslDistribution,
      cwd: context.nativeRoot,
      program: "realpath",
      args: ["-m", "--", value],
    });
    if (result.exitCode !== 0) fail(result, "realpath");
    return result.stdout.trim();
  });

  const resolvePath = async (input: string): Promise<string> => {
    const lexical = lexicalResolve(context, input);
    if (context.executionEnvironment === "wsl") {
      const canonicalRoot = await canonicalizeWsl(context.nativeRoot);
      const canonicalTarget = await canonicalizeWsl(lexical);
      if (!isContainedPath(canonicalRoot, canonicalTarget, { platform: "posix", canonicalize: (value) => value })) {
        throw new Error("Canonical path escapes outside the workspace root.");
      }
      return canonicalTarget;
    }
    const canonicalRoot = await canonicalizeHost(context.nativeRoot);
    const canonicalTarget = await canonicalizeHost(lexical);
    const windowsHost = classifyPath(context.nativeRoot) === "windows-drive" || classifyPath(context.nativeRoot) === "wsl-unc";
    if (!isContainedPath(canonicalRoot, canonicalTarget, {
      platform: windowsHost ? "windows" : "posix",
      canonicalize: (value) => value,
    })) {
      throw new Error("Canonical path escapes outside the workspace root.");
    }
    return canonicalTarget;
  };

  const runWsl = async (program: string, args: string[], stdin?: string | Buffer): Promise<DirectExecutionResult> => {
    const result = await runDirect({
      environment: "wsl",
      distribution: context.wslDistribution,
      cwd: context.nativeRoot,
      program,
      args,
      ...(stdin !== undefined ? { stdin } : {}),
    });
    if (result.exitCode !== 0) fail(result, program);
    return result;
  };

  const ensureParentWsl = async (target: string): Promise<void> => {
    await runWsl("mkdir", ["-p", "--", path.posix.dirname(target)]);
  };

  return {
    resolvePath,

    async readFile(input) {
      const target = await resolvePath(input);
      if (context.executionEnvironment === "wsl") {
        const result = await runWsl("cat", ["--", target]);
        return { path: target, content: result.stdout, bytes: Buffer.byteLength(result.stdout, "utf8") };
      }
      const content = await fs.promises.readFile(target, "utf8");
      return { path: target, content, bytes: Buffer.byteLength(content, "utf8") };
    },

    async writeFile(input, content) {
      const target = await resolvePath(input);
      if (context.executionEnvironment === "wsl") {
        await ensureParentWsl(target);
        await runWsl("tee", ["--", target], content);
      } else {
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.writeFile(target, content, "utf8");
      }
      return { path: target, bytes: Buffer.byteLength(content, "utf8") };
    },

    async patchFile(input, search, replacement, replaceAll = false) {
      if (!search) throw new Error("Patch search text cannot be empty.");
      const current = await this.readFile(input);
      if (!current.content.includes(search)) throw new Error("Patch search text was not found.");
      const content = replaceAll
        ? current.content.split(search).join(replacement)
        : current.content.replace(search, replacement);
      return this.writeFile(input, content);
    },

    async appendFile(input, content) {
      const target = await resolvePath(input);
      if (context.executionEnvironment === "wsl") {
        await ensureParentWsl(target);
        await runWsl("tee", ["-a", "--", target], content);
      } else {
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await fs.promises.appendFile(target, content, "utf8");
      }
      return { path: target, bytes: Buffer.byteLength(content, "utf8") };
    },

    async createDirectory(input) {
      const target = await resolvePath(input);
      if (context.executionEnvironment === "wsl") await runWsl("mkdir", ["-p", "--", target]);
      else await fs.promises.mkdir(target, { recursive: true });
      return { path: target };
    },

    async listDirectory(input = ".", recursive = false) {
      const target = await resolvePath(input);
      if (context.executionEnvironment === "wsl") {
        const result = await runWsl("find", [
          target,
          "-mindepth",
          "1",
          "-maxdepth",
          recursive ? "10" : "1",
          "-printf",
          "%P\\0%y\\0%s\\0",
        ]);
        const fields = result.stdout.split("\0");
        const entries: DirectoryEntry[] = [];
        for (let index = 0; index + 2 < fields.length; index += 3) {
          const [relativeFromTarget, kind, size] = fields.slice(index, index + 3);
          if (!relativeFromTarget) continue;
          const full = path.posix.join(target, relativeFromTarget);
          entries.push({
            name: path.posix.basename(relativeFromTarget),
            relativePath: path.posix.relative(context.nativeRoot, full),
            type: kind === "d" ? "directory" : "file",
            ...(kind === "d" ? {} : { sizeBytes: Number(size) || 0 }),
          });
        }
        return { path: target, entries };
      }

      const entries: DirectoryEntry[] = [];
      const walk = async (directory: string, depth: number): Promise<void> => {
        const dirents = await fs.promises.readdir(directory, { withFileTypes: true });
        for (const entry of dirents) {
          const full = path.join(directory, entry.name);
          const stat = entry.isDirectory() ? undefined : await fs.promises.stat(full);
          entries.push({
            name: entry.name,
            relativePath: path.relative(context.nativeRoot, full),
            type: entry.isDirectory() ? "directory" : "file",
            ...(stat ? { sizeBytes: stat.size } : {}),
          });
          if (recursive && entry.isDirectory() && depth < 10) {
            await walk(full, depth + 1);
          }
        }
      };
      await walk(target, 1);
      return { path: target, entries };
    },

    async deleteFile(input, recursive = false) {
      const target = await resolvePath(input);
      if (target === context.nativeRoot) throw new Error("The workspace root cannot be deleted.");
      if (context.executionEnvironment === "wsl") {
        await runWsl("rm", [recursive ? "-rf" : "-f", "--", target]);
      } else {
        await fs.promises.rm(target, { recursive, force: false });
      }
      return { path: target };
    },

    async moveFile(source, destination, overwrite = false) {
      const resolvedSource = await resolvePath(source);
      const resolvedDestination = await resolvePath(destination);
      if (context.executionEnvironment === "wsl") {
        await ensureParentWsl(resolvedDestination);
        await runWsl("mv", [overwrite ? "-f" : "-n", "--", resolvedSource, resolvedDestination]);
      } else {
        await fs.promises.mkdir(path.dirname(resolvedDestination), { recursive: true });
        if (!overwrite && fs.existsSync(resolvedDestination)) throw new Error("Destination already exists.");
        if (overwrite) await fs.promises.rm(resolvedDestination, { recursive: true, force: true });
        await fs.promises.rename(resolvedSource, resolvedDestination);
      }
      return { source: resolvedSource, destination: resolvedDestination };
    },

    async renameFile(input, newName, overwrite = false) {
      if (!newName || newName.includes("/") || newName.includes("\\")) throw new Error("New name must be a single path segment.");
      const source = await resolvePath(input);
      const destination = context.executionEnvironment === "wsl"
        ? path.posix.join(path.posix.dirname(source), newName)
        : path.join(path.dirname(source), newName);
      const relativeDestination = context.executionEnvironment === "wsl"
        ? path.posix.relative(context.nativeRoot, destination)
        : path.relative(context.nativeRoot, destination);
      return this.moveFile(input, relativeDestination, overwrite);
    },
  };
}
