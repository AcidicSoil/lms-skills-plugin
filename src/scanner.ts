import * as path from "path";
import {
  SKILL_ENTRY_POINT,
  MAX_DIRECTORY_DEPTH,
} from "./constants";
import { parseDisplayPath } from "./pathResolver";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeAdapter } from "./runtime/types";
import type { SkillInfo } from "./types";
import { checkAbort, isAbortError } from "./abort";
import { buildSkillInfoFromDirectory } from "./scanner/skillInfo";
import { searchSkillSet, type SkillSearchResult } from "./scanner/search";
import { joinForTarget, normalizeForTarget, isInsideTarget, hasPathSeparator } from "./scanner/paths";
export { searchSkillSet };
export type { SkillSearchResult };
export { readSkillFile, readAbsolutePath, readFileWithinRoots, writeFileWithinRoots, editFileWithinRoots } from "./scanner/fileAccess";
export { listSkillDirectory, listAbsoluteDirectory } from "./scanner/directoryListing";

async function scanSkillsRoot(
  root: ResolvedSkillRoot,
  registry: RuntimeRegistry,
  signal?: AbortSignal,
  limit?: number,
): Promise<SkillInfo[]> {
  const runtime = registry.getRuntime(root.environment);

  async function visitDirectory(
    dir: string,
    fallbackName: string,
    depth: number,
    skills: SkillInfo[],
  ): Promise<void> {
    checkAbort(signal);
    if (limit !== undefined && skills.length >= limit) return;
    if (depth > MAX_DIRECTORY_DEPTH) return;

    const skill = await buildSkillInfoFromDirectory(
      root,
      runtime,
      dir,
      fallbackName,
      signal,
    );
    if (skill) {
      skills.push(skill);
      return;
    }

    let entries;
    try {
      entries = await runtime.readDir(dir, signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
      return;
    }

    for (const entry of entries) {
      checkAbort(signal);
      if (limit !== undefined && skills.length >= limit) break;
      if (entry.type !== "directory") continue;

      const childDir = joinForTarget(root.environment, dir, entry.name);
      await visitDirectory(childDir, entry.name, depth + 1, skills);
    }
  }

  try {
    checkAbort(signal);
    if (!(await runtime.exists(root.resolvedPath, signal))) return [];

    const skills: SkillInfo[] = [];
    await visitDirectory(root.resolvedPath, path.basename(root.resolvedPath), 0, skills);
    return skills;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}

export async function scanSkills(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
  limit?: number,
): Promise<SkillInfo[]> {
  const seen = new Set<string>();
  const merged: SkillInfo[] = [];

  for (const root of roots) {
    checkAbort(signal);
    const remaining = limit === undefined ? undefined : Math.max(limit - merged.length, 0);
    if (remaining === 0) break;
    for (const skill of await scanSkillsRoot(root, registry, signal, remaining)) {
      const key = `${skill.environment}:${normalizeForTarget(skill.environment, skill.resolvedDirectoryPath)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(skill);
        if (limit !== undefined && merged.length >= limit) break;
      }
    }
  }

  return merged.sort((a, b) =>
    a.name === b.name
      ? a.environment.localeCompare(b.environment)
      : a.name.localeCompare(b.name),
  );
}

export async function searchSkills(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  signal?: AbortSignal,
): Promise<SkillSearchResult[]> {
  const allSkills = await scanSkills(roots, registry, signal);
  return searchSkillSet(allSkills, query, signal);
}

async function resolveSkillByDisplayOrAbsolutePath(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  skillName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  const display = parseDisplayPath(skillName);
  const candidateRoots = display.environment
    ? roots.filter((r) => r.environment === display.environment)
    : roots;

  for (const root of candidateRoots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const resolved = await runtime.expandPath(display.path, signal);
    if (!isInsideTarget(root.environment, resolved, root.resolvedPath)) continue;

    const stat = await runtime.stat(resolved, signal).catch(() => null);
    if (!stat) continue;

    const skillDir = stat.isDirectory
      ? resolved
      : path.basename(resolved) === SKILL_ENTRY_POINT
        ? (root.environment === "windows"
            ? path.win32.dirname(resolved)
            : path.posix.dirname(resolved))
        : null;
    if (!skillDir) continue;

    const fallbackName =
      root.environment === "windows"
        ? path.win32.basename(skillDir)
        : path.posix.basename(skillDir);
    const skill = await buildSkillInfoFromDirectory(
      root,
      runtime,
      skillDir,
      fallbackName,
      signal,
    );
    if (skill) return skill;
  }

  return null;
}

async function resolveSkillByRootRelativePath(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  skillName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  const requested = skillName.trim();
  if (!requested || !hasPathSeparator(requested)) return null;
  if (parseDisplayPath(requested).environment || path.isAbsolute(requested)) return null;

  for (const root of roots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const normalizedRequested = normalizeForTarget(root.environment, requested);
    const requestedDir = normalizedRequested.endsWith(`/${SKILL_ENTRY_POINT.toLowerCase()}`) || normalizedRequested.endsWith(`\\${SKILL_ENTRY_POINT.toLowerCase()}`)
      ? (root.environment === "windows"
          ? path.win32.dirname(requested)
          : path.posix.dirname(requested))
      : requested;
    const resolved = joinForTarget(root.environment, root.resolvedPath, requestedDir);
    if (!isInsideTarget(root.environment, resolved, root.resolvedPath)) continue;
    const fallbackName = root.environment === "windows"
      ? path.win32.basename(resolved)
      : path.posix.basename(resolved);
    const skill = await buildSkillInfoFromDirectory(
      root,
      runtime,
      resolved,
      fallbackName,
      signal,
    ).catch((error) => {
      if (isAbortError(error)) throw error;
      return null;
    });
    if (skill) return skill;
  }
  return null;
}

async function resolveSkillByDirectoryName(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  skillName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  const requested = skillName.trim();
  if (!requested || hasPathSeparator(requested)) return null;

  for (const root of roots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const exactDir = joinForTarget(root.environment, root.resolvedPath, requested);
    const exact = await buildSkillInfoFromDirectory(
      root,
      runtime,
      exactDir,
      requested,
      signal,
    ).catch((error) => {
      if (isAbortError(error)) throw error;
      return null;
    });
    if (exact) return exact;
  }

  const lower = requested.toLowerCase();

  async function findNestedDirectoryMatch(
    root: ResolvedSkillRoot,
    runtime: RuntimeAdapter,
    dir: string,
    depth: number,
  ): Promise<SkillInfo | null> {
    checkAbort(signal);
    if (depth > MAX_DIRECTORY_DEPTH) return null;

    const entries = await runtime.readDir(dir, signal).catch((error) => {
      if (isAbortError(error)) throw error;
      return [];
    });

    for (const entry of entries) {
      checkAbort(signal);
      if (entry.type !== "directory") continue;
      if (entry.name.toLowerCase() !== lower) continue;

      const skillDir = joinForTarget(root.environment, dir, entry.name);
      const skill = await buildSkillInfoFromDirectory(
        root,
        runtime,
        skillDir,
        entry.name,
        signal,
      );
      if (skill) return skill;
    }

    if (depth >= MAX_DIRECTORY_DEPTH) return null;

    for (const entry of entries) {
      checkAbort(signal);
      if (entry.type !== "directory") continue;
      const childDir = joinForTarget(root.environment, dir, entry.name);
      const nested = await findNestedDirectoryMatch(root, runtime, childDir, depth + 1);
      if (nested) return nested;
    }

    return null;
  }

  for (const root of roots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const nested = await findNestedDirectoryMatch(root, runtime, root.resolvedPath, 0);
    if (nested) return nested;
  }

  return null;
}

export async function resolveSkillByName(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  skillName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  const lower = skillName.toLowerCase().trim();
  const display = parseDisplayPath(skillName);

  if (display.environment || path.isAbsolute(skillName)) {
    const directPath = await resolveSkillByDisplayOrAbsolutePath(
      roots,
      registry,
      skillName,
      signal,
    );
    if (directPath) return directPath;
  }

  const rootRelativePath = await resolveSkillByRootRelativePath(
    roots,
    registry,
    skillName,
    signal,
  );
  if (rootRelativePath) return rootRelativePath;

  const directDirectory = await resolveSkillByDirectoryName(
    roots,
    registry,
    skillName,
    signal,
  );
  if (directDirectory) return directDirectory;

  const skills = await scanSkills(roots, registry, signal);
  return (
    skills.find(
      (s) =>
        s.name.toLowerCase() === lower ||
        path.basename(s.resolvedDirectoryPath).toLowerCase() === lower,
    ) ?? null
  );
}


