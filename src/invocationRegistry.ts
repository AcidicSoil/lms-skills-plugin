export interface InvocationOwner {
  chatId: string;
  profileId?: string;
  workspaceId: string;
}
interface Entry {
  active: number;
  terminationUnresolved: boolean;
  owner: InvocationOwner;
}
export class WorkspaceInvocationRegistry {
  private readonly entries = new Map<string, Entry>();
  acquire(owner: InvocationOwner): () => void {
    const entry = this.entries.get(owner.workspaceId) ?? {
      active: 0,
      terminationUnresolved: false,
      owner,
    };
    entry.active += 1;
    entry.owner = owner;
    this.entries.set(owner.workspaceId, entry);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const current = this.entries.get(owner.workspaceId);
      if (!current) return;
      current.active = Math.max(0, current.active - 1);
      if (current.active === 0 && !current.terminationUnresolved)
        this.entries.delete(owner.workspaceId);
    };
  }
  markTerminationUnresolved(workspaceId: string): void {
    const entry = this.entries.get(workspaceId);
    if (entry) entry.terminationUnresolved = true;
    else
      this.entries.set(workspaceId, {
        active: 0,
        terminationUnresolved: true,
        owner: { chatId: 'unknown', workspaceId },
      });
  }
  resolveTermination(workspaceId: string): void {
    const entry = this.entries.get(workspaceId);
    if (!entry) return;
    entry.terminationUnresolved = false;
    if (entry.active === 0) this.entries.delete(workspaceId);
  }
  getState(workspaceId: string) {
    const e = this.entries.get(workspaceId);
    return {
      active: e?.active ?? 0,
      terminationUnresolved: e?.terminationUnresolved ?? false,
      owner: e?.owner,
    };
  }
  canMutate(
    workspaceId: string,
  ): { ok: true } | { ok: false; reason: 'active' | 'termination-unresolved' } {
    const e = this.entries.get(workspaceId);
    if (e?.terminationUnresolved) return { ok: false, reason: 'termination-unresolved' };
    if ((e?.active ?? 0) > 0) return { ok: false, reason: 'active' };
    return { ok: true };
  }
}
