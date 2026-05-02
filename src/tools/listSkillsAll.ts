import { scanSkills } from "../scanner";
import { logDiagnostic, timedStep } from "../diagnostics";
import { SKILL_STRUCTURE_HINT, skillFrontmatterSummary, skillNextStepHint } from "./toolsProviderShared";
import type { RuntimeRegistry } from "../runtime";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { EffectiveConfig } from "../types";

export async function listAllSkills(
  cfg: EffectiveConfig,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  requestId: string,
  toolSignal: AbortSignal,
  status: (message: string) => void,
  cap: number,
  searchBackend: unknown,
) {
  status("Scanning skills directories..");
  const skills = await timedStep(
    requestId,
    "list_skills",
    "scan_skills",
    async () => scanSkills(roots, registry, toolSignal),
    { rootCount: roots.length },
  );

  if (skills.length === 0) {
    return {
      total: 0,
      found: 0,
      skillsEnvironment: cfg.skillsEnvironment,
      roots,
      skills: [],
      note: "No skills found. Create skill directories with a SKILL.md file inside the configured skills paths.",
      skillStructureHint: SKILL_STRUCTURE_HINT,
      searchBackend,
    };
  }

  const page = skills.slice(0, cap);
  status(`Found ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);
  logDiagnostic({ event: "list_skills_result", requestId, tool: "list_skills", total: skills.length, returned: page.length });

  return {
    total: skills.length,
    found: page.length,
    skillsEnvironment: cfg.skillsEnvironment,
    roots,
    skillStructureHint: SKILL_STRUCTURE_HINT,
    searchBackend,
    ...(skills.length > cap
      ? { note: `Showing ${cap} of ${skills.length} skills.` }
      : {}),
    skills: page.map((s) => ({
      name: s.name,
      description: s.description,
      tags: s.tags.length > 0 ? s.tags : undefined,
      environment: s.environment,
      skillMdPath: s.skillMdPath,
      displayPath: s.displayPath,
      hasExtraFiles: s.hasExtraFiles,
      nextStep: skillNextStepHint(s),
      frontmatter: skillFrontmatterSummary(s),
    })),
  };
}
