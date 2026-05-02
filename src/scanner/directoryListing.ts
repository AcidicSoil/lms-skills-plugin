import { MAX_DIRECTORY_DEPTH, MAX_DIRECTORY_ENTRIES } from "../constants";
import { parseDisplayPath, formatDisplayPath } from "../pathResolver";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { RuntimeRegistry } from "../runtime";
import type { RuntimeAdapter } from "../runtime/types";
import type { RuntimeTargetName } from "../environment";
import type { DirectoryEntry, SkillInfo } from "../types";
import { checkAbort } from "../abort";
import { joinForTarget, isInsideTarget, relativeForTarget } from "./paths";


export async function listSkillDirectory(
  skill: SkillInfo,
  relativeSubPath: string | undefined,
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<DirectoryEntry[]> {
  checkAbort(signal);
  const base = relativeSubPath
    ? joinForTarget(skill.environment, skill.resolvedDirectoryPath, relativeSubPath.trim())
    : skill.resolvedDirectoryPath;

  if (!isInsideTarget(skill.environment, base, skill.resolvedDirectoryPath)) return [];

  return walkDirectory(skill.environment, registry.getRuntime(skill.environment), base, skill.resolvedDirectoryPath, 0, signal);
}

export async function listAbsoluteDirectory(
  absolutePath: string,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<DirectoryEntry[]> {
  const parsed = parseDisplayPath(absolutePath);
  const candidateRoots = parsed.environment
    ? roots.filter((r) => r.environment === parsed.environment)
    : roots;

  for (const root of candidateRoots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const resolved = await runtime.expandPath(parsed.path, signal);
    if (!isInsideTarget(root.environment, resolved, root.resolvedPath)) continue;
    if (!(await runtime.exists(resolved, signal))) continue;
    const stat = await runtime.stat(resolved, signal);
    if (!stat.isDirectory) continue;
    return walkDirectory(root.environment, runtime, resolved, resolved, 0, signal);
  }
  return [];
}

async function walkDirectory(
  environment: RuntimeTargetName,
  runtime: RuntimeAdapter,
  dir: string,
  rootDir: string,
  depth: number,
  signal?: AbortSignal,
): Promise<DirectoryEntry[]> {
  checkAbort(signal);
  if (depth > MAX_DIRECTORY_DEPTH) return [];

  let dirEntries;
  try {
    dirEntries = await runtime.readDir(dir, signal);
  } catch {
    return [];
  }

  const entries: DirectoryEntry[] = [];

  for (const entry of dirEntries) {
    checkAbort(signal);
    if (entries.length >= MAX_DIRECTORY_ENTRIES) break;

    const fullPath = joinForTarget(environment, dir, entry.name);
    const relativePath = relativeForTarget(environment, rootDir, fullPath);

    if (entry.type === "directory") {
      entries.push({
        name: entry.name,
        relativePath,
        type: "directory",
        environment,
        displayPath: formatDisplayPath(environment, fullPath),
      });
      if (depth < MAX_DIRECTORY_DEPTH) {
        entries.push(
          ...(await walkDirectory(environment, runtime, fullPath, rootDir, depth + 1, signal)),
        );
      }
    } else if (entry.type === "file") {
      entries.push({
        name: entry.name,
        relativePath,
        type: "file",
        ...(entry.sizeBytes !== undefined ? { sizeBytes: entry.sizeBytes } : {}),
        environment,
        displayPath: formatDisplayPath(environment, fullPath),
      });
    }
  }

  return entries;
}
