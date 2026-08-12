import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pageDir = join(root, 'outputs', 'counseling-test');
const html = readFileSync(join(pageDir, 'index.html'), 'utf8');

assert.doesNotMatch(html, /<style[\s>]/i, 'The counseling page should load external CSS.');
assert.doesNotMatch(html, /<script(?:\s[^>]*)?>\s*[^<\s]/i, 'The counseling page should load external JavaScript.');

for (const source of html.matchAll(/(?:href|src)="\.\/([^"?#]+)/g)) {
  assert.ok(existsSync(join(pageDir, source[1])), `Missing page asset: ${source[1]}`);
}

runNodeCheck(join(pageDir, 'app.js'));
runNodeCheck(join(pageDir, 'research.js'));
runNode(join(root, 'worker', 'tests', 'worker.test.mjs'));

const secretPattern = /sk-ant-[a-zA-Z0-9_-]{12,}|ANTHROPIC_API_KEY\s*=\s*(?!replace-with)[^\s]+/;
for (const file of projectFiles(root)) {
  if (!['.js', '.mjs', '.json', '.jsonc', '.md', '.html', '.css', '.example'].includes(extname(file))) continue;
  assert.doesNotMatch(readFileSync(file, 'utf8'), secretPattern, `Possible secret in ${file}`);
}

console.log('Re:Mind verification passed');

function runNodeCheck(file) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || `Syntax check failed: ${file}`);
}

function runNode(file) {
  const result = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  process.stdout.write(result.stdout);
}

function projectFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.wrangler'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...projectFiles(path));
    if (entry.isFile()) files.push(path);
  }
  return files;
}
