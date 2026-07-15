import * as path from 'node:path';

const INVALID_DISTRIBUTION = /[\\/\0]/;

export function validateWslDistribution(distribution: string | undefined): string {
  const value = distribution?.trim() ?? '';
  if (!value) throw new Error('A WSL distribution is required for native WSL filesystem access.');
  if (INVALID_DISTRIBUTION.test(value) || value === '.' || value === '..') {
    throw new Error('Invalid WSL distribution name.');
  }
  return value;
}

export function linuxPathToWslUnc(distribution: string | undefined, linuxPath: string): string {
  const distro = validateWslDistribution(distribution);
  if (!linuxPath.startsWith('/')) throw new Error('A Linux-absolute path is required.');
  const normalized = path.posix.normalize(linuxPath);
  if (!normalized.startsWith('/')) throw new Error('A Linux-absolute path is required.');
  const segments = normalized.split('/').filter(Boolean);
  return path.win32.join('\\\\wsl$', distro, ...segments);
}

export function wslDisplayPathToNative(
  distribution: string | undefined,
  linuxPath: string,
  platform: NodeJS.Platform = process.platform,
): string {
  return platform === 'win32' ? linuxPathToWslUnc(distribution, linuxPath) : linuxPath;
}
