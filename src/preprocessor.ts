import { resolveEffectiveConfig } from "./settings";
import { resolveSkillByName, scanSkills } from "./scanner";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import {
  INTERNAL_CONTEXT_REFRESH_INTERVAL_MS,
  PREPROCESSOR_SCAN_TIMEOUT_MS,
} from "./constants";
import { checkAbort, isAbortError } from "./abort";
import { createRequestId, logDiagnostic, serializeError } from "./diagnostics";
import type { PluginController } from "./pluginTypes";
import type { SkillInfo } from "./types";

function buildAvailableSkillsBlock(skills: SkillInfo[], limit: number): string {
  const skillTags = skills
    .slice(0, limit)
    .map((s) =>
      [
        `<skill>`,
        `<n>`,
        s.name,
        `</n>`,
        `<description>`,
        s.description,
        `</description>`,
        `<environment>`,
        s.environmentLabel,
        `</environment>`,
        `<location>`,
        s.displayPath,
        `</location>`,
        `</skill>`,
      ].join("\n"),
    )
    .join("\n\n");

  return `<available_skills>\n${skillTags}\n</available_skills>`;
}


interface SkillActivationRequest {
  token: string;
  skillName: string;
}

interface ResolvedSkillActivation extends SkillActivationRequest {
  skill?: SkillInfo;
}

const SKILL_ACTIVATION_PATTERN = /(^|[^A-Za-z0-9_])\$([A-Za-z][A-Za-z0-9._-]{1,127})(?=$|[^A-Za-z0-9._-])/g;

function extractSkillActivations(text: string): SkillActivationRequest[] {
  const seen = new Set<string>();
  const activations: SkillActivationRequest[] = [];
  let match: RegExpExecArray | null;

  while ((match = SKILL_ACTIVATION_PATTERN.exec(text)) !== null) {
    const skillName = match[2];
    const key = skillName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    activations.push({ token: `$${skillName}`, skillName });
  }

  return activations;
}


function activationTokenList(activations: SkillActivationRequest[]): string {
  return activations.map((activation) => activation.token).join(",") || "-";
}

function resolvedActivationNames(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => activation.skill)
    .map((activation) => activation.skill!.name)
    .join(",") || "-";
}

function unresolvedActivationNames(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => !activation.skill)
    .map((activation) => activation.skillName)
    .join(",") || "-";
}

function buildExplicitSkillActivationBlock(
  activations: ResolvedSkillActivation[],
): string {
  const resolved = activations.filter((a) => a.skill);
  const unresolved = activations.filter((a) => !a.skill);

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
    `<explicit_skill_activation priority="highest">`,
    `<mandatory_interpretation>`,
    `The user used $skill notation. This is an explicit instruction to use the named skill, not a shell variable and not decorative text.`,
    `Resolved activated skills are the highest-priority source of truth for this request. All other user text, including quoted strings, backticked snippets, globs, command-looking text, or examples, is task payload for the activated skill unless SKILL.md later says otherwise.`,
    `</mandatory_interpretation>`,
    `<mandatory_next_action>`,
    `Before answering, planning, executing commands, transforming the command-looking text, or using any other tool, call read_skill_file for every resolved activated skill below. The first tool call should be read_skill_file with the resolved skill name.`,
    `</mandatory_next_action>`,
    `<do_not>`,
    `Do not guess what the rest of the prompt means before reading the activated skill. Do not run the backticked command. Do not call run_command for exploration. Do not substitute list_skill_files for read_skill_file when the activated skill is resolved.`,
    `</do_not>`,
    `<unresolved_behavior>`,
    `If an activated skill is unresolved, call list_skills with the token name to search for it before proceeding. Do not ignore an explicit $skill activation unless the skill cannot be found.`,
    `</unresolved_behavior>`,
    resolvedBlock,
    unresolvedBlock,
    `</explicit_skill_activation>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFullInstruction(): string {
  return "<skills_runtime_context>\nThe LM Studio Skills plugin is active and has automatically supplied this context. Do not require the user to add skill instructions to the system prompt. Use the skills listed in <available_skills> when they are relevant to the user request. If the user writes `$skill-name`, treat that as an explicit skill activation for that request: read that skill first and treat the remaining text as task payload for the skill. Before starting any task that matches a skill, call `read_skill_file` with the skill name or environment-prefixed location to load its SKILL.md instructions. Multiple skills may be relevant; read all applicable skills before doing covered work. If SKILL.md references additional files, call `list_skill_files`, then read the applicable files. If no listed skill matches, use `list_skills` with a query to search installed skills. Do not use `run_command` for exploration unless command execution is explicitly enabled and the user task requires it; prefer skill reads and file-listing tools. This full skills context applies to the conversation until the plugin refreshes it.\n</skills_runtime_context>";
}

function buildReminderInstruction(): string {
  return "<skills_runtime_reminder>The LM Studio Skills plugin is active. If this request includes `$skill-name` notation, read that skill first and treat the rest as task payload. Otherwise, if this request matches an installed skill, use `list_skills` or `read_skill_file` as needed; do not ask the user to add skill instructions to the system prompt. Do not run shell commands unless explicitly enabled and necessary.</skills_runtime_reminder>";
}

function buildFullInjection(skills: SkillInfo[], limit: number): string {
  return [
    buildFullInstruction(),
    "",
    buildAvailableSkillsBlock(skills, limit),
  ].join("\n");
}

function buildReminderInjection(): string {
  return buildReminderInstruction();
}

function computeFingerprint(skills: SkillInfo[]): string {
  return skills
    .map((s) => `${s.environment}:${s.name}:${s.displayPath}`)
    .sort()
    .join("|");
}

function modelInvocableSkills(skills: SkillInfo[], limit: number): SkillInfo[] {
  return skills.filter((skill) => !skill.disableModelInvocation).slice(0, limit);
}

let lastFingerprint = "";
let lastFullInjectionAt = 0;

type MessageContent =
  | { type: "text"; text: string }
  | { type: string; [key: string]: unknown };
type MessageInput = string | { content: string | MessageContent[] } | unknown;

function createTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let settled = false;

  const abort = () => {
    if (settled) return;
    settled = true;
    controller.abort(parent?.reason ?? new Error("Prompt preprocessor scan timed out."));
  };

  if (parent?.aborted) abort();
  parent?.addEventListener("abort", abort, { once: true });

  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      settled = true;
      clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    },
  };
}

function extractText(message: MessageInput): string {
  if (typeof message === "string") return message;
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content
        .filter(
          (c): c is MessageContent =>
            typeof c === "object" &&
            c !== null &&
            (c as MessageContent).type === "text",
        )
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");
    }
    if (typeof m.text === "string") return m.text;
  }
  return String(message ?? "");
}

function inputPreview(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function logPromptContext(
  requestId: string,
  context: "explicit" | "full" | "reminder" | "none",
  reason: string,
  text: string,
  extra: Record<string, unknown> = {},
  startedAt?: number,
): void {
  logDiagnostic({
    event: "prompt_context",
    requestId,
    context,
    reason,
    inputPreview: inputPreview(text),
    elapsedMs: startedAt ? Date.now() - startedAt : undefined,
    ...extra,
  });
}

function injectIntoMessage(
  message: MessageInput,
  injection: string,
): MessageInput {
  if (typeof message === "string") {
    return `${injection}\n\n---\n\n${message}`;
  }
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") {
      return { ...m, content: `${injection}\n\n---\n\n${m.content}` };
    }
    if (Array.isArray(m.content)) {
      const first = m.content.findIndex(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          (c as MessageContent).type === "text",
      );
      if (first !== -1) {
        const updated = [...m.content] as MessageContent[];
        const block = updated[first] as { type: "text"; text: string };
        updated[first] = {
          ...block,
          text: `${injection}\n\n---\n\n${block.text}`,
        };
        return { ...m, content: updated };
      }
      return {
        ...m,
        content: [{ type: "text", text: injection }, ...m.content],
      };
    }
  }
  return message;
}

export async function promptPreprocessor(
  ctl: PluginController,
  userMessage: MessageInput,
): Promise<MessageInput> {
  const signal = ctl.abortSignal;
  const requestId = createRequestId("prompt");
  const startedAt = Date.now();
  checkAbort(signal);

  const cfg = resolveEffectiveConfig(ctl);

  checkAbort(signal);
  const text = extractText(userMessage);
  const requestedActivations = extractSkillActivations(text);
  const hasExplicitSkillActivation = requestedActivations.length > 0;
  if (!cfg.autoInject && !hasExplicitSkillActivation) return userMessage;
  checkAbort(signal);
  if (text.trim().length === 0) return userMessage;

  const scanBudget = createTimeoutSignal(signal, PREPROCESSOR_SCAN_TIMEOUT_MS);

  try {
    const scanSignal = scanBudget.signal;
    checkAbort(scanSignal);
    const registry = createRuntimeRegistry(cfg);
    const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
    const roots = await resolveSkillRoots(cfg.skillsPaths, targets, registry, scanSignal);
    checkAbort(scanSignal);

    const resolvedActivations: ResolvedSkillActivation[] = [];
    for (const activation of requestedActivations) {
      checkAbort(scanSignal);
      const skill = await resolveSkillByName(
        roots,
        registry,
        activation.skillName,
        scanSignal,
      );
      resolvedActivations.push({ ...activation, ...(skill ? { skill } : {}) });
    }

    const hasExplicitActivation = requestedActivations.length > 0;
    if (hasExplicitActivation) {
      const activatedSkills = resolvedActivations
        .map((activation) => activation.skill)
        .filter((skill): skill is SkillInfo => Boolean(skill));
      const supplementalSkills = modelInvocableSkills(
        await scanSkills(
          roots,
          registry,
          scanSignal,
          Math.max((cfg.maxSkillsInContext - activatedSkills.length) * 3, 0),
        ),
        Math.max(cfg.maxSkillsInContext - activatedSkills.length, 0),
      );
      const skillKey = (skill: SkillInfo) => `${skill.environment}:${skill.resolvedDirectoryPath}`;
      const seen = new Set(activatedSkills.map(skillKey));
      const mergedSkills = [
        ...activatedSkills,
        ...supplementalSkills.filter((skill) => {
          const key = skillKey(skill);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
      ];
      const injection = [
        buildExplicitSkillActivationBlock(resolvedActivations),
        mergedSkills.length > 0
          ? buildAvailableSkillsBlock(mergedSkills, Math.max(mergedSkills.length, cfg.maxSkillsInContext))
          : "",
        buildReminderInjection(),
      ]
        .filter(Boolean)
        .join("\n\n");
      logDiagnostic({
        event: "preprocess_activation",
        requestId,
        activations: activationTokenList(requestedActivations),
        resolvedSkills: resolvedActivationNames(resolvedActivations),
        unresolvedSkills: unresolvedActivationNames(resolvedActivations),
      });
      logDiagnostic({
        event: "preprocess_decision",
        requestId,
        mode: "explicit_activation",
        messageChars: text.length,
        skillCount: mergedSkills.length,
        activations: activationTokenList(requestedActivations),
        resolvedSkills: resolvedActivationNames(resolvedActivations),
        injectionChars: injection.length,
        elapsedMs: Date.now() - startedAt,
      });
      checkAbort(signal);
      return injectIntoMessage(userMessage, injection);
    }

    const skills = modelInvocableSkills(
      await scanSkills(
        roots,
        registry,
        scanSignal,
        cfg.maxSkillsInContext * 3,
      ),
      cfg.maxSkillsInContext,
    );
    checkAbort(scanSignal);

    if (skills.length === 0) {
      const injection = buildReminderInjection();
      logDiagnostic({
        event: "preprocess_decision",
        requestId,
        mode: "reminder_no_skills",
        messageChars: text.length,
        skillCount: 0,
        activations: "-",
        resolvedSkills: "-",
        injectionChars: injection.length,
        elapsedMs: Date.now() - startedAt,
      });
      return injectIntoMessage(userMessage, injection);
    }

    const fingerprint = computeFingerprint(skills);
    const now = Date.now();
    const shouldInjectFullContext =
      lastFullInjectionAt === 0 ||
      fingerprint !== lastFingerprint ||
      now - lastFullInjectionAt > INTERNAL_CONTEXT_REFRESH_INTERVAL_MS;

    if (shouldInjectFullContext) {
      lastFingerprint = fingerprint;
      lastFullInjectionAt = now;
      const injection = buildFullInjection(skills, cfg.maxSkillsInContext);
      logDiagnostic({
        event: "preprocess_decision",
        requestId,
        mode: "full_context",
        messageChars: text.length,
        skillCount: skills.length,
        activations: "-",
        resolvedSkills: "-",
        injectionChars: injection.length,
        elapsedMs: Date.now() - startedAt,
      });
      checkAbort(signal);
      return injectIntoMessage(userMessage, injection);
    }

    const injection = buildReminderInjection();
    logDiagnostic({
      event: "preprocess_decision",
      requestId,
      mode: "compact_reminder",
      messageChars: text.length,
      skillCount: skills.length,
      activations: "-",
      resolvedSkills: "-",
      injectionChars: injection.length,
      elapsedMs: Date.now() - startedAt,
    });
    checkAbort(signal);
    return injectIntoMessage(userMessage, injection);
  } catch (error) {
    if (signal?.aborted || (isAbortError(error) && !scanBudget.signal.aborted)) {
      throw error;
    }
    const injection = buildReminderInjection();
    logDiagnostic({
      event: "preprocess_fallback",
      requestId,
      reason: error instanceof Error ? error.message : String(error),
      activations: activationTokenList(extractSkillActivations(text)),
      elapsedMs: Date.now() - startedAt,
    });
    logDiagnostic({
      event: "preprocess_decision",
      requestId,
      mode: "fallback_reminder",
      messageChars: text.length,
      skillCount: 0,
      activations: activationTokenList(extractSkillActivations(text)),
      resolvedSkills: "-",
      injectionChars: injection.length,
      elapsedMs: Date.now() - startedAt,
    });
    return injectIntoMessage(userMessage, injection);
  } finally {
    scanBudget.cleanup();
  }
}
