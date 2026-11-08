import { Router } from 'express';
import { q, one } from '../db.js';
import { requireRole } from '../auth.js';

const r = Router();
r.use(requireRole('admin'));

// Fill missing days with zero so the charts have one bar per day.
function series(rows, days = 30) {
  const map = new Map(rows.map((x) => [x.day.toISOString().slice(0, 10), Number(x.count)]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); out.push({ day: d, count: map.get(d) || 0 }); }
  return out;
}

r.get('/stats', async (_req, res) => {
  const counts = await one(`SELECT
      (SELECT count(*) FROM users)::int AS users,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS new7,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '30 days')::int AS new30,
      (SELECT count(DISTINCT user_id) FROM activity WHERE day > current_date - 7)::int AS active7,
      (SELECT count(DISTINCT user_id) FROM activity WHERE day > current_date - 30)::int AS active30,
      (SELECT count(*) FROM users WHERE role = 'teacher')::int AS teachers,
      (SELECT count(*) FROM classes)::int AS classes`);
  const signups = (await q(`SELECT date_trunc('day', created_at)::date AS day, count(*) FROM users WHERE created_at > now() - interval '30 days' GROUP BY 1`)).rows;
  const active = (await q(`SELECT day, count(DISTINCT user_id) AS count FROM activity WHERE day > current_date - 30 GROUP BY 1`)).rows;
  const top = (await q(`SELECT surah AS n, count(*)::int AS users, sum(started)::int AS verses FROM progress WHERE started > 0 GROUP BY surah ORDER BY users DESC, verses DESC LIMIT 10`)).rows;
  res.json({
    users: counts.users, newUsers7: counts.new7, newUsers30: counts.new30, active7: counts.active7, active30: counts.active30,
    teachers: counts.teachers, classes: counts.classes,
    signupsByDay: series(signups), activeByDay: series(active), topSurahs: top,
  });
});

r.get('/users', async (req, res) => {
  const term = String(req.query.q || '').trim();
  const where = term ? 'WHERE u.email ILIKE $1 OR u.name ILIKE $1' : '';
  const params = term ? ['%' + term.replace(/[%_]/g, '\\$&') + '%'] : [];
  const total = (await one(`SELECT count(*)::int AS n FROM users u ${where}`, params)).n;
  const rows = (await q(`SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_active_at, u.email_verified_at,
        COALESCE((SELECT sum(started) FROM progress p WHERE p.user_id = u.id), 0)::int AS verses
      FROM users u ${where} ORDER BY u.created_at DESC LIMIT 100`, params)).rows;
  res.json({
    total,
    users: rows.map((u) => ({ id: String(u.id), name: u.name, email: u.email, role: u.role, verified: !!u.email_verified_at, createdAt: +u.created_at, lastActive: u.last_active_at && +u.last_active_at, versesStarted: u.verses })),
  });
});

r.patch('/users/:id', async (req, res) => {
  const role = req.body.role;
  if (!['student', 'teacher', 'admin'].includes(role)) return res.status(400).json({ error: 'bad_role', code: 'bad_role' });
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'You cannot change your own role', code: 'self' });
  const u = await one('UPDATE users SET role = $1 WHERE id = $2 RETURNING id', [role, req.params.id]).catch(() => null);
  if (!u) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  res.json({ ok: true });
});

export default r;
