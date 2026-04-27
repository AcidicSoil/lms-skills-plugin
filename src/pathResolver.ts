import * as path from "path";
import type { RuntimeTargetName } from "./environment";
import { formatEnvironmentLabel } from "./environment";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeAdapter } from "./runtime/types";

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
): Promise<ResolvedSkillRoot> {
  const resolvedPath = await runtime.expandPath(rawPath);
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
): Promise<ResolvedSkillRoot[]> {
  const parsed = parseRawSkillPaths(rawPaths);
  const seen = new Set<string>();
  const roots: ResolvedSkillRoot[] = [];

  for (const target of targets) {
    const runtime = registry.getRuntime(target);
    for (const rawPath of parsed) {
      try {
        const root = await resolveTargetPath(rawPath, target, runtime);
        const key = `${target}:${normalizeForTarget(target, root.resolvedPath)}`;
        if (!seen.has(key)) {
          seen.add(key);
          roots.push(root);
        }
      } catch {}
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
