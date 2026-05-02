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
      displayName: "Skill Discovery Budget",
      subtitle: `Maximum number of skills to scan/consider before routing (${MIN_MAX_SKILLS_IN_CONTEXT}-${MAX_MAX_SKILLS_IN_CONTEXT}). Prompt injection remains capped to the top routed skills, not this full number.`,
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
    "qmdExecutable",
    "string",
    {
      displayName: "QMD Binary",
      subtitle:
        "Optional qmd executable name or absolute path for enhanced skill search. Leave as qmd when it is on PATH.",
    },
    "qmd",
  )
  .field(
    "ckExecutable",
    "string",
    {
      displayName: "CK Binary",
      subtitle:
        "Optional ck executable name or absolute path for enhanced skill search. Leave as ck when it is on PATH.",
    },
    "ck",
  )
  .field(
    "skillSearchBackend",
    "select",
    {
      displayName: "Skill Search Backend",
      subtitle:
        "Optional backend for skill discovery. Built-in is dependency-free. Auto/qmd/ck are reserved for plugin-controlled enhanced search and fall back to built-in behavior when unavailable.",
      options: [
        {
          value: "builtin",
          displayName: "Built-in - exact, fuzzy, route, and full-text search",
        },
        {
          value: "auto",
          displayName: "Auto - use enhanced local search when available, otherwise built-in (recommended)",
        },
        {
          value: "qmd",
          displayName: "QMD - use plugin-controlled qmd search when available, otherwise built-in",
        },
        {
          value: "ck",
          displayName: "CK - use plugin-controlled ck search when available, otherwise built-in",
        },
      ],
    },
    "auto",
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
  .build();
