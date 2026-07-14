import { createConfigSchematics } from "@lmstudio/sdk";
import {
  DEFAULT_MAX_SKILLS_IN_CONTEXT,
  MIN_MAX_SKILLS_IN_CONTEXT,
  MAX_MAX_SKILLS_IN_CONTEXT,
  DEFAULT_SKILLS_DIR,
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
    "skillsPath",
    "string",
    {
      displayName: "Skills Paths",
      subtitle:
        'Semicolon-separated list of skill directories, loaded in order. Leave empty to use last saved paths. Enter "default" to reset to ~/.lmstudio/plugin-data/skills',
    },
    DEFAULT_SKILLS_DIR,
  )
  .field(
    "executionEnvironment",
    "select",
    {
      displayName: "Execution Environment",
      subtitle: "Run commands on the host or through Windows Subsystem for Linux.",
      options: [
        { value: "host", displayName: "Host" },
        { value: "wsl", displayName: "WSL (Windows only)" },
      ],
    },
    "host",
  )
  .field(
    "wslDistribution",
    "string",
    {
      displayName: "WSL Distribution Override (advanced)",
      subtitle: "WSL-only. Leave empty to use the system default distribution; named overrides are validated before use.",
    },
    "",
  )
  .field(
    "shellPath",
    "string",
    {
      displayName: "Host Shell Path (optional)",
      subtitle:
        "Override the Host shell used by run_command. Ignored in WSL mode, which always uses /bin/bash.",
    },
    "",
  )
  .field(
    "windowsShell",
    "select",
    {
      displayName: "Windows Host Shell",
      subtitle: "Host-only. Selects the native Windows shell; WSL always uses Bash inside the selected distribution.",
      options: [
        { value: "cmd", displayName: "Command Prompt (cmd.exe)" },
        { value: "powershell", displayName: "PowerShell (pwsh/powershell.exe)" },
        { value: "git-bash", displayName: "Git Bash (bash.exe)" },
      ],
    },
    "cmd",
  )
  .build();
