import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', '.next', '__pycache__', '.venv', 'venv', 'dist', 'build', 'coverage', 'target', '.idea', '.vscode'
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isLikelyText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.go','.rs','.java','.rb','.php','.swift','.kt','.scala','.json','.yaml','.yml','.toml','.ini','.cfg','.conf','.md','.txt','.sh','.bash','.zsh','.sql','.html','.css','.xml']).has(ext)
    || /(^readme$|^license$|^dockerfile$|^makefile$)/i.test(path.basename(filePath));
}

function inferKind(relPath) {
  const p = relPath.toLowerCase();
  if (/readme\.md$|docs\//.test(p)) return 'docs';
  if (/agent|orchestr|handoff|profile/.test(p)) return 'agent-stack';
  if (/config|settings|env|toml|yaml|yml|json|ini|cfg|conf/.test(p)) return 'configuration';
  if (/schema|contract|adapter/.test(p)) return 'contract-surface';
  if (/test|spec|__tests__|pytest/.test(p)) return 'verification';
  if (/script|bin\//.test(p)) return 'automation';
  if (/main|app|server|index|execution|runtime|cli/.test(p)) return 'runtime-entry';
  return 'project-surface';
}

function inferFinding(relPath, kind) {
  const base = `This ${kind.replace('-', ' ')} surface influences how agents should plan, verify, or document work.`;
  const p = relPath.toLowerCase();
  if (kind === 'runtime-entry') return 'Primary runtime or entry surface likely to affect execution behavior and high-risk implementation changes.';
  if (kind === 'agent-stack') return 'Agent orchestration or handoff surface that should keep boundaries, contracts, and review gates explicit.';
  if (kind === 'configuration') return 'Configuration surface that should stay reviewable, validated, and aligned with runtime expectations.';
  if (kind === 'docs') return 'Documentation or operator surface that forms part of the working contract for future agents and maintainers.';
  if (kind === 'contract-surface') return 'Contract or schema surface that can change integration boundaries and acceptance criteria.';
  if (kind === 'verification') return 'Verification surface that helps prove the strategy and execution contract still match repo reality.';
  if (kind === 'automation') return 'Automation surface that affects developer workflow, artifact generation, or release discipline.';
  if (/package\.json$|pyproject\.toml$|cargo\.toml$|go\.mod$/.test(p)) return 'Project configuration surface that defines tooling, package boundaries, or validation commands.';
  return base;
}

function priorityFor(kind, relPath) {
  const p = relPath.toLowerCase();
  let score = 0;
  if (kind === 'runtime-entry') score += 100;
  if (kind === 'agent-stack') score += 90;
  if (kind === 'configuration') score += 80;
  if (kind === 'contract-surface') score += 70;
  if (kind === 'docs') score += 60;
  if (kind === 'verification') score += 50;
  if (kind === 'automation') score += 40;
  if (/readme\.md$/.test(p)) score += 5;
  if (/package\.json$|pyproject\.toml$|cargo\.toml$|go\.mod$/.test(p)) score += 5;
  return score;
}

function walkRepo(repoRoot) {
  const topLevelDirs = [];
  const topLevelFiles = [];
  const extensionCounts = new Map();
  const candidateFiles = [];
  let totalFiles = 0;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example' && current !== repoRoot) {
        if (entry.isDirectory()) continue;
      }
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      const abs = path.join(current, entry.name);
      const rel = toPosix(path.relative(repoRoot, abs)) || entry.name;
      if (entry.isDirectory()) {
        if (current === repoRoot) topLevelDirs.push(rel);
        walk(abs);
      } else {
        totalFiles += 1;
        if (current === repoRoot) topLevelFiles.push(rel);
        const ext = path.extname(entry.name).toLowerCase() || '[no-ext]';
        extensionCounts.set(ext, (extensionCounts.get(ext) || 0) + 1);
        if (!isLikelyText(abs)) continue;
        const kind = inferKind(rel);
        candidateFiles.push({
          path: rel,
          kind,
          finding: inferFinding(rel, kind),
          priority: priorityFor(kind, rel),
        });
      }
    }
  }

  walk(repoRoot);

  const dedup = new Map();
  for (const item of candidateFiles.sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path))) {
    if (!dedup.has(item.path)) dedup.set(item.path, item);
  }

  const prioritySurfaces = Array.from(dedup.values()).slice(0, 12).map(({ priority, ...rest }) => rest);
  const extensionSummary = Array.from(extensionCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([extension, count]) => ({ extension, count }));

  return {
    source: 'filesystem',
    repo_root: toPosix(repoRoot),
    generated_at: new Date().toISOString(),
    summary: `Filesystem-derived map of ${totalFiles} files with ${prioritySurfaces.length} high-value surfaces for Beagle strategy grounding.`,
    counts: {
      total_files: totalFiles,
      top_level_directories: topLevelDirs.length,
      top_level_files: topLevelFiles.length,
      priority_surfaces: prioritySurfaces.length,
    },
    top_level_directories: topLevelDirs.sort(),
    top_level_files: topLevelFiles.sort(),
    extension_summary: extensionSummary,
    priority_surfaces: prioritySurfaces,
  };
}

function buildStrategyDerivedMap(normalized) {
  const surfaces = normalized.repo_grounding.inspected_surfaces.map((surface) => ({
    path: surface.path,
    kind: surface.kind,
    finding: surface.finding,
  }));
  const topLevelDirs = [...new Set(surfaces.map((surface) => surface.path.split('/')[0]).filter(Boolean))].sort();
  return {
    source: 'strategy-derived',
    repo_root: normalized.target_project.repo_path,
    generated_at: normalized.meta.created_at,
    summary: `Strategy-derived repo map built from ${surfaces.length} inspected surfaces because no live filesystem repo scan was available.`,
    counts: {
      total_files: 0,
      top_level_directories: topLevelDirs.length,
      top_level_files: 0,
      priority_surfaces: surfaces.length,
    },
    top_level_directories: topLevelDirs,
    top_level_files: [],
    extension_summary: [],
    priority_surfaces: surfaces,
  };
}

export function buildRepoMap(normalized) {
  const repoRoot = normalized.target_project?.repo_path ? path.resolve(normalized.target_project.repo_path) : null;
  if (repoRoot && fs.existsSync(repoRoot) && fs.statSync(repoRoot).isDirectory()) {
    return walkRepo(repoRoot);
  }
  return buildStrategyDerivedMap(normalized);
}

export function renderRepoMapMarkdown(repoMap) {
  const lines = [];
  lines.push('# Repo Map');
  lines.push('');
  lines.push(repoMap.summary);
  lines.push('');
  lines.push(`- Source: ${repoMap.source}`);
  lines.push(`- Repo root: ${repoMap.repo_root}`);
  lines.push(`- Generated at: ${repoMap.generated_at}`);
  lines.push(`- Priority surfaces: ${repoMap.counts.priority_surfaces}`);
  if (repoMap.counts.total_files) lines.push(`- Total files scanned: ${repoMap.counts.total_files}`);
  lines.push('');
  lines.push('## Top-level directories');
  lines.push('');
  for (const dir of repoMap.top_level_directories) lines.push(`- ${dir}`);
  lines.push('');
  if (repoMap.top_level_files.length) {
    lines.push('## Top-level files');
    lines.push('');
    for (const file of repoMap.top_level_files) lines.push(`- ${file}`);
    lines.push('');
  }
  if (repoMap.extension_summary.length) {
    lines.push('## Extension summary');
    lines.push('');
    for (const item of repoMap.extension_summary) lines.push(`- ${item.extension}: ${item.count}`);
    lines.push('');
  }
  lines.push('## Priority surfaces');
  lines.push('');
  for (const surface of repoMap.priority_surfaces) {
    lines.push(`- \`${surface.path}\` (${surface.kind}) — ${surface.finding}`);
  }
  return lines.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length < 1) {
    throw new Error('Usage: node plugins/beagle-strategy/scripts/map-repo-surfaces.mjs <repo-root> [output-json] [output-md]');
  }
  const repoRoot = path.resolve(args[0]);
  if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
    throw new Error(`Repo root does not exist or is not a directory: ${repoRoot}`);
  }
  const map = walkRepo(repoRoot);
  if (args[1]) fs.writeFileSync(path.resolve(args[1]), `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  if (args[2]) fs.writeFileSync(path.resolve(args[2]), `${renderRepoMapMarkdown(map)}\n`, 'utf8');
  console.log(JSON.stringify(map, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
