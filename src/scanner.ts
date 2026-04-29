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
import type { SkillInfo, SkillManifestFile, SkillFrontmatter, DirectoryEntry } from "./types";
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


interface ParsedSkillMarkdown {
  frontmatter: SkillFrontmatter | null;
  markdown: string;
}

function unquoteYamlValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return trimmed;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (/^(true|yes|on)$/i.test(value.trim())) return true;
  if (/^(false|no|off)$/i.test(value.trim())) return false;
  return undefined;
}

function parseStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((v) => unquoteYamlValue(v).trim())
      .filter(Boolean);
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function normalizeFrontmatterKey(key: string): keyof SkillFrontmatter | null {
  switch (key.trim().toLowerCase().replace(/_/g, "-")) {
    case "name":
      return "name";
    case "description":
      return "description";
    case "when-to-use":
    case "when-to_use":
      return "whenToUse";
    case "tags":
      return "tags";
    case "disable-model-invocation":
      return "disableModelInvocation";
    case "user-invocable":
      return "userInvocable";
    case "allowed-tools":
      return "allowedTools";
    case "context":
      return "context";
    case "agent":
      return "agent";
    case "model":
      return "model";
    case "effort":
      return "effort";
    case "argument-hint":
      return "argumentHint";
    case "arguments":
      return "arguments";
    case "license":
      return "license";
    case "compatibility":
      return "compatibility";
    case "metadata":
      return "metadata";
    case "paths":
      return "paths";
    case "hooks":
      return "hooks";
    case "shell":
      return "shell";
    default:
      return null;
  }
}

function assignFrontmatterValue(
  frontmatter: SkillFrontmatter,
  key: string,
  rawValue: unknown,
): void {
  const normalizedKey = normalizeFrontmatterKey(key);
  if (!normalizedKey) return;

  if (normalizedKey === "disableModelInvocation" || normalizedKey === "userInvocable") {
    const parsed = parseBoolean(rawValue);
    if (parsed !== undefined) {
      (frontmatter as Record<string, unknown>)[normalizedKey] = parsed;
    }
    return;
  }

  if (normalizedKey === "tags" || normalizedKey === "allowedTools" || normalizedKey === "arguments" || normalizedKey === "paths") {
    const parsed = parseStringList(rawValue);
    if (parsed) {
      (frontmatter as Record<string, unknown>)[normalizedKey] = parsed;
    }
    return;
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    (frontmatter as Record<string, unknown>)[normalizedKey] = rawValue.trim();
  }
}

function parseFrontmatterYaml(yaml: string): SkillFrontmatter | null {
  const frontmatter: SkillFrontmatter = {};
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, rest] = match;
    const value = rest.trim();

    if (value === "|" || value === ">") {
      const blockLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (/^[A-Za-z0-9_-]+:\s*/.test(next)) break;
        blockLines.push(next.replace(/^\s{2,}/, ""));
        j += 1;
      }
      assignFrontmatterValue(
        frontmatter,
        key,
        value === ">" ? blockLines.join(" ").replace(/\s+/g, " ") : blockLines.join("\n"),
      );
      i = j - 1;
      continue;
    }

    if (!value) {
      const listItems: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const item = lines[j].trim().match(/^-\s+(.+)$/);
        if (!item) break;
        listItems.push(unquoteYamlValue(item[1]));
        j += 1;
      }
      if (listItems.length > 0) {
        assignFrontmatterValue(frontmatter, key, listItems);
        i = j - 1;
        continue;
      }
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      assignFrontmatterValue(frontmatter, key, value);
    } else {
      assignFrontmatterValue(frontmatter, key, unquoteYamlValue(value));
    }
  }

  return Object.keys(frontmatter).length > 0 ? frontmatter : null;
}

function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: null, markdown: content };
  }

  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) {
    return { frontmatter: null, markdown: content };
  }

  const yaml = normalized.slice(4, closing);
  const markdown = normalized.slice(closing + "\n---\n".length);
  return { frontmatter: parseFrontmatterYaml(yaml), markdown };
}

function combineDescription(description?: string, whenToUse?: string): string | undefined {
  const parts = [description, whenToUse]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) return undefined;
  return parts.join(" ").replace(/\s+/g, " ").slice(0, MAX_DESCRIPTION_CHARS);
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
  try {
    checkAbort(signal);
    if (!(await runtime.exists(root.resolvedPath, signal))) return [];

    const skills: SkillInfo[] = [];
    const entries = await runtime.readDir(root.resolvedPath, signal);

    for (const entry of entries) {
      checkAbort(signal);
      if (limit !== undefined && skills.length >= limit) break;
      if (entry.type !== "directory") continue;

      const skillDir = joinForTarget(root.environment, root.resolvedPath, entry.name);
      const skill = await buildSkillInfoFromDirectory(
        root,
        runtime,
        skillDir,
        entry.name,
        signal,
      );
      if (skill) skills.push(skill);
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

function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\");
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
  for (const root of roots) {
    checkAbort(signal);
    const runtime = registry.getRuntime(root.environment);
    const entries = await runtime.readDir(root.resolvedPath, signal).catch((error) => {
      if (isAbortError(error)) throw error;
      return [];
    });

    const match = entries.find(
      (entry) => entry.type === "directory" && entry.name.toLowerCase() === lower,
    );
    if (!match) continue;

    const skillDir = joinForTarget(root.environment, root.resolvedPath, match.name);
    const skill = await buildSkillInfoFromDirectory(
      root,
      runtime,
      skillDir,
      match.name,
      signal,
    );
    if (skill) return skill;
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

  if (display.environment || hasPathSeparator(display.path) || path.isAbsolute(skillName)) {
    const directPath = await resolveSkillByDisplayOrAbsolutePath(
      roots,
      registry,
      skillName,
      signal,
    );
    if (directPath) return directPath;
  }

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
