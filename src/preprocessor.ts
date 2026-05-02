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
import { routeSkills } from "./skillRouter";
import type { PluginController } from "./pluginTypes";
import type { SkillInfo } from "./types";
import type { SkillRouteCandidate } from "./skillRouter";
import {
  activationTokenList,
  extractSkillActivations,
  removeActivationTokensFromPayload,
  resolvedActivationNames,
  unresolvedActivationNames,
  type ResolvedSkillActivation,
  type SkillActivationRequest,
} from "./preprocessor/activations";
import { buildExplicitInjection, buildReminderInstruction, buildRoutedInjection } from "./preprocessor/rendering";
import { extractText, injectExplicitIntoMessage, injectIntoMessage, normalizeUserMessageText, type MessageInput } from "./preprocessor/messages";
import { computeFingerprint, expandedSkillProof, routedSkillProof } from "./preprocessor/proofs";
import { logContextInjection, logPromptRoute } from "./preprocessor/diagnostics";
import { createTimeoutSignal } from "./preprocessor/timeout";


function routedSkillLimit(configuredLimit: number): number {
  return Math.max(1, Math.min(DEFAULT_MAX_ROUTED_SKILLS, configuredLimit));
}





let lastFingerprint = "";
let lastFullInjectionAt = 0;

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
