import type { ExecutionEnvironment, WorkspaceProfile } from './types';

export type WorkspaceStatusCode =
  'unset' | 'valid' | 'unavailable' | 'moved' | 'configuration-required';

export interface ActiveWorkspaceSelection {
  scope: 'chat';
  profileId?: string;
  environment: ExecutionEnvironment;
}

export interface WorkspaceValidationFacts {
  configuredPath?: string;
  exists?: boolean;
  identityMatches?: boolean;
  configurationRequired?: boolean;
}

export interface WorkspaceStatus {
  code: WorkspaceStatusCode;
  scope: 'chat';
  profileId?: string;
  profileName?: string;
  environment: ExecutionEnvironment;
  nativePath?: string;
  executable: boolean;
  message: string;
}

export function deriveWorkspaceStatus(
  selection: ActiveWorkspaceSelection,
  profiles: WorkspaceProfile[],
  facts: WorkspaceValidationFacts,
): WorkspaceStatus {
  const profile = selection.profileId
    ? profiles.find((item) => item.id === selection.profileId)
    : undefined;
  const configuredPath =
    facts.configuredPath ??
    (selection.environment === 'wsl' ? profile?.wslPath : profile?.hostPath);
  const base = {
    scope: 'chat' as const,
    profileId: profile?.id,
    profileName: profile?.name,
    environment: selection.environment,
  };
  if (facts.configurationRequired)
    return {
      ...base,
      code: 'configuration-required',
      executable: false,
      message: 'Workspace configuration is required.',
    };
  if (!selection.profileId && !configuredPath)
    return { ...base, code: 'unset', executable: false, message: 'No workspace is selected.' };
  if (!profile && selection.profileId)
    return {
      ...base,
      code: 'configuration-required',
      executable: false,
      message: 'The selected workspace profile no longer exists.',
    };
  if (!configuredPath)
    return {
      ...base,
      code: 'configuration-required',
      executable: false,
      message: `No ${selection.environment} path is configured for this workspace.`,
    };
  if (facts.exists === false)
    return {
      ...base,
      nativePath: configuredPath,
      code: 'unavailable',
      executable: false,
      message: 'The configured workspace path is unavailable.',
    };
  if (facts.identityMatches === false)
    return {
      ...base,
      nativePath: configuredPath,
      code: 'moved',
      executable: false,
      message: 'The workspace appears to have moved or changed identity.',
    };
  return {
    ...base,
    nativePath: configuredPath,
    code: 'valid',
    executable: true,
    message: 'Workspace is ready.',
  };
}
