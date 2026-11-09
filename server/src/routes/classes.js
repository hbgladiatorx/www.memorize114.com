import { Router } from 'express';
import crypto from 'node:crypto';
import { q, one } from '../db.js';
import { AYAH_COUNT, validItem } from '../config.js';
import { requireUser, requireRole } from '../auth.js';
import { summarize } from '../../../web/src/lib/fsrs.js';

const r = Router();
r.use(requireUser);

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ', DIGITS = '23456789';
const pick = (set, n) => Array.from(crypto.randomBytes(n), (b) => set[b % set.length]).join('');
const newCode = () => `${pick(LETTERS, 3)}-${pick(DIGITS, 4)}`;
const cleanSurahs = (x) => [...new Set((Array.isArray(x) ? x : []).map(Number).filter(validItem))].sort((a, b) => a - b);
const canManage = (user, cls) => cls && (String(cls.teacher_id) === String(user.id) || user.role === 'admin');
const shape = (c) => ({ id: String(c.id), name: c.name, code: c.code, surahs: c.surahs, createdAt: c.created_at });

r.get('/', async (req, res) => {
  const [teaching, joined] = await Promise.all([
    q(`SELECT c.*, (SELECT count(*)::int FROM class_members m WHERE m.class_id = c.id) AS members
       FROM classes c WHERE c.teacher_id = $1 ORDER BY c.created_at DESC`, [req.user.id]),
    q(`SELECT c.*, u.name AS teacher FROM class_members m JOIN classes c ON c.id = m.class_id JOIN users u ON u.id = c.teacher_id
       WHERE m.user_id = $1 ORDER BY m.joined_at DESC`, [req.user.id]),
  ]);
  res.json({
    teaching: teaching.rows.map((c) => ({ ...shape(c), members: c.members })),
    joined: joined.rows.map((c) => ({ id: String(c.id), name: c.name, surahs: c.surahs, teacher: c.teacher })),
  });
});

r.post('/', requireRole('teacher', 'admin'), async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'bad_name', code: 'bad_name' });
  for (let i = 0; i < 5; i++) {
    try {
      const c = await one('INSERT INTO classes (teacher_id, name, code, surahs) VALUES ($1, $2, $3, $4) RETURNING *', [req.user.id, name, newCode(), cleanSurahs(req.body.surahs)]);
      return res.json({ class: shape(c) });
    } catch (e) { if (e.code !== '23505') throw e; } // code collision: try another
  }
  res.status(500).json({ error: 'Could not create a class code' });
});

r.post('/join', async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase().replace(/\s/g, '');
  const c = await one('SELECT * FROM classes WHERE code = $1', [code]);
  if (!c) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  await q('INSERT INTO class_members (class_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [c.id, req.user.id]);
  res.json({ class: { id: String(c.id), name: c.name } });
});

r.get('/:id', async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]).catch(() => null);
  if (!canManage(req.user, c)) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  const members = (await q(`SELECT u.id, u.name, u.email, u.last_active_at, m.joined_at FROM class_members m JOIN users u ON u.id = m.user_id
                            WHERE m.class_id = $1 ORDER BY u.name`, [c.id])).rows;
  const prog = members.length && c.surahs.length
    ? (await q('SELECT user_id, surah, data FROM progress WHERE user_id = ANY($1) AND surah = ANY($2)', [members.map((m) => m.id), c.surahs])).rows : [];
  const now = Date.now();
  res.json({
    class: shape(c),
    members: members.map((m) => ({
      id: String(m.id), name: m.name, email: m.email,
      joinedAt: m.joined_at && +m.joined_at, lastActive: m.last_active_at && +m.last_active_at,
      perSurah: Object.fromEntries(prog.filter((p) => String(p.user_id) === String(m.id)).map((p) => [p.surah, summarize(p.data, AYAH_COUNT[p.surah], now)])),
    })),
  });
});

r.patch('/:id', async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]).catch(() => null);
  if (!canManage(req.user, c)) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  const name = req.body.name !== undefined ? String(req.body.name).trim().slice(0, 80) || c.name : c.name;
  const surahs = req.body.surahs !== undefined ? cleanSurahs(req.body.surahs) : c.surahs;
  const u = await one('UPDATE classes SET name = $1, surahs = $2 WHERE id = $3 RETURNING *', [name, surahs, c.id]);
  res.json({ class: shape(u) });
});

r.delete('/:id', async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]).catch(() => null);
  if (!canManage(req.user, c)) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  await q('DELETE FROM classes WHERE id = $1', [c.id]);
  res.json({ ok: true });
});

r.post('/:id/leave', async (req, res) => {
  await q('DELETE FROM class_members WHERE class_id = $1 AND user_id = $2', [req.params.id, req.user.id]).catch(() => null);
  res.json({ ok: true });
});

r.delete('/:id/members/:uid', async (req, res) => {
  const c = await one('SELECT * FROM classes WHERE id = $1', [req.params.id]).catch(() => null);
  if (!canManage(req.user, c)) return res.status(404).json({ error: 'not_found', code: 'not_found' });
  await q('DELETE FROM class_members WHERE class_id = $1 AND user_id = $2', [c.id, req.params.uid]);
  res.json({ ok: true });
});

export default r;
