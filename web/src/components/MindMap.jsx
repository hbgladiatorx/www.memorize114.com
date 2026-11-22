// Mind map of a sūrah's topics. The sūrah sits in the centre; its topics branch out
// clockwise from the top, in the order they come, each with its own colour, picture,
// verse range and opening words. Recall mode hides the words so the learner rebuilds the
// map from the pictures; Walk-through lights the branches one by one, in order.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { S, prog } from '../lib/store.js';
import { retr } from '../lib/fsrs.js';
import { Seg } from './ui.jsx';
import { t, ts, tq, tsq, nn, isAr } from '../lib/i18n.jsx';

const PALETTE = ['#2F7D5B', '#B26B14', '#2D5F8E', '#7A4A8C', '#B23A5E', '#0F766E', '#8A6D1F', '#3B6E8F'];
let MM = null;
export async function loadMindmaps() {
  if (!MM) MM = fetch('/data/mindmaps.json').then((r) => r.json()).catch(() => ({ topics: {}, ruku: {} }));
  return MM;
}

// Branches for a sūrah: the written topic map, or an outline from its rukūʿ sections.
function branchesFor(s, mm) {
  const topics = mm.topics[s.n];
  if (topics) return { kind: 'topics', list: topics.map((b, k) => ({ ...b, color: PALETTE[k % PALETTE.length] })) };
  const starts = mm.ruku[s.n] || [1];
  const list = starts.map((f, k) => {
    const to = (starts[k + 1] || s.v.length + 1) - 1;
    const en = s.tr?.v?.[f] || '';
    return { f, t: to, i: null, en: en.length > 70 ? en.slice(0, 68).replace(/\s+\S*$/, '') + ' …' : en, ar: s.v[f - 1].w.slice(0, 4).join(' '), color: PALETTE[k % PALETTE.length] };
  });
  return { kind: 'ruku', list };
}

function strength(s, b) {
  const P = prog(s.n); const now = Date.now(); let started = 0, sum = 0;
  for (let a = b.f; a <= b.t; a++) { const c = P.cards[a]; if (c) { started++; sum += retr(c, now); } }
  const total = b.t - b.f + 1;
  return { started, total, recall: started ? sum / started : 0 };
}

export function MindMap({ s, open }) {
  const [mm, setMm] = useState(null);
  const [mode, setMode] = useState('map');        // map | recall
  const [shown, setShown] = useState(() => new Set());
  const [sel, setSel] = useState(null);
  const [walk, setWalk] = useState(-1);
  const box = useRef(null); const [w, setW] = useState(800);
  useEffect(() => { let live = true; loadMindmaps().then((m) => live && setMm(m)); return () => { live = false; }; }, []);
  useLayoutEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(() => setW(box.current?.clientWidth || 800)); ro.observe(box.current);
    setW(box.current.clientWidth); return () => ro.disconnect();
  }, [mm]);
  useEffect(() => { setSel(null); setShown(new Set()); setWalk(-1); }, [s.n, mode]);
  const B = useMemo(() => (mm ? branchesFor(s, mm) : null), [mm, s]);
  // walk-through: light each branch in turn
  useEffect(() => {
    if (walk < 0 || !B) return;
    if (walk >= B.list.length) { const id = setTimeout(() => setWalk(-1), 1800); return () => clearTimeout(id); }
    const id = setTimeout(() => setWalk(walk + 1), 2600); return () => clearTimeout(id);
  }, [walk, B]);
  if (!B) return <div className="card"><div className="muted small">{tsq('Loading…', 'جارٍ التحميل…')}</div></div>;

  const list = B.list; const radial = w >= 700 && list.length <= 6;   // more branches read better as a spine
  const hidden = (k) => mode === 'recall' && !shown.has(k);
  const tap = (k) => {
    if (mode === 'recall' && !shown.has(k)) { setShown((x) => new Set(x).add(k)); return; }
    setSel(sel === k ? null : k);
  };
  const title = (b) => (isAr() ? b.ar : t(b.en, ''));
  const range = (b) => (b.f === b.t ? ts(`Verse ${b.f}`, `الآية ${nn(b.f)}`) : ts(`Verses ${b.f}–${b.t}`, `الآيات ${nn(b.f)}–${nn(b.t)}`));
  const node = (b, k, style) => {
    const st = strength(s, b); const on = walk === k || sel === k; const hide = hidden(k);
    return (
      <button key={k} className={'mnode' + (on ? ' on' : '') + (hide ? ' hide' : '') + (walk >= 0 && walk !== k ? ' dim' : '')} style={{ '--c': b.color, ...style }} onClick={() => tap(k)}>
        <span className="mbadge">{nn(k + 1)}</span>
        <span className="micon">{b.i || nn(k + 1)}</span>
        <span className="mtext">
          <span className="mtitle">{hide ? tsq('Tap to recall', 'اضغط لتتذكّر') : title(b)}</span>
          <span className="mrange">{range(b)}</span>
          {!hide && <span className="mopen" dir="rtl">{s.v[b.f - 1].w.slice(0, 3).join(' ')}</span>}
          {!hide && !isAr() && S.settings.showTl && s.v[b.f - 1].tl && <span className="mtl">{s.v[b.f - 1].tl.slice(0, 3).join(' ')}</span>}
        </span>
        <span className="mbar"><i style={{ width: Math.round(100 * st.started / st.total) + '%', opacity: 0.35 + 0.65 * st.recall }} /></span>
      </button>);
  };

  const center = (
    <div className="mcenter">
      <div className="mname" dir="rtl">{s.ar}</div>
      {!isAr() && <div className="mname-en">{s.en}</div>}
      <div className="tiny faint">{s.kind === 'dua' ? tsq(`${s.v.length} passages`, `${nn(s.v.length)} فقرة`) : tsq(`${s.v.length} verses`, `${nn(s.v.length)} آية`)}</div>
      {walk >= 0 && walk < list.length && <div className="mwalk" style={{ '--c': list[walk].color }} dir="rtl">{s.v[list[walk].f - 1].w.slice(0, 3).join(' ')}</div>}
    </div>);

  let body;
  if (radial) {
    const H = list.length <= 3 ? 420 : 560; const cx = w / 2, cy = H / 2;
    const cw = Math.min(240, w * 0.26), rx = cx - cw / 2 - 6, ry = cy - 78;
    const pts = list.map((_, k) => { const a = -Math.PI / 2 + (2 * Math.PI * k) / list.length; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), a]; });
    body = (
      <div className="mradial" style={{ height: H }}>
        <svg width={w} height={H} className="mlinks" aria-hidden="true">
          {pts.map(([x, y, a], k) => {
            const mx = cx + (x - cx) * 0.55 + Math.cos(a + Math.PI / 2) * 26, my = cy + (y - cy) * 0.55 + Math.sin(a + Math.PI / 2) * 26;
            return <g key={k} className={walk >= 0 && walk !== k ? 'dim' : ''}>
              <path d={`M${cx},${cy} Q${mx},${my} ${x},${y}`} stroke={list[k].color} strokeWidth={walk === k || sel === k ? 9 : 6} fill="none" strokeLinecap="round" opacity="0.85" />
              <circle cx={mx} cy={my} r="5" fill={list[k].color} />
            </g>;
          })}
        </svg>
        <div className="mcenter-wrap" style={{ left: cx, top: cy }}>{center}</div>
        {list.map((b, k) => node(b, k, { position: 'absolute', left: pts[k][0], top: pts[k][1], width: cw, transform: 'translate(-50%,-50%)' }))}
      </div>);
  } else {
    body = (
      <div className="mspine">
        <div className="mspine-top">{center}</div>
        <div className="mspine-list">{list.map((b, k) => <div key={k} className="mlimb" style={{ '--c': b.color }}>{node(b, k, {})}</div>)}</div>
      </div>);
  }

  const b = sel !== null ? list[sel] : null;
  return (
    <div className="card topline mindmap" style={{ '--sec': 'var(--violet)' }} ref={box}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2>{tq('Mind map', 'الخريطة الذهنية')}</h2><span className="spacer" />
        <Seg value={mode} onChange={setMode} options={[['map', tsq('Map', 'الخريطة')], ['recall', tsq('Recall', 'التذكّر')]]} />
        <button className="btn sm" onClick={() => { setSel(null); setWalk(walk >= 0 ? -1 : 0); }}>{walk >= 0 ? tsq('Stop', 'إيقاف') : tsq('▶ Walk through', '▶ جولة بالترتيب')}</button>
      </div>
      <div className="muted small" style={{ margin: '4px 0 6px' }}>
        {mode === 'recall'
          ? tq('Only the pictures and numbers remain. Say each topic and its opening words, then tap to check — going round clockwise, the way the sūrah goes.', 'بقيت الصور والأرقام وحدها. اذكر كل موضوع وأوائل كلماته ثم اضغط لتتحقّق، دائرًا مع عقارب الساعة كما تسير السورة.')
          : tq('The sūrah\'s topics in order, clockwise from the top. Link each picture to its topic and its opening words; tap a branch to see its verses.', 'موضوعات السورة بالترتيب مع عقارب الساعة من الأعلى. اربط كل صورة بموضوعها وأوائل كلماتها، واضغط على الفرع لترى آياته.')}
        {B.kind === 'ruku' && <> {tq('This outline follows the sūrah\'s rukūʿ sections; its titles are the opening of each section\'s first verse.', 'هذا المخطّط يتبع أقسام الركوع في السورة، وعناوينه أوائلُ أوّل آية في كل قسم.')}</>}
      </div>
      {body}
      {b && (
        <div className="mdetail" style={{ '--c': b.color }}>
          <div className="row"><span className="micon sm">{b.i || nn(sel + 1)}</span><b>{title(b)}</b><span className="spacer" /><span className="tiny faint">{range(b)}</span></div>
          <div className="mverses">{s.v.slice(b.f - 1, b.t).map((v) => (
            <button key={v.a} onClick={() => open(v.a)}><span className="tiny">{nn(v.a)}</span><span dir="rtl" className="ar-op">{v.w.slice(0, 3).join(' ')}</span></button>))}</div>
          <button className="btn sm primary" onClick={() => open(b.f)}>{ts(`Learn from verse ${b.f}`, `احفظ من الآية ${nn(b.f)}`)}</button>
        </div>)}
    </div>);
}
