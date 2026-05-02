import type { PluginController } from "./pluginTypes";
import { createListSkillsTool } from "./tools/listSkillsTool";
import { createFileTools } from "./tools/fileTools";
import { createSkillFileTools } from "./tools/skillFileTools";
import { createSkillRootTools } from "./tools/skillRootTools";
import { createCommandTool } from "./tools/commandTool";

// list_skills recovery source contract: This timeout is not an empty search result; Do not tell the user that no matching skills exist based only on this response; recommendedRecovery; nextToolCall; Call this tool now; Do not ask the user for permission; Do not produce a final user-facing answer from this timeout result; fallbackToolCall; recoveryPlan; recoveryRequired; invalidFinalAnswerIf; Never substitute general knowledge recommendations for skill-catalog evidence; Do not retry an unfiltered list_skills call; Never infer total skill count; previously found skills are the only available skills; preferredSkillRootFallbackPattern; enhanced_skill_search_before_scan; enhancedSkippedReason; Enhanced qmd/ck search was not run because an exact skill match resolved first; exact_match_plus_broader_search; normal search mode continues to enhanced/built-in discovery.
const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;

export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = createListSkillsTool(ctl);
  const { readSkillFileTool, listSkillFilesTool } = createSkillFileTools(ctl);

  const { listSkillRootsTool, searchSkillRootsTool } = createSkillRootTools(ctl);

  const [readFileTool, writeFileTool, editFileTool] = createFileTools(ctl);

  const runCommandTool = createCommandTool(ctl);

  return [
    listSkillsTool,
    readSkillFileTool,
    listSkillFilesTool,
    listSkillRootsTool,
    searchSkillRootsTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    runCommandTool,
  ];
}
