const { route, bad } = require('./_lib/http');
const { hash, issue } = require('./_lib/auth');
const DEFAULT_POLICY = { mode: 'auto', threshold: 60, budget: 8, emergency: 1, emThr: 85, allowed: { block: 1, rate: 1, isolate: 0, mfa: 1, snap: 1, honey: 1 } };

module.exports = route({
  POST: async (req, res, { query, send }) => {
    const { email, password, name } = req.body || {};
    const e = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 254) throw bad('Enter a valid email address');
    if (String(password || '').length < 8 || String(password).length > 200) throw bad('Password must be at least 8 characters');
    const nm = String(name || e.split('@')[0]).trim().slice(0, 60);
    const taken = await query('SELECT 1 FROM users WHERE email = $1', [e]);
    if (taken.length) throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
    const rows = await query('INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id, email, name', [e, nm, await hash(password)]);
    await query('INSERT INTO policies (user_id, data) VALUES ($1,$2)', [rows[0].id, JSON.stringify(DEFAULT_POLICY)]);
    await issue(res, rows[0]);
    send(201, { user: rows[0] });
  },
}, { auth: false });
