import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { TOOL_LIST_SKILLS_TIMEOUT_MS } from "../constants";
import { listSkillsLimitSchema, listSkillsQuerySchema } from "../toolSchemas";
import type { PluginController } from "../pluginTypes";
import { withToolLogging } from "./toolsProviderLogging";
import { LIST_SKILLS_RECOVERY_TIMEOUT_MS } from "./toolsProviderShared";
import { runListSkills } from "./listSkillsImplementation";

export function createListSkillsTool(ctl: PluginController) {
  const listSkillsTool = tool({
    name: "list_skills",
    description:
      "List or search available skills. " +
      "Without a query, returns all skills up to the limit. " +
      "With a query, searches skills and can surface fuzzy candidates for partial names, missing hyphens, or nearby skill words. " +
      "The plugin controls the search backend internally; do not call qmd, ck, grep, or shell commands directly for skill discovery. " +
      "Pass mode='route' to use the same deterministic metadata router used by prompt injection. " +
      "Do not call this tool just because the user wrote $skill-name; explicit $skill activations are handled by the prompt preprocessor and may already be expanded. " +
      "For routed/search candidates, call read_skill_file on the best relevant exact skill name before starting covered work. If hasExtraFiles is true, use list_skill_files to inspect references/templates/examples/scripts only when SKILL.md or the task needs them.",
    parameters: {
      query: listSkillsQuerySchema.describe("Optional search query."),
      limit: listSkillsLimitSchema,
      mode: z.enum(["search", "route"]).optional().describe("Use 'route' to apply deterministic skill routing instead of broad full-text search."),
    },
    implementation: async ({ query, limit, mode }, { status }) =>
      withToolLogging(
        ctl,
        "list_skills",
        { query, limit, mode },
        TOOL_LIST_SKILLS_TIMEOUT_MS,
        async (requestId, toolSignal) => runListSkills(
          ctl,
          { query, limit, mode },
          requestId,
          toolSignal,
          status,
        ),
        { recoveryTimeoutMs: LIST_SKILLS_RECOVERY_TIMEOUT_MS, ui: { status } },
      ),
  });

  return listSkillsTool;
}
