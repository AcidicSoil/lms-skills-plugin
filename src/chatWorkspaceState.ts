import type { ChatWorkspaceSelection, ExecutionEnvironment } from './types';

export class ChatWorkspaceStateStore {
  constructor(private selections: Record<string, ChatWorkspaceSelection> = {}) {}
  get(chatId: string): ChatWorkspaceSelection | undefined {
    return this.selections[chatId];
  }
  set(
    chatId: string,
    environment: ExecutionEnvironment,
    profileId?: string,
    updatedAt = new Date().toISOString(),
  ): Record<string, ChatWorkspaceSelection> {
    this.selections = {
      ...this.selections,
      [chatId]: { environment, ...(profileId ? { profileId } : {}), updatedAt },
    };
    return this.snapshot();
  }
  remove(chatId: string): Record<string, ChatWorkspaceSelection> {
    const next = { ...this.selections };
    delete next[chatId];
    this.selections = next;
    return this.snapshot();
  }
  snapshot(): Record<string, ChatWorkspaceSelection> {
    return { ...this.selections };
  }
}
