const { route, bad } = require('./_lib/http');
const { TYPES } = require('./_lib/qaoa');
module.exports = route({
  PUT: async (req, res, { user, query, send }) => {
    const { attack, data } = req.body || {};
    if (!TYPES.includes(attack) || typeof data !== 'object' || !data) throw bad('Invalid signature');
    const clean = { count: Number(data.count) || 1, first: String(data.first || ''), last: String(data.last || ''), src: String(data.src || '').slice(0, 64), best: Array.isArray(data.best) ? data.best.slice(0, 6).map(String) : [], ttr: Number(data.ttr) || 0, warm: data.warm && Array.isArray(data.warm.g) ? { g: data.warm.g.slice(0, 2).map(Number), b: data.warm.b.slice(0, 2).map(Number) } : null };
    await query('INSERT INTO memory (user_id, attack, data, updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (user_id, attack) DO UPDATE SET data = $3, updated_at = now()', [user.id, attack, JSON.stringify(clean)]);
    send(200, { ok: true });
  },
  DELETE: async (req, res, { user, query, send }) => { await query('DELETE FROM memory WHERE user_id = $1', [user.id]); send(200, { ok: true }); },
});
