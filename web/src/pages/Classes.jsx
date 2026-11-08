import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { S } from '../lib/store.js';
import { D } from '../lib/data.js';
import { toAr } from '../lib/arabic.js';
import { ts, t, isAr } from '../lib/i18n.jsx';
import { toast, useAsync } from '../components/ui.jsx';

const sName = (n) => (isAr() ? D.index[n - 1].ar : `${n}. ${D.index[n - 1].en}`);
const when = (ms) => (ms ? new Date(ms).toLocaleDateString(isAr() ? 'ar' : undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function SurahChooser({ value, onChange }) {
  const [pick, setPick] = useState('');
  return (<div>
    <div className="row" style={{ gap: 6 }}>{value.map((n) => <span key={n} className="pill" style={{ '--pc': 'var(--blue)' }}>{sName(n)} <button className="linkbtn" onClick={() => onChange(value.filter((x) => x !== n))}>×</button></span>)}</div>
    <div className="row" style={{ marginTop: 6 }}>
      <select value={pick} onChange={(e) => setPick(e.target.value)}><option value="">{ts('Add a sūrah…', 'أضِف سورة…')}</option>{D.index.map((s) => <option key={s.n} value={s.n}>{sName(s.n)}</option>)}</select>
      <button type="button" className="btn sm" disabled={!pick} onClick={() => { const n = +pick; if (!value.includes(n)) onChange([...value, n].sort((a, b) => a - b)); setPick(''); }}>{ts('Add', 'أضِف')}</button>
    </div>
  </div>);
}

export function Classes({ onChange }) {
  const nav = useNavigate(); const u = S.user;
  const [st, reload] = useAsync(() => (S.user ? api('/classes') : Promise.resolve(null)), [S.user?.id]);
  const [code, setCode] = useState(''); const [nc, setNc] = useState({ name: '', surahs: [] });
  if (u === null) return <Navigate to="/login" replace />;
  if (!u || st.loading) return <div className="empty">…</div>;
  const data = st.data || { teaching: [], joined: [] };
  const join = async (e) => { e.preventDefault(); try { await api('/classes/join', { method: 'POST', body: { code } }); setCode(''); toast(ts('Joined the class', 'انضممت إلى الصف')); reload(); onChange?.(); } catch { toast(ts('No class has that code', 'لا يوجد صفّ بهذا الرمز')); } };
  const create = async (e) => { e.preventDefault(); const r = await api('/classes', { method: 'POST', body: nc }); setNc({ name: '', surahs: [] }); nav('/classes/' + r.class.id); };
  const leave = async (id) => { await api(`/classes/${id}/leave`, { method: 'POST' }); reload(); onChange?.(); };
  const isTeacher = u.role === 'teacher' || u.role === 'admin';
  return (<div className="narrow">
    <div className="card topline" style={{ '--sec': 'var(--blue)' }}>
      <h2>{ts('Join a class', 'الانضمام إلى صف')}</h2>
      <div className="small muted">{t('Enter the code your teacher gave you. Your teacher will see your name, your email, and your progress on the sūrahs they assign.', 'أدخل الرمز الذي أعطاك إيّاه معلّمك. سيرى المعلّم اسمك وبريدك وتقدّمك في السور التي يكلّفك بها.')}</div>
      <form className="row" onSubmit={join} style={{ marginTop: 8 }}><input className="inp code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC-1234" maxLength={12} required /><button className="btn primary" style={{ '--accent': 'var(--blue)' }}>{ts('Join', 'انضمّ')}</button></form>
      {data.joined.length > 0 && <div style={{ marginTop: 12 }}>{data.joined.map((c) => (
        <div key={c.id} className="thread" style={{ '--tcol': 'var(--blue)' }}>
          <div className="row"><b>{c.name}</b><span className="tiny faint">{ts('Teacher: ', 'المعلّم: ')}{c.teacher}</span><span className="spacer" /><button className="btn sm ghost" onClick={() => leave(c.id)}>{ts('Leave', 'مغادرة')}</button></div>
          {c.surahs.length > 0 && <div className="small muted">{ts('Assigned: ', 'المكلَّف به: ')}{c.surahs.map(sName).join(isAr() ? '، ' : ', ')}</div>}
        </div>))}</div>}
    </div>

    {isTeacher ? (<>
      <div className="card topline" style={{ '--sec': 'var(--green)' }}>
        <h2>{ts('Your classes', 'صفوفك')}</h2>
        {data.teaching.length === 0 && <div className="small muted">{ts('No classes yet. Create one below and share its code with your students.', 'لا صفوف بعد. أنشئ صفًّا وشارك رمزه مع طلابك.')}</div>}
        {data.teaching.map((c) => (
          <Link key={c.id} to={'/classes/' + c.id} className="qitem" style={{ '--kc': 'var(--green)', textDecoration: 'none', color: 'inherit', marginTop: 6 }}>
            <span className="k">{c.code}</span><b>{c.name}</b><span className="spacer" /><span className="small muted">{ts(`${c.members} student${c.members === 1 ? '' : 's'}`, `الطلاب: ${toAr(c.members)}`)}</span>
          </Link>))}
      </div>
      <div className="card"><h3>{ts('Create a class', 'إنشاء صف')}</h3>
        <form onSubmit={create}>
          <input className="inp" style={{ width: '100%' }} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} placeholder={ts('Class name, e.g. Saturday ḥifẓ circle', 'اسم الصف، مثل: حلقة السبت')} required maxLength={80} />
          <div className="small muted" style={{ margin: '8px 0 4px' }}>{t('Sūrahs to assign (you can change these later)', 'السور المكلَّف بها (يمكن تغييرها لاحقًا)')}</div>
          <SurahChooser value={nc.surahs} onChange={(s2) => setNc({ ...nc, surahs: s2 })} />
          <button className="btn primary" style={{ marginTop: 10 }}>{ts('Create class', 'أنشئ الصف')}</button>
        </form>
      </div>
    </>) : <div className="small muted" style={{ textAlign: 'center' }}>{ts('Teaching a class? Ask the site administrator to make your account a teacher account.', 'هل تدرّس صفًّا؟ اطلب من مدير الموقع جعل حسابك حساب معلّم.')}</div>}
  </div>);
}

export function ClassDetail() {
  const { id } = useParams(); const nav = useNavigate();
  const [st, reload] = useAsync(() => api('/classes/' + id), [id]);
  const [edit, setEdit] = useState(null); const [askDel, setAskDel] = useState(false);
  if (S.user === null) return <Navigate to="/login" replace />;
  if (st.loading) return <div className="empty">…</div>;
  if (st.error) return <div className="empty">{ts('Class not found.', 'الصف غير موجود.')}</div>;
  const { class: c, members } = st.data;
  const link = `${location.origin}/join/${c.code}`;
  const save = async () => { await api('/classes/' + id, { method: 'PATCH', body: edit }); setEdit(null); reload(); };
  const removeMember = async (uid) => { await api(`/classes/${id}/members/${uid}`, { method: 'DELETE' }); reload(); };
  const delClass = async () => { await api('/classes/' + id, { method: 'DELETE' }); nav('/classes'); };
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast(ts('Link copied', 'نُسخ الرابط')); } catch { toast(link); } };
  return (<div>
    <div className="row" style={{ marginBottom: 8 }}><Link className="btn sm" to="/classes">{ts('← Classes', '→ الصفوف')}</Link></div>
    <div className="card topline" style={{ '--sec': 'var(--green)' }}>
      {!edit ? (<>
        <div className="row"><h2>{c.name}</h2><span className="spacer" /><button className="btn sm" onClick={() => setEdit({ name: c.name, surahs: c.surahs })}>{ts('Edit', 'تعديل')}</button></div>
        <div className="row" style={{ marginTop: 4 }}>
          <span className="small muted">{ts('Join code', 'رمز الانضمام')}</span><span className="classcode">{c.code}</span>
          <button className="btn sm" onClick={copy}>{ts('Copy join link', 'انسخ رابط الانضمام')}</button>
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>{ts('Assigned: ', 'المكلَّف به: ')}{c.surahs.length ? c.surahs.map(sName).join(isAr() ? '، ' : ', ') : '—'}</div>
      </>) : (<>
        <input className="inp" style={{ width: '100%' }} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <div style={{ marginTop: 8 }}><SurahChooser value={edit.surahs} onChange={(s2) => setEdit({ ...edit, surahs: s2 })} /></div>
        <div className="row" style={{ marginTop: 8 }}><button className="btn primary" onClick={save}>{ts('Save', 'احفظ')}</button><button className="btn ghost" onClick={() => setEdit(null)}>{ts('Cancel', 'إلغاء')}</button></div>
      </>)}
    </div>

    <div className="card topline" style={{ '--sec': 'var(--blue)' }}>
      <h2>{ts(`Students (${members.length})`, `الطلاب (${toAr(members.length)})`)}</h2>
      {members.length === 0 && <div className="small muted">{ts('No students yet. Share the join code or link.', 'لا طلاب بعد. شارك رمز الانضمام أو الرابط.')}</div>}
      <div className="roster">
        {members.map((m) => (
          <div key={m.id} className="rrow">
            <div className="row"><b>{m.name}</b><span className="tiny faint">{m.email}</span><span className="spacer" />
              <span className="tiny faint">{ts('Last active ', 'آخر نشاط ')}{when(m.lastActive)}</span>
              <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={() => removeMember(m.id)}>{ts('remove', 'إزالة')}</button></div>
            <div className="rgrid">
              {c.surahs.map((n) => { const p = m.perSurah[n]; const total = D.index[n - 1].ay; const pct = p ? Math.round((p.started / total) * 100) : 0; return (
                <div key={n} className="rcell">
                  <div className="tiny" style={{ fontWeight: 700 }}>{sName(n)}</div>
                  <div className="progressbar"><i style={{ width: pct + '%' }} /></div>
                  <div className="tiny faint">{p ? ts(`${p.started}/${total} started · ${p.strong} solid · ${p.due} due · recall ${Math.round(p.avgRecall * 100)}%`, `بدأ ${toAr(p.started)}/${toAr(total)} · ثابتة ${toAr(p.strong)} · مستحقة ${toAr(p.due)} · الحفظ ${toAr(Math.round(p.avgRecall * 100))}٪`) : ts('not started', 'لم يبدأ')}</div>
                </div>); })}
            </div>
          </div>))}
      </div>
    </div>
    <div className="card"><h3 style={{ color: 'var(--red)' }}>{ts('Delete class', 'حذف الصف')}</h3>
      {!askDel ? <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => setAskDel(true)}>{ts('Delete this class', 'احذف هذا الصف')}</button>
        : <div className="row"><span className="small">{ts('Students keep their own progress. Delete the class?', 'يحتفظ الطلاب بتقدّمهم. أتحذف الصف؟')}</span><button className="btn" style={{ color: 'var(--red)' }} onClick={delClass}>{ts('Delete', 'احذف')}</button><button className="btn ghost" onClick={() => setAskDel(false)}>{ts('Cancel', 'إلغاء')}</button></div>}
    </div>
  </div>);
}

export function JoinLink({ onChange }) {
  const { code } = useParams(); const nav = useNavigate(); const [msg, setMsg] = useState('…');
  useEffect(() => {
    if (S.user === undefined) return;
    if (S.user === null) { sessionStorage.setItem('m114.join', code); nav('/register'); return; }
    api('/classes/join', { method: 'POST', body: { code } }).then((r) => { toast(ts(`Joined ${r.class.name}`, `انضممت إلى ${r.class.name}`)); onChange?.(); nav('/classes'); }).catch(() => setMsg(ts('No class has that code.', 'لا يوجد صفّ بهذا الرمز.')));
  }, [code, S.user]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="empty">{msg}</div>;
}

