import { Link, useNavigate } from 'react-router-dom';
import { toAr } from '../lib/arabic.js';
import { S, prog } from '../lib/store.js';
import { cur, set, openSurah } from '../lib/cur.js';
import { D } from '../lib/data.js';
import { retr, DAY } from '../lib/fsrs.js';
import { t, ts, nn, isAr } from '../lib/i18n.jsx';

const dayKey = (ms) => new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

export function queue(s) {
  const P = prog(s.n); const now = Date.now(); const d = dayKey(now);
  const learnedToday = Object.values(P.cards).filter((c) => dayKey(c.learnedAt) === d).length;
  const q = { new: [], sabqi: [], manzil: [] };
  s.v.forEach((v) => {
    const c = P.cards[v.a];
    if (!c) { if (q.new.length < Math.max(0, S.settings.newPerDay - learnedToday)) q.new.push(v); return; }
    if (now - c.learnedAt < 7 * DAY && c.last < now - 0.5 * DAY) q.sabqi.push(v);
    else if (c.due <= now) q.manzil.push(v);
  });
  return q;
}

export default function Today({ classes }) {
  const s = cur.surah; const P = prog(s.n); const now = Date.now(); const nav = useNavigate();
  const learned = s.v.filter((v) => P.cards[v.a]).length;
  const strong = s.v.filter((v) => retr(P.cards[v.a], now) >= 0.9 && P.cards[v.a].S >= 21).length;
  const q = queue(s);
  let streak = 0; for (let dt = Date.now(); S.settings.days[dayKey(dt)]; dt -= DAY) streak++;
  const p0 = s.v[0].p, p1 = s.v[s.v.length - 1].p;
  const openVerse = (a, step) => { set({ verse: a, mode: 'verse', learnStep: step }); nav('/learn'); };
  const revise = (vs) => { set({ session: vs }); nav('/test'); };
  const total = q.new.length + q.sabqi.length + q.manzil.length;
  const rev = [...q.sabqi, ...q.manzil].sort((a, b) => a.a - b.a);
  const weak = []; s.v.forEach((v) => (P.miss[v.a] || []).forEach((c, i) => { if (c) weak.push([c, v, i]); })); weak.sort((a, b) => b[0] - a[0]);
  const assigned = (classes || []).flatMap((c) => (c.surahs || []).map((n) => ({ n, cls: c.name }))).filter((x, i, arr) => arr.findIndex((y) => y.n === x.n) === i);

  return (<>
    {S.user === null && <div className="card banner" style={{ '--sec': 'var(--violet)' }}>
      <b>{ts('Save your progress across devices', 'احفظ تقدّمك على كل أجهزتك')}</b>
      <div className="small muted">{ts('Create a free account to keep your memorisation on your phone and computer, and to join a teacher\'s class.', 'أنشئ حسابًا مجانيًا ليبقى حفظك على هاتفك وحاسوبك، ولتنضمّ إلى صفّ معلّمك.')}</div>
      <div className="row" style={{ marginTop: 8 }}><Link className="btn primary" style={{ '--accent': 'var(--violet)' }} to="/register">{ts('Create account', 'إنشاء حساب')}</Link><Link className="btn" to="/login">{ts('Sign in', 'تسجيل الدخول')}</Link></div>
    </div>}

    {assigned.length > 0 && <div className="card topline" style={{ '--sec': 'var(--blue)' }}>
      <h2>{ts('Assigned by your teacher', 'ما كلّفك به معلّمك')}</h2>
      <div className="row" style={{ marginTop: 6 }}>{assigned.map(({ n, cls }) => (
        <button key={n} className={'btn sm' + (n === s.n ? ' primary' : '')} style={{ '--accent': 'var(--blue)' }} onClick={() => openSurah(n)}>
          <span className="ar-inline">{D.index[n - 1].ar}</span>{!isAr() && ' · ' + D.index[n - 1].en}<span className="tiny faint">{' · ' + cls}</span>
        </button>))}</div>
    </div>}

    <div className="card topline tint" style={{ '--sec': 'var(--teal)' }}>
      <div className="row">
        <div>
          <h2>{t('Sūrat ', 'سورة ')}<span>{isAr() ? s.ar : s.en}</span></h2>
          <div className="muted small">{t(`${s.v.length} verses · page ${p0}${p1 !== p0 ? '–' + p1 : ''} · juzʾ ${s.v[0].j}`, `آياتها ${toAr(s.v.length)} · الصفحة ${toAr(p0)}${p1 !== p0 ? '–' + toAr(p1) : ''} · الجزء ${toAr(s.v[0].j)}`)}</div>
        </div>
        <span className="spacer" /><div className="big-ar">{s.ar}</div>
      </div>
      <div className="hr" />
      <div className="statgrid">
        <div className="stat" style={{ '--c': 'var(--green)' }}><b>{nn(learned)}/{nn(s.v.length)}</b><span>{ts('verses started', 'آيات بدأتَ حفظها')}</span></div>
        <div className="stat" style={{ '--c': 'var(--blue)' }}><b>{nn(strong)}</b><span>{ts('held 3+ weeks', 'ثابتة ٣ أسابيع فأكثر')}</span></div>
        <div className="stat" style={{ '--c': 'var(--amber)' }}><b>{nn(streak)}</b><span>{ts('day streak', 'أيام متتالية')}</span></div>
      </div>
      <div className="tiny faint" style={{ margin: '12px 0 6px' }}>{ts('Memory strength now, verse by verse — tap one to open it', 'قوّة الحفظ الآن آيةً آية — اضغط لفتحها')}</div>
      <div className="heat">{s.v.map((v) => { const c = P.cards[v.a]; const r = retr(c, now); return (
        <i key={v.a} style={{ background: c ? `color-mix(in srgb, ${v.color} ${Math.round(25 + r * 75)}%, var(--paper))` : `color-mix(in srgb, ${v.color} 12%, var(--paper))`, color: r > 0.6 ? '#fff' : v.color }}
          title={c ? `${Math.round(r * 100)}%` : ''} onClick={() => openVerse(v.a, c ? 'recall' : 'read')}>{toAr(v.a)}</i>); })}</div>
    </div>

    <div className="card topline" style={{ '--sec': 'var(--green)' }}>
      <div className="row"><h2>{ts("Today's portion", 'وِرد اليوم')}</h2><span className="spacer" />{total > 0 && <span className="pill" style={{ '--pc': 'var(--green)' }}>{ts(`${total} item${total > 1 ? 's' : ''}`, `العناصر: ${toAr(total)}`)}</span>}</div>
      <div className="muted small" style={{ marginBottom: 10 }}>{isAr()
        ? <>النظام الثلاثي لحلقات التحفيظ، تجدوله خوارزمية للذاكرة: <b style={{ color: 'var(--green)' }}>الجديد</b> (السَّبَق)، و<b style={{ color: 'var(--gold)' }}>القريب</b> (السَّبْقي — كل ما حُفظ في الأسبوع الأخير، يوميًا)، و<b style={{ color: 'var(--blue)' }}>المراجعة المستحقّة</b> (المنزل — المحفوظ القديم، قُبيل أن يُنسى).</>
        : <>{t('The three-part daily routine of the ḥifẓ circles, scheduled by a memory model: ')}<b style={{ color: 'var(--green)' }}>new</b>{t(' (sabaq), ')}<b style={{ color: 'var(--gold)' }}>recent</b>{t(' (sabqī — anything learned in the last week, every day), and ')}<b style={{ color: 'var(--blue)' }}>due revision</b>{t(' (manzil — older verses, just before you would forget them).')}</>}</div>
      {total === 0 && <div className="empty small">{learned === s.v.length ? ts('Nothing due. Every verse is above the forgetting line — come back tomorrow, or test yourself anyway.', 'لا شيء مستحق. كل الآيات فوق خطّ النسيان — عُد غدًا، أو اختبر نفسك على كل حال.') : ts('Today\'s new verses are done. Rest is part of the method: sleep consolidates what you learned.', 'أتممتَ جديد اليوم. والراحة جزءٌ من المنهج؛ فالنوم يُثبِّت ما حفظت.')}</div>}
      <div className="qlist">
        {q.new.map((v) => <QItem key={'n' + v.a} kc="var(--green)" lab={ts('NEW', 'جديد')} v={v} onClick={() => openVerse(v.a, 'read')} />)}
        {q.sabqi.map((v) => <QItem key={'s' + v.a} kc="var(--gold)" lab={ts('RECENT', 'قريب')} v={v} onClick={() => revise([v])} />)}
        {q.manzil.map((v) => <QItem key={'m' + v.a} kc="var(--blue)" lab={ts('DUE', 'مستحق')} v={v} onClick={() => revise([v])} />)}
      </div>
      {rev.length > 0 && <div className="row" style={{ marginTop: 12 }}><button className="btn primary" onClick={() => revise(rev)}>{ts(`Revise all ${rev.length} in order`, `راجِع الكل بالترتيب (${toAr(rev.length)})`)}</button></div>}
      {q.new.length > 0 && <div className="tiny faint" style={{ marginTop: 8 }}>{ts('New verses go through the five-step ladder on the Learn tab: listen & read → build up phrase by phrase → fade → recall → link.', 'الآيات الجديدة تمرّ بالمراحل الخمس في تبويب الحفظ: استمع واقرأ ← البناء التدريجي ← الإخفاء التدريجي ← الاستذكار ← الربط.')}</div>}
    </div>

    {weak.length > 0 && <div className="card topline" style={{ '--sec': 'var(--red)' }}>
      <h2>{ts('Words that keep slipping', 'كلماتٌ تتفلّت')}</h2>
      <div className="row" style={{ direction: 'rtl', gap: 6, marginTop: 6 }}>{weak.slice(0, 12).map(([c, v, i]) => (
        <button key={v.a + '-' + i} className="tile" style={{ fontSize: 22, '--sec': c >= 2 ? 'var(--red)' : v.color }} onClick={() => openVerse(v.a, 'read')}>{v.w[i]}<sub className="tilesub">{' ' + toAr(v.a) + ' ×' + toAr(c)}</sub></button>))}</div>
    </div>}
    <MethodCard />
  </>);
}

function QItem({ kc, lab, v, onClick }) {
  return (<button className="qitem" style={{ '--kc': kc }} onClick={onClick}>
    <span className="k">{lab}</span><span className="small" style={{ fontWeight: 800, color: kc }}>{ts('v' + v.a, 'آية ' + toAr(v.a))}</span><span className="t">{v.w.slice(0, 5).join(' ')}</span>
  </button>);
}

function MethodCard() {
  const items = isAr() ? [
    ['var(--blue)', 'الاسترجاع. ', 'محاولة التذكّر ثم التحقّق تبني ذاكرةً أمتن بكثير من إعادة القراءة، وهي من أثبت نتائج أبحاث التعلّم. خطوة الاستذكار وكلّ الاختبارات قائمة عليها، مع تصحيحٍ فوري.'],
    ['var(--teal)', 'التكرار المتباعد. ', 'تُجدوَل المراجعات بخوارزمية FSRS-4.5 المستخدمة اليوم في Anki، بحيث تبقى الآية في حفظك بنسبة ٩٠٪ يوم عودتها.'],
    ['var(--gold)', 'السَّبَق والسَّبْقي والمنزل. ', 'النظام التقليدي لحلقات التحفيظ — الدرس الجديد، ثم محفوظ الأسبوع يوميًا، ثم المراجعة القديمة — هو شكل يومك.'],
    ['var(--green)', 'التقطيع والبناء التراكمي. ', 'تُقسَّم الآية عند علامات الوقف في المصحف إلى مقاطع، وتُحفظ بإضافة مقطعٍ إلى ما قبله.'],
    ['var(--violet)', 'الإخفاء التدريجي وأوائل الحروف. ', 'تختفي الكلمات على مراحل حتى لا يبقى منها إلا أوائل حروفها، ثم لا شيء.'],
    ['var(--amber)', 'مصحفٌ واحد ثابت. ', 'النصّ والصفحات والأسطر على مصحف المدينة، لتبقى صورة الصفحة في ذهنك ثابتة.'],
    ['var(--rose)', 'المتشابهات. ', 'من أكثر أسباب الخطأ؛ يكشفها التطبيق آليًا في القرآن كلّه ويدرّبك على التمييز بينها.'],
    ['var(--teal)', 'المعنى والصورة. ', 'معنى إجمالي وكلمةٌ مفتاحية وصورةٌ لكل آية، تفتح للآية طريقًا ثانيًا إلى الذاكرة.']] : [
    ['var(--blue)', 'Retrieval practice. ', 'Trying to recall, then checking, builds far more durable memory than re-reading — one of the most robust findings in learning research. The Recall step and every test are built on it, with immediate feedback.'],
    ['var(--teal)', 'Spaced repetition. ', 'Reviews are scheduled with FSRS-4.5, the open model now used in Anki, aiming for a 90% chance you still have each verse on the day it comes back.'],
    ['var(--gold)', 'Sabaq · sabqī · manzil. ', 'The traditional ḥifẓ routine — new portion, last week\'s portions daily, then older revision — is kept as the shape of the day.'],
    ['var(--green)', 'Chunking & cumulative build-up. ', 'Verses are split at the muṣḥaf\'s pause marks into phrases and learned by adding one phrase at a time to what you already hold.'],
    ['var(--violet)', 'Vanishing cues & first letters. ', 'Words fade in nested steps down to their first letters, then to nothing.'],
    ['var(--amber)', 'One fixed muṣḥaf. ', 'Text, pages and lines follow the Madinah muṣḥaf so your visual memory of the page stays consistent.'],
    ['var(--rose)', 'Mutashābihāt. ', 'Look-alike verses are a leading cause of slips; they are found automatically across the whole Qurʾān and drilled head to head.'],
    ['var(--teal)', 'Meaning & imagery. ', 'Ali Quli Qarai\'s translation, one anchor word and one picture per verse give each verse a second route into memory.']];
  return (<details className="card method topline" style={{ '--sec': 'var(--violet)' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, color: 'var(--violet)' }}>{ts('▸ The method behind this app', '◂ المنهج الذي يقوم عليه التطبيق')}</summary>
    <ul className="small muted" style={{ paddingInlineStart: 18, marginTop: 10 }}>{items.map(([c, b, x], i) => <li key={i}><b style={{ color: c }}>{t(b, b)}</b>{t(x, x)}</li>)}</ul>
    <div className="tiny faint">{t(`Text: ${D.src}. Translation: Ali Quli Qarai, via Tanzil.net. Recitation streamed from everyayah.com. A teacher hearing your recitation (talaqqī) remains irreplaceable for tajwīd; this app is for between lessons.`, 'النص: بيانات مصحف المدينة من مجمّع الملك فهد (الإصدار ١٨). الترجمة الإنجليزية: علي قلي قرائي عبر Tanzil.net. التلاوات من everyayah.com. ويبقى التلقّي على مُقرئٍ متقن لا غنى عنه لضبط التجويد؛ وهذا التطبيق لما بين الدروس.')}</div>
  </details>);
}
