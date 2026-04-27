import { createConfigSchematics } from "@lmstudio/sdk";
import {
  DEFAULT_MAX_SKILLS_IN_CONTEXT,
  MIN_MAX_SKILLS_IN_CONTEXT,
  MAX_MAX_SKILLS_IN_CONTEXT,
} from "./constants";

export const configSchematics = createConfigSchematics()
  .field(
    "autoInject",
    "select",
    {
      displayName: "Internal Skills Context",
      subtitle:
        "Automatically inject skills context behind the scenes. No manual system prompt is required when this is on.",
      options: [
        {
          value: "on",
          displayName: "On - automatically provide skills context (recommended)",
        },
        {
          value: "off",
          displayName: "Off - tools remain available, but no context is injected",
        },
      ],
    },
    "on",
  )
  .field(
    "maxSkillsInContext",
    "numeric",
    {
      displayName: "Max Skills in Context",
      subtitle: `Maximum number of skills to include in the internal skills context (${MIN_MAX_SKILLS_IN_CONTEXT}-${MAX_MAX_SKILLS_IN_CONTEXT})`,
      min: MIN_MAX_SKILLS_IN_CONTEXT,
      max: MAX_MAX_SKILLS_IN_CONTEXT,
      int: true,
      slider: {
        step: 1,
        min: MIN_MAX_SKILLS_IN_CONTEXT,
        max: MAX_MAX_SKILLS_IN_CONTEXT,
      },
    },
    DEFAULT_MAX_SKILLS_IN_CONTEXT,
  )
  .field(
    "skillsEnvironment",
    "select",
    {
      displayName: "Skills Runtime Environment",
      subtitle:
        "Choose where skill paths are resolved and commands run: Windows, WSL, or both isolated environments.",
      options: [
        {
          value: "windows",
          displayName: "Windows - use native Windows paths and shell",
        },
        {
          value: "wsl",
          displayName: "WSL - use Linux paths and bash through WSL",
        },
        {
          value: "both",
          displayName: "Both - scan Windows and WSL separately",
        },
      ],
    },
    "windows",
  )
  .field(
    "skillsPath",
    "string",
    {
      displayName: "Skills Paths",
      subtitle:
        'Semicolon-separated list of skill directories, loaded in order. Leave empty to use last saved paths. Enter "default" to reset to the runtime default.',
    },
    "",
  )

  .field(
    "commandExecutionMode",
    "select",
    {
      displayName: "Command Execution Safety",
      subtitle:
        "Controls the run_command tool. Disabled is safest. Read-only allows inspection commands. Guarded allows broader commands but blocks dangerous patterns.",
      options: [
        {
          value: "disabled",
          displayName: "Disabled - do not allow model-issued shell commands (recommended)",
        },
        {
          value: "readOnly",
          displayName: "Read-only - allow simple inspection commands only",
        },
        {
          value: "guarded",
          displayName: "Guarded - allow shell commands except blocked dangerous patterns",
        },
      ],
    },
    "disabled",
  )
  .field(
    "wslDistro",
    "string",
    {
      displayName: "WSL Distro (optional)",
      subtitle:
        "Optional WSL distribution name. Leave empty to use the default WSL distribution.",
    },
    "",
  )
  .field(
    "windowsShellPath",
    "string",
    {
      displayName: "Windows Shell Path (optional)",
      subtitle:
        "Override the Windows shell used by run_command. Leave empty to auto-detect PowerShell or cmd.",
    },
    "",
  )
  .field(
    "wslShellPath",
    "string",
    {
      displayName: "WSL Shell Path (optional)",
      subtitle:
        "Override the WSL shell used by run_command. Leave empty to use bash.",
    },
    "",
  )
  .field(
    "shellPath",
    "string",
    {
      displayName: "Legacy Shell Path (optional)",
      subtitle:
        "Legacy Windows shell override retained for backward compatibility. Prefer Windows Shell Path.",
    },
    "",
  )
  .build();
