// Follow-along highlighting: as a verse plays, each word fills with colour from
// right to left while the reciter says it, and stays coloured once said.
// Word timings (quran-align, CC BY 4.0) exist for the EveryAyah recordings named here.
const TIMED = { alafasy: 'alafasy' };
const cache = {};
const pad3 = (n) => String(n).padStart(3, '0');

export const hasTiming = (reciter, n) => !!TIMED[reciter] && n <= 114;

function load(reciter, n) {
  const key = reciter + n;
  if (!cache[key]) {
    cache[key] = fetch(`/data/timing/${TIMED[reciter]}/s${pad3(n)}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  }
  return cache[key];
}

const words = (a) => [...document.querySelectorAll(`.ayah .v[data-a="${a}"] .w, .whole .v[data-a="${a}"] .w`)];
const tlWords = (a) => [...document.querySelectorAll(`.tl[data-a="${a}"] .tw`)];   // transliteration, word for word

function clear(a) {
  for (const el of [...words(a), ...tlWords(a)]) { el.classList.remove('k-wait', 'k-now', 'k-done'); el.style.removeProperty('--p'); }
}

// Start following `au` (an <audio> element playing verse a of sūrah n). Returns a stop function.
export function follow(au, n, a, reciter) {
  if (!hasTiming(reciter, n)) return () => {};
  let dead = false, raf = 0, segs = null;
  load(reciter, n).then((t) => {
    if (dead) return;
    segs = t[a] || null;
    if (!segs) return;
    for (const el of [...words(a), ...tlWords(a)]) el.classList.add('k-wait');
    tick();
  });
  function tick() {
    if (dead || !segs) return;
    const ms = au.currentTime * 1000;
    const els = words(a); const tls = tlWords(a);
    for (const [i0, i1, t0, t1] of segs) {
      const span = i1 - i0;
      const p = ms <= t0 ? 0 : ms >= t1 ? 1 : (ms - t0) / (t1 - t0);
      for (let i = i0; i < i1; i++) {
        const pw = Math.max(0, Math.min(1, p * span - (i - i0)));  // a multi-word span fills word by word
        for (const el of [els[i], tls[i]]) {
          if (!el) continue;
          el.classList.toggle('k-done', pw >= 1);
          el.classList.toggle('k-now', pw > 0 && pw < 1);
          el.classList.toggle('k-wait', pw <= 0);
          if (pw > 0 && pw < 1) el.style.setProperty('--p', Math.round(pw * 100) + '%');
        }
      }
    }
    if (au.ended) { for (const el of [...els, ...tls]) { el.classList.remove('k-wait', 'k-now'); el.classList.add('k-done'); } return; }
    raf = requestAnimationFrame(tick);
  }
  return () => { dead = true; cancelAnimationFrame(raf); clear(a); };
}
