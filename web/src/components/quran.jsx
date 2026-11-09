import { useEffect, useRef, useState } from 'react';
import { toAr, seededOrder } from '../lib/arabic.js';
import { D, loadTr } from '../lib/data.js';
import { S, prog, persist, logActivity } from '../lib/store.js';
import { cur } from '../lib/cur.js';
import { review, retr, previewDays } from '../lib/fsrs.js';
import { t, ts, nn, isAr, fmtDays } from '../lib/i18n.jsx';
import { RECITERS, verseUrl, claimAudio, releaseAudio } from '../lib/audio.js';
import { Icon, Seg, toast, useScrollActive } from './ui.jsx';

/* ---------- one verse, word by word ---------- */
// hidden: Set or (i)=>bool. peekable: tapping a hidden word reveals it in gold.
export function Verse({ v, hidden, blank, miss, hint, anchor, diff, cur: curIdx, weak, onWord, noNum, onNum, peekable, resetKey }) {
  const [peek, setPeek] = useState(() => new Set());
  useEffect(() => setPeek(new Set()), [v, resetKey]);
  const isHidden = (i) => (hidden ? (typeof hidden === 'function' ? hidden(i) : hidden.has(i)) : false);
  return (
    <span className="v" data-a={v.a} style={{ '--sec': v.color }}>
      {v.w.map((w, i) => {
        const hid = isHidden(i) && !peek.has(i);
        const cls = ['w'];
        if (hid) { cls.push('hid'); if (blank && !(hint && hint.has(i))) cls.push('blank'); }
        if (peek.has(i)) cls.push('peek');
        if (!hid && miss?.has(i)) cls.push('miss');
        if (!hid && hint?.has(i) && !miss?.has(i)) cls.push('hintd');
        if (!hid && anchor && v.ev && v.ev.anchor === i) cls.push('anchor');
        if (diff) cls.push(diff.has(i) ? 'diff' : 'same');
        if (curIdx === i) cls.push('cur');
        if (weak && weak[i]) cls.push(weak[i] >= 2 ? 'weak2' : 'weak1');
        const clickable = onWord || (peekable && hid);
        if (clickable) cls.push('tapme');
        const click = onWord ? () => onWord(i) : peekable && hid ? () => setPeek((p) => new Set(p).add(i)) : undefined;
        return <span key={i}><span className={cls.join(' ')} data-cue={v.cues ? v.cues[i] : ''} onClick={click}>{w}</span>{' '}</span>;
      })}
      {!noNum && <span className="num" onClick={onNum ? () => onNum(v.a) : undefined}>{' ' + toAr(v.a)} </span>}
    </span>
  );
}
export const otherVerse = (o) => ({ a: o.a, w: o.w, n: o.w, cues: null, color: '#8E8676' });

export function fadeHidden(v, level, surahN) {
  if (level <= 0) return new Set();
  const n = v.w.length;
  if (level >= 4) return new Set([...Array(n).keys()]);
  return new Set(seededOrder(n, v.a * 31 + surahN).slice(0, Math.round(n * [0, 0.25, 0.5, 0.75][level])));
}

export function SurahHead({ s }) {
  return (<>
    <div className="sheader">{'سُورَةُ ' + s.ar}</div>
    {s.n !== 1 && s.n !== 9 && <div className="basmala">{D.basmala.join(' ')}</div>}
  </>);
}

export const SectionTag = ({ v }) => <span className="sectag" style={{ '--sec': v.color }}>{v.sec ? ts(v.sec.title, v.sec.ar) : ts(`Page ${v.p}`, `الصفحة ${toAr(v.p)}`)}</span>;

export function VerseChips({ active, onPick }) {
  const s = cur.surah; const P = prog(s.n); const now = Date.now();
  const ref = useScrollActive(active + '-' + s.n);
  return (
    <div className="chips" ref={ref}>
      {s.v.map((v) => (
        <button key={v.a} className={'chip' + (v.a === active ? ' on' : '')} style={{ '--sec': v.color }} onClick={() => onPick(v.a)}>
          {toAr(v.a)}<span className="bar"><i style={{ width: Math.round(retr(P.cards[v.a], now) * 100) + '%' }} /></span>
        </button>
      ))}
    </div>
  );
}

export function Meaning({ s, v }) {
  const qarai = s.tr?.v?.[v.a];
  if (isAr()) return (<>
    {v.ev?.mean_ar && <div className="trans arp" style={{ '--sec': v.color }}>{v.ev.mean_ar}<div className="src">المعنى الإجمالي — صياغة التطبيق</div></div>}
    {S.settings.showTrAr && qarai && <div className="trans" dir="ltr" style={{ '--sec': v.color, textAlign: 'left' }}>{qarai}</div>}
  </>);
  if (!S.settings.showTr || !qarai) return null;
  return <div className="trans" style={{ '--sec': v.color }}>{qarai}</div>;
}

/* ---------- audio ---------- */
function bumpRead(a, n = 1) { const P = prog(cur.surah.n); P.reads[a] = (P.reads[a] || 0) + n; persist(cur.surah.n); }

export function AudioBar({ v }) {
  const st = S.settings; const [playing, setPlaying] = useState(false); const [info, setInfo] = useState('');
  const handle = useRef(null);
  useEffect(() => () => handle.current?.stop(), [v]);
  const start = () => {
    if (handle.current) { handle.current.stop(); return; }
    const au = new Audio(verseUrl(cur.surah.n, v.a, st.reciter)); au.playbackRate = st.rate || 1;
    let n = 0, timer, dead = false;
    const h = { stop: () => { dead = true; au.pause(); clearTimeout(timer); setPlaying(false); setInfo(''); releaseAudio(h); handle.current = null; } };
    handle.current = h; claimAudio(h); setPlaying(true);
    const go = () => { if (dead) return; n++; setInfo(`${nn(n)} / ${nn(st.rep)}`); au.currentTime = 0; au.play().catch(() => { toast(ts('Audio could not play — check your connection', 'تعذّر تشغيل التلاوة — تحقّق من الاتصال')); h.stop(); }); };
    au.onended = () => {
      if (n >= st.rep) { h.stop(); bumpRead(v.a, st.rep); return; }
      if (st.echo) { setInfo(ts('Your turn — recite it back', 'دورك — ردِّد الآية')); timer = setTimeout(go, (au.duration * 1000) / (st.rate || 1) + 600); }
      else timer = setTimeout(go, 400);
    };
    au.onerror = () => { toast(ts('Audio could not load', 'تعذّر تحميل التلاوة')); h.stop(); };
    go();
  };
  const setS = (k, val) => { st[k] = val; persist('settings'); };
  return (
    <div className="audio">
      <button className="btn sm primary" style={{ '--accent': 'var(--blue)' }} onClick={start}><Icon name={playing ? 'pause' : 'play'} />{playing ? ts('Stop', 'إيقاف') : ts('Play', 'تشغيل')}</button>
      <Seg accent="var(--blue)" value={st.rep} onChange={(r) => setS('rep', r)} options={[1, 3, 5, 10].map((r) => [r, '×' + nn(r)])} />
      <button className={'btn sm' + (st.echo ? ' primary' : '')} style={{ '--accent': 'var(--violet)' }} title={ts('Pause after each play so you can recite it back', 'توقّف بعد كل تشغيل لتردّد الآية')} onClick={() => setS('echo', !st.echo)}>{ts('Echo', 'ترديد')}</button>
      <Seg accent="var(--blue)" value={st.rate} onChange={(r) => setS('rate', r)} options={[0.75, 1, 1.25].map((r) => [r, nn(r) + '×'])} />
      <span className="tiny faint">{info}</span>
      <div className="tiny reciter">♪ {t(RECITERS[st.reciter]?.en || '', RECITERS[st.reciter]?.ar || '')}</div>
    </div>
  );
}

export function SurahPlayer({ s, onVerse }) {
  const [playing, setPlaying] = useState(false); const [at, setAt] = useState(0);
  const handle = useRef(null);
  useEffect(() => () => handle.current?.stop(), [s]);
  const start = () => {
    if (handle.current) { handle.current.stop(); return; }
    let i = 0, dead = false; const au = new Audio(); au.playbackRate = S.settings.rate || 1;
    const h = { stop: () => { dead = true; au.pause(); setPlaying(false); setAt(0); onVerse(0); releaseAudio(h); handle.current = null; } };
    handle.current = h; claimAudio(h); setPlaying(true);
    const next = () => {
      if (dead) return; if (i >= s.v.length) { h.stop(); return; }
      const v = s.v[i++]; au.src = verseUrl(s.n, v.a, S.settings.reciter); setAt(v.a); onVerse(v.a);
      au.play().catch(() => h.stop());
    };
    au.onended = () => setTimeout(next, 250);
    au.onerror = () => { toast(ts('Audio could not load', 'تعذّر تحميل التلاوة')); h.stop(); };
    next();
  };
  return (
    <div className="audio" style={{ marginTop: 0, marginBottom: 10 }}>
      <button className="btn sm primary" style={{ '--accent': 'var(--blue)' }} onClick={start}><Icon name={playing ? 'pause' : 'play'} />{playing ? ts('Stop', 'إيقاف') : t('Play the sūrah', 'شغِّل السورة')}</button>
      {at > 0 && <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{ts(`verse ${at}`, `الآية ${toAr(at)}`)}</span>}
      <span className="tiny faint">♪ {t(RECITERS[S.settings.reciter]?.en || '', RECITERS[S.settings.reciter]?.ar || '')}</span>
    </div>
  );
}

/* ---------- grading ---------- */
const suggestGrade = (n, misses, hints) => (misses >= 3 || misses / n > 0.15 ? 1 : misses > 0 || hints > 1 ? 2 : 3);
export function GradeRow({ a, suggested, onDone }) {
  const P = prog(cur.surah.n); const now = Date.now();
  const pv = previewDays(P.cards[a], now, S.settings.retention).map((d, i) => (i === 0 ? ts('10m', '١٠ دقائق') : fmtDays(d)));
  const names = isAr() ? ['أعِد', 'صعب', 'جيّد', 'سهل'] : ['Again', 'Hard', 'Good', 'Easy'];
  return (<div>
    <div className="tiny faint" style={{ marginTop: 10 }}>{ts('How did it go? The outlined grade is suggested from your marks; the next review is shown under each.', 'كيف كان حفظك؟ التقدير المحاط مقترح من علاماتك، وتحت كل تقدير موعد المراجعة التالية.')}</div>
    <div className="grades">
      {names.map((nm, i) => (
        <button key={i} className={`g${i + 1}` + (suggested === i + 1 ? ' sug' : '')} onClick={() => { P.cards[a] = review(P.cards[a], i + 1, Date.now(), S.settings.retention); persist(cur.surah.n); logActivity(); onDone(i + 1); }}>
          {nm}<span>{pv[i]}</span>
        </button>))}
    </div>
  </div>);
}

/* ---------- recite and check (retrieval practice with feedback) ---------- */
export function ReciteCheck({ verses, limitFirstChunk, noGrade, contextBefore, after }) {
  const [vi, setVi] = useState(0); const [upto, setUpto] = useState(0);
  const [miss, setMiss] = useState(() => new Set()); const [hint, setHint] = useState(() => new Set());
  const [results, setResults] = useState([]);
  useEffect(() => { setVi(0); setUpto(0); setMiss(new Set()); setHint(new Set()); setResults([]); }, [verses]);
  if (vi >= verses.length) {
    const tm = results.reduce((s, r) => s + r.m, 0);
    return (<div className="empty">
      <div style={{ fontSize: 34, color: tm ? 'var(--amber)' : 'var(--green)' }}>{tm ? '◐' : '●'}</div>
      <h2 style={{ margin: '6px 0' }}>{tm ? ts(`Done — ${tm} word${tm > 1 ? 's' : ''} to tighten`, `انتهيت — كلمات تحتاج تثبيتًا: ${toAr(tm)}`) : ts('Clean recitation', 'تسميعٌ متقن')}</h2>
      <div className="muted small">{ts('Missed words are underlined in red on the Learn screen.', 'الكلمات التي أخطأت فيها مُسطَّرة بالأحمر في شاشة الحفظ.')}</div>
      {after}
    </div>);
  }
  const v = verses[vi];
  const limit = limitFirstChunk ? (v.chunks[1] || v.w.length) : v.w.length;
  const done = upto >= limit;
  const pv = contextBefore ? contextBefore(v) : null;
  const toggleMiss = (i) => setMiss((m) => { const n = new Set(m); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const record = () => {
    const P = prog(cur.surah.n);
    const arr = P.miss[v.a] || Array(v.w.length).fill(0); miss.forEach((i) => (arr[i] = (arr[i] || 0) + 1)); P.miss[v.a] = arr;
    const ha = P.hint[v.a] || Array(v.w.length).fill(0); hint.forEach((i) => (ha[i] = (ha[i] || 0) + 1)); P.hint[v.a] = ha;
    persist(cur.surah.n);
  };
  const m = [...miss].filter((i) => i < limit).length, hn = [...hint].filter((i) => i < limit && !miss.has(i)).length;
  const next = () => { setResults((r) => [...r, { a: v.a, m, h: hn }]); setVi(vi + 1); setUpto(0); setMiss(new Set()); setHint(new Set()); };
  const nextChunk = v.chunks.find((c) => c > upto) || limit;
  return (<div>
    <div className="row" style={{ marginBottom: 4 }}>
      <span className="pill" style={{ '--pc': v.color }}>{ts(`Verse ${v.a}`, `الآية ${toAr(v.a)}`)}</span>
      {verses.length > 1 && <span className="tiny faint">{ts(`${vi + 1} of ${verses.length}`, `${toAr(vi + 1)} من ${toAr(verses.length)}`)}</span>}
      <span className="spacer" /><SectionTag v={v} />
    </div>
    <div className="ayah">
      {pv && <span className="ctx"><Verse v={pv} hidden={(i) => i < pv.chunks[pv.chunks.length - 1]} />{' '}</span>}
      <Verse v={v} hidden={(i) => i >= upto} blank miss={miss} hint={hint} cur={upto < limit ? upto : -1} noNum={limit < v.w.length}
        onWord={(i) => { if (i < upto) toggleMiss(i); else if (i === upto) setHint((h) => new Set(h).add(i)); }} />
    </div>
    {!done ? (<>
      <div className="tiny faint" style={{ margin: '6px 0' }}>{ts('Recite from memory, then reveal. Tap a revealed word you got wrong to mark it red. Tap the underlined gap for a first-letter hint.', 'اقرأ من حفظك ثم اكشف. اضغط على الكلمة التي أخطأت فيها لتُعلَّم بالأحمر، واضغط على الفراغ المُسطَّر لتلميح بالحرف الأول.')}</div>
      <div className="row">
        <button className="btn" style={{ color: 'var(--gold)' }} onClick={() => setHint((h) => new Set(h).add(upto))}>{ts('Hint', 'تلميح')}</button>
        <button className="btn" onClick={() => setUpto(upto + 1)}>{ts('Next word', 'الكلمة التالية')}</button>
        <button className="btn primary" onClick={() => setUpto(Math.min(nextChunk, limit))}>{ts('Reveal phrase', 'اكشف المقطع')}</button>
        <button className="btn ghost" onClick={() => setUpto(limit)}>{ts('Reveal all', 'اكشف الكل')}</button>
      </div>
    </>) : (<>
      <div className="row small" style={{ marginTop: 6 }}>
        <b style={{ color: m ? 'var(--red)' : 'var(--green)' }}>{m ? ts(`${m} word${m > 1 ? 's' : ''} missed`, `الكلمات الفائتة: ${toAr(m)}`) : ts('No words missed', 'لا أخطاء')}</b>
        {hn > 0 && <span className="muted">{ts(`· ${hn} hint${hn > 1 ? 's' : ''}`, `· التلميحات: ${toAr(hn)}`)}</span>}
      </div>
      {noGrade ? (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => { record(); logActivity(); next(); }}>{vi + 1 < verses.length ? ts('Next', 'التالي') : ts('Finish', 'إنهاء')}</button>
          <button className="btn" onClick={() => { setUpto(0); setMiss(new Set()); setHint(new Set()); }}>{ts('Again', 'أعِد')}</button>
        </div>
      ) : <GradeRow key={v.a + '-' + vi} a={v.a} suggested={suggestGrade(limit, m, hn)} onDone={() => { record(); next(); }} />}
    </>)}
  </div>);
}

/* Qarai's translation under any verse (English mode), loaded on demand */
export function TrLine({ sn, a, color }) {
  const [txt, setTxt] = useState(null);
  useEffect(() => { let live = true; if (!isAr()) loadTr(sn).then((tr) => live && setTxt(tr?.v?.[a] || '')); return () => { live = false; }; }, [sn, a]);
  if (isAr() || txt === '') return null;
  return <div className="trans small" style={{ '--sec': color || 'var(--rose)', fontSize: 14 }}>{txt ?? '…'}</div>;
}
