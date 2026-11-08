// Arabic text helpers: digits, letter clusters, first-letter cues, phrase chunking.
export const toAr = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const NONJOIN = new Set([...'اأإآٱدذرزوؤءةى']);
const isMark = (ch) => /\p{M}/u.test(ch) || 'ۥۦـ'.includes(ch);

export function clusters(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

// The cue shown for a hidden word: its first letter, or ال plus the next letter.
export function cueOf(word, norm) {
  const cl = clusters(word);
  let k = 1;
  if (/^ال/.test(norm)) k = 3;
  else if (/^[وفبك]ال/.test(norm)) k = 4;
  else if (/^لل/.test(norm)) k = 3;
  if (k >= cl.length) k = 1;
  const shown = cl.slice(0, k);
  const base = shown[shown.length - 1][0];
  return shown.join('') + (k < cl.length && !NONJOIN.has(base) ? 'ـ' : '');
}

const PAUSE = /[ۖ-ۛ]/;
// Split a verse into phrases at the muṣḥaf's pause marks, at most ~6 words each.
export function autoChunks(words) {
  const starts = [0];
  let len = 0;
  words.forEach((w, i) => {
    len++;
    const rest = words.length - i - 1;
    if (rest > 1 && (PAUSE.test(w) || len >= 6)) { starts.push(i + 1); len = 0; }
  });
  return starts;
}

export const AR_RUN = /[؀-ۿࢠ-ࣿ]+(?:[\s ]+[؀-ۿࢠ-ࣿ]+)*/g;

export function seededOrder(n, seed) {
  const a = [...Array(n).keys()];
  let s = seed * 9301 + 49297;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
