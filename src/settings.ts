import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  PLUGIN_DATA_DIR,
  SETTINGS_FILE,
  DEFAULT_SKILLS_DIR,
  DEFAULT_MAX_SKILLS_IN_CONTEXT,
  RESET_TO_DEFAULT_SENTINEL,
  SKILLS_PATH_SEPARATOR,
  CONFIG_CACHE_TTL_MS,
} from "./constants";
import { configSchematics } from "./config";
import type { PersistedSettings, EffectiveConfig, WorkspaceProfile } from "./types";
import type { PluginController } from "./pluginTypes";

const DEFAULTS: PersistedSettings = {
  skillsPaths: [DEFAULT_SKILLS_DIR],
  autoInject: true,
  maxSkillsInContext: DEFAULT_MAX_SKILLS_IN_CONTEXT,
  shellPath: "",
  windowsShell: "cmd",
  executionEnvironment: "host",
};

let configCache = new WeakMap<PluginController, { config: EffectiveConfig; time: number }>();

function defaultSkillsPaths(environment: "host" | "wsl"): string[] {
  return environment === "wsl" ? ["~/.lmstudio/skills"] : [DEFAULT_SKILLS_DIR];
}

export function expandHostSkillsPath(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
}

function parseSkillsPaths(raw: string, environment: "host" | "wsl"): string[] {
  return raw
    .split(SKILLS_PATH_SEPARATOR)
    .map((value) => environment === "host" ? expandHostSkillsPath(value) : value.trim())
    .filter(Boolean);
}


function normalizeProfiles(value: unknown): WorkspaceProfile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const profile = item as Partial<WorkspaceProfile>;
    if (typeof profile.id !== "string" || !profile.id.trim() || typeof profile.name !== "string" || !profile.name.trim()) return [];
    return [{
      id: profile.id.trim(),
      name: profile.name.trim(),
      hostPath: typeof profile.hostPath === "string" && profile.hostPath.trim() ? profile.hostPath.trim() : undefined,
      wslPath: typeof profile.wslPath === "string" && profile.wslPath.trim() ? profile.wslPath.trim() : undefined,
      enabled: profile.enabled !== false,
      trusted: profile.trusted === true,
      preferred: profile.preferred === true,
      deleted: profile.deleted === true,
      createdAt: typeof profile.createdAt === "string" ? profile.createdAt : undefined,
      updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : undefined,
      repositoryIdentity: typeof profile.repositoryIdentity === "string" && profile.repositoryIdentity.trim() ? profile.repositoryIdentity.trim() : undefined,
    }];
  });
}

export function normalizePersistedSettings(parsed: Partial<PersistedSettings>): PersistedSettings {
  const skillsPaths = Array.isArray(parsed.skillsPaths) && parsed.skillsPaths.length > 0
    ? parsed.skillsPaths.map((value) => parsed.executionEnvironment === "wsl" ? value.trim() : expandHostSkillsPath(value)).filter(Boolean)
    : defaultSkillsPaths(parsed.executionEnvironment === "wsl" ? "wsl" : "host");
  return {
    skillsPaths,
    autoInject: typeof parsed.autoInject === "boolean" ? parsed.autoInject : DEFAULTS.autoInject,
    maxSkillsInContext: typeof parsed.maxSkillsInContext === "number" && parsed.maxSkillsInContext >= 1
      ? parsed.maxSkillsInContext
      : DEFAULTS.maxSkillsInContext,
    shellPath: typeof parsed.shellPath === "string" ? parsed.shellPath : "",
    windowsShell: parsed.windowsShell === "powershell" || parsed.windowsShell === "cmd" || parsed.windowsShell === "git-bash"
      ? parsed.windowsShell
      : DEFAULTS.windowsShell,
    executionEnvironment: parsed.executionEnvironment === "wsl" ? "wsl" : "host",
    wslDistribution: typeof parsed.wslDistribution === "string" && parsed.wslDistribution.trim()
      ? parsed.wslDistribution.trim()
      : undefined,
    workspaceProfiles: normalizeProfiles(parsed.workspaceProfiles),
    activeWorkspaceProfileId: typeof parsed.activeWorkspaceProfileId === "string" && parsed.activeWorkspaceProfileId.trim() ? parsed.activeWorkspaceProfileId.trim() : undefined,
    hostWorkspacePath: typeof parsed.hostWorkspacePath === "string" && parsed.hostWorkspacePath.trim() ? parsed.hostWorkspacePath.trim() : undefined,
    wslWorkspacePath: typeof parsed.wslWorkspacePath === "string" && parsed.wslWorkspacePath.trim() ? parsed.wslWorkspacePath.trim() : undefined,
    workspacesEnabled: parsed.workspacesEnabled !== false,
  };
}

function loadSettings(): PersistedSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS };
    return normalizePersistedSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as Partial<PersistedSettings>);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    fs.mkdirSync(PLUGIN_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    configCache = new WeakMap();
  } catch {}
}

export function resolveEffectiveConfig(ctl: PluginController): EffectiveConfig {
  const now = Date.now();
  const cached = configCache.get(ctl);
  if (cached && now - cached.time < CONFIG_CACHE_TTL_MS) return cached.config;

  const c = ctl.getPluginConfig(configSchematics);
  const autoInject = (c.get("autoInject") as string) === "on";
  const maxSkillsInContext =
    (c.get("maxSkillsInContext") as number) ?? DEFAULTS.maxSkillsInContext;
  const rawPaths = ((c.get("skillsPath") as string | undefined) ?? "").trim();
  const shellPath = ((c.get("shellPath") as string | undefined) ?? "").trim();
  const windowsShell = ((c.get("windowsShell") as "powershell" | "cmd" | "git-bash" | undefined) ?? "cmd");
  const executionEnvironment = (c.get("executionEnvironment") as "host" | "wsl" | undefined) === "wsl" ? "wsl" : "host";
  const wslDistribution = ((c.get("wslDistribution") as string | undefined) ?? "").trim() || undefined;

  const saved = loadSettings();

  if (rawPaths === RESET_TO_DEFAULT_SENTINEL) {
    const next: PersistedSettings = {
      autoInject,
      maxSkillsInContext,
      skillsPaths: defaultSkillsPaths(executionEnvironment),
      shellPath,
      windowsShell,
      executionEnvironment,
      wslDistribution,
    };
    saveSettings(next);
    configCache.set(ctl, { config: next, time: now });
    return next;
  }

  const incomingPaths = parseSkillsPaths(rawPaths, executionEnvironment);
  const skillsPaths =
    incomingPaths.length > 0 &&
    incomingPaths.join(";") !== saved.skillsPaths.join(";")
      ? incomingPaths
      : saved.skillsPaths.length > 0
        ? saved.skillsPaths
        : defaultSkillsPaths(executionEnvironment);

  if (
    autoInject !== saved.autoInject ||
    maxSkillsInContext !== saved.maxSkillsInContext ||
    skillsPaths.join(";") !== saved.skillsPaths.join(";") ||
    shellPath !== saved.shellPath ||
    windowsShell !== saved.windowsShell ||
    executionEnvironment !== saved.executionEnvironment ||
    wslDistribution !== saved.wslDistribution
  ) {
    saveSettings({ ...saved, skillsPaths, autoInject, maxSkillsInContext, shellPath, windowsShell, executionEnvironment, wslDistribution });
  }

  const result: EffectiveConfig = {
    skillsPaths,
    autoInject,
    maxSkillsInContext,
    shellPath,
    windowsShell,
    executionEnvironment,
    wslDistribution,
    workspaceProfiles: saved.workspaceProfiles,
    activeWorkspaceProfileId: saved.activeWorkspaceProfileId,
    hostWorkspacePath: saved.hostWorkspacePath,
    wslWorkspacePath: saved.wslWorkspacePath,
    workspacesEnabled: saved.workspacesEnabled,
  };
  configCache.set(ctl, { config: result, time: now });
  return result;
}

export function updatePersistedSettings(patch: Partial<PersistedSettings>): PersistedSettings {
  const next = normalizePersistedSettings({ ...loadSettings(), ...patch });
  saveSettings(next);
  return next;
}

export function getPersistedSettings(): PersistedSettings {
  return loadSettings();
}
