import * as path from 'path';

export type PathKind = 'relative' | 'windows-drive' | 'wsl-unc' | 'linux-absolute' | 'invalid';
export type PathEnvironment = 'host-windows' | 'host-posix' | 'wsl';

export interface PathValidationResult {
  ok: boolean;
  kind: PathKind;
  resolvedPath?: string;
  error?: string;
}

export function classifyPath(input: string): PathKind {
  if (!input || input.includes('\0')) return 'invalid';
  if (/^[A-Za-z]:[\\/]/.test(input)) return 'windows-drive';
  if (/^\\\\wsl(?:\.localhost)?\$?\\/i.test(input)) return 'wsl-unc';
  if (input.startsWith('/')) return 'linux-absolute';
  return 'relative';
}

export function resolveEnvironmentPath(
  input: string,
  environment: PathEnvironment,
  root?: string,
): PathValidationResult {
  const kind = classifyPath(input);
  if (kind === 'invalid') return { ok: false, kind, error: 'Invalid path.' };
  if (kind === 'relative') {
    if (!root) return { ok: false, kind, error: 'Relative paths require an explicit root.' };
    const impl = environment === 'host-windows' ? path.win32 : path.posix;
    return { ok: true, kind, resolvedPath: impl.resolve(root, input) };
  }
  const allowed =
    environment === 'host-windows'
      ? kind === 'windows-drive' || kind === 'wsl-unc'
      : kind === 'linux-absolute';
  return allowed
    ? { ok: true, kind, resolvedPath: input }
    : { ok: false, kind, error: `Path kind ${kind} is not valid for ${environment}.` };
}

export interface ContainmentOptions {
  platform?: 'windows' | 'posix';
  canonicalize?: (value: string) => string;
}

export function isContainedPath(
  root: string,
  target: string,
  options: ContainmentOptions = {},
): boolean {
  const platform = options.platform ?? 'posix';
  const impl = platform === 'windows' ? path.win32 : path.posix;
  const canonicalize = options.canonicalize ?? ((value: string) => impl.resolve(value));
  let canonicalRoot = canonicalize(root);
  let canonicalTarget = canonicalize(target);
  if (platform === 'windows') {
    canonicalRoot = canonicalRoot.toLowerCase();
    canonicalTarget = canonicalTarget.toLowerCase();
  }
  if (canonicalTarget === canonicalRoot) return true;
  const rootWithSep = canonicalRoot.endsWith(impl.sep) ? canonicalRoot : canonicalRoot + impl.sep;
  return canonicalTarget.startsWith(rootWithSep);
}
