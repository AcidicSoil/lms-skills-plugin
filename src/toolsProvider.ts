import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { resolveEffectiveConfig } from "./settings";
import { execCommand } from "./executor";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_COMMAND_LENGTH,
  LIST_SKILLS_DEFAULT_LIMIT,
} from "./constants";
import {
  scanSkills,
  searchSkills,
  resolveSkillByName,
  readSkillFile,
  readAbsolutePath,
  listSkillDirectory,
  listAbsoluteDirectory,
} from "./scanner";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry } from "./types";

function formatDirEntries(entries: DirectoryEntry[], rootName: string): string {
  if (entries.length === 0) return "Directory is empty.";

  const lines: string[] = [`${rootName}/`];
  for (const entry of entries) {
    const depth = entry.relativePath.split(/[/\\]/).length - 1;
    const indent = "  ".repeat(depth);
    if (entry.type === "directory") {
      lines.push(`${indent}${entry.name}/`);
    } else {
      const size =
        entry.sizeBytes !== undefined
          ? entry.sizeBytes >= 1024
            ? `${Math.round(entry.sizeBytes / 1024)}K`
            : `${entry.sizeBytes}B`
          : "";
      lines.push(`${indent}${entry.name}${size ? `  (${size})` : ""}`);
    }
  }
  return lines.join("\n");
}

export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = tool({
    name: "list_skills",
    description:
      "List or search available skills. " +
      "Without a query, returns all skills up to the limit. " +
      "With a query, scores and ranks skills by relevance across name, tags, description, and SKILL.md body content. " +
      "Always call read_skill_file on any skill that looks relevant before starting work.",
    parameters: {
      query: z.string().optional().describe("Optional search query."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe(`Maximum number of skills to return. Defaults to ${LIST_SKILLS_DEFAULT_LIMIT}.`),
    },
    implementation: async ({ query, limit }, { status }) => {
      const cfg = resolveEffectiveConfig(ctl);
      const registry = createRuntimeRegistry(cfg);
      const roots = await resolveSkillRoots(
        cfg.skillsPaths,
        deriveRuntimeTargets(cfg.skillsEnvironment),
        registry,
        ctl.abortSignal,
      );
      const cap = limit ?? LIST_SKILLS_DEFAULT_LIMIT;

      if (query && query.trim()) {
        status(`Searching skills for "${query.trim()}"..`);
        const results = await searchSkills(roots, registry, query.trim(), ctl.abortSignal);

        if (results.length === 0) {
          return {
            query: query.trim(),
            found: 0,
            skills: [],
            roots,
            note: "No skills matched. Try a broader query or omit the query to list all skills.",
          };
        }

        const page = results.slice(0, cap);
        status(`Found ${results.length} match${results.length !== 1 ? "es" : ""}`);

        return {
          query: query.trim(),
          total: results.length,
          found: page.length,
          skillsEnvironment: cfg.skillsEnvironment,
          roots,
          ...(results.length > cap
            ? { note: `Showing top ${cap} of ${results.length} matches.` }
            : {}),
          skills: page.map(({ skill, score }) => ({
            name: skill.name,
            description: skill.description,
            tags: skill.tags.length > 0 ? skill.tags : undefined,
            environment: skill.environment,
            skillMdPath: skill.skillMdPath,
            displayPath: skill.displayPath,
            hasExtraFiles: skill.hasExtraFiles,
            score: Math.round(score * 100) / 100,
          })),
        };
      }

      status("Scanning skills directories..");
      const skills = await scanSkills(roots, registry, ctl.abortSignal);

      if (skills.length === 0) {
        return {
          total: 0,
          found: 0,
          skillsEnvironment: cfg.skillsEnvironment,
          roots,
          skills: [],
          note: "No skills found. Create skill directories with a SKILL.md file inside the configured skills paths.",
        };
      }

      const page = skills.slice(0, cap);
      status(`Found ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);

      return {
        total: skills.length,
        found: page.length,
        skillsEnvironment: cfg.skillsEnvironment,
        roots,
        ...(skills.length > cap
          ? { note: `Showing ${cap} of ${skills.length} skills.` }
          : {}),
        skills: page.map((s) => ({
          name: s.name,
          description: s.description,
          tags: s.tags.length > 0 ? s.tags : undefined,
          environment: s.environment,
          skillMdPath: s.skillMdPath,
          displayPath: s.displayPath,
          hasExtraFiles: s.hasExtraFiles,
        })),
      };
    },
  });

  const readSkillFileTool = tool({
    name: "read_skill_file",
    description:
      "Read a file from within a skill directory. Accepts a skill name, an environment-prefixed display path such as WSL:/path, or an absolute path within a configured skill root.",
    parameters: {
      skill_name: z.string().min(1).describe("Skill name or absolute/display path."),
      file_path: z.string().optional().describe("Relative path inside the skill directory. Omit for SKILL.md."),
    },
    implementation: async ({ skill_name, file_path }, { status }) => {
      const cfg = resolveEffectiveConfig(ctl);
      const registry = createRuntimeRegistry(cfg);
      const roots = await resolveSkillRoots(
        cfg.skillsPaths,
        deriveRuntimeTargets(cfg.skillsEnvironment),
        registry,
        ctl.abortSignal,
      );
      status(`Reading ${skill_name}${file_path ? ` / ${file_path}` : ""}..`);

      if (
        skill_name.startsWith("WSL:") ||
        skill_name.startsWith("Windows:") ||
        path.isAbsolute(skill_name)
      ) {
        const result = await readAbsolutePath(skill_name, roots, registry, ctl.abortSignal);
        if ("error" in result) return { success: false, error: result.error };
        status(`Read ${Math.round(result.content.length / 1024)}KB`);
        return {
          success: true,
          environment: result.environment,
          filePath: result.resolvedPath,
          displayPath: `${result.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
          content: result.content,
        };
      }

      const skill = await resolveSkillByName(roots, registry, skill_name, ctl.abortSignal);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const result = await readSkillFile(skill, file_path, registry, ctl.abortSignal);
      if ("error" in result) return { success: false, skill: skill_name, error: result.error };

      status(`Read ${Math.round(result.content.length / 1024)}KB from ${skill.name}`);

      return {
        success: true,
        skill: skill.name,
        environment: skill.environment,
        filePath: file_path || "SKILL.md",
        resolvedPath: result.resolvedPath,
        displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
        content: result.content,
        hasExtraFiles: skill.hasExtraFiles,
        ...(skill.hasExtraFiles
          ? { hint: "This skill has additional files. Call list_skill_files to explore them." }
          : {}),
      };
    },
  });

  const listSkillFilesTool = tool({
    name: "list_skill_files",
    description:
      "List all files inside a skill directory. Accepts a skill name or an environment-prefixed display path.",
    parameters: {
      skill_name: z.string().min(1).describe("Skill name or absolute/display path."),
      sub_path: z.string().optional().describe("Optional relative sub-path within the skill directory."),
    },
    implementation: async ({ skill_name, sub_path }, { status }) => {
      const cfg = resolveEffectiveConfig(ctl);
      const registry = createRuntimeRegistry(cfg);
      const roots = await resolveSkillRoots(
        cfg.skillsPaths,
        deriveRuntimeTargets(cfg.skillsEnvironment),
        registry,
        ctl.abortSignal,
      );
      status(`Listing files in ${skill_name}..`);

      if (
        skill_name.startsWith("WSL:") ||
        skill_name.startsWith("Windows:") ||
        path.isAbsolute(skill_name)
      ) {
        const entries = await listAbsoluteDirectory(skill_name, roots, registry, ctl.abortSignal);
        const formatted = formatDirEntries(entries, path.basename(skill_name));
        status(`Found ${entries.length} entries`);
        return {
          success: true,
          directoryPath: skill_name,
          entryCount: entries.length,
          tree: formatted,
          entries: entries.map((e) => ({
            name: e.name,
            path: e.relativePath,
            type: e.type,
            environment: e.environment,
            ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
          })),
        };
      }

      const skill = await resolveSkillByName(roots, registry, skill_name, ctl.abortSignal);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const entries = await listSkillDirectory(skill, sub_path, registry, ctl.abortSignal);
      const formatted = formatDirEntries(entries, skill.name);

      status(`Found ${entries.length} entries in ${skill_name}`);

      return {
        success: true,
        skill: skill.name,
        environment: skill.environment,
        directoryPath: skill.directoryPath,
        displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${skill.directoryPath}`,
        entryCount: entries.length,
        tree: formatted,
        entries: entries.map((e) => ({
          name: e.name,
          path: e.relativePath,
          type: e.type,
          environment: e.environment,
          ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
        })),
      };
    },
  });

  const runCommandTool = tool({
    name: "run_command",
    description:
      "Execute a shell command in the configured skills runtime environment. In Both mode, pass environment or a cwd/display path that identifies Windows or WSL.",
    parameters: {
      command: z.string().min(1).max(EXEC_MAX_COMMAND_LENGTH).describe("The shell command to execute."),
      cwd: z.string().optional().describe("Working directory for the command."),
      environment: z.enum(["windows", "wsl"]).optional().describe("Optional explicit command target."),
      timeout_ms: z
        .number()
        .int()
        .min(1_000)
        .max(EXEC_MAX_TIMEOUT_MS)
        .optional()
        .describe(`Timeout in milliseconds. Defaults to ${EXEC_DEFAULT_TIMEOUT_MS}ms.`),
      env: z.record(z.string()).optional().describe("Optional environment variables."),
    },
    implementation: async ({ command, cwd, environment, timeout_ms, env }, { status }) => {
      const cfg = resolveEffectiveConfig(ctl);
      status(`Running ${environment ? `in ${environment}` : "command"}: ${command.slice(0, 60)}${command.length > 60 ? "\u2026" : ""}`);

      const registry = createRuntimeRegistry(cfg);
      const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
      const defaultTarget = targets.length === 1 ? targets[0] : undefined;
      if (!environment && !defaultTarget && !cwd) {
        status("Command target error");
        return {
          success: false,
          error:
            "Both runtime mode is active and no command target or cwd was provided.",
          hint: "Pass environment as 'windows' or 'wsl', or provide an environment-specific cwd.",
        };
      }

      const result = await execCommand(
        command,
        {
          cwd,
          timeoutMs: timeout_ms,
          env,
          signal: ctl.abortSignal,
          target: environment,
        },
        registry,
        environment ?? defaultTarget ?? targets[0],
      );

      status(result.timedOut ? "Timed out" : `Exit ${result.exitCode}`);

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        environment: result.environment,
        platform: result.platform,
        shell: result.shell,
        ...(result.timedOut
          ? { hint: "Command exceeded the timeout. Try increasing timeout_ms or splitting into smaller steps." }
          : {}),
        ...(result.exitCode !== 0 && !result.timedOut && result.stderr
          ? { hint: "Command exited with a non-zero code. Check stderr for details." }
          : {}),
      };
    },
  });

  return [listSkillsTool, readSkillFileTool, listSkillFilesTool, runCommandTool];
}
