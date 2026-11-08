// Qurʾān data: KFGQPC Hafs v18 text with page/line layout, precomputed look-alike
// verses, Qarai's translation (Tanzil.net), and the hand-written guided layers.
import { autoChunks, cueOf } from './arabic.js';

export const D = { index: null, basmala: null, src: '', surahs: {}, trs: {} };
const pad3 = (n) => String(n).padStart(3, '0');

export async function loadIndex() {
  if (D.index) return;
  const j = await (await fetch('/data/index.json')).json();
  D.index = j.surahs; D.basmala = j.basmala; D.src = j.src;
}

export async function loadTr(n) {
  if (D.trs[n] !== undefined) return D.trs[n];
  try { const r = await fetch(`/data/t${pad3(n)}.json`); D.trs[n] = r.ok ? await r.json() : null; }
  catch { D.trs[n] = null; }
  return D.trs[n];
}

export const GUIDED = new Set([62, 77]);
const PALETTE = ['#2F7D5B', '#B26B14', '#2D5F8E', '#7A4A8C', '#B23A5E', '#0F766E'];

export async function loadSurah(n) {
  if (D.surahs[n]) return D.surahs[n];
  const s = await (await fetch(`/data/s${pad3(n)}.json`)).json();
  if (GUIDED.has(n)) { try { const e = await fetch(`/data/e${pad3(n)}.json`); if (e.ok) s.enrich = await e.json(); } catch { /* no guided layer */ } }
  s.tr = await loadTr(n);
  const pages = [...new Set(s.v.map((v) => v.p))];
  s.v.forEach((v) => {
    const ev = s.enrich?.verses?.[v.a];
    v.chunks = ev?.chunks || autoChunks(v.w);
    v.cues = v.w.map((w, i) => cueOf(w, v.n[i]));
    const sec = s.enrich?.sections?.find((x) => v.a >= x.from && v.a <= x.to);
    v.color = sec ? sec.color : PALETTE[pages.indexOf(v.p) % PALETTE.length];
    v.sec = sec || null;
    v.ev = ev || null;
  });
  D.surahs[n] = s;
  return s;
}

export const surahMeta = (n) => D.index[n - 1];
