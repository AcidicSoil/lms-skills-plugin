import type { ExecutionEnvironment } from './types';
import type { WorkspaceStatus } from './workspaceSelection';
import type { WslCapability } from './wslCapability';
import { recoveryError, type RecoveryError } from './recoveryError';
import { grantAllows, type PathGrant } from './toolMetadata';

export interface ToolCompatibility {
  name: string;
  environments?: ExecutionEnvironment[];
}

export interface PreflightInput {
  environment: ExecutionEnvironment;
  workspace: WorkspaceStatus;
  capability?: WslCapability;
  tool?: ToolCompatibility;
  approvalGranted?: boolean;
  outsideWorkspacePath?: string;
  outsideWorkspaceScope?: 'read' | 'write';
  pathGrant?: PathGrant;
  destructive?: boolean;
  destructiveConfirmed?: boolean;
  affectedPaths?: string[];
  identityMatches?: boolean;
  terminationResolved?: boolean;
}

export type PreflightResult =
  | { ok: true; environment: ExecutionEnvironment; workspace: WorkspaceStatus }
  | { ok: false; error: RecoveryError };

export function runPreflight(input: PreflightInput): PreflightResult {
  if (input.terminationResolved === false)
    return {
      ok: false,
      error: recoveryError(
        'termination-unresolved',
        'A previous process has not finished terminating.',
      ),
    };
  if (input.approvalGranted === false)
    return {
      ok: false,
      error: recoveryError('approval-denied', 'The required approval was denied.'),
    };
  if (
    input.outsideWorkspacePath &&
    !grantAllows(input.pathGrant, input.outsideWorkspacePath, input.outsideWorkspaceScope ?? 'read')
  ) {
    return {
      ok: false,
      error: recoveryError(
        'approval-denied',
        'Outside-workspace access requires a path- and scope-specific approval.',
      ),
    };
  }
  if (input.destructive && !input.destructiveConfirmed) {
    const preview = input.affectedPaths?.length
      ? ` Affected paths: ${input.affectedPaths.join(', ')}.`
      : '';
    return {
      ok: false,
      error: recoveryError(
        'destructive-confirmation-required',
        `Destructive action requires confirmation.${preview}`,
      ),
    };
  }
  if (input.identityMatches === false || input.workspace.code === 'moved')
    return {
      ok: false,
      error: recoveryError(
        'identity-mismatch',
        'Workspace identity no longer matches the selected profile.',
      ),
    };
  if (input.tool?.environments && !input.tool.environments.includes(input.environment)) {
    return {
      ok: false,
      error: recoveryError(
        'tool-incompatible',
        `${input.tool.name} is not compatible with ${input.environment}.`,
      ),
    };
  }
  if (input.environment === 'wsl') {
    const capability = input.capability;
    if (
      !capability ||
      capability.status === 'pending' ||
      capability.status === 'unsupported-platform' ||
      capability.status === 'wsl-unavailable'
    ) {
      return {
        ok: false,
        error: recoveryError('environment-unavailable', 'WSL is not currently available.'),
      };
    }
    if (
      capability.status === 'no-distribution' ||
      capability.status === 'no-default-distribution' ||
      capability.status === 'distribution-unavailable'
    ) {
      return {
        ok: false,
        error: recoveryError(
          'distribution-missing',
          'The selected WSL distribution is unavailable.',
        ),
      };
    }
  }
  if (input.workspace.code !== 'valid' || !input.workspace.executable) {
    return { ok: false, error: recoveryError('workspace-invalid', input.workspace.message) };
  }
  return { ok: true, environment: input.environment, workspace: input.workspace };
}
