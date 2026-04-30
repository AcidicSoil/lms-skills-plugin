import * as child_process from "child_process";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { checkAbort, createAbortError } from "./abort";
import {
  MANAGED_QMD_DIR_NAME,
  MANAGED_QMD_INDEX_TTL_MS,
  MANAGED_QMD_MAX_COPY_BYTES,
  MANAGED_QMD_MAX_COPY_FILES,
  PLUGIN_DATA_DIR,
} from "./constants";
import { createRequestId, logDiagnostic, serializeError } from "./diagnostics";
import type { ResolvedSkillRoot } from "./pathResolver";

export interface ManagedQmdRootMapping {
  sourcePath: string;
  workspacePath: string;
}

export interface ManagedQmdIndexResult {
  collection: string;
  workspacePath: string;
  qmdEnv: Record<string, string>;
  rootMappings: ManagedQmdRootMapping[];
  syncMode: "symlink" | "copy" | "mixed" | "none";
  stale: boolean;
  updated: boolean;
  embedded: boolean;
  diagnostics: string[];
}

interface ManagedQmdManifest {
  collection: string;
  sourceRoots: string[];
  workspacePath: string;
  syncMode: ManagedQmdIndexResult["syncMode"];
  updatedAt: string;
  lastIndexedAt?: string;
}

interface CopyBudget {
  files: number;
  bytes: number;
}

const MANAGED_QMD_TIMEOUT_MS = 60_000;
const QMD_OUTPUT_BYTES = 64_000;
const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", ".cache", "dist", "build", ".next", ".turbo"]);

function truncate(text: string): string {
  const buf = Buffer.from(text, "utf-8");
  if (buf.length <= QMD_OUTPUT_BYTES) return text;
  return `${buf.slice(0, QMD_OUTPUT_BYTES).toString("utf-8")}\n[truncated]`;
}

function shortHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function collectionNameForRoots(roots: ResolvedSkillRoot[]): string {
  const material = roots
    .map((root) => `${root.environment}:${root.resolvedPath}`)
    .sort()
    .join("\n");
  return `lms-skills-${shortHash(material)}`;
}

function manifestPath(workspacePath: string): string {
  return path.join(workspacePath, "manifest.json");
}

async function readManifest(workspacePath: string): Promise<ManagedQmdManifest | null> {
  try {
    return JSON.parse(await fs.readFile(manifestPath(workspacePath), "utf-8")) as ManagedQmdManifest;
  } catch {
    return null;
  }
}

async function writeManifest(workspacePath: string, manifest: ManagedQmdManifest): Promise<void> {
  await fs.writeFile(manifestPath(workspacePath), JSON.stringify(manifest, null, 2), "utf-8");
}

function qmdStateEnv(workspacePath: string): Record<string, string> {
  return {
    XDG_CONFIG_HOME: path.join(workspacePath, "xdg-config"),
    XDG_CACHE_HOME: path.join(workspacePath, "xdg-cache"),
    XDG_DATA_HOME: path.join(workspacePath, "xdg-data"),
  };
}

function runQmdMaintenance(
  qmdExecutable: string,
  args: string[],
  signal?: AbortSignal,
  cwd?: string,
  timeoutMs = MANAGED_QMD_TIMEOUT_MS,
  envOverrides: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    let proc: child_process.ChildProcess;
    let settled = false;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const requestId = createRequestId("qmd-index");
    const startedAt = Date.now();

    const finish = (result: { stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      logDiagnostic({
        event: "qmd_index_command_result",
        requestId,
        tool: "list_skills",
        command: args.slice(0, 3).join(" "),
        elapsedMs: Date.now() - startedAt,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        stdoutBytes: result.stdout.length,
        stderrBytes: result.stderr.length,
      });
      resolve({
        ...result,
        stdout: truncate(result.stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
        stderr: truncate(result.stderr.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
      });
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { proc.kill("SIGTERM"); } catch {}
      reject(createAbortError(signal));
    };

    logDiagnostic({
      event: "qmd_index_command_start",
      requestId,
      tool: "list_skills",
      command: args.slice(0, 3).join(" "),
      timeoutMs,
    });

    try {
      proc = child_process.spawn(qmdExecutable || "qmd", args, {
        cwd,
        shell: false,
        windowsHide: true,
        env: { ...process.env, ...envOverrides, NO_COLOR: "1" },
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
    proc.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf-8"); });
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf-8"); });
    proc.on("error", (error) => finish({ stdout, stderr: error.message || stderr, exitCode: 127, timedOut }));
    proc.on("close", (code) => finish({ stdout, stderr, exitCode: code, timedOut }));
  });
}

async function copyManagedTree(source: string, destination: string, budget: CopyBudget, signal?: AbortSignal): Promise<void> {
  checkAbort(signal);
  const entries = await fs.readdir(source, { withFileTypes: true });
  await fs.mkdir(destination, { recursive: true });
  for (const entry of entries) {
    checkAbort(signal);
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyManagedTree(src, dest, budget, signal);
      continue;
    }
    if (!entry.isFile()) continue;
    const stat = await fs.stat(src);
    budget.files += 1;
    budget.bytes += stat.size;
    if (budget.files > MANAGED_QMD_MAX_COPY_FILES || budget.bytes > MANAGED_QMD_MAX_COPY_BYTES) {
      throw new Error(`Managed QMD copy limit exceeded (${budget.files} files, ${budget.bytes} bytes).`);
    }
    await fs.copyFile(src, dest);
  }
}

async function syncRoot(root: ResolvedSkillRoot, target: string, signal?: AbortSignal): Promise<"symlink" | "copy"> {
  checkAbort(signal);
  await fs.rm(target, { recursive: true, force: true });
  try {
    const type = process.platform === "win32" ? "junction" : "dir";
    await fs.symlink(root.resolvedPath, target, type);
    return "symlink";
  } catch {
    await copyManagedTree(root.resolvedPath, target, { files: 0, bytes: 0 }, signal);
    return "copy";
  }
}

async function ensureWorkspace(
  collection: string,
  roots: ResolvedSkillRoot[],
  signal?: AbortSignal,
): Promise<{ workspacePath: string; rootMappings: ManagedQmdRootMapping[]; syncMode: ManagedQmdIndexResult["syncMode"]; stale: boolean; diagnostics: string[] }> {
  checkAbort(signal);
  const workspacePath = path.join(PLUGIN_DATA_DIR, MANAGED_QMD_DIR_NAME, collection);
  const rootsPath = path.join(workspacePath, "roots");
  const sourceRoots = roots.map((root) => root.resolvedPath);
  const existing = await readManifest(workspacePath);
  const now = Date.now();
  const existingIndexedAt = existing?.lastIndexedAt ? Date.parse(existing.lastIndexedAt) : 0;
  const stale =
    !existing ||
    existing.collection !== collection ||
    existing.sourceRoots.join("\n") !== sourceRoots.join("\n") ||
    !existingIndexedAt ||
    now - existingIndexedAt > MANAGED_QMD_INDEX_TTL_MS;

  const diagnostics: string[] = [];
  const rootMappings: ManagedQmdRootMapping[] = [];
  let symlinkCount = 0;
  let copyCount = 0;

  await fs.mkdir(rootsPath, { recursive: true });
  if (stale) {
    await fs.rm(rootsPath, { recursive: true, force: true });
    await fs.mkdir(rootsPath, { recursive: true });
  }

  for (let index = 0; index < roots.length; index += 1) {
    const workspaceRoot = path.join(rootsPath, `root-${index}`);
    rootMappings.push({ sourcePath: roots[index].resolvedPath, workspacePath: workspaceRoot });
    if (!stale && fsSync.existsSync(workspaceRoot)) continue;
    const mode = await syncRoot(roots[index], workspaceRoot, signal);
    if (mode === "symlink") symlinkCount += 1;
    else copyCount += 1;
  }

  const syncMode: ManagedQmdIndexResult["syncMode"] = roots.length === 0
    ? "none"
    : copyCount === 0
      ? "symlink"
      : symlinkCount === 0
        ? "copy"
        : "mixed";

  diagnostics.push(`workspace=${workspacePath}`);
  diagnostics.push(`sync=${syncMode}`);

  await writeManifest(workspacePath, {
    collection,
    sourceRoots,
    workspacePath,
    syncMode,
    updatedAt: new Date().toISOString(),
    lastIndexedAt: existing?.lastIndexedAt,
  });

  return { workspacePath, rootMappings, syncMode, stale, diagnostics };
}

export function mapManagedQmdCandidatePath(candidate: string, index: ManagedQmdIndexResult): string {
  const withoutUri = candidate.replace(/^file:\/\//i, "");
  const absoluteCandidate = path.isAbsolute(withoutUri)
    ? withoutUri
    : path.join(index.workspacePath, withoutUri.replace(/^\.\//, ""));
  const normalizedCandidate = path.normalize(absoluteCandidate);
  for (const mapping of index.rootMappings) {
    const workspaceRoot = path.normalize(mapping.workspacePath);
    if (normalizedCandidate === workspaceRoot || normalizedCandidate.startsWith(`${workspaceRoot}${path.sep}`)) {
      return path.join(mapping.sourcePath, path.relative(workspaceRoot, normalizedCandidate));
    }
  }
  return candidate;
}

export async function ensureManagedQmdIndex(
  roots: ResolvedSkillRoot[],
  qmdExecutable: string,
  signal?: AbortSignal,
): Promise<ManagedQmdIndexResult> {
  const requestId = createRequestId("qmd-index");
  const startedAt = Date.now();
  const collection = collectionNameForRoots(roots);
  logDiagnostic({ event: "qmd_index_start", requestId, tool: "list_skills", collection, rootCount: roots.length });

  const workspace = await ensureWorkspace(collection, roots, signal);
  const qmdEnv = qmdStateEnv(workspace.workspacePath);
  await fs.mkdir(qmdEnv.XDG_CONFIG_HOME, { recursive: true });
  await fs.mkdir(qmdEnv.XDG_CACHE_HOME, { recursive: true });
  await fs.mkdir(qmdEnv.XDG_DATA_HOME, { recursive: true });
  const diagnostics = [...workspace.diagnostics, "qmd state=isolated"];
  let updated = false;
  let embedded = false;

  try {
    const add = await runQmdMaintenance(qmdExecutable, ["collection", "add", workspace.workspacePath, "--name", collection, "--mask", "**/*.md"], signal, workspace.workspacePath, MANAGED_QMD_TIMEOUT_MS, qmdEnv);
    if (add.exitCode === 0) diagnostics.push("qmd collection add ok");
    else diagnostics.push(`qmd collection add skipped/failed: ${add.stderr.slice(0, 160)}`);

    if (workspace.stale) {
      const update = await runQmdMaintenance(qmdExecutable, ["update"], signal, workspace.workspacePath, MANAGED_QMD_TIMEOUT_MS, qmdEnv);
      if (update.exitCode === 0 && !update.timedOut) {
        updated = true;
        diagnostics.push("qmd update ok");
      } else {
        diagnostics.push(`qmd update failed: ${update.stderr.slice(0, 160)}`);
      }

      const embed = await runQmdMaintenance(qmdExecutable, ["embed"], signal, workspace.workspacePath, 120_000, qmdEnv);
      if (embed.exitCode === 0 && !embed.timedOut) {
        embedded = true;
        diagnostics.push("qmd embed ok");
      } else {
        diagnostics.push(`qmd embed failed: ${embed.stderr.slice(0, 160)}`);
      }

      await writeManifest(workspace.workspacePath, {
        collection,
        sourceRoots: roots.map((root) => root.resolvedPath),
        workspacePath: workspace.workspacePath,
        syncMode: workspace.syncMode,
        updatedAt: new Date().toISOString(),
        lastIndexedAt: new Date().toISOString(),
      });
    } else {
      diagnostics.push("qmd index fresh; skipped update/embed");
    }

    const result: ManagedQmdIndexResult = {
      collection,
      workspacePath: workspace.workspacePath,
      qmdEnv,
      rootMappings: workspace.rootMappings,
      syncMode: workspace.syncMode,
      stale: workspace.stale,
      updated,
      embedded,
      diagnostics,
    };
    logDiagnostic({
      event: "qmd_index_complete",
      requestId,
      tool: "list_skills",
      collection,
      workspace: workspace.workspacePath,
      syncMode: workspace.syncMode,
      stale: workspace.stale,
      updated,
      embedded,
      elapsedMs: Date.now() - startedAt,
      diagnostics: diagnostics.join(" | "),
    });
    return result;
  } catch (error) {
    logDiagnostic({
      event: "qmd_index_error",
      requestId,
      tool: "list_skills",
      collection,
      elapsedMs: Date.now() - startedAt,
      error: serializeError(error),
    });
    throw error;
  }
}
