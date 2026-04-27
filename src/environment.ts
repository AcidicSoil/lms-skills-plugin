import type { Platform } from "./executor";

export type HostPlatform = Platform;
export type SkillsEnvironment = "windows" | "wsl" | "both";
export type RuntimeTargetName = "windows" | "wsl";

export interface RuntimeTarget {
  name: RuntimeTargetName;
  supported: boolean;
  reason?: string;
}

export function detectHostPlatform(): HostPlatform {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "linux";
}

export function hostNativeEnvironment(
  host: HostPlatform = detectHostPlatform(),
): SkillsEnvironment {
  return host === "windows" ? "windows" : "wsl";
}

export function parseSkillsEnvironment(
  value: unknown,
  host: HostPlatform = detectHostPlatform(),
): SkillsEnvironment {
  if (value === "windows" || value === "wsl" || value === "both") return value;
  return hostNativeEnvironment(host);
}

export function deriveRuntimeTargets(
  mode: SkillsEnvironment,
  _host: HostPlatform = detectHostPlatform(),
): RuntimeTargetName[] {
  if (mode === "both") return ["windows", "wsl"];
  if (mode === "windows") return ["windows"];
  return ["wsl"];
}

export function isTargetSupported(
  target: RuntimeTargetName,
  host: HostPlatform = detectHostPlatform(),
): boolean {
  if (target === "windows") return host === "windows";
  return true;
}

export function targetDisplayName(target: RuntimeTargetName): "Windows" | "WSL" {
  return target === "windows" ? "Windows" : "WSL";
}

export const formatEnvironmentLabel = targetDisplayName;
