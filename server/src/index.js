import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { config, ROOT } from './config.js';
import { loadSession } from './auth.js';
import authRoutes from './routes/auth.js';
import progressRoutes from './routes/progress.js';
import classRoutes from './routes/classes.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.set('trust proxy', 1); // behind nginx
app.disable('x-powered-by');

const api = express.Router();
api.use(helmet({ contentSecurityPolicy: false }));
api.use(express.json({ limit: '400kb' }));
// Every state-changing request must carry this header. Browsers will not let
// another site add it, so forged cross-site requests are refused.
api.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'm114') return res.status(403).json({ error: 'Bad request origin', code: 'csrf' });
  next();
});
api.use(loadSession);
api.use('/auth', authRoutes);
api.use('/progress', progressRoutes);
api.use('/classes', classRoutes);
api.use('/admin', adminRoutes);
api.get('/health', (_req, res) => res.json({ ok: true }));
api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
api.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });
app.use('/api', api);

// In production nginx serves the built site; this is for running it all locally.
if (config.serveStatic) {
  const dist = path.join(ROOT, 'web/dist');
  app.use(express.static(dist, { maxAge: '1h' }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(config.port, '127.0.0.1', () => console.log(`memorize114 API on http://127.0.0.1:${config.port}`));
