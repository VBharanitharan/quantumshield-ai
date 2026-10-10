// Runs the quantum optimizer on the server so the same code can later be pointed at a real quantum backend.
const { route, bad } = require('./_lib/http');
const { qaoa, TYPES } = require('./_lib/qaoa');
module.exports = route({
  POST: async (req, res, { send }) => {
    const c = req.body || {};
    if (!TYPES.includes(c.type)) throw bad('Unknown attack type');
    const ctx = {
      type: c.type,
      risk: Math.min(99, Math.max(0, Number(c.risk) || 0)),
      crit: Math.min(5, Math.max(1, Number(c.crit) || 3)),
      budget: Math.min(30, Math.max(0, Number(c.budget) || 8)),
      off: Array.isArray(c.off) ? c.off.map(String) : [],
    };
    const t0 = Date.now();
    const result = qaoa(ctx, c.warm);
    send(200, { result, ms: Date.now() - t0, backend: 'statevector-simulator' });
  },
});
