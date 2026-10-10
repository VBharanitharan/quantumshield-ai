const { route } = require('./_lib/http');
module.exports = route({
  POST: async (req, res, { user, query, send }) => {
    const items = Array.isArray((req.body || {}).items) ? req.body.items.slice(0, 50) : [];
    for (const it of items) await query('INSERT INTO audit (user_id, kind, text) VALUES ($1,$2,$3)', [user.id, String(it.kind || '').slice(0, 12), String(it.text || '').slice(0, 300)]);
    send(200, { saved: items.length });
  },
});
