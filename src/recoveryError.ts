export type RecoveryErrorCode =
  | 'workspace-invalid'
  | 'environment-unavailable'
  | 'distribution-missing'
  | 'tool-incompatible'
  | 'approval-denied'
  | 'identity-mismatch'
  | 'termination-unresolved'
  | 'workspace-busy'
  | 'trust-required'
  | 'workspace-disabled'
  | 'profile-deleted'
  | 'destructive-confirmation-required';

export interface RecoveryAction {
  action: string;
  label: string;
}

export interface RecoveryError {
  code: RecoveryErrorCode;
  message: string;
  recoveryActions: RecoveryAction[];
}

export function recoveryError(code: RecoveryErrorCode, message: string): RecoveryError {
  const actions: Record<RecoveryErrorCode, RecoveryAction[]> = {
    'workspace-invalid': [
      { action: 'configure-workspace', label: 'Choose or repair the workspace' },
    ],
    'environment-unavailable': [
      { action: 'change-environment', label: 'Select an available execution environment' },
    ],
    'distribution-missing': [
      { action: 'select-distribution', label: 'Select or install a WSL distribution' },
    ],
    'tool-incompatible': [
      { action: 'change-tool-or-environment', label: 'Use a compatible tool or environment' },
    ],
    'approval-denied': [{ action: 'request-approval', label: 'Request the required approval' }],
    'identity-mismatch': [
      { action: 'revalidate-workspace', label: 'Revalidate workspace identity' },
    ],
    'termination-unresolved': [
      { action: 'resolve-termination', label: 'Resolve the active process before retrying' },
    ],
    'workspace-busy': [
      { action: 'wait-for-invocation', label: 'Wait for the active workspace operation' },
    ],
    'trust-required': [{ action: 'trust-workspace', label: 'Mark this workspace as trusted' }],
    'workspace-disabled': [{ action: 'enable-workspace', label: 'Enable workspace functionality' }],
    'profile-deleted': [{ action: 'restore-workspace', label: 'Restore the deleted workspace' }],
    'destructive-confirmation-required': [
      { action: 'confirm-destructive-action', label: 'Confirm the destructive operation' },
    ],
  };
  return { code, message, recoveryActions: actions[code] };
}

export class RecoveryFailure extends Error {
  readonly recovery: RecoveryError;

  constructor(recovery: RecoveryError) {
    super(recovery.message);
    this.name = 'RecoveryFailure';
    this.recovery = recovery;
  }
}

export function toRecoveryResponse(error: RecoveryError) {
  return {
    success: false as const,
    errorCode: error.code,
    message: error.message,
    error: error.message,
    recoveryActions: error.recoveryActions,
  };
}

export function mapUnknownToRecovery(error: unknown): RecoveryError {
  if (error instanceof RecoveryFailure) return error.recovery;
  const message = error instanceof Error ? error.message : String(error);
  return recoveryError('workspace-invalid', message);
}
