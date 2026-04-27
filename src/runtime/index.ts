import type { EffectiveConfig } from "../types";
import type { RuntimeTargetName } from "../environment";
import type { RuntimeAdapter } from "./types";
import { createWindowsRuntime } from "./windowsRuntime";
import { createWslRuntime } from "./wslRuntime";

export class RuntimeRegistry {
  private readonly runtimes = new Map<RuntimeTargetName, RuntimeAdapter>();

  constructor(runtimes: RuntimeAdapter[]) {
    for (const runtime of runtimes) {
      this.runtimes.set(runtime.target, runtime);
    }
  }

  getRuntime(target: RuntimeTargetName): RuntimeAdapter {
    const runtime = this.runtimes.get(target);
    if (!runtime) throw new Error(`Runtime target not available: ${target}`);
    return runtime;
  }

  hasRuntime(target: RuntimeTargetName): boolean {
    return this.runtimes.has(target);
  }
}

export function createRuntimeRegistry(config: EffectiveConfig): RuntimeRegistry {
  return new RuntimeRegistry([
    createWindowsRuntime(config.windowsShellPath || undefined),
    createWslRuntime({
      distro: config.wslDistro || undefined,
      shellPath: config.wslShellPath || undefined,
    }),
  ]);
}

export type { RuntimeAdapter } from "./types";
