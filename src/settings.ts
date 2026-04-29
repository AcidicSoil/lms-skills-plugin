import * as fs from "fs";
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
import { detectHostPlatform, parseSkillsEnvironment } from "./environment";
import type { PersistedSettings, EffectiveConfig, SkillSearchBackend } from "./types";
import type { CommandExecutionMode } from "./commandSafety";
import type { PluginController } from "./pluginTypes";

function parseCommandExecutionMode(value: unknown): CommandExecutionMode {
  if (value === "disabled" || value === "readOnly" || value === "guarded") {
    return value;
  }
  return "disabled";
}

function parseSkillSearchBackend(value: unknown): SkillSearchBackend {
  if (value === "builtin" || value === "auto" || value === "qmd" || value === "ck") {
    return value;
  }
  return "builtin";
}

const DEFAULTS: PersistedSettings = {
  skillsPaths: [DEFAULT_SKILLS_DIR],
  autoInject: true,
  maxSkillsInContext: DEFAULT_MAX_SKILLS_IN_CONTEXT,
  skillsEnvironment: detectHostPlatform() === "windows" ? "windows" : "wsl",
  shellPath: "",
  windowsShellPath: "",
  wslShellPath: "",
  wslDistro: "",
  commandExecutionMode: "disabled",
  skillSearchBackend: "builtin",
  qmdExecutable: "qmd",
  qmdCollections: [],
  ckExecutable: "ck",
};

let cachedConfig: EffectiveConfig | null = null;
let cacheTime = 0;

export function parseSkillsPaths(raw: string): string[] {
  return raw
    .split(SKILLS_PATH_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseOptionalList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (typeof raw !== "string") return [];
  return raw
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function loadSettings(): PersistedSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS };
    const parsed = JSON.parse(
      fs.readFileSync(SETTINGS_FILE, "utf-8"),
    ) as Partial<PersistedSettings>;
    const legacyShellPath = typeof parsed.shellPath === "string" ? parsed.shellPath : "";
    const windowsShellPath =
      typeof parsed.windowsShellPath === "string" ? parsed.windowsShellPath : legacyShellPath;

    return {
      skillsPaths:
        Array.isArray(parsed.skillsPaths) && parsed.skillsPaths.length > 0
          ? parsed.skillsPaths.filter((p): p is string => typeof p === "string")
          : DEFAULTS.skillsPaths,
      autoInject:
        typeof parsed.autoInject === "boolean" ? parsed.autoInject : DEFAULTS.autoInject,
      maxSkillsInContext:
        typeof parsed.maxSkillsInContext === "number" && parsed.maxSkillsInContext >= 1
          ? parsed.maxSkillsInContext
          : DEFAULTS.maxSkillsInContext,
      skillsEnvironment: parseSkillsEnvironment(parsed.skillsEnvironment),
      shellPath: legacyShellPath,
      windowsShellPath,
      wslShellPath: typeof parsed.wslShellPath === "string" ? parsed.wslShellPath : "",
      wslDistro: typeof parsed.wslDistro === "string" ? parsed.wslDistro : "",
      commandExecutionMode: parseCommandExecutionMode(parsed.commandExecutionMode),
      skillSearchBackend: parseSkillSearchBackend(parsed.skillSearchBackend),
      qmdExecutable: typeof parsed.qmdExecutable === "string" && parsed.qmdExecutable.trim() ? parsed.qmdExecutable.trim() : DEFAULTS.qmdExecutable,
      qmdCollections: parseOptionalList(parsed.qmdCollections),
      ckExecutable: typeof parsed.ckExecutable === "string" && parsed.ckExecutable.trim() ? parsed.ckExecutable.trim() : DEFAULTS.ckExecutable,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    fs.mkdirSync(PLUGIN_DATA_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    cachedConfig = null;
  } catch {}
}

export function resolveEffectiveConfig(ctl: PluginController): EffectiveConfig {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CONFIG_CACHE_TTL_MS) return cachedConfig;

  const c = ctl.getPluginConfig(configSchematics);
  const saved = loadSettings();
  const autoInject = (c.get("autoInject") as string) === "on";
  const maxSkillsInContext =
    (c.get("maxSkillsInContext") as number) ?? DEFAULTS.maxSkillsInContext;
  const rawPaths = ((c.get("skillsPath") as string | undefined) ?? "").trim();
  const skillsEnvironment = parseSkillsEnvironment(
    c.get("skillsEnvironment") || saved.skillsEnvironment,
  );
  const shellPath = ((c.get("shellPath") as string | undefined) ?? "").trim();
  const windowsShellPath =
    ((c.get("windowsShellPath") as string | undefined) ?? "").trim() ||
    shellPath ||
    saved.windowsShellPath;
  const wslShellPath =
    ((c.get("wslShellPath") as string | undefined) ?? "").trim() || saved.wslShellPath;
  const wslDistro =
    ((c.get("wslDistro") as string | undefined) ?? "").trim() || saved.wslDistro;
  const commandExecutionMode = parseCommandExecutionMode(
    c.get("commandExecutionMode") || saved.commandExecutionMode,
  );
  const skillSearchBackend = parseSkillSearchBackend(
    c.get("skillSearchBackend") || saved.skillSearchBackend,
  );
  const qmdExecutable =
    ((c.get("qmdExecutable") as string | undefined) ?? "").trim() || saved.qmdExecutable || DEFAULTS.qmdExecutable;
  const qmdCollections = parseOptionalList(
    ((c.get("qmdCollections") as string | undefined) ?? "").trim() || saved.qmdCollections,
  );
  const ckExecutable =
    ((c.get("ckExecutable") as string | undefined) ?? "").trim() || saved.ckExecutable || DEFAULTS.ckExecutable;

  if (rawPaths === RESET_TO_DEFAULT_SENTINEL) {
    const next: PersistedSettings = {
      ...DEFAULTS,
      autoInject,
      maxSkillsInContext,
      skillsEnvironment,
      shellPath,
      windowsShellPath,
      wslShellPath,
      wslDistro,
      commandExecutionMode,
      skillSearchBackend,
      qmdExecutable,
      qmdCollections,
      ckExecutable,
    };
    saveSettings(next);
    cachedConfig = next;
    cacheTime = now;
    return next;
  }

  const incomingPaths = parseSkillsPaths(rawPaths);
  const skillsPaths =
    incomingPaths.length > 0 && incomingPaths.join(";") !== saved.skillsPaths.join(";")
      ? incomingPaths
      : saved.skillsPaths.length > 0
        ? saved.skillsPaths
        : DEFAULTS.skillsPaths;

  const next: PersistedSettings = {
    skillsPaths,
    autoInject,
    maxSkillsInContext,
    skillsEnvironment,
    shellPath,
    windowsShellPath,
    wslShellPath,
    wslDistro,
    commandExecutionMode,
    skillSearchBackend,
    qmdExecutable,
    qmdCollections,
    ckExecutable,
  };

  if (JSON.stringify(next) !== JSON.stringify(saved)) saveSettings(next);

  cachedConfig = next;
  cacheTime = now;
  return next;
}
