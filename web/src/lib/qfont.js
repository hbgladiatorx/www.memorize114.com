// Muṣḥaf fonts. The app's text is the KFGQPC Hafs v18 encoding, which repurposes a few
// code points for that font (U+06E1 = sukūn, U+0652 = silent-letter circle, U+065E/0657/0656 =
// open tanwīn). For other fonts each word is rewritten into the standard Unicode Qurʾān
// encoding, and marks a font cannot draw are dropped or handed to Hafs.
// Hafs Smart has no Unicode text: its glyph-code words are loaded from /data/hs/.

export const QFONTS = [
  { id: 'hafs', en: 'Uthmanic Hafs', ar: 'حفص العثماني', note: 'Madīnah muṣḥaf · KFGQPC', note_ar: 'مصحف المدينة · مجمع الملك فهد' },
  { id: 'smart', en: 'Hafs Smart', ar: 'حفص الذكي', note: 'Madīnah muṣḥaf, newer build · KFGQPC', note_ar: 'مصحف المدينة، إصدار أحدث · مجمع الملك فهد' },
  { id: 'dk', en: 'DigitalKhatt Madina', ar: 'الخط الرقمي — المدينة', note: 'Madīnah muṣḥaf · open font', note_ar: 'مصحف المدينة · خط مفتوح' },
  { id: 'amq', en: 'Amiri Quran', ar: 'أميري قرآن', note: 'Būlāq (Cairo 1924) Naskh', note_ar: 'نسخ بولاق (القاهرة ١٩٢٤)' },
  { id: 'uth', en: 'ʿUthmān Ṭāhā Naskh', ar: 'عثمان طه — نسخ', note: 'Book Naskh · KFGQPC', note_ar: 'نسخ الكتب · مجمع الملك فهد' },
  { id: 'ruq', en: 'Aref Ruqaa', ar: 'عارف رقعة', note: 'Ruqʿah hand', note_ar: 'خط الرقعة' },
];
export const QFAMILY = { hafs: 'Hafs', smart: 'HafsSmart, Hafs', dk: 'DigitalKhatt, Hafs', amq: 'AmiriQuran, Hafs', uth: 'UthmanTaha, Hafs', ruq: 'ArefRuqaa, Hafs' };
// al-Mulk 67:1, first three words, for the Settings preview.
const SAMPLE = ['تَبَٰرَكَ', 'ٱلَّذِي', 'بِيَدِهِ', 'ٱلۡمُلۡكُ'];
const SAMPLE_SMART = '\u200f\ue030\u200f\ue816\u200f\ue245\u200f\ue435 \u200f\ue338\u200f\ue7b1\u200f\ue341 \u200f\ue024\u200f\ue1bb\u200f\ue21d\u200f\ue466 \u200f\ue338\u200f\ue0ae\u200f\ue192\u200f\ue18a\u200f\ue2c3';
export const qfSample = (f) => (f === 'smart' ? SAMPLE_SMART : SAMPLE.map((w) => mapWord(w, f)).join(' '));
export const qfontOf = (id) => QFONTS.find((f) => f.id === id) || QFONTS[0];

const MARK = /[ً-ٰٟۖ-ۭـࣰ-ࣲ]/;
const PAUSE = /[ۖ-ۜ]/g;
const BASE = { 'ْ': '۟', 'ۡ': 'ْ', 'ٞ': 'ࣰ', 'ٗ': 'ࣱ', 'ٖ': 'ࣲ' };
// Naskh fonts without the Qurʾānic marks (ʿUthmān Ṭāhā, Ruqʿah): plain tanwīn, no silent
// circle or small iqlāb mīm; pause marks are moved after the word and drawn by Hafs.
const NASKH = { 'ࣰ': 'ً', 'ࣱ': 'ٌ', 'ࣲ': 'ٍ', '۟': '', '۠': '', 'ۢ': '', 'ۭ': '', 'ۤ': 'ٓ', 'ۧ': 'ۦ', 'ۨ': '', '۪': '', '۬': '' };

// Word-final yāʾ is written without dots in the muṣḥaf; v18 leaves that to its font.
function dotlessYa(w) {
  const a = [...w];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== 'ي') continue;
    let j = i + 1;
    while (j < a.length && MARK.test(a[j])) j++;
    if (j === a.length || a[j] === 'ء') a[i] = 'ى';
  }
  return a.join('');
}

export function mapWord(w, f) {
  if (f === 'hafs' || f === 'smart') return w;
  let s = dotlessYa([...w].map((c) => BASE[c] ?? c).join(''));
  if (f === 'dk') return s.replace(/ۤ/g, 'ٓ');
  if (f === 'uth' || f === 'ruq') {
    s = [...s].map((c) => NASKH[c] ?? c).join('');
    const p = s.match(PAUSE);
    if (p) s = s.replace(PAUSE, '') + ' ' + p.join('');
  }
  return s;
}

const hsCache = {};
export async function smartWords(n) {
  if (n > 114) return null;
  if (!hsCache[n]) hsCache[n] = fetch(`/data/hs/s${String(n).padStart(3, '0')}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return hsCache[n];
}
