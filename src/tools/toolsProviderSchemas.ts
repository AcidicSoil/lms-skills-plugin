import { z } from "zod";

export const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;
export const SKILL_ROOT_SEARCH_DEFAULT_LIMIT = 50;
export const SKILL_ROOT_SEARCH_MAX_LIMIT = 200;

export const skillRootSearchPatternSchema = z
  .string()
  .trim()
  .min(1, "Search pattern is required.")
  .max(500, "Search pattern is too long.")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Search pattern cannot contain control characters.");

export const skillRootSearchLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(SKILL_ROOT_SEARCH_MAX_LIMIT)
  .optional()
  .describe(`Maximum number of matching root entries to return. Defaults to ${SKILL_ROOT_SEARCH_DEFAULT_LIMIT}.`);
