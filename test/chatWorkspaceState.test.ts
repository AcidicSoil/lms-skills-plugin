import test from "node:test"; import assert from "node:assert/strict";
import { ChatWorkspaceStateStore } from "../src/chatWorkspaceState";
import { unsupportedSessionCapability,validateOpaqueSessionReference } from "../src/sessionCapability";
test("chat workspace restoration keeps chats isolated",()=>{const s=new ChatWorkspaceStateStore();s.set("a","host","p1","2026-01-01T00:00:00Z");s.set("b","wsl","p2","2026-01-01T00:00:01Z");assert.equal(s.get("a")?.profileId,"p1");assert.equal(s.get("b")?.profileId,"p2");assert.equal(s.get("a")?.environment,"host");});
test("session capability is unsupported by default",()=>{assert.equal(unsupportedSessionCapability.status,"unsupported");});
test("opaque session references reject transcript-like content",()=>{assert.equal(validateOpaqueSessionReference("session_123"),"session_123");assert.throws(()=>validateOpaqueSessionReference("message: hello"),/opaque/);});
