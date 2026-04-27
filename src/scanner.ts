import * as path from "path";
import {
  SKILL_ENTRY_POINT,
  SKILL_MANIFEST_FILE,
  MAX_FILE_SIZE_BYTES,
  MAX_DESCRIPTION_CHARS,
  BODY_EXCERPT_CHARS,
  MAX_DIRECTORY_DEPTH,
  MAX_DIRECTORY_ENTRIES,
} from "./constants";
import { parseDisplayPath, formatDisplayPath } from "./pathResolver";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeAdapter } from "./runtime/types";
import type { SkillInfo, SkillManifestFile, DirectoryEntry } from "./types";
import type { RuntimeTargetName } from "./environment";
import { checkAbort, isAbortError } from "./abort";

async function readFileSafe(
  runtime: RuntimeAdapter,
  filePath: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    checkAbort(signal);
    const stat = await runtime.stat(filePath, signal);
    if (stat.size <= MAX_FILE_SIZE_BYTES) {
      return runtime.readFile(filePath, signal);
    }

    checkAbort(signal);
    const content = await runtime.readFile(filePath, signal);
    checkAbort(signal);
    const buf = Buffer.from(content, "utf-8");
    const headBytes = Math.floor(MAX_FILE_SIZE_BYTES * 0.8);
    const tailBytes = MAX_FILE_SIZE_BYTES - headBytes;
    const head = buf.slice(0, headBytes).toString("utf-8").replace(/\uFFFD.*$/, "");
    const tail = buf.slice(buf.length - tailBytes).toString("utf-8").replace(/^.*?\uFFFD/, "");
    const omitted = Math.round((stat.size - MAX_FILE_SIZE_BYTES) / 1024);
    return `${head}\n\n[... ${omitted}KB omitted - middle of file truncated ...]\n\n${tail}`;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

function extractDescription(content: string): string {
  const lines = content.split("\n");
  const collected: string[] = [];
  let passedH1 = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (collected.length > 0) break;
      continue;
    }
    if (trimmed.startsWith("# ") && !passedH1) {
      passedH1 = true;
      continue;
    }
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("```") ||
      trimmed.startsWith("<!--")
    ) {
      if (collected.length > 0) break;
      continue;
    }
    collected.push(trimmed);
    if (collected.join(" ").length >= MAX_DESCRIPTION_CHARS) break;
  }

  return (
    collected.join(" ").trim().slice(0, MAX_DESCRIPTION_CHARS) ||
    "No description available."
  );
}

function extractBodyExcerpt(content: string): string {
  const lines = content.split("\n");
  const collected: string[] = [];
  let passedH1 = false;
  let passedDescription = false;
  let inCodeFence = false;
  let descriptionDone = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (!passedH1) {
      if (trimmed.startsWith("# ")) passedH1 = true;
      continue;
    }

    if (!descriptionDone) {
      if (!passedDescription) {
        if (trimmed && !trimmed.startsWith("#")) {
          passedDescription = true;
          continue;
        }
        continue;
      }
      if (!trimmed) {
        descriptionDone = true;
        continue;
      }
      continue;
    }

    if (!trimmed) continue;

    const stripped = trimmed
      .replace(/^#{1,6}\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    if (!stripped) continue;

    collected.push(stripped);
    if (collected.join(" ").length >= BODY_EXCERPT_CHARS) break;
  }

  return collected.join(" ").trim().slice(0, BODY_EXCERPT_CHARS);
}

async function loadManifest(
  runtime: RuntimeAdapter,
  skillDir: string,
  signal?: AbortSignal,
): Promise<SkillManifestFile | null> {
  const manifestPath = path.posix.join(skillDir, SKILL_MANIFEST_FILE);
  try {
    checkAbort(signal);
    if (!(await runtime.exists(manifestPath, signal))) return null;
    checkAbort(signal);
    return JSON.parse(await runtime.readFile(manifestPath, signal)) as SkillManifestFile;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

async function hasExtraFiles(
  runtime: RuntimeAdapter,
  skillDir: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    checkAbort(signal);
    const entries = await runtime.readDir(skillDir, signal);
    checkAbort(signal);
    return entries.some(
      (e) => e.name !== SKILL_ENTRY_POINT && e.name !== SKILL_MANIFEST_FILE,
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    return false;
  }
}

function joinForTarget(target: RuntimeTargetName, base: string, child: string): string {
  return target === "windows"
    ? path.win32.join(base, child)
    : path.posix.join(base, child);
}

function relativeForTarget(
  target: RuntimeTargetName,
  from: string,
  to: string,
): string {
  return target === "windows"
    ? path.win32.relative(from, to)
    : path.posix.relative(from, to);
}

function normalizeForTarget(target: RuntimeTargetName, value: string): string {
  return target === "windows"
    ? path.win32.normalize(value).toLowerCase()
    : path.posix.normalize(value);
}

function isInsideTarget(
  target: RuntimeTargetName,
  child: string,
  parent: string,
): boolean {
  const rel = relativeForTarget(target, parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function scanSkillsRoot(
  root: ResolvedSkillRoot,
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<SkillInfo[]> {
  const runtime = registry.getRuntime(root.environment);
  try {
    checkAbort(signal);
    if (!(await runtime.exists(root.resolvedPath, signal))) return [];

    const skills: SkillInfo[] = [];
    const entries = await runtime.readDir(root.resolvedPath, signal);

    for (const entry of entries) {
      checkAbort(signal);
      if (entry.type !== "directory") continue;

      const skillDir = joinForTarget(root.environment, root.resolvedPath, entry.name);
      const skillMdPath = joinForTarget(root.environment, skillDir, SKILL_ENTRY_POINT);

      if (!(await runtime.exists(skillMdPath, signal))) continue;

      const manifest = await loadManifest(runtime, skillDir, signal);
      const skillMdContent = await readFileSafe(runtime, skillMdPath, signal);

      const description =
        manifest?.description ??
        (skillMdContent
          ? extractDescription(skillMdContent)
          : "No description available.");
      const bodyExcerpt = skillMdContent
        ? extractBodyExcerpt(skillMdContent)
        : "";
      const tags = Array.isArray(manifest?.tags)
        ? manifest.tags.filter((t): t is string => typeof t === "string")
        : [];

      const displayPath = formatDisplayPath(root.environment, skillMdPath);
      skills.push({
        name: manifest?.name ?? entry.name,
        description,
        bodyExcerpt,
        tags,
        skillMdPath: displayPath,
        directoryPath: formatDisplayPath(root.environment, skillDir),
        resolvedSkillMdPath: skillMdPath,
        resolvedDirectoryPath: skillDir,
        displayPath,
        environment: root.environment,
        environmentLabel: root.environmentLabel,
        hasExtraFiles: await hasExtraFiles(runtime, skillDir, signal),
      });
    }

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
): Promise<SkillInfo[]> {
  const seen = new Set<string>();
  const merged: SkillInfo[] = [];

  for (const root of roots) {
    checkAbort(signal);
    for (const skill of await scanSkillsRoot(root, registry, signal)) {
      const key = `${skill.environment}:${normalizeForTarget(skill.environment, skill.resolvedDirectoryPath)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(skill);
      }
    }
  }

  return merged.sort((a, b) =>
    a.name === b.name
      ? a.environment.localeCompare(b.environment)
      : a.name.localeCompare(b.name),
  );
}

export interface SkillSearchResult {
  skill: SkillInfo;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_/\\.,;:()\[\]{}|]+/)
    .filter((t) => t.length > 0);
}

function computeIdf(skills: SkillInfo[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  const N = skills.length;

  for (const skill of skills) {
    const allTokens = new Set([
      ...tokenize(skill.name),
      ...tokenize(skill.description),
      ...tokenize(skill.bodyExcerpt),
      ...skill.tags.flatMap((t) => tokenize(t)),
    ]);
    for (const token of allTokens) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, df] of docFreq) {
    idf.set(token, Math.log((N + 1) / (df + 1)) + 1);
  }

  return idf;
}

function scoreToken(token: string, candidate: string): number {
  if (candidate === token) return 1.0;
  if (candidate.startsWith(token) && token.length >= 3) return 0.6;
  if (candidate.includes(token) && token.length >= 4) return 0.3;
  return 0;
}

function scoreField(
  queryTokens: string[],
  fieldTokens: string[],
  idf: Map<string, number>,
): number {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;

  let weightedTotal = 0;
  let weightSum = 0;

  for (const qt of queryTokens) {
    const weight = idf.get(qt) ?? 1.0;
    let best = 0;
    for (const ft of fieldTokens) {
      best = Math.max(best, scoreToken(qt, ft));
    }
    weightedTotal += best * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;

  const coverage = weightedTotal / weightSum;
  const density = Math.min(weightedTotal / fieldTokens.length, 1.0);
  return coverage * 0.7 + density * 0.3;
}

export async function searchSkills(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  signal?: AbortSignal,
): Promise<SkillSearchResult[]> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryLower = query.toLowerCase().trim();
  const allSkills = await scanSkills(roots, registry, signal);
  const idf = computeIdf(allSkills);
  const results: SkillSearchResult[] = [];

  for (const skill of allSkills) {
    checkAbort(signal);
    const nameLower = skill.name.toLowerCase();

    if (nameLower === queryLower) {
      results.push({ skill, score: 10.0 });
      continue;
    }

    const nameTokens = tokenize(skill.name);
    const descTokens = tokenize(skill.description);
    const bodyTokens = tokenize(skill.bodyExcerpt);

    const nameScore = scoreField(queryTokens, nameTokens, idf);
    const descScore = scoreField(queryTokens, descTokens, idf);
    const bodyScore = scoreField(queryTokens, bodyTokens, idf);

    const phraseNameBonus = nameLower.includes(queryLower) ? 0.4 : 0;
    const phraseDescBonus = skill.description.toLowerCase().includes(queryLower)
      ? 0.2
      : 0;

    let tagScore = 0;
    for (const tag of skill.tags) {
      const tagLower = tag.toLowerCase();
      if (tagLower === queryLower) {
        tagScore = Math.max(tagScore, 1.0);
      } else if (
        tagLower.includes(queryLower) ||
        queryLower.includes(tagLower)
      ) {
        tagScore = Math.max(tagScore, 0.6);
      } else {
        tagScore = Math.max(
          tagScore,
          scoreField(queryTokens, tokenize(tag), idf),
        );
      }
    }

    const score =
      nameScore * 3.0 +
      tagScore * 2.5 +
      descScore * 1.5 +
      bodyScore * 0.8 +
      phraseNameBonus +
      phraseDescBonus;

    if (score > 0.15) {
      results.push({ skill, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export async function resolveSkillByName(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  skillName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  const lower = skillName.toLowerCase().trim();
  const display = parseDisplayPath(skillName);
  const skills = await scanSkills(roots, registry, signal);

  if (display.environment) {
    return (
      skills.find(
        (s) =>
          s.environment === display.environment &&
          (s.resolvedSkillMdPath === display.path ||
            s.resolvedDirectoryPath === display.path ||
            s.displayPath === skillName ||
            s.directoryPath === skillName),
      ) ?? null
    );
  }

  return (
    skills.find(
      (s) =>
        s.name.toLowerCase() === lower ||
        path.basename(s.resolvedDirectoryPath).toLowerCase() === lower,
    ) ?? null
  );
}

export async function readSkillFile(
  skill: SkillInfo,
  relativeFilePath: string | undefined,
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<{ content: string; resolvedPath: string; displayPath: string } | { error: string }> {
  checkAbort(signal);
  const runtime = registry.getRuntime(skill.environment);
  const targetRel = relativeFilePath?.trim() || SKILL_ENTRY_POINT;
  const resolved = joinForTarget(
    skill.environment,
    skill.resolvedDirectoryPath,
    targetRel,
  );

  if (!isInsideTarget(skill.environment, resolved, skill.resolvedDirectoryPath)) {
    return { error: "Path traversal outside skill directory is not allowed." };
  }
  if (!(await runtime.exists(resolved, signal))) {
    return {
      error: `File not found: ${targetRel}. Use \`list_skill_files\` to see available files.`,
    };
  }

  const stat = await runtime.stat(resolved, signal);
  if (stat.isDirectory) {
    return {
      error: `"${targetRel}" is a directory. Use \`list_skill_files\` to explore it.`,
    };
  }

  const content = await readFileSafe(runtime, resolved, signal);
  if (content === null) return { error: `Unable to read file: ${targetRel}` };

  return {
    content,
    resolvedPath: resolved,
    displayPath: formatDisplayPath(skill.environment, resolved),
  };
}

export async function readAbsolutePath(
  absolutePath: string,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
): Promise<
  | {
      content: string;
      resolvedPath: string;
      displayPath: string;
      environment: RuntimeTargetName;
    }
  | { error: string }
> {
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
    if (stat.isDirectory) {
      return {
        error: `"${resolved}" is a directory. Use \`list_skill_files\` to explore it.`,
      };
    }
    const content = await readFileSafe(runtime, resolved, signal);
    if (content === null) return { error: `Unable to read file: ${resolved}` };
    return {
      content,
      resolvedPath: resolved,
      displayPath: formatDisplayPath(root.environment, resolved),
      environment: root.environment,
    };
  }

  return { error: "Path is outside the configured skills directories or does not exist." };
}

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
