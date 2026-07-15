import * as fs from 'node:fs';
import * as path from 'node:path';
import { classifyPath, isContainedPath, resolveEnvironmentPath } from './pathPolicy';
import type { DirectoryEntry, WorkspaceContext } from './types';
import { wslDisplayPathToNative } from './wslPath';

export interface DirectExecutionRequest {
  environment: 'host' | 'wsl';
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

export type DirectExecutionRunner = (
  request: DirectExecutionRequest,
) => Promise<DirectExecutionResult>;

export interface WorkspaceFsDependencies {
  /** @deprecated Filesystem operations no longer execute programs. */
  runDirect?: DirectExecutionRunner;
  /** @deprecated Native canonicalization replaces WSL realpath execution. */
  canonicalizeWsl?: (value: string) => Promise<string>;
  toNativeWslPath?: (linuxPath: string, distribution?: string) => string;
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
  patchFile(
    input: string,
    search: string,
    replacement: string,
    replaceAll?: boolean,
  ): Promise<FileWriteResult>;
  appendFile(input: string, content: string): Promise<FileWriteResult>;
  createDirectory(input: string): Promise<{ path: string }>;
  listDirectory(input?: string, recursive?: boolean): Promise<DirectoryListResult>;
  deleteFile(input: string, recursive?: boolean): Promise<{ path: string }>;
  moveFile(
    source: string,
    destination: string,
    overwrite?: boolean,
  ): Promise<{ source: string; destination: string }>;
  renameFile(
    input: string,
    newName: string,
    overwrite?: boolean,
  ): Promise<{ source: string; destination: string }>;
}

async function canonicalizeNative(value: string): Promise<string> {
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
  const raw = input || '.';
  if (context.executionEnvironment === 'wsl') {
    const resolved = resolveEnvironmentPath(raw, 'wsl', context.nativeRoot);
    if (!resolved.ok || !resolved.resolvedPath)
      throw new Error(resolved.error || 'Invalid workspace path.');
    if (!isContainedPath(context.nativeRoot, resolved.resolvedPath, { platform: 'posix' })) {
      throw new Error('Path escapes outside the workspace root.');
    }
    return path.posix.normalize(resolved.resolvedPath);
  }
  const windowsHost =
    classifyPath(context.nativeRoot) === 'windows-drive' ||
    classifyPath(context.nativeRoot) === 'wsl-unc';
  const environment = windowsHost ? 'host-windows' : 'host-posix';
  const resolved = resolveEnvironmentPath(raw, environment, context.nativeRoot);
  if (!resolved.ok || !resolved.resolvedPath)
    throw new Error(resolved.error || 'Invalid workspace path.');
  if (
    !isContainedPath(context.nativeRoot, resolved.resolvedPath, {
      platform: windowsHost ? 'windows' : 'posix',
    })
  ) {
    throw new Error('Path escapes outside the workspace root.');
  }
  return resolved.resolvedPath;
}

export function createWorkspaceFileSystem(
  context: WorkspaceContext,
  dependencies: WorkspaceFsDependencies = {},
): WorkspaceFileSystem {
  const displayRoot = context.nativeRoot;
  const toNative = (displayPath: string): string =>
    context.executionEnvironment === 'wsl'
      ? (dependencies.toNativeWslPath?.(displayPath, context.wslDistribution) ??
        wslDisplayPathToNative(context.wslDistribution, displayPath))
      : displayPath;
  const nativeRoot = toNative(displayRoot);

  const resolvePair = async (input: string): Promise<{ display: string; native: string }> => {
    const display = lexicalResolve(context, input);
    const native = toNative(display);
    const canonicalRoot = await canonicalizeNative(nativeRoot);
    const canonicalTarget = await canonicalizeNative(native);
    const windowsNative =
      classifyPath(nativeRoot) === 'windows-drive' || classifyPath(nativeRoot) === 'wsl-unc';
    if (
      !isContainedPath(canonicalRoot, canonicalTarget, {
        platform: windowsNative ? 'windows' : 'posix',
        canonicalize: (value) => value,
      })
    )
      throw new Error('Canonical path escapes outside the workspace root.');
    return { display, native: canonicalTarget };
  };

  const api: WorkspaceFileSystem = {
    async resolvePath(input) {
      return (await resolvePair(input)).display;
    },
    async readFile(input) {
      const target = await resolvePair(input);
      const content = await fs.promises.readFile(target.native, 'utf8');
      return { path: target.display, content, bytes: Buffer.byteLength(content, 'utf8') };
    },
    async writeFile(input, content) {
      const target = await resolvePair(input);
      await fs.promises.mkdir(path.dirname(target.native), { recursive: true });
      await fs.promises.writeFile(target.native, content, 'utf8');
      return { path: target.display, bytes: Buffer.byteLength(content, 'utf8') };
    },
    async patchFile(input, search, replacement, replaceAll = false) {
      if (!search) throw new Error('Patch search text cannot be empty.');
      const current = await api.readFile(input);
      if (!current.content.includes(search)) throw new Error('Patch search text was not found.');
      const content = replaceAll
        ? current.content.split(search).join(replacement)
        : current.content.replace(search, replacement);
      return api.writeFile(input, content);
    },
    async appendFile(input, content) {
      const target = await resolvePair(input);
      await fs.promises.mkdir(path.dirname(target.native), { recursive: true });
      await fs.promises.appendFile(target.native, content, 'utf8');
      return { path: target.display, bytes: Buffer.byteLength(content, 'utf8') };
    },
    async createDirectory(input) {
      const target = await resolvePair(input);
      await fs.promises.mkdir(target.native, { recursive: true });
      return { path: target.display };
    },
    async listDirectory(input = '.', recursive = false) {
      const target = await resolvePair(input);
      const entries: DirectoryEntry[] = [];
      const walk = async (
        nativeDirectory: string,
        displayDirectory: string,
        depth: number,
      ): Promise<void> => {
        const dirents = await fs.promises.readdir(nativeDirectory, { withFileTypes: true });
        for (const entry of dirents) {
          const nativeFull = path.join(nativeDirectory, entry.name);
          const displayFull =
            context.executionEnvironment === 'wsl'
              ? path.posix.join(displayDirectory, entry.name)
              : path.join(displayDirectory, entry.name);
          const stat = entry.isDirectory() ? undefined : await fs.promises.stat(nativeFull);
          entries.push({
            name: entry.name,
            relativePath:
              context.executionEnvironment === 'wsl'
                ? path.posix.relative(displayRoot, displayFull)
                : path.relative(displayRoot, displayFull),
            type: entry.isDirectory() ? 'directory' : 'file',
            ...(stat ? { sizeBytes: stat.size } : {}),
          });
          if (recursive && entry.isDirectory() && depth < 10)
            await walk(nativeFull, displayFull, depth + 1);
        }
      };
      await walk(target.native, target.display, 1);
      return { path: target.display, entries };
    },
    async deleteFile(input, recursive = false) {
      const target = await resolvePair(input);
      if (target.display === displayRoot) throw new Error('The workspace root cannot be deleted.');
      await fs.promises.rm(target.native, { recursive, force: false });
      return { path: target.display };
    },
    async moveFile(source, destination, overwrite = false) {
      const resolvedSource = await resolvePair(source);
      const resolvedDestination = await resolvePair(destination);
      await fs.promises.mkdir(path.dirname(resolvedDestination.native), { recursive: true });
      if (!overwrite && fs.existsSync(resolvedDestination.native))
        throw new Error('Destination already exists.');
      if (overwrite)
        await fs.promises.rm(resolvedDestination.native, { recursive: true, force: true });
      await fs.promises.rename(resolvedSource.native, resolvedDestination.native);
      return { source: resolvedSource.display, destination: resolvedDestination.display };
    },
    async renameFile(input, newName, overwrite = false) {
      if (!newName || newName.includes('/') || newName.includes('\\'))
        throw new Error('New name must be a single path segment.');
      const source = await resolvePair(input);
      const destination =
        context.executionEnvironment === 'wsl'
          ? path.posix.join(path.posix.dirname(source.display), newName)
          : path.join(path.dirname(source.display), newName);
      const relativeDestination =
        context.executionEnvironment === 'wsl'
          ? path.posix.relative(displayRoot, destination)
          : path.relative(displayRoot, destination);
      return api.moveFile(input, relativeDestination, overwrite);
    },
  };
  return api;
}
