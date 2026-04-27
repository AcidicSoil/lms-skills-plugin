import * as path from "path";
import { z } from "zod";
import {
  EXEC_MAX_COMMAND_LENGTH,
  EXEC_MAX_TIMEOUT_MS,
  LIST_SKILLS_DEFAULT_LIMIT,
} from "./constants";

const CONTROL_OR_NULL = /[\u0000-\u001f\u007f]/;
const WINDOWS_ABSOLUTE = /^[A-Za-z]:[\\/]/;
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

function noControlChars(value: string): boolean {
  return !CONTROL_OR_NULL.test(value);
}

function noTraversal(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some((part) => part === "..");
}

function isRelativePath(value: string): boolean {
  return (
    !path.posix.isAbsolute(value) &&
    !path.win32.isAbsolute(value) &&
    !WINDOWS_ABSOLUTE.test(value) &&
    !value.startsWith("WSL:") &&
    !value.startsWith("Windows:")
  );
}

function noShellNewline(value: string): boolean {
  return !/[\r\n]/.test(value);
}

export const skillNameSchema = z
  .string()
  .trim()
  .min(1, "Skill name or path is required.")
  .max(1_000, "Skill name/path is too long.")
  .refine(noControlChars, "Skill name/path cannot contain control characters.");

export const optionalRelativeSkillPathSchema = z
  .string()
  .trim()
  .min(1, "File path cannot be empty when provided.")
  .max(1_000, "File path is too long.")
  .refine(noControlChars, "File path cannot contain control characters.")
  .refine(isRelativePath, "File path must be relative to the skill directory.")
  .refine(noTraversal, "File path cannot contain '..' traversal segments.")
  .optional();

export const listSkillsQuerySchema = z
  .string()
  .trim()
  .max(500, "Search query is too long.")
  .refine(noControlChars, "Search query cannot contain control characters.")
  .optional();

export const listSkillsLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe(`Maximum number of skills to return. Defaults to ${LIST_SKILLS_DEFAULT_LIMIT}.`);

export const commandSchema = z
  .string()
  .trim()
  .min(1, "Command is required.")
  .max(EXEC_MAX_COMMAND_LENGTH)
  .refine(noControlChars, "Command cannot contain control characters or newlines.")
  .refine(noShellNewline, "Command must be a single-line command.");

export const cwdSchema = z
  .string()
  .trim()
  .min(1, "Working directory cannot be empty when provided.")
  .max(1_000, "Working directory is too long.")
  .refine(noControlChars, "Working directory cannot contain control characters.")
  .optional();

export const timeoutMsSchema = z
  .number()
  .int()
  .min(1_000)
  .max(EXEC_MAX_TIMEOUT_MS)
  .optional();

export const envSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(128)
      .regex(ENV_KEY, "Environment variable names must be shell-safe identifiers."),
    z
      .string()
      .max(4_096)
      .refine(noControlChars, "Environment variable values cannot contain control characters."),
  )
  .refine((env) => Object.keys(env).length <= 50, "At most 50 environment variables are allowed.")
  .optional();
