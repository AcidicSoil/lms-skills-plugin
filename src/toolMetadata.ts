import type { ExecutionEnvironment } from './types';
export interface ToolMetadata {
  name: string;
  requiresWorkspace: boolean;
  destructive: boolean;
  environments?: ExecutionEnvironment[];
}
export interface PathGrant {
  path: string;
  scope: 'read' | 'write';
}
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  read_file: { name: 'read_file', requiresWorkspace: true, destructive: false },
  write_file: { name: 'write_file', requiresWorkspace: true, destructive: true },
  patch_file: { name: 'patch_file', requiresWorkspace: true, destructive: true },
  append_to_file: { name: 'append_to_file', requiresWorkspace: true, destructive: true },
  create_directory: { name: 'create_directory', requiresWorkspace: true, destructive: true },
  list_directory: { name: 'list_directory', requiresWorkspace: true, destructive: false },
  delete_file: { name: 'delete_file', requiresWorkspace: true, destructive: true },
  move_file: { name: 'move_file', requiresWorkspace: true, destructive: true },
  rename_file: { name: 'rename_file', requiresWorkspace: true, destructive: true },
  change_directory: { name: 'change_directory', requiresWorkspace: true, destructive: false },
  get_current_directory: {
    name: 'get_current_directory',
    requiresWorkspace: true,
    destructive: false,
  },
  run_command: { name: 'run_command', requiresWorkspace: true, destructive: true },
};
export function grantAllows(
  grant: PathGrant | undefined,
  path: string,
  scope: 'read' | 'write',
): boolean {
  if (!grant) return false;
  const norm = (v: string) => v.replace(/\\/g, '/').replace(/\/+$/g, '');
  return norm(grant.path) === norm(path) && (grant.scope === 'write' || scope === 'read');
}
