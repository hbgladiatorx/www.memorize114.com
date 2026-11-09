import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { S, useStore, persist, loadUser, resetSurah } from './lib/store.js';
import { cur, openSurah } from './lib/cur.js';
import { D, loadIndex, GUIDED, isDua } from './lib/data.js';
import { api } from './lib/api.js';
import { RECITERS, stopAudio } from './lib/audio.js';
import { toAr } from './lib/arabic.js';
import { t, ts, tq, tsq, nn, isAr, resetGloss } from './lib/i18n.jsx';
import { Icon, Toast, Sheet, Seg, toast } from './components/ui.jsx';
import Today from './views/Today.jsx';
import Learn from './views/Learn.jsx';
import Test from './views/Test.jsx';
import Similar from './views/Similar.jsx';
import MapView from './views/MapView.jsx';
import { Login, Register, Forgot, Reset, Verify } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import { Classes, ClassDetail, JoinLink } from './pages/Classes.jsx';
import Admin from './pages/Admin.jsx';

const TABS = [
  ['/', 'today', 'Today', 'اليوم', 'var(--teal)', 'var(--teal-soft)'],
  ['/learn', 'learn', 'Learn', 'الحفظ', 'var(--green)', 'var(--green-soft)'],
  ['/test', 'test', 'Test', 'الاختبار', 'var(--blue)', 'var(--blue-soft)'],
  ['/similar', 'similar', 'Similar', 'المتشابهات', 'var(--rose)', 'var(--rose-soft)'],
  ['/map', 'map', 'Map', 'الخريطة', 'var(--amber)', 'var(--amber-soft)'],
];

export default function App() {
  useStore();
  const loc = useLocation();
  const [ready, setReady] = useState(false); const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    (async () => {
      try { await loadIndex(); await openSurah(S.settings.surah || 62); setReady(true); } catch { setFailed(true); }
      loadUser();
    })();
  }, []);
  const refreshClasses = () => { if (S.user) api('/classes').then((r) => setClasses(r.joined)).catch(() => {}); else setClasses([]); };
  useEffect(() => {
    refreshClasses();
    const pending = sessionStorage.getItem('m114.join');
    if (S.user && pending) {
      sessionStorage.removeItem('m114.join');
      api('/classes/join', { method: 'POST', body: { code: pending } }).then((r) => { toast(ts(`Joined ${r.class.name}`, `انضممت إلى ${r.class.name}`)); refreshClasses(); }).catch(() => {});
    }
  }, [S.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ar = isAr();
    document.documentElement.lang = ar ? 'ar' : 'en'; document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.documentElement.style.setProperty('--ar-size', S.settings.size + 'px');
    document.title = ar ? 'حِفظ — حفظ القرآن الكريم · memorize114' : 'Memorize 114 — Qurʾān memorisation';
  });
  useEffect(() => { stopAudio(); window.scrollTo(0, 0); }, [loc.pathname]);

  const tab = TABS.find(([p]) => p === loc.pathname) || TABS[0];
  useEffect(() => { document.documentElement.style.setProperty('--accent', tab[4]); }, [tab]);
  resetGloss();

  if (failed) return <div className="empty">{ts('The Qurʾān text could not be loaded. Reload the page to try again.', 'تعذّر تحميل نص القرآن. أعِد تحميل الصفحة.')}</div>;
  if (!ready || !cur.surah) return <div className="empty" style={{ paddingTop: 80 }}>{ts('Loading the muṣḥaf…', 'جارٍ تحميل المصحف…')}</div>;
  const s = cur.surah;
  // Study tabs speak of passages while a duʿāʾ is open; account and class pages keep their own wording.
  D.mode = s.kind === 'dua' && ['/', '/learn', '/test', '/similar', '/map'].includes(loc.pathname) ? 'dua' : 'quran';
  return (<>
    <div className="app">
      <header className="top">
        <Link to="/" className="brand">{isAr() ? 'حِفظ' : 'Memorize 114 '}{!isAr() && <span className="ar-inline" dir="rtl">حِفْظُ الْقُرْآن</span>}
          <small>{S.user ? (S.sync === 'synced' ? ts('✓ Saved to your account', '✓ محفوظ في حسابك') : S.sync === 'offline' ? ts('Offline — will sync', 'غير متصل — ستتم المزامنة') : ts('Syncing…', 'جارٍ المزامنة…')) : ts('Qurʾān memorisation', 'حفظ القرآن الكريم')}</small></Link>
        <button className={'surah-btn' + (isDua(s.n) ? ' isdua' : '')} onClick={() => setSheet('surah')} aria-label="Choose sūrah or duʿāʾ"><span className="tiny">{isDua(s.n) ? tsq('duʿāʾ', 'دعاء') : nn(s.n)}</span><span className="ar">{s.ar}</span></button>
        <button className="icon-btn langbtn" onClick={() => { S.settings.lang = isAr() ? 'en' : 'ar'; persist('settings'); }} title={isAr() ? 'English' : 'العربية'}>{isAr() ? 'EN' : 'ع'}</button>
        <Link className={'icon-btn' + (S.user ? ' signed' : '')} to={S.user ? '/account' : '/login'} title={S.user ? S.user.name : ts('Sign in', 'تسجيل الدخول')}><Icon name="user" /></Link>
        <button className="icon-btn" onClick={() => setSheet('settings')} aria-label="Settings"><Icon name="gear" /></button>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Today classes={classes} />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/test" element={<Test />} />
          <Route path="/similar" element={<Similar />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/account" element={<Account />} />
          <Route path="/classes" element={<Classes onChange={refreshClasses} />} />
          <Route path="/classes/:id" element={<ClassDetail />} />
          <Route path="/join/:code" element={<JoinLink onChange={refreshClasses} />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<div className="empty">{ts('Page not found.', 'الصفحة غير موجودة.')}</div>} />
        </Routes>
      </main>
    </div>
    <nav className="tabs"><div className="wrap">
      {TABS.map(([p, ic, en, ar, c, cs]) => (
        <NavLink key={p} to={p} end className={({ isActive }) => (isActive ? 'on' : '')} style={{ '--tc': c, '--tcs': cs }}>
          <span className="ib"><Icon name={ic} /></span>{ts(en, ar)}
        </NavLink>))}
    </div></nav>
    {sheet === 'surah' && <SurahPicker onClose={() => setSheet(null)} />}
    {sheet === 'settings' && <Settings onClose={() => setSheet(null)} />}
    <Toast />
  </>);
}

const latin = (x) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/^(al|an|ar|as|at|ad|az|ash)-?/, '').replace(/[^a-z]/g, '');
const arBare = (x) => x.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
// Extra search words for the duʿāʾs (common spellings in English and Arabic).
const DUA_ALIAS = { 201: 'dua duaa doa supplication kumail kumayl komail komeil kumeil دعاء كميل', 202: 'dua duaa doa supplication ahd ahad al-ahd covenant عهد العهد دعاء' };

function SurahPicker({ onClose }) {
  const [q, setQ] = useState(''); const nav = useNavigate();
  const qq = q.trim(); const ql = latin(qq); const qa = arBare(qq);
  const hit = (s) => {
    if (!qq) return true;
    if (String(s.n) === qq || toAr(s.n) === qq) return true;
    if (ql && (latin(s.en).includes(ql) || (DUA_ALIAS[s.n] || '').split(' ').some((w) => latin(w).startsWith(ql)))) return true;
    if (qa && /[\u0600-\u06FF]/.test(qa) && (arBare(s.ar).includes(qa) || arBare(DUA_ALIAS[s.n] || '').includes(qa))) return true;
    return false;
  };
  const list = D.index.filter(hit); const duas = D.duas.filter(hit);
  useEffect(() => { document.querySelector('.slist .on')?.scrollIntoView({ block: 'center' }); }, []);
  const pick = async (n) => { onClose(); await openSurah(n); nav('/'); };
  return (<Sheet onClose={onClose}>
    <h2>{tq('Choose a sūrah or duʿāʾ', 'اختر سورة أو دعاء')}</h2>
    <input type="search" autoFocus placeholder={tsq('Search by name or number', 'ابحث بالاسم أو الرقم')} value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="slist">
      {list.length > 0 && duas.length > 0 && <div className="sgroup">{tq('The Qurʾān · 114 sūrahs', 'القرآن الكريم · ١١٤ سورة')}</div>}
      {list.map((s) => (
      <button key={s.n} className={s.n === cur.surah.n ? 'on' : ''} onClick={() => pick(s.n)}>
        <span className="n">{nn(s.n)}</span>
        <span><div style={{ fontWeight: 700 }}>{isAr() ? s.ar : s.en}</div><div className="tiny faint">{tsq(`${s.ay} verses · page ${s.p}`, `آياتها ${toAr(s.ay)} · الصفحة ${toAr(s.p)}`)}{GUIDED.has(s.n) && <span className="pill guided" style={{ marginInlineStart: 6 }}>{tsq('guided', 'مع الشرح')}</span>}</div></span>
        {!isAr() && <span className="ar">{s.ar}</span>}
      </button>))}
      {duas.length > 0 && <div className="sgroup">{tq('Supplications · duʿāʾ', 'الأدعية')}</div>}
      {duas.map((s) => (
        <button key={s.n} className={'dua' + (s.n === cur.surah.n ? ' on' : '')} onClick={() => pick(s.n)}>
          <span className="n dn">{s.n === 201 ? '☾' : '☀'}</span>
          <span><div style={{ fontWeight: 700 }}>{isAr() ? s.ar : s.en}</div><div className="tiny faint">{tsq(`${s.ay} passages · Mafātīḥ al-Jinān`, `${toAr(s.ay)} فقرة · مفاتيح الجنان`)}</div></span>
          {!isAr() && <span className="ar">{s.ar}</span>}
        </button>))}
      {!list.length && !duas.length && <div className="empty small">{tsq('Nothing matches. Try the number, or part of the name.', 'لا نتائج. جرّب الرقم أو جزءًا من الاسم.')}</div>}
    </div>
  </Sheet>);
}

function Settings({ onClose }) {
  const st = S.settings; const [confirmReset, setConfirmReset] = useState(false);
  const setS = (k, v) => { st[k] = v; persist('settings'); };
  return (<Sheet onClose={onClose}>
    <h2>{ts('Settings', 'الإعدادات')}</h2>
    <h3>{ts('Language', 'اللغة')}</h3>
    <Seg accent="var(--teal)" value={st.lang} onChange={(v) => setS('lang', v)} options={[['en', 'English'], ['ar', 'العربية']]} />
    <div className="tiny faint" style={{ marginTop: 4 }}>{ts('English mode gives the Arabic of every Arabic term and the English meaning of every Arabic phrase. Arabic mode switches the whole app to Arabic.', 'في الوضع الإنجليزي يُذكر لكل مصطلح عربي أصلُه العربي، ولكل عبارة عربية معناها بالإنجليزية. أمّا الوضع العربي فيجعل التطبيق كلّه بالعربية.')}</div>
    <div className="hr" />
    <h3>{ts('Text size', 'حجم الخط')}</h3>
    <input type="range" min={22} max={44} value={st.size} onChange={(e) => setS('size', +e.target.value)} />
    <label className="row small" style={{ marginTop: 8 }}>
      <input type="checkbox" checked={isAr() ? st.showTrAr : st.showTr} onChange={(e) => setS(isAr() ? 'showTrAr' : 'showTr', e.target.checked)} />
      {ts('Show translation', 'اعرض الترجمة الإنجليزية أيضًا')}
    </label>
    {!isAr() && <label className="row small" style={{ marginTop: 6 }}>
      <input type="checkbox" checked={st.showTl} onChange={(e) => setS('showTl', e.target.checked)} />
      {tq('Show transliteration (duʿāʾ)', '')}
    </label>}
    <div className="hr" />
    <h3>{ts('Recitation', 'التلاوة')}</h3>
    <select value={st.reciter} onChange={(e) => setS('reciter', e.target.value)} style={{ width: '100%' }}>
      {Object.entries(RECITERS).map(([k, r]) => <option key={k} value={k}>{isAr() ? r.ar : r.en}</option>)}
    </select>
    <div className="tiny faint" style={{ marginTop: 4 }}>{t('Every verse of the Qurʾān. Al-Ḥuṣarī\'s muʿallim recitation is slow and made for memorisation.', 'كل آيات القرآن. وتلاوة الحُصَري المعلِّم بطيئة ومُعدّة للتحفيظ.')}</div>
    <div className="hr" />
    <h3>{ts('Daily plan', 'الخطة اليومية')}</h3>
    <div className="row small">{ts('New verses per day', 'آيات جديدة كل يوم')}<Seg accent="var(--teal)" value={st.newPerDay} onChange={(v) => setS('newPerDay', v)} options={[1, 2, 3, 5, 10].map((n) => [n, nn(n)])} /></div>
    <div className="row small" style={{ marginTop: 8 }}>{ts('Target recall', 'نسبة الحفظ المستهدفة')}<Seg accent="var(--teal)" value={st.retention} onChange={(v) => setS('retention', v)} options={[0.85, 0.9, 0.95].map((r) => [r, nn(Math.round(r * 100)) + '%'])} /></div>
    <div className="tiny faint" style={{ marginTop: 4 }}>{t('Higher target = more frequent revision. 90% is the usual balance; 95% suits a ḥāfiẓ keeping the whole Qurʾān sharp.', 'كلما ارتفعت النسبة زادت المراجعة. ٩٠٪ هي الموازنة المعتادة، و٩٥٪ تناسب الحافظ الذي يريد القرآن كلّه حاضرًا.')}</div>
    <div className="hr" />
    <div className="small muted">{S.user ? ts('Progress is saved to your account and follows you to other devices.', 'التقدّم محفوظ في حسابك وينتقل معك إلى أجهزتك الأخرى.') : ts('Progress is saved in this browser. Create an account to keep it on every device.', 'التقدّم محفوظ في هذا المتصفح. أنشئ حسابًا ليبقى على كل أجهزتك.')}</div>
    {!confirmReset ? <button className="btn ghost" style={{ color: 'var(--red)', marginTop: 8 }} onClick={() => setConfirmReset(true)}>{ts(`Reset progress for ${cur.surah.en}`, `أعِد ضبط التقدّم في سورة ${cur.surah.ar}`)}</button>
      : <div className="note">{ts(`Erase all progress for ${cur.surah.en}? `, `أتمحو كل التقدّم في سورة ${cur.surah.ar}؟ `)}
        <button className="btn sm" style={{ color: 'var(--red)' }} onClick={() => { resetSurah(cur.surah.n); setConfirmReset(false); toast(ts('Progress erased', 'مُحي التقدّم')); }}>{ts('Erase', 'امحُ')}</button>{' '}
        <button className="btn sm ghost" onClick={() => setConfirmReset(false)}>{ts('Cancel', 'إلغاء')}</button></div>}
  </Sheet>);
}
