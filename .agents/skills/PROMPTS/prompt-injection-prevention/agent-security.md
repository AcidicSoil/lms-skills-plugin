# Agent-Specific Security Patterns

This reference covers security patterns for LLM agents with tool access, memory,
and multi-agent communication. Based on the OWASP AI Agent Security Cheat Sheet.

## Table of Contents

1. [Tool Call Validation](#1-tool-call-validation)
2. [Memory Security](#2-memory-security)
3. [Multi-Agent Trust Boundaries](#3-multi-agent-trust-boundaries)
4. [Agent Loop Circuit Breakers](#4-agent-loop-circuit-breakers)
5. [Thought/Observation Injection Defense](#5-thoughtobservation-injection-defense)

---

## 1. Tool Call Validation

Agents that can call tools (APIs, databases, file systems) are the highest-risk
LLM integration. Every tool call must be validated against explicit allowlists.

```python
from typing import Any
from dataclasses import dataclass, field


@dataclass
class ToolPermission:
    """Define what a tool is allowed to do."""
    name: str
    allowed_actions: list[str] = field(default_factory=list)
    allowed_params: dict[str, list] = field(default_factory=dict)
    requires_approval: bool = False
    max_calls_per_session: int = 50


class ToolCallValidator:
    """
    Validates every agent tool call against a permission schema.

    OWASP principle: Agents should never have unrestricted tool access.
    Every tool call should be checked against:
    1. Is this tool allowed for this user/session?
    2. Are the parameters within allowed ranges?
    3. Has the call limit been exceeded?
    4. Does this specific call need human approval?
    """

    def __init__(self, permissions: list[ToolPermission]):
        self.permissions = {p.name: p for p in permissions}
        self.call_counts: dict[str, dict[str, int]] = {}

    def validate_tool_call(
        self,
        session_id: str,
        tool_name: str,
        action: str,
        params: dict[str, Any],
    ) -> dict:
        """
        Returns:
          allowed: bool
          reason: str
          needs_approval: bool
        """
        # Check tool exists in allowlist
        perm = self.permissions.get(tool_name)
        if not perm:
            return {
                "allowed": False,
                "reason": f"Tool '{tool_name}' is not in the allowlist",
                "needs_approval": False,
            }

        # Check action is allowed
        if perm.allowed_actions and action not in perm.allowed_actions:
            return {
                "allowed": False,
                "reason": (
                    f"Action '{action}' not allowed for tool '{tool_name}'. "
                    f"Allowed: {perm.allowed_actions}"
                ),
                "needs_approval": False,
            }

        # Check parameters
        for param_name, value in params.items():
            allowed_values = perm.allowed_params.get(param_name)
            if allowed_values is not None and value not in allowed_values:
                return {
                    "allowed": False,
                    "reason": (
                        f"Parameter '{param_name}={value}' not in allowed "
                        f"values: {allowed_values}"
                    ),
                    "needs_approval": False,
                }

        # Check call count
        session_counts = self.call_counts.setdefault(session_id, {})
        current = session_counts.get(tool_name, 0)
        if current >= perm.max_calls_per_session:
            return {
                "allowed": False,
                "reason": f"Call limit exceeded for '{tool_name}'",
                "needs_approval": False,
            }

        # Record the call
        session_counts[tool_name] = current + 1

        return {
            "allowed": True,
            "reason": "OK",
            "needs_approval": perm.requires_approval,
        }


# Example: configuring permissions for a customer service agent
CUSTOMER_SERVICE_TOOLS = [
    ToolPermission(
        name="database",
        allowed_actions=["read"],  # NO write/delete
        allowed_params={"table": ["customers", "orders", "products"]},
        max_calls_per_session=20,
    ),
    ToolPermission(
        name="email",
        allowed_actions=["draft"],  # Can draft but not send
        requires_approval=True,     # Human must approve before sending
        max_calls_per_session=5,
    ),
    ToolPermission(
        name="knowledge_base",
        allowed_actions=["search"],
        max_calls_per_session=30,
    ),
]
```

---

## 2. Memory Security

Agents with memory (conversation history, long-term storage) face unique risks:
an attacker can poison the memory in one session to affect future sessions.

```python
import hashlib
import time
from typing import Optional


class SecureAgentMemory:
    """
    Secure memory store with isolation, sanitization, and expiration.

    Key principles:
    - Isolate memory per user and session
    - Sanitize content before storage (injection patterns)
    - Set expiration limits
    - Audit memory contents
    - Use integrity checks for long-term memory
    """

    def __init__(
        self,
        max_entries_per_session: int = 100,
        max_entry_size: int = 2000,
        ttl_seconds: int = 86400,  # 24 hours default
    ):
        self.max_entries = max_entries_per_session
        self.max_entry_size = max_entry_size
        self.ttl = ttl_seconds
        self.store: dict[str, list[dict]] = {}
        self.injection_filter = None  # Set to PromptInjectionFilter instance

    def set_filter(self, filter_instance):
        """Attach the injection filter for memory sanitization."""
        self.injection_filter = filter_instance

    def _make_key(self, user_id: str, session_id: str) -> str:
        """Memory is always scoped to user + session."""
        return f"{user_id}::{session_id}"

    def store_memory(
        self,
        user_id: str,
        session_id: str,
        content: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Store a memory entry after sanitization."""
        key = self._make_key(user_id, session_id)

        # Size check
        if len(content) > self.max_entry_size:
            content = content[:self.max_entry_size]

        # Injection scan
        if self.injection_filter:
            detection = self.injection_filter.detect_injection(content)
            if detection["detected"]:
                return {
                    "stored": False,
                    "reason": "Memory content failed security scan",
                }
            content = self.injection_filter.sanitize_input(content)

        # Capacity check
        entries = self.store.setdefault(key, [])
        if len(entries) >= self.max_entries:
            # Remove oldest
            entries.pop(0)

        entry = {
            "content": content,
            "timestamp": time.time(),
            "checksum": hashlib.sha256(content.encode()).hexdigest()[:16],
            "metadata": metadata or {},
        }
        entries.append(entry)

        return {"stored": True, "entry_count": len(entries)}

    def retrieve_memory(
        self, user_id: str, session_id: str
    ) -> list[dict]:
        """Retrieve memory entries, filtering expired ones."""
        key = self._make_key(user_id, session_id)
        entries = self.store.get(key, [])
        now = time.time()

        # Filter expired entries
        valid = [e for e in entries if now - e["timestamp"] < self.ttl]
        self.store[key] = valid

        return valid

    def verify_integrity(self, entry: dict) -> bool:
        """Check that a memory entry hasn't been tampered with."""
        expected = hashlib.sha256(
            entry["content"].encode()
        ).hexdigest()[:16]
        return entry.get("checksum") == expected

    def clear_session(self, user_id: str, session_id: str):
        """Wipe memory for a specific session."""
        key = self._make_key(user_id, session_id)
        self.store.pop(key, None)
```

---

## 3. Multi-Agent Trust Boundaries

When multiple agents communicate, a compromised agent can propagate attacks.

```python
import hmac
import json
import time
from enum import IntEnum


class TrustLevel(IntEnum):
    UNTRUSTED = 0
    INTERNAL = 1
    PRIVILEGED = 2
    SYSTEM = 3


class SecureAgentBus:
    """
    Authenticated message passing between agents with trust levels.

    Principles:
    - Every agent has an explicit trust level
    - Messages are signed to prevent forgery
    - Agents can only send to their allowed recipients
    - Message types are restricted by trust level
    """

    def __init__(self, signing_key: bytes):
        self.signing_key = signing_key
        self.registry: dict[str, dict] = {}

    def register_agent(
        self,
        agent_id: str,
        trust_level: TrustLevel,
        allowed_recipients: list[str],
        allowed_message_types: list[str],
    ):
        self.registry[agent_id] = {
            "trust_level": trust_level,
            "allowed_recipients": allowed_recipients,
            "allowed_message_types": allowed_message_types,
        }

    def send_message(
        self,
        sender_id: str,
        recipient_id: str,
        message_type: str,
        payload: dict,
    ) -> dict:
        """Send a validated, signed message between agents."""
        # Validate sender
        sender = self.registry.get(sender_id)
        if not sender:
            return {"error": f"Unknown sender: {sender_id}"}

        # Validate recipient
        if recipient_id not in sender["allowed_recipients"]:
            return {"error": f"Sender '{sender_id}' cannot message '{recipient_id}'"}

        # Validate message type
        if message_type not in sender["allowed_message_types"]:
            return {"error": f"Message type '{message_type}' not allowed"}

        # Validate recipient exists
        if recipient_id not in self.registry:
            return {"error": f"Unknown recipient: {recipient_id}"}

        # Sign the message
        message = {
            "sender": sender_id,
            "recipient": recipient_id,
            "type": message_type,
            "payload": payload,
            "timestamp": time.time(),
        }
        message["signature"] = self._sign(message)

        return {"delivered": True, "message": message}

    def verify_message(self, message: dict) -> bool:
        """Verify message signature before processing."""
        sig = message.pop("signature", None)
        expected = self._sign(message)
        message["signature"] = sig
        return hmac.compare_digest(sig, expected) if sig else False

    def _sign(self, message: dict) -> str:
        # Remove signature field if present for signing
        to_sign = {k: v for k, v in message.items() if k != "signature"}
        payload = json.dumps(to_sign, sort_keys=True).encode()
        return hmac.new(self.signing_key, payload, 'sha256').hexdigest()
```

---

## 4. Agent Loop Circuit Breakers

Prevent runaway agent loops that waste compute, hit APIs excessively, or
get stuck in injection-induced infinite loops.

```python
import time


class AgentCircuitBreaker:
    """
    Halt agent execution when safety thresholds are exceeded.

    Protects against:
    - Denial-of-wallet attacks (excessive API costs)
    - Injection-induced infinite loops
    - Runaway tool calling
    """

    def __init__(
        self,
        max_steps: int = 25,
        max_tool_calls: int = 50,
        max_duration_seconds: int = 120,
        max_tokens_used: int = 100_000,
    ):
        self.max_steps = max_steps
        self.max_tool_calls = max_tool_calls
        self.max_duration = max_duration_seconds
        self.max_tokens = max_tokens_used

        self.step_count = 0
        self.tool_call_count = 0
        self.start_time = time.time()
        self.tokens_used = 0
        self.tripped = False
        self.trip_reason = ""

    def check(self) -> bool:
        """Returns True if the agent should continue, False if tripped."""
        if self.tripped:
            return False

        if self.step_count >= self.max_steps:
            self._trip(f"Max steps exceeded: {self.step_count}")
            return False

        if self.tool_call_count >= self.max_tool_calls:
            self._trip(f"Max tool calls exceeded: {self.tool_call_count}")
            return False

        elapsed = time.time() - self.start_time
        if elapsed >= self.max_duration:
            self._trip(f"Max duration exceeded: {elapsed:.0f}s")
            return False

        if self.tokens_used >= self.max_tokens:
            self._trip(f"Max tokens exceeded: {self.tokens_used}")
            return False

        return True

    def record_step(self):
        self.step_count += 1

    def record_tool_call(self):
        self.tool_call_count += 1

    def record_tokens(self, count: int):
        self.tokens_used += count

    def _trip(self, reason: str):
        self.tripped = True
        self.trip_reason = reason

    def reset(self):
        self.step_count = 0
        self.tool_call_count = 0
        self.start_time = time.time()
        self.tokens_used = 0
        self.tripped = False
        self.trip_reason = ""
```

---

## 5. Thought/Observation Injection Defense

In ReAct-style agents, attackers can inject fake "Thought:" or "Observation:"
markers in tool output to hijack the agent's reasoning chain.

```python
class ThoughtInjectionDefense:
    """
    Validate agent reasoning chains for injected steps.

    Attack: External content (tool output, retrieved docs) contains
    markers like "Thought:", "Action:", "Observation:" that the agent
    framework interprets as its own reasoning.

    Defense: Strip or escape these markers in all external content.
    """

    AGENT_MARKERS = [
        "Thought:", "Action:", "Observation:", "Final Answer:",
        "Action Input:", "Tool:", "Result:",
    ]

    @classmethod
    def sanitize_tool_output(cls, output: str) -> str:
        """Remove agent reasoning markers from tool output."""
        for marker in cls.AGENT_MARKERS:
            # Replace with a safe version that won't be parsed as a marker
            safe_marker = marker.replace(":", " -")
            output = output.replace(marker, safe_marker)
        return output

    @classmethod
    def validate_reasoning_chain(
        cls, steps: list[dict]
    ) -> list[dict]:
        """
        Check a list of reasoning steps for suspicious patterns.
        Each step should have 'type' (thought/action/observation) and 'content'.
        """
        validated = []
        for i, step in enumerate(steps):
            content = step.get("content", "")

            # Check if an observation step contains further reasoning markers
            if step.get("type") == "observation":
                for marker in cls.AGENT_MARKERS:
                    if marker in content:
                        step["flagged"] = True
                        step["flag_reason"] = (
                            f"Observation contains agent marker: {marker}"
                        )
                        # Sanitize it
                        step["content"] = cls.sanitize_tool_output(content)
                        break

            validated.append(step)
        return validated
```
