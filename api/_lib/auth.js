// Sessions: a signed JWT in an httpOnly cookie. Passwords: bcrypt.
const bcrypt = require('bcryptjs');
const { SignJWT, jwtVerify } = require('jose');
const { query } = require('./db');

const COOKIE = 'qs_session';
const DAYS = 7;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 24) throw Object.assign(new Error('JWT_SECRET must be set (24+ characters)'), { status: 503 });
  return new TextEncoder().encode(s);
}
const hash = (pw) => bcrypt.hash(pw, 10);
const verify = (pw, h) => bcrypt.compare(pw, h);

async function issue(res, user) {
  const token = await new SignJWT({ uid: String(user.id) })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${DAYS}d`).sign(secret());
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${DAYS * 86400}${secure}`);
}
function clear(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
function cookie(req) {
  const m = String(req.headers.cookie || '').match(new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'));
  return m && m[1];
}
async function readSession(req) {
  const t = cookie(req);
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret());
    const rows = await query('SELECT id, email, name FROM users WHERE id = $1', [payload.uid]);
    return rows[0] || null;
  } catch (e) { return null; }
}
module.exports = { hash, verify, issue, clear, readSession };
