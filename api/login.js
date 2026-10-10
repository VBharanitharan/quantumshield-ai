const { route, bad } = require('./_lib/http');
const { verify, issue } = require('./_lib/auth');

module.exports = route({
  POST: async (req, res, { query, send }) => {
    const e = String((req.body || {}).email || '').trim().toLowerCase();
    const pw = String((req.body || {}).password || '');
    if (!e || !pw) throw bad('Enter your email and password');
    // Simple brute-force guard: 8 failed attempts per email in 15 minutes.
    const recent = await query("SELECT count(*)::int AS n FROM login_attempts WHERE email = $1 AND at > now() - interval '15 minutes'", [e]);
    if (recent[0].n >= 8) throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'), { status: 429 });
    const rows = await query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [e]);
    const ok = rows[0] && (await verify(pw, rows[0].password_hash));
    if (!ok) {
      await query('INSERT INTO login_attempts (email) VALUES ($1)', [e]);
      throw Object.assign(new Error('Wrong email or password'), { status: 401 });
    }
    await query('DELETE FROM login_attempts WHERE email = $1', [e]);
    await issue(res, rows[0]);
    send(200, { user: { id: rows[0].id, email: rows[0].email, name: rows[0].name } });
  },
}, { auth: false });
