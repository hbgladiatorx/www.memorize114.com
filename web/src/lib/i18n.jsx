// Language helpers. t(en, ar) returns renderable text; in English mode the first
// mention of each Arabic-origin term on a screen gets its Arabic in brackets.
import { Fragment } from 'react';
import { S } from './store.js';
import { toAr, AR_RUN } from './arabic.js';
import { D } from './data.js';

export const isAr = () => S.settings.lang === 'ar';
export const ts = (en, ar) => (isAr() ? ar : en); // plain string (attributes, toasts)
export const nn = (n) => (isAr() ? toAr(n) : String(n));

const GLOSS_BASE = {
  'ḥifẓ': 'حِفْظ', 'ḥāfiẓ': 'حَافِظ', 'Qurʾān': 'الْقُرْآن', 'sūrah': 'سُورَة', 'sūrat': 'سُورَة', 'muṣḥaf': 'مُصْحَف', 'juzʾ': 'جُزْء',
  'sabaq': 'سَبَق', 'sabqī': 'سَبْقِي', 'manzil': 'مَنْزِل', 'tasmīʿ': 'تَسْمِيع', 'mutashābihāt': 'مُتَشَابِهَات', 'talaqqī': 'تَلَقِّي',
  'tajwīd': 'تَجْوِيد', 'basmala': 'بَسْمَلَة', 'muʿallim': 'مُعَلِّم', 'al-Ḥuṣarī': 'الْحُصَرِي', 'al-ʿAfāsī': 'العَفَاسِي', 'al-Minshāwī': 'الْمِنْشَاوِي',
  'murattal': 'مُرَتَّل', 'nūn': 'نُون', 'kasra': 'كَسْرَة', 'ḍamma': 'ضَمَّة', 'Ibrāhīm': 'إِبْرَاهِيم',
  'al-Taghābun': 'التَّغَابُن', 'al-Ḥadīd': 'الْحَدِيد', 'al-Ḥashr': 'الْحَشْر', 'al-Ṣaff': 'الصَّفّ', 'Āl ʿImrān': 'آلِ عِمْرَان',
  'al-Baqarah': 'الْبَقَرَة', 'al-Tawbah': 'التَّوْبَة', 'al-ʿAnkabūt': 'الْعَنْكَبُوت', 'al-Anfāl': 'الْأَنْفَال', 'al-Jumuʿah': 'الْجُمُعَة',
  'al-Munāfiqūn': 'الْمُنَافِقُون', 'al-Mursalāt': 'الْمُرْسَلَات', 'al-Takwīr': 'التَّكْوِير', 'al-Infiṭār': 'الِانْفِطَار', 'al-Ṣāffāt': 'الصَّافَّات',
  'al-Sajdah': 'السَّجْدَة', 'al-Muʾminūn': 'الْمُؤْمِنُون', 'al-Nabaʾ': 'النَّبَأ', 'al-Dhāriyāt': 'الذَّارِيَات', 'al-Ṭūr': 'الطُّور',
  'al-Ḥāqqah': 'الْحَاقَّة', 'al-Aʿrāf': 'الْأَعْرَاف', 'al-Jāthiyah': 'الْجَاثِيَة', 'al-Muṭaffifīn': 'الْمُطَفِّفِين',
};
let GLOSS = null, GLOSS_RE = null;
const seen = new Set();
export function resetGloss() { seen.clear(); }
function buildGloss() {
  GLOSS = new Map();
  D.index?.forEach((s) => GLOSS.set(s.en.toLowerCase(), s.ar));
  for (const k in GLOSS_BASE) GLOSS.set(k.toLowerCase(), GLOSS_BASE[k]);
  const keys = [...GLOSS.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  GLOSS_RE = new RegExp(`(?<![\\p{L}\\p{M}])(${keys.join('|')})(s?)(?![\\p{L}\\p{M}])`, 'giu');
}

// English text → nodes, with the first mention of each term glossed in Arabic.
export function gloss(text) {
  if (isAr() || typeof text !== 'string') return text;
  if (!GLOSS_RE || (D.index && GLOSS.size < 100)) buildGloss();
  const out = []; let last = 0, m; GLOSS_RE.lastIndex = 0;
  while ((m = GLOSS_RE.exec(text))) {
    const ar = GLOSS.get(m[1].toLowerCase());
    if (!ar || seen.has(ar)) continue;
    seen.add(ar);
    const end = m.index + m[0].length;
    out.push(text.slice(last, end), <span key={end} className="gl"> (<span className="ar-inline" dir="rtl">{ar}</span>)</span>);
    last = end;
  }
  if (!out.length) return text;
  out.push(text.slice(last));
  return out.map((x, i) => <Fragment key={'g' + i}>{x}</Fragment>);
}

export const t = (en, ar) => (isAr() ? ar : gloss(en));

// English with embedded Arabic: Arabic in the Qurʾān font, “quoted” meanings in colour.
export function rich(text) {
  const parts = []; let last = 0, k = 0;
  const pushEn = (s) => s.split(/(“[^”]+”)/).forEach((p) => { if (p) parts.push(/^“/.test(p) ? <span key={k++} className="en-gloss">{p}</span> : <Fragment key={k++}>{gloss(p)}</Fragment>); });
  text.replace(AR_RUN, (m, i) => { if (i > last) pushEn(text.slice(last, i)); parts.push(<span key={k++} className="ar-inline" dir="rtl">{m}</span>); last = i + m.length; });
  if (last < text.length) pushEn(text.slice(last));
  return parts;
}

// Arabic prose with ﴿Qurʾān﴾ quotations set in the Qurʾān font.
export function richAr(text) {
  return text.split(/(﴿[^﴾]+﴾)/).filter(Boolean).map((p, i) => (p.startsWith('﴿') ? <span key={i} className="q">{p}</span> : <Fragment key={i}>{p}</Fragment>));
}

export function fmtDays(d) {
  if (!isAr()) { if (d < 1) return '<1d'; if (d < 30) return Math.round(d) + 'd'; if (d < 365) return Math.round(d / 30) + 'mo'; return (d / 365).toFixed(1) + 'y'; }
  const arCount = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n <= 10 ? toAr(n) + ' ' + few : toAr(n) + ' ' + many);
  if (d < 1) return 'أقلّ من يوم';
  if (d < 30) return arCount(Math.round(d), 'يوم', 'يومان', 'أيام', 'يومًا');
  if (d < 365) return arCount(Math.round(d / 30), 'شهر', 'شهران', 'أشهر', 'شهرًا');
  return toAr((d / 365).toFixed(1)) + ' سنة';
}

export const refTxt = (sn, a) => (isAr() ? `[${D.index[sn - 1].ar}: ${toAr(a)}]` : `${D.index[sn - 1].en} ${sn}:${a}`);
