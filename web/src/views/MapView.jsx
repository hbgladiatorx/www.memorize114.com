import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MushafPage } from '../components/Mushaf.jsx';
import { logActivity } from '../lib/store.js';
import { Seg } from '../components/ui.jsx';
import { toAr } from '../lib/arabic.js';
import { cur, set } from '../lib/cur.js';
import { t, ts, nn, isAr, rich, richAr } from '../lib/i18n.jsx';

const COLS = ['var(--green)', 'var(--amber)', 'var(--rose)', 'var(--violet)', 'var(--blue)', 'var(--teal)'];

export default function MapView() {
  const s = cur.surah; const E = s.enrich; const nav = useNavigate();
  const open = (a) => { set({ verse: a, mode: 'verse', learnStep: 'read' }); nav('/learn'); };
  const pages = [...new Set(s.v.map((v) => v.p))];
  let lastSec = null;
  return (<>
    <PageMap key={s.n} s={s} pages={pages} open={open} />

    <div className="card topline" style={{ '--sec': 'var(--violet)' }}>
      <h2>{ts('Memory journey', 'رحلة الذاكرة')}</h2>
      <div className="muted small" style={{ marginBottom: 6 }}>{E ? ts('One anchor word and one picture per verse, in order. Walk the path in your mind before reciting: the order of the stations is the order of the verses.', 'كلمةٌ مفتاحية وصورةٌ لكل آية بالترتيب. امشِ في الطريق بذهنك قبل التسميع؛ فترتيب المحطات هو ترتيب الآيات.') : t('The opening words of each verse, in order. Recite the sūrah by walking these stations.', 'أوائل كلمات كل آية بالترتيب. سمِّع السورة بالمرور على هذه المحطات.')}</div>
      <div className="journey">
        {s.v.map((v) => {
          const head = E && v.sec && v.sec !== lastSec ? <div className="secthead" style={{ '--sec': v.color }}>{`${ts(v.sec.title, v.sec.ar)} · ${nn(v.sec.from)}–${nn(v.sec.to)}`}</div> : null;
          if (head) lastSec = v.sec;
          const word = v.ev ? v.w[v.ev.anchor] : v.w.slice(0, 2).join(' ');
          return (<div key={v.a}>{head}
            <div className="stn" data-n={nn(v.a)} style={{ '--sec': v.color }} onClick={() => open(v.a)}>
              <div className="row" style={{ gap: 6 }}><span className="a" dir="rtl">{word}</span>{!isAr() && v.ev?.anchor_en && <span className="en-gloss small">“{v.ev.anchor_en}”</span>}</div>
              {v.ev && <div className="small muted">{v.ev.icon}{'  '}{isAr() ? v.ev.hook_ar : rich(v.ev.hook)}</div>}
            </div>
          </div>);
        })}
      </div>
    </div>

    {E?.threads && <div className="card topline" style={{ '--sec': 'var(--teal)' }}>
      <h2>{t('Threads that tie the sūrah together', 'خيوطٌ تربط السورة')}</h2>
      <div className="muted small" style={{ marginBottom: 4 }}>{ts('Words that come back. Each return is a cue for where you are.', 'كلماتٌ تعود. وكل عودةٍ علامةٌ على موضعك من السورة.')}</div>
      {E.threads.map((th, i) => { const c = COLS[i % COLS.length]; return (
        <div key={i} className="thread" style={{ '--tcol': c }}>
          <div className="row"><b className="small" style={{ color: c }}>{isAr() ? richAr(th.label_ar) : rich(th.label)}</b><span className="spacer" />
            {th.verses.map((a) => <span key={a} className="pill" style={{ '--pc': c, marginInlineStart: 4 }}>{ts('v' + a, 'آية ' + toAr(a))}</span>)}</div>
          <div className="small muted">{isAr() ? richAr(th.text_ar) : rich(th.text)}</div>
        </div>); })}
    </div>}
  </>);
}

/* ---------- the page map: an open muṣḥaf, three ways of looking at it ---------- */
function PageMap({ s, pages, open }) {
  const [mode, setMode] = useState('text');
  const [focus, setFocus] = useState(0);
  const [at, setAt] = useState(0);
  // the book opens right-to-left: odd pages sit on the right, even on the left
  const spreads = useMemo(() => {
    const out = []; let i = 0;
    while (i < pages.length) {
      const p = pages[i];
      if (p % 2 === 1 && pages[i + 1] === p + 1) { out.push([p, p + 1]); i += 2; } else { out.push([p]); i += 1; }
    }
    return out;
  }, [pages]);
  return (
    <div className="card topline" style={{ '--sec': 'var(--amber)', '--accent': 'var(--amber)' }}>
      <div className="row"><h2>{t('The muṣḥaf page', 'صفحة المصحف')}</h2><span className="spacer" />
        <Seg value={mode} onChange={(m) => { setMode(m); setFocus(0); }} options={[['text', ts('Page', 'الصفحة')], ['shape', ts('Shape', 'الشكل')], ['find', ts('Find the verse', 'أين الآية؟')]]} />
      </div>
      <div className="muted small" style={{ margin: '4px 0 12px' }}>
        {mode === 'text' && t('Each verse in its own colour, where it sits on the Madinah muṣḥaf page. Tap a verse to see it; tap again to open it.', 'كل آية بلونها، في موضعها من صفحة مصحف المدينة. اضغط آية لتمييزها، ثم اضغط مرة أخرى لفتحها.')}
        {mode === 'shape' && ts('The page with the words turned into shapes. Recite the sūrah while your eye walks the shapes — the memory of where a verse sits on the page is a strong cue.', 'الصفحة وقد صارت كلماتها أشكالًا. اقرأ السورة وعينك تمشي على الأشكال؛ فتذكّر موضع الآية من الصفحة مفتاحٌ قويّ للحفظ.')}
        {mode === 'find' && ts('A verse is named; tap where it sits on the blank page.', 'تُذكر آية، فاضغط على موضعها في الصفحة الفارغة.')}
      </div>
      {spreads.length > 1 && <SpreadNav spreads={spreads} at={at} setAt={(i) => { setAt(i); setFocus(0); }} />}
      {mode === 'find' ? <FindVerse key={at} s={s} spreads={[spreads[at]]} /> : (<>
        {[spreads[at]].map((sp) => (
          <div key={sp[0]} className={'mspread' + (sp.length === 2 ? ' two' : '')}>
            {sp.map((p) => <MushafPage key={p} s={s} page={p} mode={mode} focus={focus}
              onPick={(a) => { if (focus === a) open(a); else setFocus(a); }} />)}
          </div>))}
        {focus > 0 && <FocusBar s={s} a={focus} open={open} />}
      </>)}
      {pages.length > 1 && pages.length <= 6 && <div className="note"><b>{ts('Page turns  ', 'انتقال الصفحات  ')}</b>
        {pages.slice(1).map((p) => { const a = s.v.find((v) => v.p === p).a; return ts(`verse ${a} opens page ${p}`, `الآية ${toAr(a)} تبدأ الصفحة ${toAr(p)}`); }).join(' · ')}
        {ts('. Page turns are natural break points for a day\'s portion.', '. وانتقال الصفحة موضعٌ طبيعي لختم ورد اليوم.')}</div>}
    </div>
  );
}

function SpreadNav({ spreads, at, setAt }) {
  const sp = spreads[at]; const lbl = sp.length === 2 ? `${sp[0]}–${sp[1]}` : `${sp[0]}`;
  const lblAr = sp.length === 2 ? `${toAr(sp[0])}–${toAr(sp[1])}` : toAr(sp[0]);
  return (
    <div className="mnav">
      <button className="btn sm" disabled={at === 0} onClick={() => setAt(at - 1)}>{isAr() ? '→' : '←'}</button>
      <div className="mnavmid">
        <b>{ts(`Page ${lbl}`, `الصفحة ${lblAr}`)}</b>
        <input type="range" min="0" max={spreads.length - 1} value={at} onChange={(e) => setAt(+e.target.value)} dir={isAr() ? 'rtl' : 'ltr'} />
        <span className="tiny faint">{ts(`${at + 1} of ${spreads.length} spreads`, `${toAr(at + 1)} من ${toAr(spreads.length)}`)}</span>
      </div>
      <button className="btn sm" disabled={at === spreads.length - 1} onClick={() => setAt(at + 1)}>{isAr() ? '←' : '→'}</button>
    </div>
  );
}

function FocusBar({ s, a, open }) {
  const v = s.v[a - 1];
  return (
    <div className="mfocus" style={{ '--sec': v.color }}>
      <span className="sectag">{ts(`Verse ${a}`, `الآية ${toAr(a)}`)}</span>
      <span className="small muted">{ts(`page ${v.p} · ${v.ls === v.le ? 'line ' + v.ls : 'lines ' + v.ls + '–' + v.le}`, `الصفحة ${toAr(v.p)} · ${v.ls === v.le ? 'السطر ' + toAr(v.ls) : 'الأسطر ' + toAr(v.ls) + '–' + toAr(v.le)}`)}</span>
      <span className="spacer" />
      <button className="btn sm primary" onClick={() => open(a)}>{ts('Open in Learn', 'افتحها في الحفظ')}</button>
    </div>
  );
}

function FindVerse({ s, spreads }) {
  const pick = () => s.v[Math.floor(Math.random() * s.v.length)].a;
  const [target, setTarget] = useState(pick); const [found, setFound] = useState(() => new Set());
  const [miss, setMiss] = useState(0); const [score, setScore] = useState({ ok: 0, all: 0 }); const [answered, setAnswered] = useState(null);
  const v = s.v[target - 1];
  const next = () => { let n = pick(); if (s.v.length > 1) while (n === target) n = pick(); setTarget(n); setAnswered(null); setMiss(0); };
  const tap = (a) => {
    if (answered) return;
    if (a === target) { setFound((f) => new Set(f).add(a)); setAnswered('ok'); setScore((x) => ({ ok: x.ok + (miss ? 0 : 1), all: x.all + 1 })); logActivity(); }
    else if (miss >= 1) { setFound((f) => new Set(f).add(target)); setAnswered('shown'); setScore((x) => ({ ok: x.ok, all: x.all + 1 })); }
    else setMiss(1);
  };
  return (<>
    <div className="mprompt" style={{ '--sec': v.color }}>
      <div className="row"><b>{ts(`Where is verse ${target}?`, `أين الآية ${toAr(target)}؟`)}</b><span className="spacer" /><span className="tiny faint">{ts(`${score.ok}/${score.all} first try`, `${toAr(score.ok)}/${toAr(score.all)} من أول محاولة`)}</span></div>
      <div className="ayah" style={{ fontSize: 'calc(var(--ar-size)*.75)', lineHeight: 1.8 }}>{v.w.slice(0, 3).join(' ')} …</div>
      {miss > 0 && !answered && <div className="tiny" style={{ color: 'var(--red)' }}>{ts('Not there — one more try.', 'ليست هنا — حاول مرة أخرى.')}</div>}
      {answered && <div className="row"><b className="small" style={{ color: answered === 'ok' ? 'var(--green)' : 'var(--amber)' }}>{answered === 'ok' ? ts('Found it.', 'أحسنت.') : ts('Here it is.', 'هذا موضعها.')}</b><span className="spacer" />
        <button className="btn sm" onClick={() => setFound(new Set())}>{ts('Clear page', 'امسح الصفحة')}</button>
        <button className="btn sm primary" onClick={next}>{ts('Next', 'التالي')}</button></div>}
    </div>
    {spreads.map((sp) => (
      <div key={sp[0]} className={'mspread' + (sp.length === 2 ? ' two' : '')}>
        {sp.map((p) => <MushafPage key={p} s={s} page={p} mode="blank" reveal={found} focus={answered ? target : 0} onPick={tap} />)}
      </div>))}
  </>);
}
