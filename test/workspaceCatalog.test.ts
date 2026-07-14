import test from "node:test";
import assert from "node:assert/strict";
import { addWorkspace, listWorkspaces, permanentlyDeleteWorkspace, restoreWorkspace, softDeleteWorkspace, updateWorkspace } from "../src/workspaceCatalog";
import type { WorkspaceProfile } from "../src/types";

function fixture(count = 500): WorkspaceProfile[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p-${i.toString().padStart(3,"0")}`, name: `Workspace ${i}`, hostPath: `/work/${i}`, enabled: true, trusted: i % 2 === 0, preferred: i < 3 }));
}

test("workspace catalog paginates large lists without duplicates", () => {
  const profiles=fixture(); const ids:string[]=[]; let cursor: string|undefined;
  do { const page=listWorkspaces(profiles,{limit:37,cursor}); ids.push(...page.items.map(i=>i.id)); cursor=page.nextCursor; } while(cursor);
  assert.equal(ids.length,500); assert.equal(new Set(ids).size,500); assert.deepEqual(ids.slice(0,3),["p-000","p-001","p-002"]);
});

test("workspace catalog search is case insensitive across name and paths", () => {
  const page=listWorkspaces(fixture(30),{query:"WORK/12"}); assert.deepEqual(page.items.map(i=>i.id),["p-012"]);
});

test("trusted and preferred flags update independently", () => {
  let profiles=addWorkspace([], {name:"Demo",hostPath:"/demo",trusted:false,preferred:false,id:"demo"});
  profiles=updateWorkspace(profiles,"demo",{trusted:true});
  assert.equal(profiles[0].trusted,true); assert.equal(profiles[0].preferred,false);
});

test("workspace lifecycle supports soft delete restore and guarded permanent delete", () => {
  let profiles=fixture(2); profiles=softDeleteWorkspace(profiles,"p-000"); assert.equal(listWorkspaces(profiles).items.length,1);
  profiles=restoreWorkspace(profiles,"p-000"); assert.equal(listWorkspaces(profiles).items.length,2);
  assert.throws(()=>permanentlyDeleteWorkspace(profiles,"p-000","p-000"),/active workspace/);
  profiles=permanentlyDeleteWorkspace(profiles,"p-000"); assert.equal(profiles.length,1);
});
