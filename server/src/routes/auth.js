import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { q, one } from '../db.js';
import { config } from '../config.js';
import { hashPassword, checkPassword, startSession, endSession, publicUser, requireUser, makeToken, useToken } from '../auth.js';
import { sendMail, verifyMail, resetMail } from '../mail.js';

const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts', code: 'rate_limited' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s, max) => String(s || '').trim().slice(0, max);
const bad = (res, code, status = 400) => res.status(status).json({ error: code, code });

async function promoteIfAdmin(user) {
  if (config.adminEmails.includes(user.email) && user.role !== 'admin') {
    return one(`UPDATE users SET role = 'admin' WHERE id = $1 RETURNING *`, [user.id]);
  }
  return user;
}
async function sendVerify(user) {
  const token = await makeToken(user.id, 'verify', 48);
  const [subject, text] = verifyMail(user.name, `${config.appUrl}/verify?token=${token}`);
  await sendMail(user.email, subject, text).catch((e) => console.error('verify mail failed', e.message));
}

r.post('/register', limiter, async (req, res) => {
  const name = clean(req.body.name, 80), email = clean(req.body.email, 200).toLowerCase(), password = String(req.body.password || '');
  if (!name) return bad(res, 'bad_name');
  if (!EMAIL.test(email)) return bad(res, 'bad_email');
  if (password.length < 8 || password.length > 200) return bad(res, 'weak_password');
  if (await one('SELECT 1 FROM users WHERE email = $1', [email])) return bad(res, 'email_taken', 409);
  let user = await one(`INSERT INTO users (email, name, password_hash, last_active_at) VALUES ($1, $2, $3, now()) RETURNING *`, [email, name, await hashPassword(password)]);
  user = await promoteIfAdmin(user);
  await startSession(res, user.id, req.headers['user-agent']);
  sendVerify(user);
  res.json({ user: publicUser(user) });
});

r.post('/login', limiter, async (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase(), password = String(req.body.password || '');
  let user = await one('SELECT * FROM users WHERE email = $1', [email]);
  const ok = await checkPassword(password, user?.password_hash);
  if (!user || !ok) return bad(res, 'bad_credentials', 401);
  user = await promoteIfAdmin(user);
  await startSession(res, user.id, req.headers['user-agent']);
  res.json({ user: publicUser(user) });
});

r.post('/logout', async (req, res) => { await endSession(req, res); res.json({ ok: true }); });

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

r.patch('/me', requireUser, async (req, res) => {
  const u = req.user;
  if (req.body.name !== undefined) {
    const name = clean(req.body.name, 80); if (!name) return bad(res, 'bad_name');
    await q('UPDATE users SET name = $1 WHERE id = $2', [name, u.id]);
  }
  if (req.body.password !== undefined) {
    if (!(await checkPassword(String(req.body.currentPassword || ''), u.password_hash))) return bad(res, 'bad_credentials', 401);
    const pw = String(req.body.password); if (pw.length < 8 || pw.length > 200) return bad(res, 'weak_password');
    await q('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(pw), u.id]);
  }
  res.json({ user: publicUser(await one('SELECT * FROM users WHERE id = $1', [u.id])) });
});

r.delete('/me', requireUser, async (req, res) => {
  if (!(await checkPassword(String(req.body.password || ''), req.user.password_hash))) return bad(res, 'bad_credentials', 401);
  await q('DELETE FROM users WHERE id = $1', [req.user.id]); // cascades to progress, sessions, classes, memberships
  await endSession(req, res);
  res.json({ ok: true });
});

r.post('/forgot', limiter, async (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase();
  const user = await one('SELECT * FROM users WHERE email = $1', [email]);
  if (user) {
    const token = await makeToken(user.id, 'reset', 1);
    const [subject, text] = resetMail(user.name, `${config.appUrl}/reset?token=${token}`);
    await sendMail(user.email, subject, text).catch((e) => console.error('reset mail failed', e.message));
  }
  res.json({ ok: true }); // same answer either way, so emails can't be probed
});

r.post('/reset', limiter, async (req, res) => {
  const pw = String(req.body.password || '');
  if (pw.length < 8 || pw.length > 200) return bad(res, 'weak_password');
  const t = await useToken(req.body.token, 'reset');
  if (!t) return bad(res, 'bad_token');
  const user = await one('UPDATE users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $2 RETURNING *', [await hashPassword(pw), t.user_id]);
  await q('DELETE FROM sessions WHERE user_id = $1', [user.id]); // sign out everywhere else
  await startSession(res, user.id, req.headers['user-agent']);
  res.json({ user: publicUser(user) });
});

r.post('/verify', async (req, res) => {
  const t = await useToken(req.body.token, 'verify');
  if (!t) return bad(res, 'bad_token');
  await q('UPDATE users SET email_verified_at = now() WHERE id = $1', [t.user_id]);
  res.json({ ok: true });
});

r.post('/resend-verify', requireUser, limiter, async (req, res) => { if (!req.user.email_verified_at) await sendVerify(req.user); res.json({ ok: true }); });

export default r;
