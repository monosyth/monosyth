import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { request } from 'node:http';
import { resolve } from 'node:path';
import vm from 'node:vm';

// Exercise the running Next server rather than duplicating routing logic.
const server = new URL(process.argv[2] ?? 'http://127.0.0.1:3017');
let checked = 0;
function get(path, host = 'vtmultifamily.com') {
  return new Promise((done, reject) => {
    const req = request(new URL(path, server), { headers: { Host: host } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => done({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}));
    });
    req.on('error', reject);
    req.end();
  });
}
async function check(path, host, status = 200) {
  const result = await get(path, host);
  assert.equal(result.status, status, `${host}${path}: expected ${status}, got ${result.status}`);
  checked++;
  return result;
}

const home = await check('/', 'vtmultifamily.com');
const html = home.body.toString();
assert.match(html, /<title>VT Multifamily \| Rooted in Vermont<\/title>/);
assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /Michelle|Hebert|Keller|KW Vermont/i);
assert.match(html, /href="\/vtmultifamily\/michellehebert#properties"/);
assert.match(html, /canonical" href="https:\/\/vtmultifamily.com\/"/);
assert.match(html, /noindex,nofollow/);
assert.ok(!html.includes('<iframe'), 'The domain must serve the site directly');

const folder = await check('/vtmultifamily', 'monosyth.com');
assert.equal(folder.body.toString(), html, 'Both URLs must serve the same site');
const main = await check('/', 'monosyth.com');
assert.ok(!main.body.toString().includes('<title>VT Multifamily'), 'Monosyth homepage must remain separate');
await check('/iwannahavefun', 'monosyth.com');

const redirected = await check('/?source=domain-test', 'www.vtmultifamily.com', 308);
assert.equal(new URL(redirected.headers.location).href, 'https://vtmultifamily.com/?source=domain-test');
await check('/vtmultifamily/', 'monosyth.com', 308);

// These requests must never reach unrelated Monosyth pages or API handlers.
for (const path of ['/shop', '/weather', '/app', '/api/shop/order', '/does-not-exist']) {
  await check(path, 'vtmultifamily.com', 404);
}

const agentFolder = '/vtmultifamily/michellehebert';
const agent = await check(agentFolder, 'monosyth.com');
const agentHtml = agent.body.toString();
assert.match(agentHtml, /<title>Michelle Hebert \| Central Vermont Real Estate<\/title>/);
assert.match(agentHtml, /canonical" href="https:\/\/monosyth.com\/vtmultifamily\/michellehebert"/);
assert.match(agentHtml, /KW Vermont, Keller Williams/);
for (const path of [agentFolder, '/michellehebert']) {
  const page = await check(path, 'vtmultifamily.com');
  assert.equal(page.body.toString(), agentHtml, path);
}
await check(agentFolder + '/', 'monosyth.com', 308);
const agentRedirect = await check('/michellehebert?source=share', 'www.vtmultifamily.com', 308);
assert.equal(new URL(agentRedirect.headers.location).href, 'https://vtmultifamily.com/michellehebert?source=share');
const js = await check(agentFolder + '/listings.js', 'vtmultifamily.com');
const properties = vm.runInNewContext(`${js.body.toString()}\nproperties`);
assert.deepEqual(Array.from(properties, p => p.id), ['brooklyn', 'foss', 'graniteville850', 'graniteville852']);
assert.equal(properties.reduce((n, p) => n + p.photos.length, 0), 27);
assert.equal(properties.reduce((n, p) => n + p.sections.reduce((m, s) => m + s.fields.length, 0), 0), 147);

const assets = new Set([
  ...Array.from((html + agentHtml).matchAll(/(?:src|href)="(\/vtmultifamily\/[^"#]+\.(?:js|css|jpg|png))"/g), m => m[1]),
  ...properties.flatMap(p => p.photos),
]);
for (const path of assets) {
  assert.ok(path.startsWith('/vtmultifamily/'), `Asset must stay within the public folder: ${path}`);
  const result = await check(path, 'vtmultifamily.com');
  const local = await readFile(resolve('public', path.slice(1)));
  assert.ok(result.body.equals(local), `${path}: served bytes differ from source`);
}
const cssAlias = await check('/styles.css', 'vtmultifamily.com');
assert.match(cssAlias.headers['content-type'], /text\/css/);
const robots = await check('/robots.txt', 'vtmultifamily.com');
assert.equal(robots.body.toString(), 'User-agent: *\nDisallow: /\n');
console.log(`PASS: ${checked} HTTP checks; all ${assets.size} linked assets; 4 properties, 27 photos, 147 MLS fields; generic splash, separate agent site, host routing, canonical redirect and Monosyth isolation.`);
