// Local development server: serves public/ and runs the /api routes against an embedded Postgres (PGlite).
// Data is kept in ./.data so it survives restarts. Run: npm run dev  ->  http://localhost:3000
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-local-dev-secret';
const http = require('http'), fs = require('fs'), path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const pg = new PGlite(process.env.MEMORY_DB ? undefined : path.join(__dirname, '.data'));
const dbPath = require.resolve('./api/_lib/db.js');
const real = require('./api/_lib/db.js');
const query = async (t, p = []) => (await pg.query(t, p)).rows;
require.cache[dbPath].exports = { query, ensureSchema: () => real.ensureSchema(query) };

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    const file = path.join(__dirname, 'api', name + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
    let raw = ''; for await (const c of req) raw += c;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
    res.status = (s) => { res.statusCode = s; return res; };
    res.json = (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return res; };
    return require(file)(req, res);
  }
  const f = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('QuantumShield dev server on http://localhost:' + (process.env.PORT || 3000)));
