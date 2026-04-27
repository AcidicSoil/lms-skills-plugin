import { createHash } from "crypto";
import { resolveEffectiveConfig } from "./settings";
import { readSkillFile, resolveSkillByName, scanSkills } from "./scanner";
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
  content?: string;
  contentDisplayPath?: string;
  contentError?: string;
}

const SKILL_ACTIVATION_PATTERN = /(^|[^A-Za-z0-9_])\$([a-z][a-z0-9._-]{1,127})(?=$|[^A-Za-z0-9._-])/g;

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
): string {
  return buildExplicitSkillActivationBlock(activations);
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

function normalizeUserMessageText(text: string): string {
  return text.replace(/^\s*user:\s*/i, "");
}


function sha256Short(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function contentPreview(content: string, maxChars = 180): string {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > maxChars ? `${compact.slice(0, maxChars - 3)}...` : compact;
}

function expandedSkillProof(activations: ResolvedSkillActivation[]): string {
  return activations
    .filter((activation) => activation.skill)
    .map((activation) => {
      const skill = activation.skill!;
      if (!activation.content) {
        return `${skill.name}:ERROR:${activation.contentError ?? "not-expanded"}`;
      }
      return `${skill.name}:expanded:${activation.content.length}B:sha256=${sha256Short(activation.content)}:source=${activation.contentDisplayPath ?? skill.displayPath}:preview="${contentPreview(activation.content, 96)}"`;
    })
    .join(" | ") || "-";
}

function routedSkillProof(candidates: SkillRouteCandidate[]): string {
  return candidates
    .map((candidate, index) => `${index + 1}:${candidate.skill.name}:score=${candidate.score}:confidence=${candidate.confidence}:source=${candidate.skill.displayPath}:why=${candidate.reasons.slice(0, 2).join("+") || "score"}`)
    .join(" | ") || "-";
}

function logContextInjection(
  requestId: string,
  kind: "explicit_expanded" | "routed" | "reminder" | "fallback",
  injection: string,
  payload: string | undefined,
  extra: Record<string, unknown> = {},
): void {
  const injectionSha256 = sha256Short(injection);
  logDiagnostic({
    event: "context_injection",
    requestId,
    kind,
    injectionChars: injection.length,
    injectionSha256,
    injectionPreview: contentPreview(injection),
    payloadChars: payload?.length ?? 0,
    payloadSha256: payload ? sha256Short(payload) : "-",
    payloadPreview: payload ? contentPreview(payload) : "-",
    ...extra,
  });
  logDiagnostic({
    event: "context_injection_content",
    requestId,
    kind,
    injectedContext: injection,
    injectedContextChars: injection.length,
    injectedContextSha256: injectionSha256,
    taskPayload: payload,
    ...extra,
  });
}


function removeActivationTokensFromPayload(
  text: string,
  activations: SkillActivationRequest[],
): string {
  let payload = text;
  for (const activation of activations) {
    payload = payload.split(activation.token).join("");
  }
  return payload.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function injectExplicitIntoMessage(
  message: MessageInput,
  injection: string,
  payload: string,
  skillNames: string[],
): MessageInput {
  const skillAttr = skillNames.join(",") || "unresolved";
  const content = `${injection}\n\n<task_payload for_expanded_skills="${skillAttr}">\n${payload}\n</task_payload>`;
  if (typeof message === "string") {
    return content;
  }
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") {
      return { ...m, content };
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
        updated[first] = { ...block, text: content };
        return { ...m, content: updated };
      }
      return { ...m, content: [{ type: "text", text: content }, ...m.content] };
    }
  }
  return message;
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
    if (!skill) {
      resolved.push({ ...activation });
      continue;
    }

    const read = await readSkillFile(skill, undefined, registry, signal);
    if ("error" in read) {
      resolved.push({ ...activation, skill, contentError: read.error });
      continue;
    }

    resolved.push({
      ...activation,
      skill,
      content: read.content,
      contentDisplayPath: read.displayPath,
    });
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
  const text = normalizeUserMessageText(extractText(userMessage));
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

    if (requestedActivations.length > 0) {
      const activatedSkills = resolvedActivations
        .map((activation) => activation.skill)
        .filter((skill): skill is SkillInfo => Boolean(skill));
      const expandedCount = resolvedActivations.filter((activation) => activation.content).length;
      const injection = buildExplicitInjection(resolvedActivations);
      logDiagnostic({
        event: "preprocess_activation",
        requestId,
        activations: activationTokenList(requestedActivations),
        resolvedSkills: resolvedActivationNames(resolvedActivations),
        unresolvedSkills: unresolvedActivationNames(resolvedActivations),
        expandedCount,
      });
      logPromptRoute(
        requestId,
        "explicit_activation_expanded",
        text,
        undefined,
        injection,
        startedAt,
        {
          activations: activationTokenList(requestedActivations),
          resolvedSkills: resolvedActivationNames(resolvedActivations),
          unresolvedSkills: unresolvedActivationNames(resolvedActivations),
          expectedAction: activatedSkills.length
            ? `expanded_skill(${activatedSkills.map((skill) => skill.name).join(",")}) before_model`
            : "list_skills for unresolved activation",
          expandedCount,
        },
      );
      const taskPayload = removeActivationTokensFromPayload(text, requestedActivations);
      logContextInjection(
        requestId,
        "explicit_expanded",
        injection,
        taskPayload,
        {
          skills: activatedSkills.map((skill) => skill.name).join(",") || "-",
          expandedSkills: expandedSkillProof(resolvedActivations),
          unresolvedSkills: unresolvedActivationNames(resolvedActivations),
          packet: "skill_invocation_packet",
          payloadWrapper: "task_payload",
        },
      );
      checkAbort(signal);
      return injectExplicitIntoMessage(
        userMessage,
        injection,
        taskPayload,
        activatedSkills.map((skill) => skill.name),
      );
    }

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
      logContextInjection(
        requestId,
        "reminder",
        injection,
        text,
        { reason: "no_confident_skill_route", selected: "-" },
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
      logContextInjection(
        requestId,
        "routed",
        injection,
        text,
        {
          reason,
          routedSkills: routedSkillProof(route.selected),
          selectedCount: route.selected.length,
          packet: "routed_skills",
        },
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
    logContextInjection(
      requestId,
      "reminder",
      injection,
      text,
      {
        reason: "route_unchanged",
        routedSkills: routedSkillProof(route.selected),
        selectedCount: route.selected.length,
      },
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
    logContextInjection(
      requestId,
      "fallback",
      injection,
      text,
      { reason: error instanceof Error ? error.message : String(error) },
    );
    return injectIntoMessage(userMessage, injection);
  } finally {
    scanBudget.cleanup();
  }
}
