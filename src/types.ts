import type { RuntimeTargetName, SkillsEnvironment } from "./environment";
import type { CommandExecutionMode } from "./commandSafety";

export type SkillSearchBackend = "builtin" | "auto" | "qmd" | "ck";

export interface SkillInfo {
  name: string;
  description: string;
  bodyExcerpt: string;
  tags: string[];
  frontmatter?: SkillFrontmatter;
  metadataSource: "frontmatter" | "skill.json" | "markdown" | "fallback";
  disableModelInvocation: boolean;
  userInvocable: boolean;
  skillMdPath: string;
  directoryPath: string;
  resolvedSkillMdPath: string;
  resolvedDirectoryPath: string;
  displayPath: string;
  environment: RuntimeTargetName;
  environmentLabel: "Windows" | "WSL";
  hasExtraFiles: boolean;
}

export interface SkillManifestFile {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  whenToUse?: string;
  tags?: string[];
  disableModelInvocation?: boolean;
  userInvocable?: boolean;
  allowedTools?: string[];
  context?: string;
  agent?: string;
  model?: string;
  effort?: string;
  argumentHint?: string;
  arguments?: string[];
  license?: string;
  compatibility?: string;
  metadata?: string;
  paths?: string[];
  hooks?: string;
  shell?: string;
  extensionMetadata?: Record<string, string | string[]>;
}

export interface PersistedSettings {
  skillsPaths: string[];
  autoInject: boolean;
  maxSkillsInContext: number;
  skillsEnvironment: SkillsEnvironment;
  wslDistro: string;
  windowsShellPath: string;
  wslShellPath: string;
  shellPath: string;
  commandExecutionMode: CommandExecutionMode;
  skillSearchBackend: SkillSearchBackend;
  qmdExecutable: string;
  qmdCollections: string[];
  ckExecutable: string;
}

export interface EffectiveConfig {
  skillsPaths: string[];
  autoInject: boolean;
  maxSkillsInContext: number;
  skillsEnvironment: SkillsEnvironment;
  wslDistro: string;
  windowsShellPath: string;
  wslShellPath: string;
  shellPath: string;
  commandExecutionMode: CommandExecutionMode;
  skillSearchBackend: SkillSearchBackend;
  qmdExecutable: string;
  qmdCollections: string[];
  ckExecutable: string;
}

export interface DirectoryEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  sizeBytes?: number;
  environment?: RuntimeTargetName;
  displayPath?: string;
}
