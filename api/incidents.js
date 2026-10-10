const { route, bad } = require('./_lib/http');
const { TYPES } = require('./_lib/qaoa');
const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
module.exports = route({
  GET: async (req, res, { user, query, send }) => {
    send(200, { incidents: await query('SELECT id, attack, src, risk, state, emergency, assets, actions, timeline, ttr, created_at FROM incidents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [user.id]) });
  },
  POST: async (req, res, { user, query, send }) => {
    const b = req.body || {};
    if (!TYPES.includes(b.attack)) throw bad('Unknown attack type');
    const tl = arr(b.timeline, 40).map((x) => ({ t: String(x.t || '').slice(0, 12), text: String(x.text || '').slice(0, 200) }));
    const rows = await query(
      'INSERT INTO incidents (user_id, attack, src, risk, state, emergency, assets, actions, timeline, ttr) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [user.id, b.attack, String(b.src || '').slice(0, 64), Math.min(99, Math.max(0, Math.round(Number(b.risk) || 0))), String(b.state || 'contained').slice(0, 20), !!b.emergency,
        JSON.stringify(arr(b.assets, 12).map(String)), JSON.stringify(arr(b.actions, 6).map(String)), JSON.stringify(tl), Number(b.ttr) || null]);
    send(201, { id: rows[0].id });
  },
});
