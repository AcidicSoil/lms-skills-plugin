import * as path from "path";
import { SKILL_ENTRY_POINT } from "../constants";
import { parseDisplayPath, formatDisplayPath } from "../pathResolver";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { RuntimeRegistry } from "../runtime";
import type { RuntimeTargetName } from "../environment";
import type { SkillInfo } from "../types";
import { checkAbort } from "../abort";
import { parseSkillMarkdown } from "./markdown";
import { joinForTarget, isInsideTarget } from "./paths";
import { readFileSafe } from "./safeRead";

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
