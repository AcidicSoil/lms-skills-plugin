import * as path from "path";
import type { RuntimeTargetName } from "./environment";
import { formatEnvironmentLabel } from "./environment";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeAdapter } from "./runtime/types";
import { checkAbort, isAbortError } from "./abort";

export interface ResolvedSkillRoot {
  environment: RuntimeTargetName;
  environmentLabel: "Windows" | "WSL";
  rawPath: string;
  resolvedPath: string;
  displayPath: string;
}

export function parseRawSkillPaths(rawPaths: string[]): string[] {
  return rawPaths
    .flatMap((raw) => raw.split(";"))
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatDisplayPath(
  target: RuntimeTargetName,
  resolvedPath: string,
): string {
  return `${formatEnvironmentLabel(target)}:${resolvedPath}`;
}

function normalizeForTarget(target: RuntimeTargetName, value: string): string {
  return target === "windows"
    ? path.win32.normalize(value).toLowerCase()
    : path.posix.normalize(value);
}

export async function resolveTargetPath(
  rawPath: string,
  target: RuntimeTargetName,
  runtime: RuntimeAdapter,
  signal?: AbortSignal,
): Promise<ResolvedSkillRoot> {
  checkAbort(signal);
  const resolvedPath = await runtime.expandPath(rawPath, signal);
  checkAbort(signal);
  return {
    environment: target,
    environmentLabel: formatEnvironmentLabel(target),
    rawPath,
    resolvedPath,
    displayPath: formatDisplayPath(target, resolvedPath),
  };
}

export async function resolveSkillRoots(
  rawPaths: string[],
  targets: RuntimeTargetName[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<ResolvedSkillRoot[]> {
  checkAbort(signal);
  const parsed = parseRawSkillPaths(rawPaths);
  const seen = new Set<string>();
  const roots: ResolvedSkillRoot[] = [];

  for (const target of targets) {
    checkAbort(signal);
    const runtime = registry.getRuntime(target);
    for (const rawPath of parsed) {
      checkAbort(signal);
      try {
        const root = await resolveTargetPath(rawPath, target, runtime, signal);
        const key = `${target}:${normalizeForTarget(target, root.resolvedPath)}`;
        if (!seen.has(key)) {
          seen.add(key);
          roots.push(root);
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
    }
  }

  return roots;
}

export function parseDisplayPath(
  value: string,
): { environment?: RuntimeTargetName; path: string } {
  if (value.startsWith("WSL:")) return { environment: "wsl", path: value.slice(4) };
  if (value.startsWith("Windows:")) {
    return { environment: "windows", path: value.slice("Windows:".length) };
  }
  return { path: value };
}
