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
import type { PersistedSettings, EffectiveConfig } from "./types";
import type { PluginController } from "./pluginTypes";

const DEFAULTS: PersistedSettings = {
  skillsPaths: [DEFAULT_SKILLS_DIR],
  autoInject: true,
  maxSkillsInContext: DEFAULT_MAX_SKILLS_IN_CONTEXT,
  shellPath: "",
  windowsShell: "cmd",
  executionEnvironment: "host",
};

let cachedConfig: EffectiveConfig | null = null;
let cacheTime = 0;

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
  };
}

function loadSettings(): PersistedSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS };
    const parsed = JSON.parse(
      fs.readFileSync(SETTINGS_FILE, "utf-8"),
    ) as Partial<PersistedSettings>;

    let skillsPaths: string[];
    if (Array.isArray(parsed.skillsPaths) && parsed.skillsPaths.length > 0) {
      skillsPaths = parsed.skillsPaths;
    } else {
      skillsPaths = DEFAULTS.skillsPaths;
    }

    return {
      skillsPaths,
      autoInject:
        typeof parsed.autoInject === "boolean"
          ? parsed.autoInject
          : DEFAULTS.autoInject,
      maxSkillsInContext:
        typeof parsed.maxSkillsInContext === "number" &&
        parsed.maxSkillsInContext >= 1
          ? parsed.maxSkillsInContext
          : DEFAULTS.maxSkillsInContext,
      shellPath: typeof parsed.shellPath === "string" ? parsed.shellPath : "",
      windowsShell: (parsed.windowsShell === "powershell" || parsed.windowsShell === "cmd" || parsed.windowsShell === "git-bash")
        ? parsed.windowsShell
        : DEFAULTS.windowsShell,
      executionEnvironment: parsed.executionEnvironment === "wsl" ? "wsl" : "host",
      wslDistribution: typeof parsed.wslDistribution === "string" && parsed.wslDistribution.trim() ? parsed.wslDistribution.trim() : undefined,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: PersistedSettings): void {
  try {
    fs.mkdirSync(PLUGIN_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    cachedConfig = null;
  } catch {}
}

export function resolveEffectiveConfig(ctl: PluginController): EffectiveConfig {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CONFIG_CACHE_TTL_MS)
    return cachedConfig;

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
    cachedConfig = next;
    cacheTime = now;
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
    saveSettings({ skillsPaths, autoInject, maxSkillsInContext, shellPath, windowsShell, executionEnvironment, wslDistribution });
  }

  const result: EffectiveConfig = {
    skillsPaths,
    autoInject,
    maxSkillsInContext,
    shellPath,
    windowsShell,
    executionEnvironment,
    wslDistribution,
  };
  cachedConfig = result;
  cacheTime = now;
  return result;
}
