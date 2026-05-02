import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { TOOL_FILE_OPERATION_TIMEOUT_MS } from "../constants";
import { editFileWithinRoots, readFileWithinRoots, writeFileWithinRoots } from "../scanner";
import { logDiagnostic, timedStep } from "../diagnostics";
import { editNewTextSchema, editOldTextSchema, fileContentSchema, sandboxFilePathSchema } from "../toolSchemas";
import type { PluginController } from "../pluginTypes";
import { withToolLogging } from "./toolsProviderLogging";
import { getRuntimeContext } from "./toolsProviderShared";

export function createFileTools(ctl: PluginController) {
  const readFileTool = tool({
    name: "read_file",
    description:
      "Read a UTF-8 text file inside the configured skills sandbox. Accepts an absolute path or environment-prefixed display path such as WSL:/path. This is for authorized workflow file reads, not broad filesystem exploration; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
    },
    implementation: async ({ file_path }, { status }) =>
      withToolLogging(ctl, "read_file", { file_path }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_file", toolSignal, { status });
        status(`Reading ${file_path}..`);
        const result = await timedStep(
          requestId,
          "read_file",
          "read_file_within_roots",
          async () => readFileWithinRoots(file_path, roots, registry, toolSignal),
          { file_path, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_read_result",
          requestId,
          tool: "read_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          contentLength: result.content.length,
          sizeBytes: result.sizeBytes,
        });
        return {
          success: true,
          environment: result.environment,
          filePath: result.resolvedPath,
          displayPath: result.displayPath,
          sizeBytes: result.sizeBytes,
          content: result.content,
        };
      }, { ui: { status } }),
  });

  const writeFileTool = tool({
    name: "write_file",
    description:
      "Write or replace a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded as an explicit authorization signal. Paths outside configured skill roots are rejected. Set overwrite=true to replace an existing file.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      content: fileContentSchema.describe("UTF-8 text content to write."),
      overwrite: z.boolean().optional().describe("Whether to overwrite an existing file. Defaults to false."),
    },
    implementation: async ({ file_path, content, overwrite }, { status }) =>
      withToolLogging(ctl, "write_file", { file_path, overwrite, contentBytes: Buffer.byteLength(content, "utf-8") }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "write_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_write_blocked", requestId, tool: "write_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File writes require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Writing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "write_file",
          "write_file_within_roots",
          async () => writeFileWithinRoots(file_path, content, roots, registry, { overwrite: overwrite === true }, toolSignal),
          { file_path, overwrite: overwrite === true, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_write_result",
          requestId,
          tool: "write_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          bytesWritten: result.bytesWritten,
          created: result.created,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

  const editFileTool = tool({
    name: "edit_file",
    description:
      "Replace exact text in a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded. Use expected_replacements to prevent accidental broad edits; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      old_text: editOldTextSchema.describe("Exact text to replace."),
      new_text: editNewTextSchema.describe("Replacement text."),
      expected_replacements: z.number().int().min(1).max(1_000).optional().describe("Optional exact number of replacements required."),
    },
    implementation: async ({ file_path, old_text, new_text, expected_replacements }, { status }) =>
      withToolLogging(ctl, "edit_file", { file_path, oldTextBytes: Buffer.byteLength(old_text, "utf-8"), newTextBytes: Buffer.byteLength(new_text, "utf-8"), expected_replacements }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "edit_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_edit_blocked", requestId, tool: "edit_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File edits require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Editing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "edit_file",
          "edit_file_within_roots",
          async () => editFileWithinRoots(file_path, old_text, new_text, roots, registry, { expectedReplacements: expected_replacements }, toolSignal),
          { file_path, expected_replacements, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_edit_result",
          requestId,
          tool: "edit_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          replacements: result.replacements,
          bytesWritten: result.bytesWritten,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

  return [readFileTool, writeFileTool, editFileTool];
}
