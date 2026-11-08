import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });
export const q = (text, params) => pool.query(text, params);
export async function one(text, params) { const r = await pool.query(text, params); return r.rows[0] || null; }
