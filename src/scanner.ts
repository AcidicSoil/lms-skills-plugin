import * as path from "path";
import {
  SKILL_ENTRY_POINT,
  SKILL_MANIFEST_FILE,
  MAX_FILE_SIZE_BYTES,
  MAX_DIRECTORY_DEPTH,
  MAX_DIRECTORY_ENTRIES,
} from "./constants";
import { parseDisplayPath, formatDisplayPath } from "./pathResolver";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeAdapter } from "./runtime/types";
import type { SkillInfo, SkillManifestFile, SkillFrontmatter, DirectoryEntry } from "./types";
import type { RuntimeTargetName } from "./environment";
import { checkAbort, isAbortError } from "./abort";
import { parseSkillMarkdown, combineDescription, extractDescription, extractBodyExcerpt } from "./scanner/markdown";
import { searchSkillSet, type SkillSearchResult } from "./scanner/search";
import { joinForTarget, normalizeForTarget, isInsideTarget, hasPathSeparator, relativeForTarget } from "./scanner/paths";
export { searchSkillSet };
export type { SkillSearchResult };

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

async function buildSkillInfoFromDirectory(
  root: ResolvedSkillRoot,
  runtime: RuntimeAdapter,
  skillDir: string,
  fallbackName: string,
  signal?: AbortSignal,
): Promise<SkillInfo | null> {
  checkAbort(signal);
  const skillMdPath = joinForTarget(root.environment, skillDir, SKILL_ENTRY_POINT);

  if (!(await runtime.exists(skillMdPath, signal))) return null;

  const manifest = await loadManifest(runtime, skillDir, signal);
  const skillMdContent = await readFileSafe(runtime, skillMdPath, signal);
  const parsedSkillMd = skillMdContent
    ? parseSkillMarkdown(skillMdContent)
    : { frontmatter: null, markdown: "" };
  const frontmatter = parsedSkillMd.frontmatter;
  const markdownContent = parsedSkillMd.markdown;

  const frontmatterDescription = combineDescription(
    frontmatter?.description,
    frontmatter?.whenToUse,
  );
  const markdownDescription = markdownContent
    ? extractDescription(markdownContent)
    : "No description available.";
  const description = frontmatterDescription ?? manifest?.description ?? markdownDescription;
  const bodyExcerpt = markdownContent ? extractBodyExcerpt(markdownContent) : "";
  const manifestTags = Array.isArray(manifest?.tags)
    ? manifest.tags.filter((t): t is string => typeof t === "string")
    : [];
  const frontmatterTags = Array.isArray(frontmatter?.tags) ? frontmatter.tags : [];
  const tags = frontmatterTags.length > 0 ? frontmatterTags : manifestTags;
  const metadataSource = frontmatterDescription || frontmatter?.name
    ? "frontmatter"
    : manifest?.description || manifest?.name
      ? "skill.json"
      : markdownDescription !== "No description available."
        ? "markdown"
        : "fallback";

  const displayPath = formatDisplayPath(root.environment, skillMdPath);
  return {
    name: frontmatter?.name ?? manifest?.name ?? fallbackName,
    description,
    bodyExcerpt,
    tags,
    frontmatter: frontmatter ?? undefined,
    metadataSource,
    disableModelInvocation: frontmatter?.disableModelInvocation ?? false,
    userInvocable: frontmatter?.userInvocable ?? true,
    skillMdPath: displayPath,
    directoryPath: formatDisplayPath(root.environment, skillDir),
    resolvedSkillMdPath: skillMdPath,
    resolvedDirectoryPath: skillDir,
    displayPath,
    environment: root.environment,
    environmentLabel: root.environmentLabel,
    hasExtraFiles: await hasExtraFiles(runtime, skillDir, signal),
  };
}

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
  const returnedContent = targetRel === SKILL_ENTRY_POINT
    ? parseSkillMarkdown(content).markdown
    : content;

  return {
    content: returnedContent,
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
    const returnedContent = (root.environment === "windows"
      ? path.win32.basename(resolved)
      : path.posix.basename(resolved)) === SKILL_ENTRY_POINT
        ? parseSkillMarkdown(content).markdown
        : content;
    return {
      content: returnedContent,
      resolvedPath: resolved,
      displayPath: formatDisplayPath(root.environment, resolved),
      environment: root.environment,
    };
  }

  return { error: "Path is outside the configured skills directories or does not exist." };
}

export async function readFileWithinRoots(
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
      sizeBytes: number;
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
      return { error: `"${resolved}" is a directory. Use list_skill_files or list_skill_roots to explore directories.` };
    }
    const content = await readFileSafe(runtime, resolved, signal);
    if (content === null) return { error: `Unable to read file: ${resolved}` };
    return {
      content,
      resolvedPath: resolved,
      displayPath: formatDisplayPath(root.environment, resolved),
      environment: root.environment,
      sizeBytes: stat.sizeBytes,
    };
  }

  return { error: "Path is outside the configured skills directories or does not exist." };
}

export async function writeFileWithinRoots(
  absolutePath: string,
  content: string,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  options: { overwrite?: boolean } = {},
  signal?: AbortSignal,
): Promise<
  | {
      resolvedPath: string;
      displayPath: string;
      environment: RuntimeTargetName;
      bytesWritten: number;
      created: boolean;
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

    const exists = await runtime.exists(resolved, signal);
    if (exists) {
      const stat = await runtime.stat(resolved, signal);
      if (stat.isDirectory) return { error: `"${resolved}" is a directory.` };
      if (!options.overwrite) return { error: `File already exists: ${resolved}. Set overwrite=true to replace it.` };
    }

    await runtime.writeFile(resolved, content, signal);
    return {
      resolvedPath: resolved,
      displayPath: formatDisplayPath(root.environment, resolved),
      environment: root.environment,
      bytesWritten: Buffer.byteLength(content, "utf-8"),
      created: !exists,
    };
  }

  return { error: "Path is outside the configured skills directories." };
}

export async function editFileWithinRoots(
  absolutePath: string,
  oldText: string,
  newText: string,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  options: { expectedReplacements?: number } = {},
  signal?: AbortSignal,
): Promise<
  | {
      resolvedPath: string;
      displayPath: string;
      environment: RuntimeTargetName;
      replacements: number;
      bytesWritten: number;
    }
  | { error: string }
> {
  const read = await readFileWithinRoots(absolutePath, roots, registry, signal);
  if ("error" in read) return read;

  const parts = read.content.split(oldText);
  const replacements = parts.length - 1;
  if (replacements === 0) return { error: "old_text was not found in the target file." };
  if (options.expectedReplacements !== undefined && replacements !== options.expectedReplacements) {
    return {
      error: `Expected ${options.expectedReplacements} replacement(s), but found ${replacements}. Refusing to edit ambiguously.`,
    };
  }

  const write = await writeFileWithinRoots(
    read.displayPath,
    parts.join(newText),
    roots,
    registry,
    { overwrite: true },
    signal,
  );
  if ("error" in write) return write;
  return {
    resolvedPath: write.resolvedPath,
    displayPath: write.displayPath,
    environment: write.environment,
    replacements,
    bytesWritten: write.bytesWritten,
  };
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
