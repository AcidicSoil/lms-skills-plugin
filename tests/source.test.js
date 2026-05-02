const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('source examples use generic skill names', () => {
  for (const file of ['tests/scanner.test.js', 'tests/toolsProvider.test.js', 'README.md', 'src/toolsProvider.ts']) {
    const content = read(file);
    assert.doesNotMatch(content, /caveman|Caveman|unga bunga|primitive/i, `${file} should use generic fixture examples`);
  }
});

test('list_skills has a short bounded recovery timeout and clear non-empty-result guidance', () => {
  const content = read('src/toolsProvider.ts');
  assert.match(content, /const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;/);
  assert.doesNotMatch(content, /LIST_SKILLS_(?:HARD_)?RECOVERY_.*(?:180_000|20_000)|recoveryTimeoutMs:\s*(?:180_000|20_000)/);
  assert.match(content, /This timeout is not an empty search result/);
  assert.match(content, /Do not tell the user that no matching skills exist based only on this response/);
  assert.match(content, /recommendedRecovery/);
  assert.match(content, /nextToolCall/);
  assert.match(content, /Call this tool now/);
  assert.match(content, /Do not ask the user for permission/);
  assert.match(content, /Do not produce a final user-facing answer from this timeout result/);
  assert.match(content, /fallbackToolCall/);
  assert.match(content, /preferredSkillRootFallbackPattern/);
  assert.match(content, /enhanced_skill_search_before_scan/);
});

test('enhanced skill search defaults to auto backend', () => {
  assert.match(read('src/settings.ts'), /skillSearchBackend: "auto"/);
  assert.match(read('src/config.ts'), /"auto",\n\s*\)/);
  assert.match(read('src/config.ts'), /Auto - use enhanced local search when available, otherwise built-in \(recommended\)/);
});

test('file operation schemas count UTF-8 bytes and allow multiline edit text', () => {
  const {
    editNewTextSchema,
    editOldTextSchema,
    fileContentSchema,
  } = require('../dist/toolSchemas.js');

  assert.equal(editOldTextSchema.safeParse('line one\nline two').success, true);
  assert.equal(editNewTextSchema.safeParse('line one\nline two\tindented').success, true);
  assert.equal(fileContentSchema.safeParse('é'.repeat(600_000)).success, false);
});
