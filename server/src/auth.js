// Sessions, password hashing and one-time tokens.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { q, one } from './db.js';
import { config } from './config.js';

export const COOKIE = 'm114sid';
const SESSION_DAYS = 60;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');

export const hashPassword = (pw) => bcrypt.hash(pw, 12);
const DUMMY = bcrypt.hashSync('timing-equaliser', 12);
export async function checkPassword(pw, hash) { return bcrypt.compare(pw, hash || DUMMY); }

export const publicUser = (u) => u && ({ id: String(u.id), name: u.name, email: u.email, role: u.role, verified: !!u.email_verified_at });

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function cookieString(value, maxAgeSec) {
  return [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', config.production ? 'Secure' : '', `Max-Age=${maxAgeSec}`].filter(Boolean).join('; ');
}

export async function startSession(res, userId, userAgent) {
  const token = newToken();
  await q(`INSERT INTO sessions (id_hash, user_id, expires_at, user_agent) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days', $3)`, [sha(token), userId, (userAgent || '').slice(0, 200)]);
  res.setHeader('Set-Cookie', cookieString(token, SESSION_DAYS * 86400));
}
export async function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) await q('DELETE FROM sessions WHERE id_hash = $1', [sha(token)]);
  res.setHeader('Set-Cookie', cookieString('', 0));
}

// Attach req.user if the session cookie is valid.
export async function loadSession(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) {
      req.user = await one(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1 AND s.expires_at > now()`, [sha(token)]);
    }
    next();
  } catch (e) { next(e); }
}

export function requireUser(req, res, next) { if (!req.user) return res.status(401).json({ error: 'Sign in required', code: 'auth' }); next(); }
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Sign in required', code: 'auth' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed', code: 'forbidden' });
  next();
};

export async function makeToken(userId, kind, hours) {
  const token = newToken();
  await q(`INSERT INTO tokens (hash, user_id, kind, expires_at) VALUES ($1, $2, $3, now() + ($4 || ' hours')::interval)`, [sha(token), userId, kind, String(hours)]);
  return token;
}
export async function useToken(token, kind) {
  if (!token || typeof token !== 'string') return null;
  return one(`UPDATE tokens SET used_at = now() WHERE hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now() RETURNING user_id`, [sha(token), kind]);
}
