// End-to-end API test against an in-process Postgres (PGlite). Run with: npm test
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
const path = require('path'), assert = require('assert');
const { PGlite } = require('@electric-sql/pglite');
const dbPath = require.resolve('../api/_lib/db.js');
const pg = new PGlite();
const real = require('../api/_lib/db.js');           // load real module to reuse ensureSchema
const query = async (t, p = []) => (await pg.query(t, p)).rows;
require.cache[dbPath].exports = { query, ensureSchema: () => real.ensureSchema(query) };
const route = (n) => require('../api/' + n + '.js');

async function call(name, method, body, cookie) {
  const req = { method, headers: { 'content-type': 'application/json', cookie: cookie || '' }, body };
  const out = { headers: {} };
  const res = { status(s) { out.status = s; return this; }, setHeader(k, v) { out.headers[k.toLowerCase()] = v; return this; }, json(b) { out.body = b; return this; } };
  await route(name)(req, res);
  return out;
}
(async () => {
  let r = await call('register', 'POST', { email: 'bad', password: 'x' }); assert.equal(r.status, 400);
  r = await call('register', 'POST', { email: 'Ana@Acme.example', password: 'longenough1', name: 'Ana' }); assert.equal(r.status, 201);
  const cookie = r.headers['set-cookie'].split(';')[0]; assert(cookie.startsWith('qs_session='));
  r = await call('register', 'POST', { email: 'ana@acme.example', password: 'longenough1' }); assert.equal(r.status, 409, 'duplicate email');
  r = await call('me', 'GET', null, ''); assert.equal(r.status, 401, 'needs session');
  r = await call('me', 'GET', null, cookie); assert.equal(r.status, 200); assert.equal(r.body.user.email, 'ana@acme.example'); assert.equal(r.body.policy.mode, 'auto');
  r = await call('login', 'POST', { email: 'ana@acme.example', password: 'wrong' }); assert.equal(r.status, 401);
  r = await call('login', 'POST', { email: 'ana@acme.example', password: 'longenough1' }); assert.equal(r.status, 200);
  r = await call('policy', 'PUT', { mode: 'approve', threshold: 70, budget: 99, emergency: 1, emThr: 90, allowed: { block: 1, isolate: 1 } }, cookie);
  assert.equal(r.status, 200); assert.equal(r.body.policy.budget, 14, 'clamped');
  r = await call('optimize', 'POST', { type: 'ransom', risk: 85, crit: 5, budget: 8, off: [] }, cookie);
  assert.equal(r.status, 200); const best = r.body.result; assert(best.cost <= best.greedyCost + 1e-6 && best.cost < best.none, 'beats greedy and doing nothing');
  r = await call('optimize', 'POST', { type: 'ransom', risk: 85, crit: 5, budget: 14, off: ['isolate', 'block', 'snap'] }, cookie);
  const picked = [0,1,2,3,4,5].filter(i => r.body.result.choice >> i & 1); assert(!picked.includes(2) && !picked.includes(0) && !picked.includes(4), 'avoids offline actions');
  r = await call('optimize', 'POST', { type: 'nope' }, cookie); assert.equal(r.status, 400);
  r = await call('incidents', 'POST', { attack: 'exfil', src: '10.0.5.77', risk: 91, state: 'contained', emergency: true, assets: ['file-01'], actions: ['block', 'isolate'], timeline: [{ t: '10:00:00', text: 'x' }], ttr: 6.1 }, cookie); assert.equal(r.status, 201);
  r = await call('memory', 'PUT', { attack: 'exfil', data: { count: 1, best: ['block'], ttr: 6, warm: { g: [1, 2], b: [.1, .2] } } }, cookie); assert.equal(r.status, 200);
  r = await call('audit', 'POST', { items: [{ kind: 'ok', text: 'hello' }] }, cookie); assert.equal(r.body.saved, 1);
  r = await call('me', 'GET', null, cookie);
  assert.equal(r.body.incidents.length, 1); assert.equal(r.body.memory.exfil.count, 1); assert.equal(r.body.audit.length, 1); assert.equal(r.body.policy.mode, 'approve');
  // second user must not see the first user's data
  const r2 = await call('register', 'POST', { email: 'bo@acme.example', password: 'longenough2' }); const c2 = r2.headers['set-cookie'].split(';')[0];
  r = await call('me', 'GET', null, c2); assert.equal(r.body.incidents.length, 0); assert.deepEqual(r.body.memory, {});
  r = await call('me', 'GET', null, cookie.slice(0, -3) + 'abc'); assert.equal(r.status, 401, 'tampered cookie rejected');
  for (let i = 0; i < 8; i++) await call('login', 'POST', { email: 'bo@acme.example', password: 'bad' + i });
  r = await call('login', 'POST', { email: 'bo@acme.example', password: 'longenough2' }); assert.equal(r.status, 429, 'rate limited');
  console.log('All API checks passed');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
