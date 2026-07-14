import { randomUUID } from "crypto";
import type { WorkspaceProfile } from "./types";

export interface WorkspacePage { items: WorkspaceProfile[]; nextCursor?: string; }
export interface WorkspaceListOptions { query?: string; cursor?: string; limit?: number; includeDeleted?: boolean; }

function sortProfiles(items: WorkspaceProfile[]): WorkspaceProfile[] {
  return [...items].sort((a,b) => Number(Boolean(b.preferred))-Number(Boolean(a.preferred)) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
function encodeCursor(id: string): string { return Buffer.from(id, "utf8").toString("base64url"); }
function decodeCursor(value?: string): string | undefined { try { return value ? Buffer.from(value, "base64url").toString("utf8") : undefined; } catch { return undefined; } }

export function listWorkspaces(profiles: WorkspaceProfile[], options: WorkspaceListOptions = {}): WorkspacePage {
  const q=(options.query??"").trim().toLowerCase(); const limit=Math.min(100,Math.max(1,options.limit??25));
  const filtered=sortProfiles(profiles.filter(p => (options.includeDeleted || !p.deleted) && (!q || [p.name,p.hostPath,p.wslPath].some(v=>v?.toLowerCase().includes(q)))));
  const after=decodeCursor(options.cursor); const start=after ? Math.max(0, filtered.findIndex(p=>p.id===after)+1) : 0;
  const items=filtered.slice(start,start+limit); const more=start+limit<filtered.length;
  return { items, nextCursor: more && items.length ? encodeCursor(items[items.length-1].id) : undefined };
}

export function addWorkspace(profiles: WorkspaceProfile[], input: Omit<WorkspaceProfile,"id"> & {id?:string}, now=new Date().toISOString()): WorkspaceProfile[] {
  const id=input.id?.trim() || randomUUID(); if (profiles.some(p=>p.id===id)) throw new Error(`Workspace profile already exists: ${id}`);
  return [...profiles,{...input,id,name:input.name.trim(),enabled:input.enabled!==false,trusted:input.trusted===true,preferred:input.preferred===true,deleted:false,createdAt:input.createdAt??now,updatedAt:now}];
}
export function updateWorkspace(profiles: WorkspaceProfile[], id:string, patch:Partial<WorkspaceProfile>, now=new Date().toISOString()): WorkspaceProfile[] {
  let found=false; const next=profiles.map(p=>{ if(p.id!==id)return p; found=true; return {...p,...patch,id,name:(patch.name??p.name).trim(),updatedAt:now}; }); if(!found) throw new Error(`Workspace profile not found: ${id}`); return next;
}
export const softDeleteWorkspace=(p:WorkspaceProfile[],id:string)=>updateWorkspace(p,id,{deleted:true,enabled:false});
export const restoreWorkspace=(p:WorkspaceProfile[],id:string)=>updateWorkspace(p,id,{deleted:false,enabled:true});
export function permanentlyDeleteWorkspace(profiles:WorkspaceProfile[],id:string,activeId?:string):WorkspaceProfile[]{ if(id===activeId) throw new Error("Cannot permanently delete the active workspace."); return profiles.filter(p=>p.id!==id); }
