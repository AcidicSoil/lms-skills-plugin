import * as path from "path";
import { checkAbort } from "../abort";
import { resolveSkillByName } from "../scanner";
import type { RuntimeRegistry } from "../runtime";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { SkillInfo } from "../types";

function collectStringValues(value: unknown, keys: Set<string>, output: string[]): void {
  if (typeof value !== "object" || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, keys, output);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (typeof child === "string" && keys.has(normalizedKey)) {
      output.push(child);
    }
    collectStringValues(child, keys, output);
  }
}

export function parseJsonCandidates(stdout: string): string[] {
  const values: string[] = [];
  const keys = new Set(["file", "filepath", "file_path", "path", "absolute_path", "document", "doc", "uri"]);

  const trimmed = stdout.trim();
  if (!trimmed) return values;

  try {
    collectStringValues(JSON.parse(trimmed), keys, values);
  } catch {
    for (const line of trimmed.split("\n")) {
      const candidate = line.trim();
      if (!candidate || (!candidate.startsWith("{") && !candidate.startsWith("["))) continue;
      try { collectStringValues(JSON.parse(candidate), keys, values); } catch {}
    }
  }

  return values;
}

export function parseTextCandidatePaths(stdout: string): string[] {
  const paths: string[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim().replace(/^\u001b\[[0-9;]*m/g, "");
    if (!trimmed) continue;
    const match = trimmed.match(/(?:^|\s)(\.?\.?[/\\][^:\s]+|[A-Za-z]:\\[^:\s]+|[^:\s]+\.(?:md|mdx|txt|json|yaml|yml|ts|tsx|js|jsx|py|sh|ps1|go|rs))(?:[:\s]|$)/i);
    if (match?.[1]) paths.push(match[1]);
  }
  return paths;
}

function normalizeCandidatePath(candidate: string, root: ResolvedSkillRoot): string {
  const withoutUri = candidate.replace(/^file:\/\//i, "");
  if (path.isAbsolute(withoutUri) || /^[A-Za-z]:[\\/]/.test(withoutUri)) return withoutUri;
  const targetPath = withoutUri.replace(/^\.\//, "");
  return root.environment === "windows"
    ? path.win32.normalize(path.win32.join(root.resolvedPath, targetPath))
    : path.posix.normalize(path.posix.join(root.resolvedPath, targetPath.replace(/\\/g, "/")));
}

export async function resolveCandidatePaths(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  paths: string[],
  limit: number,
  signal?: AbortSignal,
): Promise<SkillInfo[]> {
  const seen = new Set<string>();
  const skills: SkillInfo[] = [];

  for (const candidate of paths) {
    checkAbort(signal);
    for (const root of roots) {
      const normalized = normalizeCandidatePath(candidate, root);
      const skill = await resolveSkillByName(roots, registry, normalized, signal).catch(() => null);
      if (!skill) continue;
      const key = `${skill.environment}:${skill.resolvedDirectoryPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
      if (skills.length >= limit) return skills;
    }
  }

  return skills;
}
