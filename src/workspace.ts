import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  HOST_WORKSPACES_DIR,
  WSL_WORKSPACES_RELATIVE_DIR,
} from "./constants";
import { execCommand } from "./executor";
import type { EffectiveConfig, ExecutionEnvironment, WorkspaceContext } from "./types";
import { detectWslCapability, type WslCapability } from "./wslCapability";

export interface WorkspaceDependencies {
  hostBaseRoot?: string;
  mkdirHost?: (value: string) => Promise<void>;
  detectWsl?: (requested?: string) => Promise<WslCapability>;
  resolveWslHome?: (distribution: string) => Promise<string>;
  mkdirWsl?: (distribution: string, value: string) => Promise<void>;
}

function normalizeIdentity(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) throw new Error("A provider working directory is required to resolve a workspace.");
  return /^[A-Za-z]:\//.test(normalized)
    ? normalized[0].toLowerCase() + normalized.slice(1)
    : normalized;
}

export function deriveWorkspaceId(
  providerWorkingDirectory: string,
  environment: ExecutionEnvironment,
  wslDistribution?: string,
): string {
  const identity = normalizeIdentity(providerWorkingDirectory);
  const distribution = environment === "wsl" ? (wslDistribution?.trim() || "default") : "";
  return createHash("sha256")
    .update(`${environment}\0${distribution}\0${identity}`, "utf8")
    .digest("hex")
    .slice(0, 24);
}

function quotePosix(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

async function defaultResolveWslHome(distribution: string): Promise<string> {
  const result = await execCommand("printf '%s' \"$HOME\"", {
    executionEnvironment: "wsl",
    wslDistribution: distribution,
    cwd: "/",
  });
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    throw new Error(result.stderr || "Unable to resolve the WSL home directory.");
  }
  return result.stdout.trim();
}

async function defaultMkdirWsl(distribution: string, value: string): Promise<void> {
  const result = await execCommand(`mkdir -p -- ${quotePosix(value)}`, {
    executionEnvironment: "wsl",
    wslDistribution: distribution,
    cwd: "/",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr || `Unable to create WSL workspace: ${value}`);
}

function capabilityError(capability: Exclude<WslCapability, { status: "ready" }>): Error {
  switch (capability.status) {
    case "unsupported-platform":
      return new Error("WSL execution is only available on Windows.");
    case "wsl-unavailable":
      return new Error(`WSL is unavailable: ${capability.error}`);
    case "no-distribution":
      return new Error("No WSL distribution is installed.");
    case "distribution-unavailable":
      return new Error(`WSL distribution '${capability.requested}' is unavailable. Available: ${capability.available.join(", ") || "none"}.`);
  }
}

export async function resolveWorkspaceContext(
  providerWorkingDirectory: string,
  config: EffectiveConfig,
  dependencies: WorkspaceDependencies = {},
): Promise<WorkspaceContext> {
  const identity = normalizeIdentity(providerWorkingDirectory);
  const workspaceId = deriveWorkspaceId(identity, config.executionEnvironment, config.wslDistribution);

  if (config.executionEnvironment === "host") {
    const hostBaseRoot = dependencies.hostBaseRoot ?? HOST_WORKSPACES_DIR;
    const nativeRoot = path.join(hostBaseRoot, workspaceId);
    const mkdirHost = dependencies.mkdirHost ?? (async (value: string) => {
      await fs.promises.mkdir(value, { recursive: true });
    });
    await mkdirHost(nativeRoot);
    return {
      workspaceId,
      providerWorkingDirectory: identity,
      executionEnvironment: "host",
      nativeRoot,
    };
  }

  const detect = dependencies.detectWsl ?? detectWslCapability;
  const capability = await detect(config.wslDistribution);
  if (capability.status !== "ready") throw capabilityError(capability);

  const distribution = capability.distribution;
  const resolveHome = dependencies.resolveWslHome ?? defaultResolveWslHome;
  const mkdirWsl = dependencies.mkdirWsl ?? defaultMkdirWsl;
  const home = (await resolveHome(distribution)).replace(/\/+$/, "");
  if (!home.startsWith("/")) throw new Error("WSL home directory must be a Linux-native absolute path.");
  const nativeRoot = path.posix.join(home, WSL_WORKSPACES_RELATIVE_DIR, workspaceId);
  await mkdirWsl(distribution, nativeRoot);

  return {
    workspaceId,
    providerWorkingDirectory: identity,
    executionEnvironment: "wsl",
    wslDistribution: distribution,
    nativeRoot,
  };
}
