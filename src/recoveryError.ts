export type RecoveryErrorCode =
  | "workspace-invalid"
  | "environment-unavailable"
  | "distribution-missing"
  | "tool-incompatible"
  | "approval-denied"
  | "identity-mismatch"
  | "termination-unresolved";

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
    "workspace-invalid": [{ action: "configure-workspace", label: "Choose or repair the workspace" }],
    "environment-unavailable": [{ action: "change-environment", label: "Select an available execution environment" }],
    "distribution-missing": [{ action: "select-distribution", label: "Select or install a WSL distribution" }],
    "tool-incompatible": [{ action: "change-tool-or-environment", label: "Use a compatible tool or environment" }],
    "approval-denied": [{ action: "request-approval", label: "Request the required approval" }],
    "identity-mismatch": [{ action: "revalidate-workspace", label: "Revalidate workspace identity" }],
    "termination-unresolved": [{ action: "resolve-termination", label: "Resolve the active process before retrying" }],
  };
  return { code, message, recoveryActions: actions[code] };
}

export function toRecoveryResponse(error: RecoveryError) {
  return { success: false as const, errorCode: error.code, message: error.message, error: error.message, recoveryActions: error.recoveryActions };
}
