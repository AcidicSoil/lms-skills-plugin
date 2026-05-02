import * as path from "path";
import type { RuntimeTargetName } from "./environment";

export function joinForTarget(target: RuntimeTargetName, base: string, child: string): string {
  return target === "windows"
    ? path.win32.join(base, child)
    : path.posix.join(base, child);
}

export function relativeForTarget(
  target: RuntimeTargetName,
  from: string,
  to: string,
): string {
  return target === "windows"
    ? path.win32.relative(from, to)
    : path.posix.relative(from, to);
}

export function normalizeForTarget(target: RuntimeTargetName, value: string): string {
  return target === "windows"
    ? path.win32.normalize(value).toLowerCase()
    : path.posix.normalize(value);
}

export function isInsideTarget(
  target: RuntimeTargetName,
  child: string,
  parent: string,
): boolean {
  const rel = relativeForTarget(target, parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function hasPathSeparator(value: string): boolean {
  return value.includes("/") || value.includes("\\");
}
