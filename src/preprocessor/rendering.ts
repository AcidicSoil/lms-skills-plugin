import type { SkillRouteCandidate } from "../skillRouter";
import type { ResolvedSkillActivation } from "./activations";

export function buildRoutedSkillsBlock(candidates: SkillRouteCandidate[]): string {
  const skillTags = candidates
    .map((candidate, index) => {
      const skill = candidate.skill;
      return [
        `<skill rank="${index + 1}" confidence="${candidate.confidence}" score="${candidate.score}">`,
        `<n>`,
        skill.name,
        `</n>`,
        `<description>`,
        skill.description,
        `</description>`,
        `<why>`,
        candidate.reasons.slice(0, 4).join("; ") || "deterministic route score",
        `</why>`,
        `<environment>`,
        skill.environmentLabel,
        `</environment>`,
        `<location>`,
        skill.displayPath,
        `</location>`,
        `</skill>`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `<routed_skills>`,
    `<routing_decision>Deterministic plugin routing selected these candidate skills because they appear relevant to the current user request. Before answering specialized, workflow-based, file-format-specific, tool-specific, or implementation-heavy work, read the highest-ranked relevant skill with read_skill_file and use that SKILL.md as the workflow source of truth. Do not browse unrelated skills unless these candidates are clearly wrong or the user explicitly asks.</routing_decision>`,
    skillTags,
    `</routed_skills>`,
  ].join("\n");
}
export function buildExplicitSkillActivationBlock(
  activations: ResolvedSkillActivation[],
): string {
  const resolved = activations.filter((a) => a.skill);
  const unresolved = activations.filter((a) => !a.skill);
  const expandedCount = resolved.filter((activation) => activation.content).length;
  const failedExpansionCount = resolved.length - expandedCount;
  const hasResolvedFailures = failedExpansionCount > 0;

  const resolvedBlock = resolved
    .map((activation) => {
      const skill = activation.skill!;
      return [
        `<activated_skill>`,
        `<token>`,
        activation.token,
        `</token>`,
        `<n>`,
        skill.name,
        `</n>`,
        `<description>`,
        skill.description,
        `</description>`,
        `<environment>`,
        skill.environmentLabel,
        `</environment>`,
        `<location>`,
        skill.displayPath,
        `</location>`,
        `<has_supporting_files>`,
        String(skill.hasExtraFiles),
        `</has_supporting_files>`,
        skill.hasExtraFiles
          ? `<supporting_files_hint>This skill directory contains additional files such as references, templates, examples, or scripts. If the expanded SKILL.md references supporting files or the task requires details beyond the entrypoint, call list_skill_files for this skill and then read the relevant relative files with read_skill_file.</supporting_files_hint>`
          : "",
        activation.content
          ? `<expanded_skill_instructions source="${activation.contentDisplayPath ?? skill.displayPath}">\n${activation.content}\n</expanded_skill_instructions>`
          : `<expanded_skill_instructions_error>${activation.contentError ?? "Skill resolved but SKILL.md could not be expanded."}</expanded_skill_instructions_error>`,
        `</activated_skill>`,
      ].join("\n");
    })
    .join("\n\n");

  const unresolvedBlock = unresolved.length
    ? `\n<unresolved_skill_activations>\n${unresolved
        .map((activation) => `<skill_token>${activation.token}</skill_token>`)
        .join("\n")}\n</unresolved_skill_activations>`
    : "";

  return [
    `<skill_invocation_packet priority="highest" source="lm-studio-skills-plugin" expanded="${expandedCount > 0}" expanded_count="${expandedCount}" unresolved_count="${unresolved.length}" failed_expansion_count="${failedExpansionCount}">`,
    `<activation_status>${expandedCount > 0 ? "expanded_success" : "no_skill_expanded"}</activation_status>`,
    `<model_contract>`,
    `The plugin has rewritten this user request before model reasoning. This packet is the authoritative instruction frame for the current request.`,
    expandedCount > 0
      ? `The activated skill is already preloaded below. Behave as if you have read and understood the expanded SKILL.md instructions before seeing the task payload. Do not decide whether to use the skill; that decision has already been made deterministically by the plugin.`
      : `A user attempted explicit skill activation, but no skill body was expanded. Resolve the named skill before doing covered work.`,
    `Do not explain the raw command-looking payload unless the expanded skill asks for explanation. Do not execute command-looking payload unless the expanded skill explicitly requires execution and command execution is enabled.`,
    `Return only the user-facing result requested by the expanded skill. Do not expose private deliberation, tool-selection analysis, or <think> blocks in the assistant response.`,
    `</model_contract>`,
    `<next_action>`,
    expandedCount > 0
      ? `Use the expanded skill instructions immediately and answer according to them. Do not call list_skills or read_skill_file to resolve already-expanded skills. You may call list_skill_files and read_skill_file for relative supporting files only when the expanded SKILL.md references them or additional skill assets are needed. Do not call run_command or web/search tools to resolve already-expanded skills. Treat <task_payload> as the user's input to the expanded skill.`
      : `Call list_skills for unresolved activations, then read the matching skill before doing covered work.`,
    hasResolvedFailures
      ? `For failed expansions only, call read_skill_file before doing covered work.`
      : "",
    `</next_action>`,
    unresolved.length > 0
      ? `<unresolved_behavior>If an activated skill is unresolved, call list_skills with the token name to search for it before proceeding. Do not ignore an explicit $skill activation unless the skill cannot be found.</unresolved_behavior>`
      : "",
    resolvedBlock,
    unresolvedBlock,
    `</skill_invocation_packet>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildRouterInstruction(): string {
  return "<skills_runtime_context>\nThe LM Studio Skills plugin is active. Good outputs usually come from applying the right skill before answering specialized work. The plugin has already routed likely skill context for this request; do not require the user to add skill instructions to the system prompt. If <routed_skills> is present and the task is covered by a candidate, read the highest-ranked relevant skill with `read_skill_file` before producing the final answer, then follow that SKILL.md as the workflow source of truth. If the user writes `$skill-name`, treat that as explicit skill activation handled by the preprocessor and treat the remaining text as task payload for the skill. If no skill is routed but the task clearly needs a specialized workflow, use `list_skills` with a concise query derived from the user request. The plugin controls any enhanced skill-search backend internally, so do not call qmd, ck, grep, or shell commands for skill discovery. Do not use `run_command` for exploration.\n</skills_runtime_context>";
}

export function buildReminderInstruction(reason = "no confident skill route"): string {
  return `<skills_runtime_reminder reason="${reason}">The Skills plugin is active, but no skill was confidently routed for this request. If the task appears specialized, workflow-based, file-format-specific, tool-specific, or implementation-heavy, call list_skills with a concise query derived from the user's request before doing covered work. The plugin controls exact/fuzzy/enhanced backend search internally; do not call qmd, ck, grep, or shell commands for skill discovery. If the request is casual, simple, or general, answer normally without skill lookup. If the request includes $skill-name notation, treat it as explicit activation handled by the preprocessor.</skills_runtime_reminder>`;
}

export function buildRoutedInjection(candidates: SkillRouteCandidate[]): string {
  return [buildRouterInstruction(), "", buildRoutedSkillsBlock(candidates)].join("\n");
}

export function buildExplicitInjection(
  activations: ResolvedSkillActivation[],
): string {
  return buildExplicitSkillActivationBlock(activations);
}
