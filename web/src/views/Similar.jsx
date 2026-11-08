import { toAr } from '../lib/arabic.js';
import { cur, set } from '../lib/cur.js';
import { t, ts, isAr, rich, richAr, refTxt } from '../lib/i18n.jsx';
import { Verse, otherVerse, VerseChips, TrLine } from '../components/quran.jsx';
import { diffSets } from './Test.jsx';

export default function Similar() {
  const s = cur.surah; const v = s.v[cur.verse - 1];
  return (<>
    <VerseChips active={cur.verse} onPick={(a) => set({ verse: a })} />
    <div className="card topline" style={{ '--sec': 'var(--rose)' }}>
      <div className="row">
        <h2>{ts(`Verse ${v.a} and its look-alikes`, `الآية ${toAr(v.a)} ومتشابهاتها`)}</h2><span className="spacer" />
        <div className="legend"><span className="ls">{ts('shared', 'مشترك')}</span><span className="ld">{ts('different', 'مختلف')}</span></div>
      </div>
      <div className="ayah" style={{ fontSize: 'calc(var(--ar-size)*.85)' }}><Verse v={v} /></div>
      <TrLine sn={s.n} a={v.a} color={v.color} />
      {v.ev?.watch && <div className="note"><b>{ts('How to keep them apart  ', 'كيف تميّز بينها  ')}</b>{isAr() ? richAr(v.ev.watch_ar) : rich(v.ev.watch)}</div>}
      {!v.sim.length ? <div className="empty small">{ts('No verse elsewhere shares a run of four or more words with this one.', 'لا توجد آية أخرى تشترك معها في أربع كلمات متتالية أو أكثر.')}</div>
        : v.sim.map((o) => {
          const [A, B] = diffSets(o.b, v.w.length, o.w.length);
          const shared = o.b.reduce((x, b) => x + b[2], 0);
          return (<div className="simbox" key={o.s + ':' + o.a}>
            <div className="row"><span className="ref">{refTxt(o.s, o.a)}</span><span className="spacer" /><span className="pill" style={{ '--pc': 'var(--rose)' }}>{ts(`${shared} shared words`, `كلمات مشتركة: ${toAr(shared)}`)}</span></div>
            <div className="ayah"><Verse v={otherVerse(o)} diff={B} noNum /></div>
            <TrLine sn={o.s} a={o.a} />
            <details><summary className="tiny" style={{ cursor: 'pointer', color: 'var(--rose)', fontWeight: 700 }}>{ts(`▸ Show ${refTxt(s.n, v.a)} with its differences`, `◂ اعرض ${refTxt(s.n, v.a)} مع مواضع الاختلاف`)}</summary>
              <div className="ayah"><Verse v={v} diff={A} noNum /></div></details>
          </div>);
        })}
      <div className="tiny faint" style={{ marginTop: 10 }}>{t('Found by comparing every verse of the Qurʾān word by word (consonantal skeleton, vowel marks ignored). Ranked by how much they share.', 'استُخرجت بمقارنة كل آيات القرآن كلمةً كلمة (بالرسم دون الحركات)، ورُتِّبت بحسب مقدار الاشتراك.')}</div>
    </div>
  </>);
}
