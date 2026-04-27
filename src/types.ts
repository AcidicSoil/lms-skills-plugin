import type { RuntimeTargetName, SkillsEnvironment } from "./environment";

export interface SkillInfo {
  name: string;
  description: string;
  bodyExcerpt: string;
  tags: string[];
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

export interface PersistedSettings {
  skillsPaths: string[];
  autoInject: boolean;
  maxSkillsInContext: number;
  skillsEnvironment: SkillsEnvironment;
  wslDistro: string;
  windowsShellPath: string;
  wslShellPath: string;
  shellPath: string;
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
}

export interface DirectoryEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  sizeBytes?: number;
  environment?: RuntimeTargetName;
  displayPath?: string;
}
