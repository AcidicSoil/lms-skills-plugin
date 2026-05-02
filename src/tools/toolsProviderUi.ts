export type ToolUiReporter = {
  status?: (message: string) => void;
  warn?: (message: string) => void;
};

export const SKILL_STRUCTURE_HINT =
  "A skill directory uses SKILL.md as the entrypoint. Supporting assets may live in references/, templates/, examples/, scripts/, or other relative paths. Read SKILL.md first, then call list_skill_files and read_skill_file with a relative file_path for referenced support files when needed.";

export const SKILL_SEARCH_WORKFLOW_HINT =
  "Skill workflow: if the user wrote $skill-name and the preprocessor expanded it, apply the expanded skill directly and do not rediscover it. If an explicit $skill-name was not expanded or is unresolved, call list_skills with that exact token first. If list_skills finds nothing and the user suspects a custom or nested skill collection, call search_skill_roots for likely patterns or list_skill_roots to inspect the configured skill-root tree. For normal specialized tasks, use routed candidates first; otherwise call list_skills with a concise task query. After choosing a candidate, call read_skill_file with the exact skill name. Use list_skill_files only after SKILL.md references supporting assets. Do not call qmd, ck, grep, shell commands, or run_command for skill discovery.";

export function compactToolStatusValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "-";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

export function emitToolDebugStatus(
  ui: ToolUiReporter | undefined,
  message: string,
  details: Record<string, unknown> = {},
): void {
  if (!ui?.status) return;
  const compactDetails = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${compactToolStatusValue(value)}`)
    .join(" ");
  ui.status(`[debug] ${message}${compactDetails ? ` (${compactDetails})` : ""}`);
}

export function emitToolDebugWarning(
  ui: ToolUiReporter | undefined,
  message: string,
  details: Record<string, unknown> = {},
): void {
  if (!ui?.warn && !ui?.status) return;
  const compactDetails = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${compactToolStatusValue(value)}`)
    .join(" ");
  const text = `[debug] ${message}${compactDetails ? ` (${compactDetails})` : ""}`;
  if (ui.warn) ui.warn(text);
  else ui.status?.(text);
}
