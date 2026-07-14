export interface SkillInfo {
  name: string;
  description: string;
  bodyExcerpt: string;
  tags: string[];
  skillMdPath: string;
  directoryPath: string;
  hasExtraFiles: boolean;
}

export interface SkillManifestFile {
  name?: string;
  description?: string;
  tags?: string[];
}

export type ExecutionEnvironment = "host" | "wsl";

export interface WorkspaceProfile {
  id: string;
  name: string;
  hostPath?: string;
  wslPath?: string;
  enabled?: boolean;
  trusted?: boolean;
  preferred?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  repositoryIdentity?: string;
}

export interface ApprovalHistoryRecord {
  id: string; workspaceId: string; profileId?: string; toolName: string; path?: string; scope?: "read" | "write"; decision: "approved" | "denied" | "revoked"; timestamp: string; expiresAt?: string;
}

export interface ChatWorkspaceSelection { environment: ExecutionEnvironment; profileId?: string; updatedAt: string; }

export interface PersistedSettings {
  settingsSchemaVersion?: number;
  skillsPaths: string[];
  autoInject: boolean;
  maxSkillsInContext: number;
  shellPath: string;
  windowsShell?: "powershell" | "cmd" | "git-bash";
  executionEnvironment: ExecutionEnvironment;
  wslDistribution?: string;
  workspaceProfiles?: WorkspaceProfile[];
  activeWorkspaceProfileId?: string;
  hostWorkspacePath?: string;
  wslWorkspacePath?: string;
  workspacesEnabled?: boolean;
  approvalHistory?: ApprovalHistoryRecord[];
  chatWorkspaceSelections?: Record<string, ChatWorkspaceSelection>;
}

export interface EffectiveConfig {
  skillsPaths: string[];
  autoInject: boolean;
  maxSkillsInContext: number;
  shellPath: string;
  windowsShell?: "powershell" | "cmd" | "git-bash";
  executionEnvironment: ExecutionEnvironment;
  wslDistribution?: string;
  workspaceProfiles?: WorkspaceProfile[];
  activeWorkspaceProfileId?: string;
  hostWorkspacePath?: string;
  wslWorkspacePath?: string;
  workspacesEnabled?: boolean;
  approvalHistory?: ApprovalHistoryRecord[];
  chatWorkspaceSelections?: Record<string, ChatWorkspaceSelection>;
}

export interface WorkspaceContext {
  workspaceId: string;
  providerWorkingDirectory: string;
  executionEnvironment: ExecutionEnvironment;
  wslDistribution?: string;
  nativeRoot: string;
}

export interface DirectoryEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  sizeBytes?: number;
}
