import { resolveEffectiveConfig } from "../settings";
import { deriveRuntimeTargets } from "../environment";
import { createRuntimeRegistry } from "../runtime";
import { resolveSkillRoots } from "../pathResolver";
import { logDiagnostic, timedStep } from "../diagnostics";
import type { RuntimeRegistry } from "../runtime";
import type { RuntimeTargetName } from "../environment";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { PluginController } from "../pluginTypes";
import type { EffectiveConfig } from "../types";
import { emitToolDebugStatus, type ToolUiReporter } from "./toolsProviderUi";

export async function getRuntimeContext(
  ctl: PluginController,
  requestId: string,
  toolName: string,
  signal: AbortSignal,
  ui?: ToolUiReporter,
): Promise<{
  cfg: EffectiveConfig;
  registry: RuntimeRegistry;
  targets: RuntimeTargetName[];
  roots: ResolvedSkillRoot[];
}> {
  emitToolDebugStatus(ui, `${toolName}: resolving configuration`, { requestId });
  const cfg = await timedStep(requestId, toolName, "resolve_config", async () =>
    resolveEffectiveConfig(ctl),
  );
  emitToolDebugStatus(ui, `${toolName}: creating runtime registry`, {
    environment: cfg.skillsEnvironment,
    paths: cfg.skillsPaths.length,
  });
  const registry = await timedStep(requestId, toolName, "create_runtime_registry", async () =>
    createRuntimeRegistry(cfg),
  );
  const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
  emitToolDebugStatus(ui, `${toolName}: runtime targets ready`, {
    targets: targets.join(","),
    backend: cfg.skillSearchBackend,
  });
  logDiagnostic({
    event: "runtime_context",
    requestId,
    tool: toolName,
    skillsEnvironment: cfg.skillsEnvironment,
    targets,
    skillsPaths: cfg.skillsPaths,
    autoInject: cfg.autoInject,
    maxSkillsInContext: cfg.maxSkillsInContext,
    skillSearchBackend: cfg.skillSearchBackend,
    wslDistro: cfg.wslDistro || undefined,
    hasWindowsShellPath: Boolean(cfg.windowsShellPath),
    hasWslShellPath: Boolean(cfg.wslShellPath),
  });
  emitToolDebugStatus(ui, `${toolName}: resolving skill roots`, {
    targets: targets.length,
    rawPaths: cfg.skillsPaths.length,
  });
  const roots = await timedStep(
    requestId,
    toolName,
    "resolve_skill_roots",
    async () => resolveSkillRoots(cfg.skillsPaths, targets, registry, signal),
    { targetCount: targets.length, rawPathCount: cfg.skillsPaths.length },
  );
  emitToolDebugStatus(ui, `${toolName}: resolved skill roots`, { roots: roots.length });
  logDiagnostic({
    event: "roots_resolved",
    requestId,
    tool: toolName,
    rootCount: roots.length,
    roots: roots.map((r) => ({
      environment: r.environment,
      rawPath: r.rawPath,
      resolvedPath: r.resolvedPath,
      displayPath: r.displayPath,
    })),
  });
  return { cfg, registry, targets, roots };
}
