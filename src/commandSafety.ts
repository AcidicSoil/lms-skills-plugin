export type CommandExecutionMode = "disabled" | "readOnly" | "guarded";

export interface CommandSafetyResult {
  allowed: boolean;
  reason?: string;
  mode: CommandExecutionMode;
  commandPreview: string;
}

const READ_ONLY_COMMANDS = new Set([
  "awk",
  "basename",
  "cat",
  "command",
  "cut",
  "diff",
  "dirname",
  "du",
  "echo",
  "env",
  "file",
  "find",
  "grep",
  "head",
  "ls",
  "pwd",
  "rg",
  "sed",
  "sort",
  "stat",
  "tail",
  "test",
  "tree",
  "type",
  "wc",
  "which",
]);

const READ_ONLY_FORBIDDEN_ARGS = [
  /(^|\s)-delete(\s|$)/i,
  /(^|\s)-exec(\s|$)/i,
  /(^|\s)-ok(\s|$)/i,
  /(^|\s)-execdir(\s|$)/i,
  /(^|\s)-fdelete(\s|$)/i,
  /(^|\s)-i(\s|$)/i,
  /(^|\s)--in-place(\s|$)/i,
  /(^|\s)-i(\.|\w)/i,
];

const ALWAYS_BLOCKED_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bdel\b/i,
  /\berase\b/i,
  /\bremove-item\b/i,
  /\brd\b/i,
  /\bformat\b/i,
  /\bmkfs(\.|\b)/i,
  /\bdd\b/i,
  /\bshred\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bchgrp\b/i,
  /\bmv\b/i,
  /\bmove\b/i,
  /\bcp\b/i,
  /\bcopy\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\btee\b/i,
  /\bcat\b[^\n]*(>|>>)/i,
  />\s*[^\s]/,
  />>\s*[^\s]/,
  /<<\s*[^\s]/,
  /\btruncate\b/i,
  /\binstall\b/i,
  /\bapt(-get)?\b/i,
  /\byum\b/i,
  /\bdnf\b/i,
  /\bbrew\b/i,
  /\bchoco\b/i,
  /\bscoop\b/i,
  /\bnpm\s+(install|i|update|uninstall|remove|rm|run)\b/i,
  /\bbun\s+(install|add|remove|run)\b/i,
  /\byarn\s+(add|remove|install|run)\b/i,
  /\bpnpm\s+(add|remove|install|run)\b/i,
  /\bpip\s+(install|uninstall)\b/i,
  /\bpython\b[^\n]*\s-m\s+pip\s+(install|uninstall)\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\binvoke-webrequest\b/i,
  /\biwr\b/i,
  /\binvoke-restmethod\b/i,
  /\birm\b/i,
  /\bssh\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bgit\s+(clone|pull|push|fetch|reset|clean|checkout|switch|merge|rebase|apply|am)\b/i,
  /\bkill(all)?\b/i,
  /\btaskkill\b/i,
  /\bpowershell\b[^\n]*-enc(odedcommand)?\b/i,
  /\bbase64\b[^\n]*\|[^\n]*(sh|bash|zsh|powershell|pwsh)\b/i,
  /\b(sh|bash|zsh|fish|pwsh|powershell|cmd)\b\s*(-c|\/c)\b/i,
];

const READ_ONLY_SHELL_METACHARS = /[;&|`$(){}<>]/;

function firstToken(command: string): string {
  const trimmed = command.trim();
  const match = trimmed.match(/^(?:\s*)(?:[A-Za-z0-9_./\\:-]+|"[^"]+"|'[^']+')/);
  if (!match) return "";
  const token = match[0].trim().replace(/^['"]|['"]$/g, "");
  const parts = token.split(/[\\/]/);
  return (parts[parts.length - 1] ?? token).toLowerCase();
}

function blockedPattern(command: string): string | null {
  for (const pattern of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(command)) return pattern.source;
  }
  return null;
}

function readOnlyForbiddenArg(command: string): string | null {
  for (const pattern of READ_ONLY_FORBIDDEN_ARGS) {
    if (pattern.test(command)) return pattern.source;
  }
  return null;
}

export function validateCommandSafety(
  command: string,
  mode: CommandExecutionMode,
): CommandSafetyResult {
  const normalized = command.trim();
  const commandPreview = normalized.slice(0, 180);

  if (!normalized) {
    return { allowed: false, mode, commandPreview, reason: "Empty command." };
  }

  if (mode === "disabled") {
    return {
      allowed: false,
      mode,
      commandPreview,
      reason:
        "Command execution is disabled. Enable read-only command mode in plugin settings only if you trust the current chat/task.",
    };
  }

  const blocked = blockedPattern(normalized);
  if (blocked) {
    return {
      allowed: false,
      mode,
      commandPreview,
      reason: `Command blocked by safety policy: ${blocked}`,
    };
  }

  if (mode === "readOnly") {
    if (READ_ONLY_SHELL_METACHARS.test(normalized)) {
      return {
        allowed: false,
        mode,
        commandPreview,
        reason:
          "Read-only command mode does not allow shell metacharacters, redirection, variable expansion, pipes, or command chaining.",
      };
    }

    const token = firstToken(normalized);
    if (!READ_ONLY_COMMANDS.has(token)) {
      return {
        allowed: false,
        mode,
        commandPreview,
        reason: `Read-only command mode only allows inspection commands. '${token || "unknown"}' is not allowed.`,
      };
    }

    const forbiddenArg = readOnlyForbiddenArg(normalized);
    if (forbiddenArg) {
      return {
        allowed: false,
        mode,
        commandPreview,
        reason: `Read-only command mode blocked a mutating argument: ${forbiddenArg}`,
      };
    }
  }

  return { allowed: true, mode, commandPreview };
}
