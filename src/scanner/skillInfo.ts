import * as path from "path";
import { SKILL_ENTRY_POINT, SKILL_MANIFEST_FILE } from "../constants";
import { formatDisplayPath } from "../pathResolver";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { RuntimeAdapter } from "../runtime/types";
import type { SkillInfo, SkillManifestFile } from "../types";
import { checkAbort, isAbortError } from "../abort";
import { parseSkillMarkdown, combineDescription, extractDescription, extractBodyExcerpt } from "./markdown";
import { joinForTarget } from "./paths";
import { readFileSafe } from "./safeRead";

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

export async function buildSkillInfoFromDirectory(
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
