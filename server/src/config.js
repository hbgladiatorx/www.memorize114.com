import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');

const need = (k) => { if (!process.env[k]) throw new Error(`Missing ${k} in server/.env`); return process.env[k]; };

export const config = {
  port: +(process.env.PORT || 3000),
  databaseUrl: need('DATABASE_URL'),
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  production: process.env.NODE_ENV === 'production',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  mail: { from: process.env.MAIL_FROM || '', region: process.env.SES_REGION || '' },
  serveStatic: process.env.SERVE_STATIC === '1',
};

// Verse count per sūrah (and passage count per duʿāʾ), for progress summaries.
const index = JSON.parse(readFileSync(path.join(ROOT, 'web/public/data/index.json'), 'utf8'));
export const AYAH_COUNT = Object.fromEntries([...index.surahs, ...(index.duas || [])].map((s) => [s.n, s.ay]));
export const validItem = (n) => Number.isInteger(n) && n in AYAH_COUNT;
