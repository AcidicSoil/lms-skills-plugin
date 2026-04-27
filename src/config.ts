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
      displayName: "Auto-Inject Skills List",
      subtitle:
        "Automatically inject the list of available skills into every prompt so the model knows when to use them",
      options: [
        {
          value: "on",
          displayName: "On - inject skill list into every prompt (recommended)",
        },
        {
          value: "off",
          displayName: "Off - only use skills when tools are called explicitly",
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
      subtitle: `Maximum number of skills to list in the injected prompt (${MIN_MAX_SKILLS_IN_CONTEXT}-${MAX_MAX_SKILLS_IN_CONTEXT})`,
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
