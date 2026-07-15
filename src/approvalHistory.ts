import type { ApprovalHistoryRecord } from './types';

export interface ApprovalHistoryOptions {
  maxPerWorkspace?: number;
  maxAgeMs?: number;
  now?: () => number;
}
export class ApprovalHistoryStore {
  constructor(
    private records: ApprovalHistoryRecord[] = [],
    private readonly options: ApprovalHistoryOptions = {},
  ) {}
  list(workspaceId: string): ApprovalHistoryRecord[] {
    return this.prune().filter((r) => r.workspaceId === workspaceId);
  }
  append(record: ApprovalHistoryRecord): ApprovalHistoryRecord[] {
    this.records = [...this.records, record];
    return this.prune();
  }
  revoke(id: string): ApprovalHistoryRecord[] {
    this.records = this.records.map((r) => (r.id === id ? { ...r, decision: 'revoked' } : r));
    return this.records;
  }
  clearWorkspace(workspaceId: string): ApprovalHistoryRecord[] {
    this.records = this.records.filter((r) => r.workspaceId !== workspaceId);
    return this.records;
  }
  findActiveGrant(
    workspaceId: string,
    path: string,
    scope: 'read' | 'write',
  ): ApprovalHistoryRecord | undefined {
    const now = this.now();
    return this.prune().find(
      (r) =>
        r.workspaceId === workspaceId &&
        r.path === path &&
        r.decision === 'approved' &&
        (!r.expiresAt || Date.parse(r.expiresAt) > now) &&
        (r.scope === 'write' || scope === 'read'),
    );
  }
  snapshot(): ApprovalHistoryRecord[] {
    return [...this.records];
  }
  private now() {
    return this.options.now?.() ?? Date.now();
  }
  private prune(): ApprovalHistoryRecord[] {
    const maxAge = this.options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000;
    const max = this.options.maxPerWorkspace ?? 100;
    const cutoff = this.now() - maxAge;
    const recent = this.records.filter((r) => Date.parse(r.timestamp) >= cutoff);
    const grouped = new Map<string, ApprovalHistoryRecord[]>();
    for (const r of recent) {
      const arr = grouped.get(r.workspaceId) ?? [];
      arr.push(r);
      grouped.set(r.workspaceId, arr);
    }
    this.records = [...grouped.values()].flatMap((arr) =>
      arr.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).slice(-max),
    );
    return [...this.records];
  }
}

export function createApprovalRecord(input: {
  id: string;
  workspaceId: string;
  profileId?: string;
  toolName: string;
  path?: string;
  scope?: 'read' | 'write';
  decision: 'approved' | 'denied';
  timestamp?: string;
  expiresAt?: string;
}): ApprovalHistoryRecord {
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    ...(input.profileId ? { profileId: input.profileId } : {}),
    toolName: input.toolName,
    ...(input.path ? { path: input.path.replace(/\\/g, '/') } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
    decision: input.decision,
    timestamp: input.timestamp ?? new Date().toISOString(),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };
}
