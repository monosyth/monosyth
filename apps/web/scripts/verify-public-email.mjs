import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
const leaked = [];
function scan(directory, suffixes) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file, suffixes);
    else if (suffixes.has(path.extname(file))) {
      checked++;
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      if (/[a-z0-9._%+-]+(?:@|%40)gmail\.com/i.test(content)) leaked.push(path.relative(root, file));
    }
  }
}
scan(path.join(root, '.next/static'), new Set(['.js', '.json', '.map']));
scan(path.join(root, '.next/server/app'), new Set(['.html', '.rsc']));
scan(path.join(root, 'public'), new Set(['.html', '.js', '.mjs', '.json', '.map']));
assert.ok(checked > 0, 'Build public assets before running the email privacy audit');
assert.deepEqual(leaked, [], 'Personal Gmail address leaked into public assets');
console.log(`Public email audit passed: ${checked} public build assets checked`);
