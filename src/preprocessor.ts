import { resolveEffectiveConfig } from "./settings";
import { resolveSkillByName, scanSkills } from "./scanner";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import {
  DEFAULT_MAX_ROUTED_SKILLS,
  INTERNAL_CONTEXT_REFRESH_INTERVAL_MS,
  PREPROCESSOR_SCAN_TIMEOUT_MS,
  ROUTER_DISCOVERY_MULTIPLIER,
} from "./constants";
import { checkAbort, isAbortError } from "./abort";
import { createRequestId, logDiagnostic, serializeError } from "./diagnostics";
import { routeSkills, summarizeRouteCandidate } from "./skillRouter";
import type { PluginController } from "./pluginTypes";
import type { SkillInfo } from "./types";
import type { SkillRouteCandidate, SkillRouteDecision } from "./skillRouter";

interface SkillActivationRequest {
  token: string;
  skillName: string;
}

interface ResolvedSkillActivation extends SkillActivationRequest {
  skill?: SkillInfo;
}

const SKILL_ACTIVATION_PATTERN = /(^|[^A-Za-z0-9_])\$([A-Za-z][A-Za-z0-9._-]{1,127})(?=$|[^A-Za-z0-9._-])/g;

function routedSkillLimit(configuredLimit: number): number {
  return Math.max(1, Math.min(DEFAULT_MAX_ROUTED_SKILLS, configuredLimit));
}

function buildRoutedSkillsBlock(candidates: SkillRouteCandidate[]): string {
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
    `<routing_decision>Deterministic plugin routing selected these candidate skills for this request. Read the highest-ranked relevant skill with read_skill_file before doing covered work. Do not browse unrelated skills unless routing is unresolved or the user explicitly asks.</routing_decision>`,
    skillTags,
    `</routed_skills>`,
  ].join("\n");
}

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

function buildRouterInstruction(): string {
  return "<skills_runtime_context>\nThe LM Studio Skills plugin is active and has automatically routed skill context for this request. Do not require the user to add skill instructions to the system prompt. If <routed_skills> is present, read the highest-ranked relevant skill with `read_skill_file` before doing covered work. If the user writes `$skill-name`, treat that as an explicit skill activation: read that skill first and treat the remaining text as task payload for the skill. If no skill is routed, use `list_skills` only when the task clearly requires a specialized skill. Do not use `run_command` for exploration unless command execution is explicitly enabled and necessary.\n</skills_runtime_context>";
}

function buildReminderInstruction(reason = "no confident skill route"): string {
  return `<skills_runtime_reminder reason="${reason}">The Skills plugin is active, but no skill was confidently routed for this request. Use list_skills only if the task appears to require a specialized skill. If the request includes $skill-name notation, read that skill first.</skills_runtime_reminder>`;
}

function buildRoutedInjection(candidates: SkillRouteCandidate[]): string {
  return [buildRouterInstruction(), "", buildRoutedSkillsBlock(candidates)].join("\n");
}

function buildExplicitInjection(
  activations: ResolvedSkillActivation[],
  routedSupplemental: SkillRouteCandidate[],
): string {
  return [
    buildExplicitSkillActivationBlock(activations),
    routedSupplemental.length > 0 ? buildRoutedSkillsBlock(routedSupplemental) : "",
    buildReminderInstruction("explicit activation"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function computeFingerprint(candidates: SkillRouteCandidate[]): string {
  return candidates
    .map((candidate) => `${candidate.skill.environment}:${candidate.skill.name}:${candidate.skill.displayPath}:${candidate.score}`)
    .sort()
    .join("|");
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

function logPromptRoute(
  requestId: string,
  mode: string,
  text: string,
  route: SkillRouteDecision | undefined,
  injection: string,
  startedAt: number,
  extra: Record<string, unknown> = {},
): void {
  const top = route?.selected[0];
  logDiagnostic({
    event: "prompt_route",
    requestId,
    mode,
    inputPreview: inputPreview(text),
    selected: route?.selected.map(summarizeRouteCandidate).join(" | ") || "-",
    rejectedBest: route?.bestRejected ? summarizeRouteCandidate(route.bestRejected) : "-",
    topSkill: top?.skill.name ?? "-",
    topScore: top?.score ?? 0,
    topConfidence: top?.confidence ?? "low",
    injectionChars: injection.length,
    elapsedMs: Date.now() - startedAt,
    ...extra,
  });
}

async function resolveActivations(
  activations: SkillActivationRequest[],
  roots: Awaited<ReturnType<typeof resolveSkillRoots>>,
  registry: ReturnType<typeof createRuntimeRegistry>,
  signal?: AbortSignal,
): Promise<ResolvedSkillActivation[]> {
  const resolved: ResolvedSkillActivation[] = [];
  for (const activation of activations) {
    checkAbort(signal);
    const skill = await resolveSkillByName(
      roots,
      registry,
      activation.skillName,
      signal,
    );
    resolved.push({ ...activation, ...(skill ? { skill } : {}) });
  }
  return resolved;
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
  const maxRouted = routedSkillLimit(cfg.maxSkillsInContext);

  try {
    const scanSignal = scanBudget.signal;
    checkAbort(scanSignal);
    const registry = createRuntimeRegistry(cfg);
    const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
    const roots = await resolveSkillRoots(cfg.skillsPaths, targets, registry, scanSignal);
    checkAbort(scanSignal);

    const resolvedActivations = await resolveActivations(
      requestedActivations,
      roots,
      registry,
      scanSignal,
    );

    const discoveryLimit = Math.max(
      maxRouted * ROUTER_DISCOVERY_MULTIPLIER,
      cfg.maxSkillsInContext,
    );
    const discoveredSkills = await scanSkills(
      roots,
      registry,
      scanSignal,
      discoveryLimit,
    );

    if (requestedActivations.length > 0) {
      const activatedSkills = resolvedActivations
        .map((activation) => activation.skill)
        .filter((skill): skill is SkillInfo => Boolean(skill));
      const activatedKeys = new Set(
        activatedSkills.map((skill) => `${skill.environment}:${skill.resolvedDirectoryPath}`),
      );
      const route = routeSkills(
        text,
        discoveredSkills.filter(
          (skill) => !activatedKeys.has(`${skill.environment}:${skill.resolvedDirectoryPath}`),
        ),
        Math.max(maxRouted - activatedSkills.length, 0),
      );
      const injection = buildExplicitInjection(resolvedActivations, route.selected);
      logDiagnostic({
        event: "preprocess_activation",
        requestId,
        activations: activationTokenList(requestedActivations),
        resolvedSkills: resolvedActivationNames(resolvedActivations),
        unresolvedSkills: unresolvedActivationNames(resolvedActivations),
      });
      logPromptRoute(
        requestId,
        "explicit_activation",
        text,
        route,
        injection,
        startedAt,
        {
          activations: activationTokenList(requestedActivations),
          resolvedSkills: resolvedActivationNames(resolvedActivations),
          unresolvedSkills: unresolvedActivationNames(resolvedActivations),
          expectedAction: activatedSkills.length
            ? `read_skill_file(${activatedSkills.map((skill) => skill.name).join(",")}) first`
            : "list_skills for unresolved activation",
        },
      );
      checkAbort(signal);
      return injectIntoMessage(userMessage, injection);
    }

    const route = routeSkills(text, discoveredSkills, maxRouted);
    if (route.selected.length === 0) {
      const injection = buildReminderInstruction("no confident skill route");
      logPromptRoute(
        requestId,
        "no_route",
        text,
        route,
        injection,
        startedAt,
        { expectedAction: "no skill unless user asks or task needs specialization" },
      );
      return injectIntoMessage(userMessage, injection);
    }

    const fingerprint = computeFingerprint(route.selected);
    const now = Date.now();
    const shouldInjectRoutedContext =
      lastFullInjectionAt === 0 ||
      fingerprint !== lastFingerprint ||
      now - lastFullInjectionAt > INTERNAL_CONTEXT_REFRESH_INTERVAL_MS;

    if (shouldInjectRoutedContext) {
      const reason =
        lastFullInjectionAt === 0
          ? "initial_route"
          : fingerprint !== lastFingerprint
            ? "route_changed"
            : "refresh_interval";
      lastFingerprint = fingerprint;
      lastFullInjectionAt = now;
      const injection = buildRoutedInjection(route.selected);
      logPromptRoute(
        requestId,
        "routed_context",
        text,
        route,
        injection,
        startedAt,
        { reason, expectedAction: `read_skill_file(${route.selected[0].skill.name}) if task is covered` },
      );
      checkAbort(signal);
      return injectIntoMessage(userMessage, injection);
    }

    const injection = buildReminderInstruction("route unchanged");
    logPromptRoute(
      requestId,
      "compact_reminder",
      text,
      route,
      injection,
      startedAt,
      { reason: "route_unchanged", expectedAction: "reuse prior routed context or use skills tools if needed" },
    );
    checkAbort(signal);
    return injectIntoMessage(userMessage, injection);
  } catch (error) {
    if (signal?.aborted || (isAbortError(error) && !scanBudget.signal.aborted)) {
      throw error;
    }
    const injection = buildReminderInstruction("scan timeout or routing error");
    logDiagnostic({
      event: "preprocess_fallback",
      requestId,
      reason: error instanceof Error ? error.message : String(error),
      activations: activationTokenList(requestedActivations),
      elapsedMs: Date.now() - startedAt,
      error: serializeError(error),
    });
    logPromptRoute(
      requestId,
      "fallback_reminder",
      text,
      undefined,
      injection,
      startedAt,
      { expectedAction: "use list_skills only if specialized skill is needed" },
    );
    return injectIntoMessage(userMessage, injection);
  } finally {
    scanBudget.cleanup();
  }
}
