import * as fs from 'node:fs';
import * as path from 'node:path';
import { execProgram } from './executor';
import {
  extractBodyExcerpt,
  extractDescription,
  listSkillDirectory,
  readSkillFile,
  resolveSkillByName,
  scanSkills,
  searchSkills,
  type SkillSearchResult,
} from './scanner';
import { MAX_DIRECTORY_DEPTH, MAX_DIRECTORY_ENTRIES, SKILL_ENTRY_POINT } from './constants';
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from './types';
import { wslDisplayPathToNative } from './wslPath';

export interface SkillStore {
  roots: string[];
  scan(): Promise<SkillInfo[]>;
  search(query: string): Promise<SkillSearchResult[]>;
  resolve(nameOrPath: string): Promise<SkillInfo | null>;
  read(
    skill: SkillInfo,
    relativeFilePath?: string,
  ): Promise<{ content: string; resolvedPath: string } | { error: string }>;
  list(skill: SkillInfo, relativeSubPath?: string): Promise<DirectoryEntry[]>;
}

function createHostSkillStore(config: EffectiveConfig): SkillStore {
  return {
    roots: config.skillsPaths,
    async scan() {
      return scanSkills(config.skillsPaths);
    },
    async search(query) {
      return searchSkills(config.skillsPaths, query);
    },
    async resolve(nameOrPath) {
      return resolveSkillByName(config.skillsPaths, nameOrPath);
    },
    async read(skill, relativeFilePath) {
      return readSkillFile(skill, relativeFilePath);
    },
    async list(skill, relativeSubPath) {
      return listSkillDirectory(skill, relativeSubPath);
    },
  };
}

type SkillProgramRunner = typeof execProgram;
type WslPathMapper = (linuxPath: string, distribution?: string) => string;

async function resolveWslRoots(
  config: EffectiveConfig,
  runner: SkillProgramRunner,
): Promise<string[]> {
  if (config.skillsPaths.every((raw) => raw.trim().startsWith('/'))) {
    return config.skillsPaths.map((raw) => path.posix.normalize(raw.trim()));
  }
  const homeResult = await runner('printenv', ['HOME'], {
    executionEnvironment: 'wsl',
    wslDistribution: config.wslDistribution,
    cwd: '/',
  });
  if (homeResult.exitCode !== 0)
    throw new Error(homeResult.stderr || 'Unable to resolve WSL HOME for skill paths.');
  const home = homeResult.stdout.trim().replace(/\/+$/, '');
  if (!home.startsWith('/')) throw new Error('WSL HOME is not a Linux absolute path.');
  return config.skillsPaths.map((raw) => {
    const value = raw.trim();
    if (value === '~') return home;
    if (value.startsWith('~/')) return path.posix.join(home, value.slice(2));
    if (!value.startsWith('/'))
      throw new Error(`WSL skill path must be Linux-absolute or start with ~/: ${value}`);
    return path.posix.normalize(value);
  });
}

function simpleSearch(skills: SkillInfo[], query: string): SkillSearchResult[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return skills
    .map((skill) => {
      const haystack = [skill.name, skill.description, skill.bodyExcerpt, ...skill.tags]
        .join(' ')
        .toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { skill, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
}

function createWslSkillStore(
  config: EffectiveConfig,
  runner: SkillProgramRunner,
  mapPath: WslPathMapper,
): SkillStore {
  let resolvedRootsPromise: Promise<string[]> | undefined;
  let cachedSkills: SkillInfo[] | undefined;
  const roots = () => (resolvedRootsPromise ??= resolveWslRoots(config, runner));
  const native = (linuxPath: string) => mapPath(linuxPath, config.wslDistribution);

  const store: SkillStore = {
    roots: config.skillsPaths,
    async scan() {
      if (cachedSkills) return cachedSkills;
      const found: SkillInfo[] = [];
      for (const root of await roots()) {
        let entries: fs.Dirent[];
        try {
          entries = await fs.promises.readdir(native(root), { withFileTypes: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
          throw error;
        }
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const directoryPath = path.posix.join(root, entry.name);
          const skillMdPath = path.posix.join(directoryPath, SKILL_ENTRY_POINT);
          let content: string;
          try {
            content = await fs.promises.readFile(native(skillMdPath), 'utf8');
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
            throw error;
          }
          const children = await fs.promises.readdir(native(directoryPath), {
            withFileTypes: true,
          });
          found.push({
            name: entry.name,
            description: extractDescription(content),
            bodyExcerpt: extractBodyExcerpt(content),
            tags: [],
            skillMdPath,
            directoryPath,
            hasExtraFiles: children.some((child) => child.name !== SKILL_ENTRY_POINT),
          });
        }
      }
      cachedSkills = found.sort((a, b) => a.name.localeCompare(b.name));
      store.roots = await roots();
      return cachedSkills;
    },
    async search(query) {
      return simpleSearch(await store.scan(), query);
    },
    async resolve(nameOrPath) {
      const target = nameOrPath.toLowerCase().trim();
      return (
        (await store.scan()).find(
          (skill) =>
            skill.name.toLowerCase() === target ||
            skill.skillMdPath.toLowerCase() === target ||
            skill.directoryPath.toLowerCase() === target,
        ) ?? null
      );
    },
    async read(skill, relativeFilePath) {
      const target = path.posix.resolve(
        skill.directoryPath,
        relativeFilePath?.trim() || SKILL_ENTRY_POINT,
      );
      const relative = path.posix.relative(skill.directoryPath, target);
      if (relative.startsWith('../') || relative === '..' || path.posix.isAbsolute(relative)) {
        return { error: 'Path traversal outside skill directory is not allowed.' };
      }
      try {
        return {
          content: await fs.promises.readFile(native(target), 'utf8'),
          resolvedPath: target,
        };
      } catch (error) {
        return { error: (error as Error).message || `Unable to read file: ${target}` };
      }
    },
    async list(skill, relativeSubPath) {
      const base = path.posix.resolve(skill.directoryPath, relativeSubPath?.trim() || '.');
      const relative = path.posix.relative(skill.directoryPath, base);
      if (relative.startsWith('../') || relative === '..' || path.posix.isAbsolute(relative))
        return [];
      const entries: DirectoryEntry[] = [];
      const walk = async (displayDirectory: string, depth: number): Promise<void> => {
        const dirents = await fs.promises.readdir(native(displayDirectory), {
          withFileTypes: true,
        });
        for (const entry of dirents) {
          if (entries.length >= MAX_DIRECTORY_ENTRIES) return;
          const displayFull = path.posix.join(displayDirectory, entry.name);
          const stat = entry.isDirectory()
            ? undefined
            : await fs.promises.stat(native(displayFull));
          entries.push({
            name: entry.name,
            relativePath: path.posix.relative(skill.directoryPath, displayFull),
            type: entry.isDirectory() ? 'directory' : 'file',
            ...(stat ? { sizeBytes: stat.size } : {}),
          });
          if (entry.isDirectory() && depth < MAX_DIRECTORY_DEPTH)
            await walk(displayFull, depth + 1);
        }
      };
      try {
        await walk(base, 0);
      } catch {
        return [];
      }
      return entries;
    },
  };
  return store;
}

export function createSkillStore(
  config: EffectiveConfig,
  dependencies: { execProgram?: SkillProgramRunner; toNativeWslPath?: WslPathMapper } = {},
): SkillStore {
  return config.executionEnvironment === 'wsl'
    ? createWslSkillStore(
        config,
        dependencies.execProgram ?? execProgram,
        dependencies.toNativeWslPath ??
          ((linuxPath, distribution) => wslDisplayPathToNative(distribution, linuxPath)),
      )
    : createHostSkillStore(config);
}
