// One call that loads everything the console needs after sign-in.
const { route } = require('./_lib/http');
module.exports = route({
  GET: async (req, res, { user, query, send }) => {
    const [pol, mem, inc, aud] = await Promise.all([
      query('SELECT data FROM policies WHERE user_id = $1', [user.id]),
      query('SELECT attack, data FROM memory WHERE user_id = $1', [user.id]),
      query('SELECT id, attack, src, risk, state, emergency, assets, actions, timeline, ttr, created_at FROM incidents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [user.id]),
      query('SELECT kind, text, at FROM audit WHERE user_id = $1 ORDER BY at DESC LIMIT 60', [user.id]),
    ]);
    const memory = {}; mem.forEach((r) => { memory[r.attack] = r.data; });
    send(200, { user, policy: pol[0] ? pol[0].data : null, memory, incidents: inc, audit: aud });
  },
});
