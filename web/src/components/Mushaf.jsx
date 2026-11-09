// A miniature Madinah muṣḥaf page: the real words, laid out on the page's 15 lines,
// coloured by verse. Line data (which lines each verse occupies) is from the
// KFGQPC layout; where two verses share a line the break point is estimated.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { toAr } from '../lib/arabic.js';
import { D } from '../lib/data.js';

// Lay a page's words out on its lines, honouring each verse's first and last line.
export function layoutPage(s, page) {
  const vs = s.v.filter((v) => v.p === page);
  const first = vs[0], last = vs[vs.length - 1];
  const lines = Array.from({ length: 15 }, () => ({ kind: 'other', items: [], chars: 0 }));
  if (first.a === 1) {
    if (s.n === 1 || s.n === 9) { if (first.ls >= 2) lines[first.ls - 2] = { kind: 'title', items: [], chars: 0 }; }
    else {
      if (first.ls >= 3) lines[first.ls - 3] = { kind: 'title', items: [], chars: 0 };
      if (first.ls >= 2) lines[first.ls - 2] = { kind: 'basmala', items: [], chars: 0 };
    }
  }
  for (let L = first.ls; L <= last.le; L++) lines[L - 1].kind = 'text';
  // capacity: average characters per text line on this page
  const tokens = vs.flatMap((v) => [...v.n.map((n) => n.length + 1), 2]);
  const nLines = last.le - first.ls + 1;
  const cap = Math.max(18, tokens.reduce((a, b) => a + b, 0) / nLines);
  let L = first.ls;
  vs.forEach((v) => {
    if (L < v.ls) L = v.ls;
    v.w.forEach((w, i) => {
      const len = v.n[i].length + 1;
      if (lines[L - 1].chars + len > cap * 1.04 && L < v.le && lines[L - 1].items.length) L++;
      lines[L - 1].items.push({ a: v.a, w, i });
      lines[L - 1].chars += len;
    });
    lines[L - 1].items.push({ a: v.a, num: true });
    lines[L - 1].chars += 2;
    if (v.le > L && v.a !== last.a) L = v.le; // the next verse cannot start before this one's last line
  });
  lines.forEach((ln) => { ln.full = ln.kind === 'text' && ln.chars > cap * 0.72; });
  // pages 1–2 of the Madinah muṣḥaf are short ornamental pages: stop after the last line
  if (page <= 2) lines.length = last.le;
  return { lines, first, last, cap, juz: first.j };
}

// mode: 'text' (coloured words) | 'shape' (words as coloured bars) | 'blank' (grey bars, for the drill)
export function MushafPage({ s, page, mode = 'text', focus, reveal, onPick }) {
  const layout = useMemo(() => layoutPage(s, page), [s, page]);
  const box = useRef(null);
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => {
      const w = el.clientWidth; if (!w) return;
      let size = Math.min(26, w / (Math.max(layout.cap, 30) * 0.47));
      el.style.setProperty('--mfs', size + 'px');
      let worst = 1;
      el.querySelectorAll('.mline.full, .mline.part').forEach((ln) => { worst = Math.max(worst, ln.scrollWidth / ln.clientWidth); });
      if (worst > 1.001) { size = (size / worst) * 0.985; el.style.setProperty('--mfs', size + 'px'); }
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);
  const byA = Object.fromEntries(s.v.map((v) => [v.a, v]));
  return (
    <div className={`mpage mode-${mode}`}>
      <div className="mframe">
        <div className="mhead"><span>{toAr(layout.juz)} الجزء</span><span>{s.ar}</span></div>
        <div className="mbody" ref={box}>
          {layout.lines.map((ln, k) => {
            if (ln.kind === 'title') return <div key={k} className="mline mtitle"><span>سُورَةُ {s.ar}</span></div>;
            if (ln.kind === 'basmala') return <div key={k} className="mline mbasmala">{D.basmala.join(' ')}</div>;
            if (ln.kind === 'other') return <div key={k} className="mline mother" />;
            return (
              <div key={k} className={'mline ' + (ln.full ? 'full' : 'part')}>
                {ln.items.map((it, j) => {
                  const v = byA[it.a];
                  const on = focus === it.a;
                  const shown = mode === 'text' || reveal?.has(it.a);
                  const cls = ['mw', it.num ? 'mnum' : '', on ? 'on' : '', shown ? 'shown' : ''].join(' ');
                  return (
                    <span key={j} className={cls} style={{ '--vc': v.color, '--alt': v.a % 2 ? '1' : '0' }} onClick={onPick ? () => onPick(it.a) : undefined}>
                      {it.num ? ' ' + toAr(it.a) : it.w}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="mfoot"><span className="mpno">{toAr(page)}</span></div>
      </div>
    </div>
  );
}
