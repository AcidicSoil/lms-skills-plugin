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

test('list_skills has a short bounded recovery timeout instead of a multi-minute wait', () => {
  const content = read('src/toolsProvider.ts');
  assert.match(content, /const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 20_000;/);
  assert.doesNotMatch(content, /LIST_SKILLS_(?:HARD_)?RECOVERY_.*180_000|recoveryTimeoutMs:\s*180_000/);
});
