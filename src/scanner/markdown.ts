import { MAX_DESCRIPTION_CHARS, BODY_EXCERPT_CHARS } from "../constants";
import type { SkillFrontmatter } from "../types";

export interface ParsedSkillMarkdown {
  frontmatter: SkillFrontmatter | null;
  markdown: string;
}

function unquoteYamlValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return trimmed;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (/^(true|yes|on)$/i.test(value.trim())) return true;
  if (/^(false|no|off)$/i.test(value.trim())) return false;
  return undefined;
}

function parseStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((v) => unquoteYamlValue(v).trim())
      .filter(Boolean);
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

function canonicalFrontmatterExtensionKey(key: string): string {
  return key.trim().toLowerCase().replace(/_/g, "-");
}

function normalizeFrontmatterKey(key: string): keyof SkillFrontmatter | null {
  switch (canonicalFrontmatterExtensionKey(key)) {
    case "name":
      return "name";
    case "description":
      return "description";
    case "when-to-use":
    case "when-to_use":
      return "whenToUse";
    case "tags":
      return "tags";
    case "disable-model-invocation":
      return "disableModelInvocation";
    case "user-invocable":
      return "userInvocable";
    case "allowed-tools":
      return "allowedTools";
    case "context":
      return "context";
    case "agent":
      return "agent";
    case "model":
      return "model";
    case "effort":
      return "effort";
    case "argument-hint":
      return "argumentHint";
    case "arguments":
      return "arguments";
    case "license":
      return "license";
    case "compatibility":
      return "compatibility";
    case "metadata":
      return "metadata";
    case "paths":
      return "paths";
    case "hooks":
      return "hooks";
    case "shell":
      return "shell";
    default:
      return null;
  }
}

function assignFrontmatterValue(
  frontmatter: SkillFrontmatter,
  key: string,
  rawValue: unknown,
): void {
  const normalizedKey = normalizeFrontmatterKey(key);
  if (!normalizedKey) {
    const extensionKey = canonicalFrontmatterExtensionKey(key);
    if (!extensionKey) return;
    if (Array.isArray(rawValue)) {
      const parsedList = parseStringList(rawValue);
      if (parsedList) {
        frontmatter.extensionMetadata = {
          ...(frontmatter.extensionMetadata ?? {}),
          [extensionKey]: parsedList,
        };
      }
      return;
    }
    if (typeof rawValue === "string" && rawValue.trim()) {
      frontmatter.extensionMetadata = {
        ...(frontmatter.extensionMetadata ?? {}),
        [extensionKey]: rawValue.trim(),
      };
    }
    return;
  }

  if (normalizedKey === "disableModelInvocation" || normalizedKey === "userInvocable") {
    const parsed = parseBoolean(rawValue);
    if (parsed !== undefined) {
      (frontmatter as Record<string, unknown>)[normalizedKey] = parsed;
    }
    return;
  }

  if (normalizedKey === "tags" || normalizedKey === "allowedTools" || normalizedKey === "arguments" || normalizedKey === "paths") {
    const parsed = parseStringList(rawValue);
    if (parsed) {
      (frontmatter as Record<string, unknown>)[normalizedKey] = parsed;
    }
    return;
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    (frontmatter as Record<string, unknown>)[normalizedKey] = rawValue.trim();
  }
}

function parseFrontmatterYaml(yaml: string): SkillFrontmatter | null {
  const frontmatter: SkillFrontmatter = {};
  const lines = yaml.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const [, key, rest] = match;
    const value = rest.trim();

    if (value === "|" || value === ">") {
      const blockLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (/^[A-Za-z0-9_-]+:\s*/.test(next)) break;
        blockLines.push(next.replace(/^\s{2,}/, ""));
        j += 1;
      }
      assignFrontmatterValue(
        frontmatter,
        key,
        value === ">" ? blockLines.join(" ").replace(/\s+/g, " ") : blockLines.join("\n"),
      );
      i = j - 1;
      continue;
    }

    if (!value) {
      const listItems: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const item = lines[j].trim().match(/^-\s+(.+)$/);
        if (!item) break;
        listItems.push(unquoteYamlValue(item[1]));
        j += 1;
      }
      if (listItems.length > 0) {
        assignFrontmatterValue(frontmatter, key, listItems);
        i = j - 1;
        continue;
      }
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      assignFrontmatterValue(frontmatter, key, value);
    } else {
      assignFrontmatterValue(frontmatter, key, unquoteYamlValue(value));
    }
  }

  return Object.keys(frontmatter).length > 0 ? frontmatter : null;
}

export function parseSkillMarkdown(content: string): ParsedSkillMarkdown {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: null, markdown: content };
  }

  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) {
    return { frontmatter: null, markdown: content };
  }

  const yaml = normalized.slice(4, closing);
  const markdown = normalized.slice(closing + "\n---\n".length);
  return { frontmatter: parseFrontmatterYaml(yaml), markdown };
}

export function combineDescription(description?: string, whenToUse?: string): string | undefined {
  const parts = [description, whenToUse]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) return undefined;
  return parts.join(" ").replace(/\s+/g, " ").slice(0, MAX_DESCRIPTION_CHARS);
}

export function extractDescription(content: string): string {
  const lines = content.split("\n");
  const collected: string[] = [];
  let passedH1 = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (collected.length > 0) break;
      continue;
    }
    if (trimmed.startsWith("# ") && !passedH1) {
      passedH1 = true;
      continue;
    }
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("```") ||
      trimmed.startsWith("<!--")
    ) {
      if (collected.length > 0) break;
      continue;
    }
    collected.push(trimmed);
    if (collected.join(" ").length >= MAX_DESCRIPTION_CHARS) break;
  }

  return (
    collected.join(" ").trim().slice(0, MAX_DESCRIPTION_CHARS) ||
    "No description available."
  );
}

export function extractBodyExcerpt(content: string): string {
  const lines = content.split("\n");
  const collected: string[] = [];
  let passedH1 = false;
  let passedDescription = false;
  let inCodeFence = false;
  let descriptionDone = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (!passedH1) {
      if (trimmed.startsWith("# ")) passedH1 = true;
      continue;
    }

    if (!descriptionDone) {
      if (!passedDescription) {
        if (trimmed && !trimmed.startsWith("#")) {
          passedDescription = true;
          continue;
        }
        continue;
      }
      if (!trimmed) {
        descriptionDone = true;
        continue;
      }
      continue;
    }

    if (!trimmed) continue;

    const stripped = trimmed
      .replace(/^#{1,6}\s+/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1");

    if (!stripped) continue;

    collected.push(stripped);
    if (collected.join(" ").length >= BODY_EXCERPT_CHARS) break;
  }

  return collected.join(" ").trim().slice(0, BODY_EXCERPT_CHARS);
}
