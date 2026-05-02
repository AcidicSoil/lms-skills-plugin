import * as path from "path";
import { resolveSkillByName } from "./scanner";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeTargetName } from "./environment";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { DirectoryEntry } from "./types";

export function joinRootSubPath(root: ResolvedSkillRoot, subPath?: string): string {
  if (!subPath) return root.resolvedPath;
  return root.environment === "windows"
    ? path.win32.join(root.resolvedPath, subPath)
    : path.posix.join(root.resolvedPath, subPath);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function globPatternToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/").replace(/^\/+/, "");
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  source += "$";
  return new RegExp(source, "i");
}

export function skillRootSearchVariants(pattern: string): string[] {
  const normalizedPattern = pattern.replace(/\\/g, "/").trim().toLowerCase();
  const tokens = normalizedPattern
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  const variants = new Set<string>();
  if (normalizedPattern) variants.add(normalizedPattern);
  for (const token of tokens) {
    variants.add(token);
    if (token.endsWith("s") && token.length > 3) variants.add(token.slice(0, -1));
  }
  return [...variants];
}

export function preferredSkillRootFallbackPattern(query: string): string {
  const variants = skillRootSearchVariants(query);
  const promptVariant = variants.find((variant) => variant === "prompt" || variant === "prompts");
  if (promptVariant) return "prompt";
  return variants.find((variant) => !["write", "writing", "craft", "crafting", "skill", "skills"].includes(variant))
    ?? variants[0]
    ?? query;
}

export function entryMatchesSkillRootSearch(entry: DirectoryEntry, pattern: string): boolean {
  const normalizedPath = entry.relativePath.replace(/\\/g, "/").toLowerCase();
  const normalizedName = entry.name.toLowerCase();
  const normalizedPattern = pattern.replace(/\\/g, "/").trim();
  if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
    return skillRootSearchVariants(normalizedPattern).some((needle) =>
      normalizedPath.includes(needle) || normalizedName.includes(needle),
    );
  }
  return globPatternToRegExp(normalizedPattern).test(normalizedPath);
}

export function formatDirEntries(entries: DirectoryEntry[], rootName: string) {
  if (entries.length === 0) return "Directory is empty.";

  const lines: string[] = [`${rootName}/`];
  for (const entry of entries) {
    const depth = entry.relativePath.split(/[/\\]/).length - 1;
    const indent = "  ".repeat(depth);
    if (entry.type === "directory") {
      lines.push(`${indent}${entry.name}/`);
    } else {
      const size =
        entry.sizeBytes !== undefined
          ? entry.sizeBytes >= 1024
            ? `${Math.round(entry.sizeBytes / 1024)}K`
            : `${entry.sizeBytes}B`
          : "";
      lines.push(`${indent}${entry.name}${size ? `  (${size})` : ""}`);
    }
  }
  return lines.join("\n");
}

export function dirnameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.dirname(value) : path.posix.dirname(value);
}

export function basenameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.basename(value) : path.posix.basename(value);
}

export function dirnameDisplayPath(displayPath: string): string {
  const parsed = displayPath.match(/^(Windows|WSL):(.*)$/);
  if (!parsed) return path.posix.dirname(displayPath);
  const label = parsed[1];
  const rawPath = parsed[2];
  const dir = label === "Windows" ? path.win32.dirname(rawPath) : path.posix.dirname(rawPath);
  return `${label}:${dir}`;
}

export function skillEntrypointFollowup(entry: {
  rootIndex: number;
  environment: RuntimeTargetName;
  path: string;
  displayPath?: string;
}) {
  const skillDirectoryPath = dirnameForTarget(entry.environment, entry.path);
  const skillNameCandidate = basenameForTarget(entry.environment, skillDirectoryPath);
  const displayPath = entry.displayPath;
  const skillDirectoryDisplayPath = displayPath ? dirnameDisplayPath(displayPath) : undefined;
  return {
    rootIndex: entry.rootIndex,
    environment: entry.environment,
    path: entry.path,
    skillDirectoryPath,
    skillNameCandidate,
    ...(displayPath ? { displayPath } : {}),
    ...(skillDirectoryDisplayPath ? { skillDirectoryDisplayPath } : {}),
    readSkillFileArgs: { skill_name: skillNameCandidate },
    ...(displayPath ? { readSkillFileDisplayPathArgs: { skill_name: displayPath } } : {}),
    note: "Use readSkillFileArgs exactly to read this skill entrypoint. Do not pass this SKILL.md path as file_path; omit file_path for SKILL.md.",
  };
}

export function relativeChildPath(environment: RuntimeTargetName, parent: string, child: string): string | undefined {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\.\/?/, "").replace(/\/$/, "");
  const normalizedParent = normalize(parent);
  const normalizedChild = normalize(child);
  if (normalizedChild === normalizedParent) return undefined;
  const prefix = `${normalizedParent}/`;
  return normalizedChild.startsWith(prefix) ? normalizedChild.slice(prefix.length) : undefined;
}

export function listSubPathForMatchedEntry(
  environment: RuntimeTargetName,
  skillDirectoryPath: string,
  entryPath: string,
  entryType: "file" | "directory",
): string | undefined {
  const child = relativeChildPath(environment, skillDirectoryPath, entryPath);
  if (!child) return undefined;
  if (entryType === "directory") return child;
  const dir = dirnameForTarget(environment, child);
  return dir === "." ? undefined : dir;
}

export function ancestorSkillSearchPaths(environment: RuntimeTargetName, entryPath: string, entryType: "file" | "directory"): string[] {
  const ancestors: string[] = [];
  let current = entryType === "file" ? dirnameForTarget(environment, entryPath) : entryPath;
  while (current && current !== "." && current !== "/" && current !== "\\") {
    ancestors.push(current);
    const next = dirnameForTarget(environment, current);
    if (!next || next === current || next === ".") break;
    current = next;
  }
  return ancestors;
}

export async function parentSkillReferenceForRootEntry(
  entry: {
    environment: RuntimeTargetName;
    path: string;
    type: "file" | "directory";
    displayPath?: string;
  },
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
) {
  for (const candidatePath of ancestorSkillSearchPaths(entry.environment, entry.path, entry.type)) {
    const skill = await resolveSkillByName(roots, registry, candidatePath, signal).catch(() => null);
    if (!skill) continue;
    const subPath = listSubPathForMatchedEntry(entry.environment, candidatePath, entry.path, entry.type);
    const filePath = entry.type === "file" ? relativeChildPath(entry.environment, candidatePath, entry.path) : undefined;
    return {
      name: skill.name,
      environment: skill.environment,
      skillDirectoryPath: candidatePath,
      displayPath: skill.displayPath,
      reason: `Matched path is inside parent skill "${skill.name}". Use the parent skill name, not the matched subdirectory, with list_skill_files or read_skill_file.`,
      listSkillFilesArgs: subPath
        ? { skill_name: skill.name, sub_path: subPath }
        : { skill_name: skill.name },
      ...(entry.type === "file"
        ? {
            readSkillFileArgs: {
              skill_name: skill.name,
              file_path: filePath,
            },
          }
        : {}),
    };
  }
  return undefined;
}
