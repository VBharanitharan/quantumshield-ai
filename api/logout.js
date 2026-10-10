const { route } = require('./_lib/http');
const { clear } = require('./_lib/auth');
module.exports = route({ POST: async (req, res, { send }) => { clear(res); send(200, { ok: true }); } }, { auth: false });
