// Small helpers shared by every route.
const { query, ensureSchema } = require('./db');
const { readSession } = require('./auth');

function send(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}
// route(handlers, {auth}) wires methods, JSON checks, auth and error handling.
function route(handlers, { auth = true } = {}) {
  return async (req, res) => {
    try {
      const h = handlers[req.method];
      if (!h) { res.setHeader('Allow', Object.keys(handlers).join(', ')); return send(res, 405, { error: 'Method not allowed' }); }
      if (req.method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json'))
        return send(res, 415, { error: 'Send JSON' });
      await ensureSchema();
      const user = auth ? await readSession(req) : null;
      if (auth && !user) return send(res, 401, { error: 'Please sign in' });
      await h(req, res, { user, query, send: (s, b) => send(res, s, b) });
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      send(res, status, { error: status >= 500 ? 'Server error' : e.message });
    }
  };
}
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
module.exports = { route, send, bad };
