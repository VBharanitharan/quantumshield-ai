const { route, bad } = require('./_lib/http');
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
module.exports = route({
  PUT: async (req, res, { user, query, send }) => {
    const p = req.body || {};
    if (!['monitor', 'approve', 'auto'].includes(p.mode)) throw bad('Unknown mode');
    const allowed = {}; ['block', 'rate', 'isolate', 'mfa', 'snap', 'honey'].forEach((k) => { allowed[k] = p.allowed && p.allowed[k] ? 1 : 0; });
    const clean = { mode: p.mode, threshold: num(p.threshold, 20, 95, 60), budget: num(p.budget, 1, 14, 8), emergency: p.emergency ? 1 : 0, emThr: num(p.emThr, 60, 99, 85), allowed };
    await query('INSERT INTO policies (user_id, data, updated_at) VALUES ($1,$2,now()) ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()', [user.id, JSON.stringify(clean)]);
    send(200, { policy: clean });
  },
});
