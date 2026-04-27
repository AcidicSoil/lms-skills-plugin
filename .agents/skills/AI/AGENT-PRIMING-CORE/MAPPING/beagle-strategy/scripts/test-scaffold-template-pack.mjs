import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { readArtifactIR, validateArtifactIR } from './validate-artifact-ir.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const scriptPath = path.join(__dirname, 'scaffold-strategy-template-pack.mjs');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'beagle-strategy-scaffold-'));

execFileSync('node', [
  scriptPath,
  '--output-dir', tempRoot,
  '--target-project', 'ExampleRepo',
  '--repo-path', 'example-repo',
  '--primary-language', 'Python',
], { cwd: repoRoot, stdio: 'pipe' });

const packDir = path.join(tempRoot, 'examplerepo');
const artifactPath = path.join(packDir, 'examplerepo.artifact-ir.json');
const fillGuidePath = path.join(packDir, 'fill-guide.md');
const renderHelperPath = path.join(packDir, 'render.sh');

assert(fs.existsSync(packDir), 'scaffold should create the pack directory');
assert(fs.existsSync(artifactPath), 'scaffold should create the artifact ir starter');
assert(fs.existsSync(fillGuidePath), 'scaffold should create the fill guide');
assert(fs.existsSync(renderHelperPath), 'scaffold should create the render helper script');

const document = readArtifactIR(artifactPath);
const result = validateArtifactIR(document);
assert.equal(result.valid, true, `scaffolded artifact should validate: ${result.errors.join('; ')}`);
assert.equal(document.target_project.name, 'ExampleRepo');
assert.equal(document.target_project.primary_language, 'Python');
assert.equal(document.target_project.repo_path, 'example-repo');
assert.equal(document.chosen_skills[0].skill_id, 'beagle-core:review-plan');

const fillGuide = fs.readFileSync(fillGuidePath, 'utf8');
assert(fillGuide.includes('save tokens'), 'fill guide should explain the token-saving purpose');
assert(fillGuide.includes('render.sh'), 'fill guide should mention the render helper');

const renderHelper = fs.readFileSync(renderHelperPath, 'utf8');
assert(renderHelper.includes('validate-artifact-ir.mjs'), 'render helper should validate before rendering');
assert(renderHelper.includes('render-artifact-bundle.mjs'), 'render helper should render the bundle');

console.log('Scaffold template pack checks passed.');
