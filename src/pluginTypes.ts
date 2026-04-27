import type { configSchematics } from "./config";

export interface PluginController {
  abortSignal?: AbortSignal;
  getPluginConfig(schematics: typeof configSchematics): {
    get(key: string): unknown;
  };
}

export interface PluginContext {
  withConfigSchematics(schematics: typeof configSchematics): void;
  withToolsProvider(
    provider: (ctl: PluginController) => Promise<unknown[]>,
  ): void;
  withPromptPreprocessor(
    preprocessor: (ctl: PluginController, message: unknown) => Promise<unknown>,
  ): void;
}
