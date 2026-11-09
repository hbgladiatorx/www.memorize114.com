import { useNavigate } from 'react-router-dom';
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
    <div className="card topline" style={{ '--sec': 'var(--amber)' }}>
      <h2>{ts('Where each verse sits on the page', 'موضع كل آية في الصفحة')}</h2>
      <div className="muted small" style={{ marginBottom: 12 }}>{t('Madinah muṣḥaf layout, 15 lines a page. Picture the page while you recite; tap a block to open the verse. Within a shared line the split is approximate.', 'على ترتيب مصحف المدينة، خمسة عشر سطرًا في الصفحة. تخيّل الصفحة وأنت تقرأ، واضغط على أي آية لفتحها. التقسيم داخل السطر المشترك تقريبي.')}</div>
      <div className="pages">
        {pages.map((p) => {
          const vs = s.v.filter((v) => v.p === p); const first = vs[0];
          return (<div className="page" key={p}>
            {Array.from({ length: 15 }, (_, k) => {
              const L = k + 1; const on = vs.filter((v) => v.ls <= L && v.le >= L);
              const hdrLines = s.n === 1 || s.n === 9 ? 1 : 2;
              return (<div className="pl" key={L}>
                {on.length ? on.map((v) => <div key={v.a} className="seg2" style={{ background: v.color }} onClick={() => open(v.a)}>{toAr(v.a)}</div>)
                  : first.a === 1 && L < first.ls && L >= first.ls - hdrLines ? <div className="seg2 hdr">{L === first.ls - 1 && hdrLines === 2 ? 'بسم الله' : s.ar}</div>
                  : <div className="seg2 other" />}
              </div>);
            })}
            <div className="pno">{ts(`page ${p} · juzʾ ${first.j}`, `الصفحة ${toAr(p)} · الجزء ${toAr(first.j)}`)}</div>
          </div>);
        })}
      </div>
      {pages.length > 1 && <div className="note"><b>{ts('Page turns  ', 'انتقال الصفحات  ')}</b>
        {pages.slice(1).map((p) => { const a = s.v.find((v) => v.p === p).a; return ts(`verse ${a} opens page ${p}`, `الآية ${toAr(a)} تبدأ الصفحة ${toAr(p)}`); }).join(' · ')}
        {ts('. Page turns are natural break points for a day\'s portion.', '. وانتقال الصفحة موضعٌ طبيعي لختم ورد اليوم.')}</div>}
    </div>

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
