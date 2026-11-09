import { Router } from 'express';
import { q } from '../db.js';
import { requireUser } from '../auth.js';
import { validItem } from '../config.js';

const r = Router();
r.use(requireUser);

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

async function touch(userId) {
  await q('UPDATE users SET last_active_at = now() WHERE id = $1', [userId]);
  await q(`INSERT INTO activity (user_id, day, count) VALUES ($1, current_date, 1)
           ON CONFLICT (user_id, day) DO UPDATE SET count = activity.count + 1`, [userId]);
}

r.get('/', async (req, res) => {
  const [s, p] = await Promise.all([
    q('SELECT data FROM user_settings WHERE user_id = $1', [req.user.id]),
    q('SELECT surah, data FROM progress WHERE user_id = $1', [req.user.id]),
  ]);
  res.json({ settings: s.rows[0]?.data || null, surahs: Object.fromEntries(p.rows.map((x) => [x.surah, x.data])) });
});

r.put('/settings', async (req, res) => {
  const data = req.body?.data; if (!isObj(data)) return res.status(400).json({ error: 'bad_data', code: 'bad_data' });
  await q(`INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, now())
           ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [req.user.id, data]);
  res.json({ ok: true });
});

r.put('/surah/:n', async (req, res) => {
  const n = +req.params.n; const data = req.body?.data;
  if (!validItem(n) || !isObj(data) || !isObj(data.cards || {})) return res.status(400).json({ error: 'bad_data', code: 'bad_data' });
  const started = Object.keys(data.cards || {}).length;
  await q(`INSERT INTO progress (user_id, surah, data, started, updated_at) VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (user_id, surah) DO UPDATE SET data = EXCLUDED.data, started = EXCLUDED.started, updated_at = now()`, [req.user.id, n, data, started]);
  await touch(req.user.id);
  res.json({ ok: true });
});

export default r;
