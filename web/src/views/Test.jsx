import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toAr } from '../lib/arabic.js';
import { logActivity } from '../lib/store.js';
import { cur, set } from '../lib/cur.js';
import { t, ts, nn, isAr, refTxt } from '../lib/i18n.jsx';
import { Verse, otherVerse, SurahHead, VerseChips, ReciteCheck, TrLine } from '../components/quran.jsx';
import { toast } from '../components/ui.jsx';

const MODES = [
  ['tasmi', '◎', 'var(--blue)', 'Tasmīʿ — whole sūrah', 'التسميع — السورة كاملة', 'Recite every verse in order from memory, reveal, mark slips, grade. The full exam.', 'اقرأ الآيات كلها بالترتيب من حفظك، ثم اكشف وعلِّم الأخطاء وقيِّم. الاختبار الكامل.'],
  ['range', '⇄', 'var(--teal)', 'Recite a range', 'تسميع مقطع', 'Pick a stretch of verses and recite it the same way.', 'اختر مجموعة آيات واقرأها بالطريقة نفسها.'],
  ['next', '➜', 'var(--green)', 'What comes next?', 'ما الذي يلي؟', 'See the end of one verse; pick how the next one begins. Trains the joins.', 'ترى نهاية آية فتختار بداية التي تليها. تدريب على مواضع الانتقال.'],
  ['build', '▦', 'var(--violet)', 'Build the verse', 'رتِّب الآية', 'Tap shuffled words into the right order, phrase by phrase.', 'رتِّب الكلمات المبعثرة مقطعًا بعد مقطع.'],
  ['which', '≈', 'var(--rose)', 'Same or different?', 'مطابقة أم مختلفة؟', 'A look-alike verse from elsewhere, or the real one? Trains you against mutashābihāt.', 'آيةٌ مشابهة من موضعٍ آخر أم الآية نفسها؟ تدريب على المتشابهات.'],
];
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const diffSets = (blocks, la, lb) => { const A = new Set([...Array(la).keys()]), B = new Set([...Array(lb).keys()]); blocks.forEach(([i, j, n]) => { for (let k = 0; k < n; k++) { A.delete(i + k); B.delete(j + k); } }); return [A, B]; };

export default function Test() {
  const s = cur.surah; const nav = useNavigate();
  if (cur.session) return (<>
    <div className="row" style={{ marginBottom: 8 }}>
      <button className="btn sm" onClick={() => { set({ session: null }); nav('/'); }}>{ts('← Today', '→ اليوم')}</button>
      <b style={{ color: 'var(--blue)' }}>{ts('Revision', 'المراجعة')}</b>
    </div>
    <div className="card topline" style={{ '--sec': 'var(--blue)' }}>
      <ReciteCheck verses={cur.session} after={<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}><button className="btn primary" onClick={() => { set({ session: null }); nav('/'); }}>{ts('Back to today', 'العودة إلى اليوم')}</button></div>} />
    </div>
  </>);
  if (!cur.testMode) return MODES.map(([k, ic, c, en, ar, den, dar]) => (
    <button key={k} className="card mode" style={{ '--mc': c }} onClick={() => set({ testMode: k, testState: null })}>
      <div className="mi">{k === 'next' && isAr() ? '⬅' : ic}</div>
      <div><h2>{t(en, ar)}</h2><div className="muted small">{t(den, dar)}</div></div>
    </button>));
  const md = MODES.find((m) => m[0] === cur.testMode);
  return (<>
    <div className="row" style={{ marginBottom: 8 }}>
      <button className="btn sm" onClick={() => set({ testMode: null })}>{ts('← All tests', '→ كل الاختبارات')}</button>
      <b style={{ color: md[2] }}>{t(md[3], md[4])}</b>
    </div>
    <div className="card topline" style={{ '--sec': md[2], '--accent': md[2] }}>
      {cur.testMode === 'tasmi' && <><SurahHead s={s} /><ReciteCheck verses={s.v} /></>}
      {cur.testMode === 'range' && <Range s={s} />}
      {cur.testMode === 'next' && <NextVerse s={s} />}
      {cur.testMode === 'build' && <Build s={s} />}
      {cur.testMode === 'which' && <Which s={s} />}
    </div>
  </>);
}

function Range({ s }) {
  const [from, setFrom] = useState(1); const [to, setTo] = useState(Math.min(s.v.length, 5)); const [go, setGo] = useState(null);
  if (go) return <ReciteCheck verses={go} />;
  const sel = (val, on) => <select value={val} onChange={(e) => on(+e.target.value)}>{s.v.map((v) => <option key={v.a} value={v.a}>{nn(v.a)}</option>)}</select>;
  return (<div className="row">
    {ts('From verse', 'من الآية')} {sel(from, (x) => { setFrom(x); if (to < x) setTo(x); })} {ts('to', 'إلى')} {sel(to, setTo)}
    <button className="btn primary" onClick={() => setGo(s.v.slice(from - 1, Math.max(to, from)))}>{ts('Start', 'ابدأ')}</button>
  </div>);
}

const scoreTxt = (st) => ts(`Score ${st.score}/${st.total}`, `النتيجة ${toAr(st.score)}/${toAr(st.total)}`);

function NextVerse({ s }) {
  const [score, setScore] = useState({ score: 0, total: 0 }); const [round, setRound] = useState(0); const [pick, setPick] = useState(null);
  const q = useMemo(() => {
    if (s.v.length < 3) return null;
    const a = 1 + rnd(s.v.length - 1); const v = s.v[a - 1], nx = s.v[a];
    const open = (x) => x.w.slice(0, Math.min(4, x.w.length)).join(' ');
    return { v, nx, open, opts: shuffle([nx, ...shuffle(s.v.filter((x) => x.a !== nx.a && open(x) !== open(nx))).slice(0, 3)]) };
  }, [s, round]);
  if (!q) return <div className="empty">{t('This sūrah is too short for this drill.', 'السورة أقصر من أن يصلح لها هذا التدريب.')}</div>;
  const { v, nx, open, opts } = q;
  return (<>
    <div className="row"><span className="pill" style={{ '--pc': v.color }}>{ts(`End of verse ${v.a}`, `نهاية الآية ${toAr(v.a)}`)}</span><span className="spacer" /><span className="tiny faint">{scoreTxt(score)}</span></div>
    <div className="ayah"><Verse v={v} hidden={(i) => i < v.chunks[v.chunks.length - 1]} blank /></div>
    <div className="tiny faint">{ts('How does the next verse begin?', 'بِمَ تبدأ الآية التالية؟')}</div>
    {opts.map((o) => (
      <button key={o.a} className={'opt' + (pick ? (o === nx ? ' right' : o === pick ? ' wrong' : '') : '')}
        onClick={() => { if (pick) return; setPick(o); setScore((st) => ({ score: st.score + (o === nx ? 1 : 0), total: st.total + 1 })); logActivity(); }}>{open(o)} …</button>
    ))}
    {pick && <div className="row" style={{ marginTop: 12 }}>
      <b className="small" style={{ color: pick === nx ? 'var(--green)' : 'var(--red)' }}>{pick === nx ? ts('Right.', 'أحسنت.') : ts(`It is verse ${nx.a}.`, `إنها الآية ${toAr(nx.a)}.`)}</b>
      <span className="spacer" /><button className="btn primary" onClick={() => { setPick(null); setRound(round + 1); }}>{ts('Next', 'التالي')}</button>
    </div>}
  </>);
}

function Build({ s }) {
  const [a, setA] = useState(cur.verse); const [k, setK] = useState(0); const [placed, setPlaced] = useState(0); const [errs, setErrs] = useState(0); const [shake, setShake] = useState(-1); const [done, setDone] = useState(false);
  const v = s.v[a - 1]; const C = v.chunks; const start = C[k], end = C[k + 1] || v.w.length;
  const order = useMemo(() => shuffle([...Array(end - start).keys()].map((i) => i + start)), [a, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = (na) => { setA(na); setK(0); setPlaced(0); setErrs(0); setDone(false); };
  const tap = (i) => {
    if (v.n[i] === v.n[start + placed]) {
      const p = placed + 1;
      if (start + p >= end) {
        if (k + 1 < C.length) { setK(k + 1); setPlaced(0); }
        else { setPlaced(p); setDone(true); logActivity(); toast(errs ? ts(`Verse built with ${errs} slip${errs > 1 ? 's' : ''}`, `اكتملت الآية — الأخطاء: ${toAr(errs)}`) : ts('Built without a slip', 'اكتملت الآية دون خطأ')); }
      } else setPlaced(p);
    } else { setErrs(errs + 1); setShake(i); setTimeout(() => setShake(-1), 400); }
  };
  return (<>
    <VerseChips active={a} onPick={reset} />
    <div className="row">
      <span className="pill" style={{ '--pc': v.color }}>{ts(`Verse ${v.a} · phrase ${k + 1}/${C.length}`, `الآية ${toAr(v.a)} · المقطع ${toAr(k + 1)}/${toAr(C.length)}`)}</span><span className="spacer" />
      <span className="tiny" style={{ color: errs ? 'var(--red)' : 'var(--ink3)' }}>{ts(`${errs} slip${errs === 1 ? '' : 's'}`, `الأخطاء: ${toAr(errs)}`)}</span>
    </div>
    <div className="ayah built"><Verse v={v} hidden={(i) => i >= start + placed} blank noNum={!done && end < v.w.length} /></div>
    {done ? <div className="row" style={{ marginTop: 12, justifyContent: 'center' }}><button className="btn primary" onClick={() => reset(a < s.v.length ? a + 1 : 1)}>{ts('Next verse', 'الآية التالية')}</button></div>
      : <div className="tiles" style={{ '--sec': v.color }}>{order.map((i) => <button key={i} className={'tile' + (i < start + placed ? ' used' : '') + (shake === i ? ' shake' : '')} onClick={() => tap(i)}>{v.w[i]}</button>)}</div>}
  </>);
}

function Which({ s }) {
  const cands = useMemo(() => { const c = []; s.v.forEach((v) => v.sim.forEach((o) => { const shared = o.b.reduce((t2, b) => t2 + b[2], 0); if (shared >= 0.5 * Math.min(v.w.length, o.w.length)) c.push([v, o]); })); return c; }, [s]);
  const [score, setScore] = useState({ score: 0, total: 0 }); const [round, setRound] = useState(0); const [ans, setAns] = useState(null);
  const q = useMemo(() => (cands.length ? { pair: cands[rnd(cands.length)], real: Math.random() < 0.5 } : null), [cands, round]);
  if (!q) return <div className="empty">{t('No close look-alikes were found for this sūrah.', 'لم يُعثر على متشابهات قريبة لهذه السورة.')}</div>;
  const [v, o] = q.pair; const real = q.real;
  const answer = (yes) => { if (ans) return; const ok = yes === real; setAns({ ok }); setScore((st) => ({ score: st.score + (ok ? 1 : 0), total: st.total + 1 })); logActivity(); };
  const [A, B] = diffSets(o.b, v.w.length, o.w.length);
  return (<>
    <div className="row"><span className="pill" style={{ '--pc': 'var(--rose)' }}>{ts(`Is this ${refTxt(s.n, v.a)}, word for word?`, `هل هذه ${refTxt(s.n, v.a)} حرفًا بحرف؟`)}</span><span className="spacer" /><span className="tiny faint">{scoreTxt(score)}</span></div>
    <div className="ayah"><Verse v={real ? v : otherVerse(o)} noNum /></div>
    <div className="row" style={{ marginTop: 8 }}>
      <button className="btn primary" style={{ '--accent': 'var(--green)' }} onClick={() => answer(true)}>{ts('Yes, exactly', 'نعم، مطابقة')}</button>
      <button className="btn primary" style={{ '--accent': 'var(--red)' }} onClick={() => answer(false)}>{ts('No — it differs', 'لا — مختلفة')}</button>
    </div>
    {ans && (<>
      <div className="note" style={{ borderColor: ans.ok ? 'var(--green)' : 'var(--red)' }}>
        <b style={{ color: ans.ok ? 'var(--green)' : 'var(--red)' }}>{ans.ok ? ts('Right. ', 'أحسنت. ') : ts('Not quite. ', 'ليس تمامًا. ')}</b>
        {real ? ts(`That was ${refTxt(s.n, v.a)} itself.`, `كانت هي ${refTxt(s.n, v.a)} نفسها.`) : ts(`That was ${refTxt(o.s, o.a)}.`, `كانت ${refTxt(o.s, o.a)}.`)}
      </div>
      <div className="simbox">
        <div className="ref">{refTxt(s.n, v.a)}</div><div className="ayah"><Verse v={v} diff={A} noNum /></div><TrLine sn={s.n} a={v.a} color={v.color} />
        <div className="ref" style={{ marginTop: 8 }}>{refTxt(o.s, o.a)}</div><div className="ayah"><Verse v={otherVerse(o)} diff={B} noNum /></div><TrLine sn={o.s} a={o.a} />
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}><button className="btn primary" onClick={() => { setAns(null); setRound(round + 1); }}>{ts('Next', 'التالي')}</button></div>
    </>)}
  </>);
}

