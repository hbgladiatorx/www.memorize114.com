import { useState } from 'react';
import { toAr } from '../lib/arabic.js';
import { S, prog, persist, logActivity } from '../lib/store.js';
import { cur, set } from '../lib/cur.js';
import { t, ts, tq, nn, isAr, rich, richAr } from '../lib/i18n.jsx';
import { Verse, SurahHead, SectionTag, VerseChips, Meaning, AudioBar, SurahPlayer, ReciteCheck, fadeHidden } from '../components/quran.jsx';
import { Seg } from '../components/ui.jsx';

const STEPS = [
  ['read', 'Listen & read', 'استمع واقرأ', 'var(--teal)'],
  ['chunks', 'Build up', 'البناء التدريجي', 'var(--green)'],
  ['fade', 'Fade', 'الإخفاء التدريجي', 'var(--violet)'],
  ['recall', 'Recall', 'الاستذكار', 'var(--blue)'],
  ['link', 'Link', 'الربط', 'var(--amber)'],
];
const fadeLabels = () => (isAr() ? ['كاملة', 'إخفاء ¼', 'إخفاء ½', 'إخفاء ¾', 'أوائل الحروف', 'فارغة'] : ['Full', '¼ hidden', '½ hidden', '¾ hidden', 'Initials', 'Blank']);

export default function Learn() {
  const s = cur.surah;
  return (<>
    <div className="row" style={{ marginBottom: 8 }}>
      <Seg value={cur.mode} onChange={(m) => set({ mode: m })} options={[['verse', ts('One verse', 'آية واحدة')], ['surah', t('Whole sūrah', 'السورة كاملة')]]} />
    </div>
    {cur.mode === 'surah' ? <LearnSurah s={s} /> : <LearnVerse s={s} />}
  </>);
}

function LearnVerse({ s }) {
  const v = s.v[cur.verse - 1];
  const P = prog(s.n);
  const stepCol = STEPS.find((x) => x[0] === cur.learnStep)[3];
  return (<>
    <VerseChips active={cur.verse} onPick={(a) => set({ verse: a })} />
    <div className="stepper">
      {STEPS.map(([k, en, ar, c], i) => (
        <button key={k} className={cur.learnStep === k ? 'on' : ''} style={{ '--sc': c }} onClick={() => set({ learnStep: k })}><span className="n">{nn(i + 1)}</span>{ts(en, ar)}</button>
      ))}
    </div>
    <div className="card topline tint" style={{ '--sec': v.color, '--accent': stepCol }}>
      {cur.learnStep === 'read' && <ReadStep s={s} v={v} P={P} />}
      {cur.learnStep === 'chunks' && <ChunkStep key={v.a} v={v} />}
      {cur.learnStep === 'fade' && <FadeStep s={s} v={v} />}
      {cur.learnStep === 'recall' && (<>
        <div className="tiny faint" style={{ marginBottom: 6 }}>{ts('Retrieval with feedback: this is the step that writes the verse into long-term memory, and it schedules the next review.', 'الاسترجاع مع التصحيح: هذه الخطوة هي التي تُثبِّت الآية في الذاكرة طويلة المدى، ومنها يُحدَّد موعد المراجعة التالية.')}</div>
        <ReciteCheck verses={[v]} after={
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button className="btn primary" onClick={() => set({ learnStep: 'link' })}>{ts('Link to the previous verse', 'اربطها بالآية السابقة')}</button>
            {v.a < s.v.length && <button className="btn" onClick={() => set({ verse: v.a + 1, learnStep: 'read' })}>{ts('Next verse', 'الآية التالية')}</button>}
          </div>} />
      </>)}
      {cur.learnStep === 'link' && (v.a === 1 ? (
        <div className="empty small">{(s.kind === 'dua' ? tq('Passage 1 opens the duʿāʾ — link it to its name instead: say the name, then go straight into ', 'الفقرة الأولى هي مطلع الدعاء؛ فاربطها باسمه: اذكر اسمه ثم ادخل مباشرة في ') : t('Verse 1 has no previous verse in this sūrah — link it to the sūrah title and basmala instead: say them, then go straight into ', 'ليس قبل الآية الأولى آيةٌ في هذه السورة؛ فاربطها باسم السورة والبسملة: اقرأهما ثم ادخل مباشرة في '))}<span className="ar-inline">{v.w.slice(0, 3).join(' ')}</span>.</div>
      ) : (<>
        <div className="tiny faint" style={{ marginBottom: 6 }}>{ts('Junctions are where recitation breaks down. The end of the previous verse is shown faintly; recite on into this one.', 'مواضع الانتقال بين الآيات هي حيث يتعثّر الحافظ. نهاية الآية السابقة ظاهرة بلونٍ خافت؛ واصل القراءة إلى هذه الآية.')}</div>
        <ReciteCheck verses={[v]} limitFirstChunk noGrade contextBefore={(vv) => s.v[vv.a - 2]} />
      </>))}
    </div>
    <div className="row" style={{ marginTop: 14 }}>
      <button className="btn sm" disabled={v.a === 1} onClick={() => set({ verse: v.a - 1 })}>{ts('← Previous verse', '→ الآية السابقة')}</button>
      <span className="spacer" />
      <button className="btn sm" disabled={v.a === s.v.length} onClick={() => set({ verse: v.a + 1 })}>{ts('Next verse →', 'الآية التالية ←')}</button>
    </div>
  </>);
}

function ReadStep({ s, v, P }) {
  const n = P.reads[v.a] || 0, target = 10;
  return (<>
    <div className="row">
      <SectionTag v={v} /><span className="spacer" />
      <span className="tiny faint">{v.dua ? ts(`${v.a} of ${s.v.length}`, `${toAr(v.a)} من ${toAr(s.v.length)}`) : (v.sec ? ts(`Page ${v.p} · `, `الصفحة ${toAr(v.p)} · `) : '') + (v.ls === v.le ? ts(`line ${v.ls}`, `السطر ${toAr(v.ls)}`) : ts(`lines ${v.ls}–${v.le}`, `الأسطر ${toAr(v.ls)}–${toAr(v.le)}`))}</span>
    </div>
    {v.a === 1 && <SurahHead s={s} />}
    <div className="ayah"><Verse v={v} anchor weak={P.miss[v.a]} /></div>
    <Meaning s={s} v={v} />
    {v.ev && (
      <div className="hook">
        <div className="ic" style={{ '--sec': v.color }}>{v.ev.icon}</div>
        <div>
          <div className="lab">{ts('MEMORY ANCHOR · ', 'الكلمة المفتاح · ')}<span className="ar-inline" style={{ color: v.color }}>{v.w[v.ev.anchor]}</span>{!isAr() && v.ev.anchor_en && <span className="en-gloss" style={{ textTransform: 'none', letterSpacing: 0 }}> “{v.ev.anchor_en}”</span>}</div>
          {isAr() ? v.ev.hook_ar : rich(v.ev.hook)}
        </div>
      </div>
    )}
    <AudioBar v={v} />
    <div className="counter">
      <button className="bigtap" onClick={() => { P.reads[v.a] = (P.reads[v.a] || 0) + 1; persist(s.n); logActivity(); }}>{ts(`I read it aloud  ·  ${n}`, `قرأتُها بصوتٍ مسموع (${toAr(n)})`)}</button>
      <div>
        <div className="dots">{Array.from({ length: target }, (_, i) => <i key={i} className={i < n ? 'f' : ''} />)}</div>
        <div className="tiny faint" style={{ marginTop: 4 }}>{n >= target ? ts('Ready to build it up', 'جاهزة للبناء التدريجي') : ts(`Aim for ${target} attentive readings`, `اقرأها ${toAr(target)} مرّات بتركيز`)}</div>
      </div>
    </div>
    {P.miss[v.a]?.some((x) => x) && <div className="tiny faint" style={{ marginTop: 8 }}>{ts('Red underlines mark words you have missed in recall.', 'الخطوط الحمراء تحت الكلمات التي أخطأت فيها عند الاستذكار.')}</div>}
    {v.ev?.watch && <div className="note"><b>{ts('Watch-out  ', 'تنبيه  ')}</b>{isAr() ? richAr(v.ev.watch_ar) : rich(v.ev.watch)}</div>}
  </>);
}

function ChunkStep({ v }) {
  const [k, setK] = useState(0); const [hide, setHide] = useState(false);
  const C = v.chunks; const end = C[k + 1] || v.w.length;
  return (<>
    <div className="row">
      <b style={{ color: 'var(--green)' }}>{ts(`Phrase ${k + 1} of ${C.length}`, `المقطع ${toAr(k + 1)} من ${toAr(C.length)}`)}</b><span className="spacer" />
      <span className="tiny faint">{ts('Each round adds one phrase to everything before it', 'كل جولة تضيف مقطعًا إلى ما سبقه')}</span>
    </div>
    <div className="progressbar" style={{ margin: '8px 0' }}><i style={{ width: (end / v.w.length) * 100 + '%' }} /></div>
    <div className="ayah"><Verse v={v} hidden={(i) => i >= end || (hide && i < end)} blank noNum={end < v.w.length} peekable={hide} resetKey={`${k}-${hide}`} /></div>
    <div className="tiny faint" style={{ margin: '4px 0 10px' }}>{hide ? ts('Recite the visible span from memory. Tap any gap to peek at it.', 'اقرأ هذا الجزء من حفظك. اضغط على أي فراغ لتلقي نظرة.') : ts('Read this span aloud three times, eyes on the words. Then hide it.', 'اقرأ هذا الجزء ثلاث مرّات بصوتٍ مسموع وعينك على الكلمات، ثم أخفِه.')}</div>
    <div className="row">
      {!hide ? <button className="btn primary" onClick={() => setHide(true)}>{ts('Hide & recite', 'أخفِ واقرأ')}</button> : <button className="btn" onClick={() => setHide(false)}>{ts('Show again', 'أظهِر مجددًا')}</button>}
      {hide && k + 1 < C.length && <button className="btn primary" onClick={() => { setK(k + 1); setHide(false); logActivity(); }}>{ts('Got it — add next phrase', 'حفظتُه — أضِف المقطع التالي')}</button>}
      {hide && k + 1 >= C.length && <button className="btn primary" onClick={() => { logActivity(); set({ learnStep: 'fade', fade: 2 }); }}>{ts('Whole verse done — go to Fade', 'اكتملت الآية — إلى الإخفاء التدريجي')}</button>}
      {k > 0 && <button className="btn ghost" onClick={() => { setK(0); setHide(false); }}>{ts('Restart', 'من البداية')}</button>}
    </div>
  </>);
}

function FadeStep({ s, v }) {
  const f = cur.fade;
  return (<>
    <div style={{ marginBottom: 8 }}><Seg value={f} onChange={(x) => set({ fade: x })} options={fadeLabels().map((l, i) => [i, l])} /></div>
    <div className="ayah"><Verse v={v} hidden={fadeHidden(v, f === 5 ? 4 : f, s.n)} blank={f === 5} peekable resetKey={f} /></div>
    <div className="tiny faint" style={{ margin: '6px 0 10px' }}>{ts('Vanishing cues: recite the whole verse at each level, then step up. Tap a gap to peek — a peek means stay on this level one more round.', 'الإخفاء التدريجي: اقرأ الآية كاملة في كل مستوى ثم انتقل لما بعده. اضغط على فراغ لتلقي نظرة — ومن نظر فليُعِد المستوى نفسه جولةً أخرى.')}</div>
    <div className="row">
      <button className="btn" disabled={f === 0} onClick={() => set({ fade: f - 1 })}>{ts('Easier', 'أسهل')}</button>
      {f < 5 ? <button className="btn primary" onClick={() => { logActivity(); set({ fade: f + 1 }); }}>{ts('Recited it — fade more', 'قرأتُها — أخفِ أكثر')}</button>
        : <button className="btn primary" onClick={() => set({ learnStep: 'recall' })}>{ts('Go to Recall', 'إلى الاستذكار')}</button>}
    </div>
  </>);
}

function LearnSurah({ s }) {
  const f = cur.fade; const [playing, setPlaying] = useState(0);
  const labels = isAr() ? ['كاملة', '¼', '½', '¾', 'أوائل الحروف', 'فارغة'] : ['Full', '¼', '½', '¾', 'Initials', 'Blank'];
  const P = prog(s.n);
  let page = null;
  return (<>
    <div className="card topline" style={{ '--accent': 'var(--violet)' }}>
      <div className="row" style={{ marginBottom: 6 }}><Seg value={f} onChange={(x) => set({ fade: x })} options={labels.map((l, i) => [i, l])} /></div>
      <div className="tiny faint">{t('Recite the whole sūrah at each level. Tap a verse number to open it on its own; tap a gap to peek.', 'اقرأ السورة كاملة في كل مستوى. اضغط على رقم الآية لفتحها وحدها، وعلى الفراغ لتلقي نظرة.')}</div>
    </div>
    <div className="card">
      <SurahPlayer s={s} onVerse={(a) => { setPlaying(a); if (a) document.querySelector(`.v[data-a="${a}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }} />
      <SurahHead s={s} />
      <div className="ayah">
        {s.v.map((v) => {
          const mark = v.dua ? v.sec?.id : v.p;
          const brk = v.dua ? mark !== page : page !== null && mark !== page; page = mark;
          return (<span key={v.a}>
            {brk && (v.dua
              ? <div className="pagebreak secbreak" style={{ '--sec': v.color }}>{isAr() ? v.sec.ar : v.sec.title}</div>
              : <div className="pagebreak">{ts(`page ${v.p}`, `الصفحة ${toAr(v.p)}`)}</div>)}
            <span className={playing === v.a ? 'playing' : ''}>
              <Verse v={v} hidden={fadeHidden(v, f === 5 ? 4 : f, s.n)} blank={f === 5} weak={f === 0 ? P.miss[v.a] : null} peekable resetKey={f} onNum={(a) => set({ mode: 'verse', verse: a, learnStep: 'read' })} />
            </span>
            {v.dua && f === 0 && !isAr() && (S.settings.showTl || S.settings.showTr) && <div className="tlblock" dir="ltr" style={{ '--sec': v.color }}>
              {S.settings.showTl && v.tl && <div className="tl">{v.tl.join(' ')}</div>}
              {S.settings.showTr && s.tr?.v?.[v.a] && <div className="small muted">{s.tr.v[v.a]}</div>}
            </div>}
          </span>);
        })}
      </div>
    </div>
  </>);
}
