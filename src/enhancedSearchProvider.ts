import * as child_process from "child_process";
import * as path from "path";
import { checkAbort, createAbortError } from "./abort";
import { resolveSkillByName } from "./scanner";
import type { RuntimeRegistry } from "./runtime";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { SkillInfo, SkillSearchBackend } from "./types";

export type ActiveSkillSearchBackend = "builtin" | "qmd" | "ck";

export interface EnhancedSkillSearchOptions {
  qmdExecutable: string;
  qmdCollections: string[];
  ckExecutable: string;
}

export interface EnhancedSkillSearchResult {
  requested: SkillSearchBackend;
  active: ActiveSkillSearchBackend;
  fallbackUsed: boolean;
  fallbackReason?: string;
  available: {
    qmd?: boolean;
    ck?: boolean;
  };
  options: {
    qmdExecutable: string;
    qmdCollections: string[];
    ckExecutable: string;
  };
  candidates: SkillInfo[];
  rawResultCount: number;
  diagnostics: string[];
}

const ENHANCED_SEARCH_TIMEOUT_MS = 8_000;
const ENHANCED_SEARCH_MAX_OUTPUT_BYTES = 256_000;
const EXECUTABLE_TOKEN_PATTERN = /^[A-Za-z0-9._~+:/\\-]+$/;
const QMD_COLLECTION_PATTERN = /^[A-Za-z0-9._:@/\\-]+$/;

const BLOCKED_PROVIDER_ARGS = new Set([
  "collection",
  "context",
  "update",
  "embed",
  "cleanup",
  "bench",
  "mcp",
  "skill",
  "remove",
  "rename",
  "install",
  "--pull",
  "--force",
  "--reindex",
  "--index",
  "--clean",
  "--clean-orphans",
  "--switch-model",
  "--add",
  "--serve",
  "--tui",
]);

function truncateOutput(text: string): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= ENHANCED_SEARCH_MAX_OUTPUT_BYTES) return text;
  return `${buf.slice(0, ENHANCED_SEARCH_MAX_OUTPUT_BYTES).toString("utf-8")}\n[truncated]`;
}

function sanitizeExecutable(raw: string, fallback: string): string {
  const executable = raw.trim() || fallback;
  if (!EXECUTABLE_TOKEN_PATTERN.test(executable)) return fallback;
  if (executable.includes("..")) return fallback;
  return executable;
}

function sanitizeQmdCollections(collections: string[]): string[] {
  return collections
    .map((collection) => collection.trim())
    .filter((collection) => collection.length > 0 && QMD_COLLECTION_PATTERN.test(collection) && !collection.includes(".."))
    .slice(0, 8);
}

function assertReadOnlyProviderInvocation(executable: string, args: string[]): string | null {
  if (!EXECUTABLE_TOKEN_PATTERN.test(executable) || executable.includes("..")) {
    return "Enhanced search executable contains unsupported characters.";
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const lowered = arg.toLowerCase();
    if ((index === 0 || lowered.startsWith("--")) && BLOCKED_PROVIDER_ARGS.has(lowered)) {
      return `Enhanced search argument is blocked: ${arg}`;
    }
  }
  return null;
}

function runFixedCommand(
  executable: string,
  args: string[],
  signal?: AbortSignal,
  cwd?: string,
  timeoutMs = ENHANCED_SEARCH_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  checkAbort(signal);
  const blockedReason = assertReadOnlyProviderInvocation(executable, args);
  if (blockedReason) {
    return Promise.resolve({ stdout: "", stderr: blockedReason, exitCode: 126, timedOut: false });
  }

  return new Promise((resolve, reject) => {
    let proc: child_process.ChildProcess;
    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const finish = (result: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: truncateOutput(result.stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
        stderr: truncateOutput(result.stderr.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
      });
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { proc.kill("SIGTERM"); } catch {}
      reject(createAbortError(signal));
    };

    try {
      proc = child_process.spawn(executable, args, {
        cwd,
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          NO_COLOR: "1",
        },
      });
    } catch (error) {
      resolve({ stdout: "", stderr: error instanceof Error ? error.message : String(error), exitCode: 127, timedOut: false });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill("SIGKILL"); } catch {}
    }, timeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });
    proc.stdout?.on("data", (chunk: Buffer) => { if (!signal?.aborted) stdout += chunk.toString("utf-8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { if (!signal?.aborted) stderr += chunk.toString("utf-8"); });
    proc.on("error", (error) => {
      finish({ stdout, stderr: error.message || stderr, exitCode: 127, timedOut });
    });
    proc.on("close", (code) => {
      finish({ stdout, stderr, exitCode: code, timedOut });
    });
  });
}

async function isExecutableAvailable(executable: string, signal?: AbortSignal): Promise<boolean> {
  const result = await runFixedCommand(sanitizeExecutable(executable, executable), ["--version"], signal, undefined, 2_000).catch(() => null);
  return Boolean(result && !result.timedOut && result.exitCode === 0);
}

function collectStringValues(value: unknown, keys: Set<string>, output: string[]): void {
  if (typeof value !== "object" || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, keys, output);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();
    if (typeof child === "string" && keys.has(normalizedKey)) {
      output.push(child);
    }
    collectStringValues(child, keys, output);
  }
}

function parseJsonCandidates(stdout: string): string[] {
  const values: string[] = [];
  const keys = new Set(["file", "filepath", "file_path", "path", "absolute_path", "document", "doc", "uri"]);

  const trimmed = stdout.trim();
  if (!trimmed) return values;

  try {
    collectStringValues(JSON.parse(trimmed), keys, values);
  } catch {
    for (const line of trimmed.split("\n")) {
      const candidate = line.trim();
      if (!candidate || (!candidate.startsWith("{") && !candidate.startsWith("["))) continue;
      try { collectStringValues(JSON.parse(candidate), keys, values); } catch {}
    }
  }

  return values;
}

function parseTextCandidatePaths(stdout: string): string[] {
  const paths: string[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim().replace(/^\u001b\[[0-9;]*m/g, "");
    if (!trimmed) continue;
    const match = trimmed.match(/(?:^|\s)(\.?\.?[/\\][^:\s]+|[A-Za-z]:\\[^:\s]+|[^:\s]+\.(?:md|mdx|txt|json|yaml|yml|ts|tsx|js|jsx|py|sh|ps1|go|rs))(?:[:\s]|$)/i);
    if (match?.[1]) paths.push(match[1]);
  }
  return paths;
}

function normalizeCandidatePath(candidate: string, root: ResolvedSkillRoot): string {
  const withoutUri = candidate.replace(/^file:\/\//i, "");
  if (path.isAbsolute(withoutUri) || /^[A-Za-z]:[\\/]/.test(withoutUri)) return withoutUri;
  const targetPath = withoutUri.replace(/^\.\//, "");
  return root.environment === "windows"
    ? path.win32.normalize(path.win32.join(root.resolvedPath, targetPath))
    : path.posix.normalize(path.posix.join(root.resolvedPath, targetPath.replace(/\\/g, "/")));
}

async function resolveCandidatePaths(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  paths: string[],
  limit: number,
  signal?: AbortSignal,
): Promise<SkillInfo[]> {
  const seen = new Set<string>();
  const skills: SkillInfo[] = [];

  for (const candidate of paths) {
    checkAbort(signal);
    for (const root of roots) {
      const normalized = normalizeCandidatePath(candidate, root);
      const skill = await resolveSkillByName(roots, registry, normalized, signal).catch(() => null);
      if (!skill) continue;
      const key = `${skill.environment}:${skill.resolvedDirectoryPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
      if (skills.length >= limit) return skills;
    }
  }

  return skills;
}

async function runQmdSearch(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<{ skills: SkillInfo[]; rawResultCount: number; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const qmdExecutable = sanitizeExecutable(options.qmdExecutable, "qmd");
  const qmdCollections = sanitizeQmdCollections(options.qmdCollections);
  const collectionArgs = qmdCollections.flatMap((collection) => ["-c", collection]);
  const args = ["query", "--json", "--explain", "-n", String(Math.max(limit, 10)), "--candidate-limit", "40", ...collectionArgs, query];
  diagnostics.push(qmdCollections.length > 0 ? `qmd collections=${qmdCollections.join(",")}` : "qmd collections=default");
  const result = await runFixedCommand(qmdExecutable, args, signal);
  if (result.timedOut) return { skills: [], rawResultCount: 0, diagnostics: ["qmd query timed out"] };
  if (result.exitCode !== 0) return { skills: [], rawResultCount: 0, diagnostics: [`qmd query failed: ${result.stderr.slice(0, 240)}`] };
  const candidates = [...new Set([...parseJsonCandidates(result.stdout), ...parseTextCandidatePaths(result.stdout)])];
  const skills = await resolveCandidatePaths(roots, registry, candidates, limit, signal);
  diagnostics.push(`qmd returned ${candidates.length} path candidate(s), resolved ${skills.length} skill(s)`);
  return { skills, rawResultCount: candidates.length, diagnostics };
}

async function runCkSearch(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<{ skills: SkillInfo[]; rawResultCount: number; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const allCandidates: string[] = [];

  const ckExecutable = sanitizeExecutable(options.ckExecutable, "ck");
  for (const root of roots) {
    checkAbort(signal);
    const result = await runFixedCommand(ckExecutable, ["--jsonl", "--hybrid", "--rerank", "--topk", String(Math.max(limit, 10)), "--scores", query, root.resolvedPath], signal, root.resolvedPath);
    if (result.timedOut) {
      diagnostics.push(`ck timed out for ${root.displayPath}`);
      continue;
    }
    if (result.exitCode !== 0) {
      diagnostics.push(`ck failed for ${root.displayPath}: ${result.stderr.slice(0, 160)}`);
      continue;
    }
    allCandidates.push(...parseJsonCandidates(result.stdout), ...parseTextCandidatePaths(result.stdout));
  }

  const candidates = [...new Set(allCandidates)];
  const skills = await resolveCandidatePaths(roots, registry, candidates, limit, signal);
  diagnostics.push(`ck returned ${candidates.length} path candidate(s), resolved ${skills.length} skill(s)`);
  return { skills, rawResultCount: candidates.length, diagnostics };
}

export async function searchSkillsWithEnhancedBackend(
  requested: SkillSearchBackend,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<EnhancedSkillSearchResult> {
  if (requested === "builtin") {
    return {
      requested,
      active: "builtin",
      fallbackUsed: false,
      available: {},
      options,
      candidates: [],
      rawResultCount: 0,
      diagnostics: ["built-in backend selected"],
    };
  }

  const available = {
    qmd: requested === "qmd" || requested === "auto" ? await isExecutableAvailable(options.qmdExecutable, signal) : undefined,
    ck: requested === "ck" || requested === "auto" ? await isExecutableAvailable(options.ckExecutable, signal) : undefined,
  };

  const order: ActiveSkillSearchBackend[] = requested === "qmd"
    ? ["qmd"]
    : requested === "ck"
      ? ["ck"]
      : ["qmd", "ck"];

  for (const backend of order) {
    if (backend === "qmd" && !available.qmd) continue;
    if (backend === "ck" && !available.ck) continue;

    const result = backend === "qmd"
      ? await runQmdSearch(roots, registry, query, limit, options, signal)
      : await runCkSearch(roots, registry, query, limit, options, signal);

    if (result.skills.length > 0) {
      return {
        requested,
        active: backend,
        fallbackUsed: false,
        available,
        options,
        candidates: result.skills,
        rawResultCount: result.rawResultCount,
        diagnostics: result.diagnostics,
      };
    }

    if (result.rawResultCount > 0 || result.diagnostics.length > 0) {
      return {
        requested,
        active: "builtin",
        fallbackUsed: true,
        fallbackReason: `${backend} produced no resolvable skill candidates; using built-in fallback`,
        available,
        options,
        candidates: [],
        rawResultCount: result.rawResultCount,
        diagnostics: result.diagnostics,
      };
    }
  }

  return {
    requested,
    active: "builtin",
    fallbackUsed: true,
    fallbackReason: requested === "auto"
      ? "No enhanced search backend is available; using built-in fallback"
      : `${requested} is not available; using built-in fallback`,
    available,
    options,
    candidates: [],
    rawResultCount: 0,
    diagnostics: ["enhanced backend unavailable"],
  };
}
