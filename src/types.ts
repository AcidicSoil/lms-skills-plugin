import type { RuntimeTargetName, SkillsEnvironment } from "./environment";
import type { CommandExecutionMode } from "./commandSafety";

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
}

export interface DirectoryEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  sizeBytes?: number;
  environment?: RuntimeTargetName;
  displayPath?: string;
}
