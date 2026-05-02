export function normalizeReadSkillFileRequest(skillName: string, filePath?: string): { skillName: string; filePath?: string; note?: string } {
  const normalizedSkill = skillName.trim();
  const normalizedFile = filePath?.trim();
  if (!normalizedFile || normalizedFile === "SKILL.md") {
    return { skillName: normalizedSkill, filePath: undefined };
  }

  const fileNormalized = normalizedFile.replace(/\\/g, "/");
  const skillNormalized = normalizedSkill.replace(/\\/g, "/").replace(/\/$/, "");
  if (fileNormalized.endsWith("/SKILL.md")) {
    const fileParent = fileNormalized.slice(0, -"/SKILL.md".length).replace(/\/$/, "");
    const fileParentBase = fileParent.split("/").filter(Boolean).pop();
    const skillBase = skillNormalized.split("/").filter(Boolean).pop();
    if (fileParent === skillNormalized || (fileParentBase && skillBase && fileParentBase === skillBase)) {
      return {
        skillName: normalizedSkill,
        filePath: undefined,
        note: "Normalized duplicated SKILL.md path from file_path; omit file_path when reading a skill entrypoint.",
      };
    }
  }

  return { skillName: normalizedSkill, filePath: normalizedFile };
}
