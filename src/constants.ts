import * as os from "os";
import * as path from "path";

export const DEFAULT_SKILLS_DIR = path.join(
  os.homedir(),
  ".lmstudio",
  "skills",
);
export const PLUGIN_DATA_DIR = path.join(
  os.homedir(),
  ".lmstudio",
  "plugin-data",
  "lms-skills",
);
export const SETTINGS_FILE = path.join(PLUGIN_DATA_DIR, "settings.json");

export const SKILL_ENTRY_POINT = "SKILL.md";
export const SKILL_MANIFEST_FILE = "skill.json";
export const RESET_TO_DEFAULT_SENTINEL = "default";

export const MAX_FILE_SIZE_BYTES = 102_400;
export const MAX_FILE_WRITE_BYTES = 1_048_576;
export const MAX_DESCRIPTION_CHARS = 1_536;
export const BODY_EXCERPT_CHARS = 2_000;
export const MAX_DIRECTORY_DEPTH = 3;
export const MAX_DIRECTORY_ENTRIES = 200;
export const DEFAULT_MAX_SKILLS_IN_CONTEXT = 15;
export const DEFAULT_MAX_ROUTED_SKILLS = 3;
export const ROUTER_DISCOVERY_MULTIPLIER = 8;
export const MIN_MAX_SKILLS_IN_CONTEXT = 1;
export const MAX_MAX_SKILLS_IN_CONTEXT = 50;
export const LIST_SKILLS_DEFAULT_LIMIT = 50;

export const TOOL_DEFAULT_TIMEOUT_MS = 45_000;
export const TOOL_LIST_SKILLS_TIMEOUT_MS = 60_000;
export const TOOL_READ_SKILL_FILE_TIMEOUT_MS = 30_000;
export const TOOL_LIST_SKILL_FILES_TIMEOUT_MS = 45_000;
export const TOOL_FILE_OPERATION_TIMEOUT_MS = 30_000;
export const TOOL_COMMAND_SETUP_TIMEOUT_MS = 15_000;

export const EXEC_DEFAULT_TIMEOUT_MS = 30_000;
export const EXEC_MAX_TIMEOUT_MS = 300_000;
export const EXEC_MAX_OUTPUT_BYTES = 100_000;
export const EXEC_MAX_COMMAND_LENGTH = 8_000;

export const SKILLS_PATH_SEPARATOR = ";";
export const CONFIG_CACHE_TTL_MS = 5_000;
export const PREPROCESSOR_SCAN_TIMEOUT_MS = 3_000;
export const INTERNAL_CONTEXT_REFRESH_INTERVAL_MS = 30 * 60 * 1_000;

export const MANAGED_QMD_DIR_NAME = "managed-qmd";
export const MANAGED_QMD_INDEX_TTL_MS = 10 * 60 * 1_000;
export const MANAGED_QMD_MAX_COPY_FILES = 2_000;
export const MANAGED_QMD_MAX_COPY_BYTES = 100 * 1024 * 1024;
