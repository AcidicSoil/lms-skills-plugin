import test from "node:test";
import assert from "node:assert/strict";
import { toolsProvider } from "../src/toolsProvider";
import type { PluginController } from "../src/pluginTypes";
import type { PersistedSettings, WorkspaceProfile } from "../src/types";

function controller(): PluginController {
  return {
    getWorkingDirectory: () => "/provider/project",
    getPluginConfig: () => ({ get(key: string) {
      const values: Record<string, unknown> = { skillsPath: "default", autoInject: true, maxSkillsInContext: 15, shellPath: "", windowsShell: "cmd", executionEnvironment: "host", wslDistribution: "" };
      return values[key];
    }}),
  };
}

async function invoke(tools: any[], name: string, params: Record<string, unknown> = {}) {
  const selected = tools.find((tool) => tool.name === name);
  assert.ok(selected, `Missing tool ${name}`);
  return selected.implementation(params, { status() {} });
}

function manyProfiles(): WorkspaceProfile[] {
  return Array.from({ length: 500 }, (_, i) => ({
    id: `p-${i.toString().padStart(3, "0")}`,
    name: `Workspace ${i}`,
    hostPath: `/work/${i}`,
    enabled: true,
    trusted: true,
    preferred: i < 2,
  }));
}

test("workspace picker incrementally loads a large profile list", async () => {
  let state: PersistedSettings = { skillsPaths:["/skills"], autoInject:true, maxSkillsInContext:15, shellPath:"", executionEnvironment:"host", workspaceProfiles:manyProfiles(), workspacesEnabled:true };
  const tools = await toolsProvider(controller(), { getSettings:()=>state, updateSettings:(patch)=>(state={...state,...patch}) });
  const ids:string[]=[]; let cursor:string|undefined;
  do {
    const page = await invoke(tools, "list_workspaces", { limit: 43, cursor });
    ids.push(...page.items.map((item:WorkspaceProfile)=>item.id)); cursor=page.nextCursor;
  } while(cursor);
  assert.equal(ids.length,500); assert.equal(new Set(ids).size,500); assert.deepEqual(ids.slice(0,2),["p-000","p-001"]);
});

test("workspace picker adds, updates, disables, deletes, and restores profiles", async () => {
  let state: PersistedSettings = { skillsPaths:["/skills"], autoInject:true, maxSkillsInContext:15, shellPath:"", executionEnvironment:"host", workspaceProfiles:[], workspacesEnabled:true };
  const tools = await toolsProvider(controller(), { getSettings:()=>state, updateSettings:(patch)=>(state={...state,...patch}) });
  const added = await invoke(tools,"add_workspace",{name:"Demo",host_path:"/work/demo",trusted:true,preferred:true});
  const id = added.profile.id;
  await invoke(tools,"update_workspace",{profile_id:id,trusted:false,preferred:true,enabled:false});
  assert.equal(state.workspaceProfiles?.[0].trusted,false); assert.equal(state.workspaceProfiles?.[0].preferred,true); assert.equal(state.workspaceProfiles?.[0].enabled,false);
  await invoke(tools,"set_workspaces_enabled",{enabled:false}); assert.equal(state.workspacesEnabled,false);
  await invoke(tools,"delete_workspace",{profile_id:id}); assert.equal(state.workspaceProfiles?.[0].deleted,true);
  await invoke(tools,"restore_workspace",{profile_id:id}); assert.equal(state.workspaceProfiles?.[0].deleted,false);
});

test("workspace switch is transactional and affects the next command", async () => {
  let state: PersistedSettings = { skillsPaths:["/skills"], autoInject:true, maxSkillsInContext:15, shellPath:"", executionEnvironment:"host", activeWorkspaceProfileId:"old", workspacesEnabled:true, workspaceProfiles:[
    {id:"old",name:"Old",hostPath:"/work/old",enabled:true,trusted:true},
    {id:"new",name:"New",hostPath:"/work/new",enabled:true,trusted:true},
    {id:"blocked",name:"Blocked",hostPath:"/work/blocked",enabled:true,trusted:false},
  ]};
  const calls:string[]=[];
  const tools = await toolsProvider(controller(), {
    getSettings:()=>state,
    updateSettings:(patch)=>(state={...state,...patch}),
    createWorkspaceFs:()=>({resolvePath:async(v:string)=>v} as any),
    executeCommand: async (_command, options) => { calls.push(options?.cwd ?? ""); return {stdout:"",stderr:"",exitCode:0,timedOut:false,shell:"/bin/sh",platform:"linux",environment:"host"}; },
  });
  const blocked=await invoke(tools,"switch_workspace",{profile_id:"blocked"}); assert.equal(blocked.errorCode,"trust-required"); assert.equal(state.activeWorkspaceProfileId,"old");
  const switched=await invoke(tools,"switch_workspace",{profile_id:"new"}); assert.equal(switched.success,true); assert.equal(state.activeWorkspaceProfileId,"new");
  await invoke(tools,"run_command",{command:"pwd"}); assert.deepEqual(calls,["/work/new"]);
});
