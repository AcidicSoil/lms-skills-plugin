import * as path from "path";
import { execProgram } from "./executor";
import {
  extractBodyExcerpt,
  extractDescription,
  listSkillDirectory,
  readSkillFile,
  resolveSkillByName,
  scanSkills,
  searchSkills,
  type SkillSearchResult,
} from "./scanner";
import { MAX_DIRECTORY_DEPTH, MAX_DIRECTORY_ENTRIES, SKILL_ENTRY_POINT } from "./constants";
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from "./types";

export interface SkillStore {
  roots: string[];
  scan(): Promise<SkillInfo[]>;
  search(query: string): Promise<SkillSearchResult[]>;
  resolve(nameOrPath: string): Promise<SkillInfo | null>;
  read(skill: SkillInfo, relativeFilePath?: string): Promise<{ content: string; resolvedPath: string } | { error: string }>;
  list(skill: SkillInfo, relativeSubPath?: string): Promise<DirectoryEntry[]>;
}

function createHostSkillStore(config: EffectiveConfig): SkillStore {
  return {
    roots: config.skillsPaths,
    async scan() { return scanSkills(config.skillsPaths); },
    async search(query) { return searchSkills(config.skillsPaths, query); },
    async resolve(nameOrPath) { return resolveSkillByName(config.skillsPaths, nameOrPath); },
    async read(skill, relativeFilePath) { return readSkillFile(skill, relativeFilePath); },
    async list(skill, relativeSubPath) { return listSkillDirectory(skill, relativeSubPath); },
  };
}

type SkillProgramRunner = typeof execProgram;

async function runWsl(config: EffectiveConfig, runner: SkillProgramRunner, program: string, args: string[]) {
  return runner(program, args, {
    executionEnvironment: "wsl",
    wslDistribution: config.wslDistribution,
    cwd: "/",
  });
}

async function resolveWslRoots(config: EffectiveConfig, runner: SkillProgramRunner): Promise<string[]> {
  const homeResult = await runWsl(config, runner, "printenv", ["HOME"]);
  if (homeResult.exitCode !== 0) {
    throw new Error(homeResult.stderr || "Unable to resolve WSL HOME for skill paths.");
  }
  const home = homeResult.stdout.trim().replace(/\/+$/, "");
  if (!home.startsWith("/")) throw new Error("WSL HOME is not a Linux absolute path.");
  return config.skillsPaths.map((raw) => {
    const value = raw.trim();
    if (value === "~") return home;
    if (value.startsWith("~/")) return path.posix.join(home, value.slice(2));
    if (!value.startsWith("/")) {
      throw new Error(`WSL skill path must be Linux-absolute or start with ~/: ${value}`);
    }
    return path.posix.normalize(value);
  });
}

async function readWslFile(config: EffectiveConfig, runner: SkillProgramRunner, absolutePath: string) {
  const result = await runWsl(config, runner, "cat", ["--", absolutePath]);
  if (result.exitCode !== 0) return { error: result.stderr || `Unable to read file: ${absolutePath}` } as const;
  return { content: result.stdout, resolvedPath: absolutePath } as const;
}

function simpleSearch(skills: SkillInfo[], query: string): SkillSearchResult[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return skills.map((skill) => {
    const haystack = [skill.name, skill.description, skill.bodyExcerpt, ...skill.tags].join(" ").toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    return { skill, score };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
}

function createWslSkillStore(config: EffectiveConfig, runner: SkillProgramRunner): SkillStore {
  let resolvedRootsPromise: Promise<string[]> | undefined;
  let cachedSkills: SkillInfo[] | undefined;
  const roots = () => resolvedRootsPromise ??= resolveWslRoots(config, runner);

  const store: SkillStore = {
    roots: config.skillsPaths,
    async scan() {
      if (cachedSkills) return cachedSkills;
      const found: SkillInfo[] = [];
      for (const root of await roots()) {
        const result = await runWsl(config, runner, "find", [root, "-mindepth", "2", "-maxdepth", "2", "-type", "f", "-name", SKILL_ENTRY_POINT, "-print"]);
        if (result.exitCode !== 0) {
          if (/No such file or directory/i.test(result.stderr)) continue;
          throw new Error(result.stderr || `Unable to scan WSL skill root: ${root}`);
        }
        for (const skillMdPath of result.stdout.split("\n").map((line) => line.trim()).filter(Boolean)) {
          const directoryPath = path.posix.dirname(skillMdPath);
          const contentResult = await readWslFile(config, runner, skillMdPath);
          if ("error" in contentResult) continue;
          const extraResult = await runWsl(config, runner, "find", [directoryPath, "-mindepth", "1", "-maxdepth", "1", "-type", "f", "!", "-name", SKILL_ENTRY_POINT, "-print", "-quit"]);
          found.push({
            name: path.posix.basename(directoryPath),
            description: extractDescription(contentResult.content),
            bodyExcerpt: extractBodyExcerpt(contentResult.content),
            tags: [],
            skillMdPath,
            directoryPath,
            hasExtraFiles: Boolean(extraResult.stdout.trim()),
          });
        }
      }
      cachedSkills = found.sort((a, b) => a.name.localeCompare(b.name));
      store.roots = await roots();
      return cachedSkills;
    },
    async search(query) { return simpleSearch(await store.scan(), query); },
    async resolve(nameOrPath) {
      const target = nameOrPath.toLowerCase().trim();
      return (await store.scan()).find((skill) =>
        skill.name.toLowerCase() === target ||
        skill.skillMdPath.toLowerCase() === target ||
        skill.directoryPath.toLowerCase() === target,
      ) ?? null;
    },
    async read(skill, relativeFilePath) {
      const target = path.posix.resolve(skill.directoryPath, relativeFilePath?.trim() || SKILL_ENTRY_POINT);
      const relative = path.posix.relative(skill.directoryPath, target);
      if (relative.startsWith("../") || relative === ".." || path.posix.isAbsolute(relative)) {
        return { error: "Path traversal outside skill directory is not allowed." };
      }
      return readWslFile(config, runner, target);
    },
    async list(skill, relativeSubPath) {
      const base = path.posix.resolve(skill.directoryPath, relativeSubPath?.trim() || ".");
      const relative = path.posix.relative(skill.directoryPath, base);
      if (relative.startsWith("../") || relative === ".." || path.posix.isAbsolute(relative)) return [];
      const result = await runWsl(config, runner, "find", [base, "-mindepth", "1", "-maxdepth", String(MAX_DIRECTORY_DEPTH + 1), "-printf", "%y\t%s\t%p\n"]);
      if (result.exitCode !== 0) return [];
      return result.stdout.split("\n").filter(Boolean).slice(0, MAX_DIRECTORY_ENTRIES).map((line): DirectoryEntry | null => {
        const [kind, size, ...parts] = line.split("\t");
        const absolute = parts.join("\t");
        if (!absolute) return null;
        const relativePath = path.posix.relative(skill.directoryPath, absolute);
        return kind === "d"
          ? { name: path.posix.basename(absolute), relativePath, type: "directory" }
          : { name: path.posix.basename(absolute), relativePath, type: "file", sizeBytes: Number(size) || undefined };
      }).filter((entry): entry is DirectoryEntry => entry !== null);
    },
  };
  return store;
}

export function createSkillStore(config: EffectiveConfig, dependencies: { execProgram?: SkillProgramRunner } = {}): SkillStore {
  return config.executionEnvironment === "wsl"
    ? createWslSkillStore(config, dependencies.execProgram ?? execProgram)
    : createHostSkillStore(config);
}
