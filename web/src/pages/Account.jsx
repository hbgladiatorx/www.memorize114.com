import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { S, signOut, emit } from '../lib/store.js';
import { ts, t } from '../lib/i18n.jsx';
import { Field, toast } from '../components/ui.jsx';

export default function Account() {
  const nav = useNavigate(); const u = S.user;
  const [name, setName] = useState(u?.name || ''); const [pw, setPw] = useState({ current: '', next: '' }); const [del, setDel] = useState(''); const [askDel, setAskDel] = useState(false);
  if (u === null) return <Navigate to="/login" replace />;
  if (!u) return null;
  const roleName = { student: ts('Student', 'طالب'), teacher: ts('Teacher', 'معلّم'), admin: ts('Administrator', 'مدير') }[u.role];
  const saveName = async (e) => { e.preventDefault(); const r = await api('/auth/me', { method: 'PATCH', body: { name } }); S.user = r.user; emit(); toast(ts('Saved', 'حُفظ')); };
  const savePw = async (e) => { e.preventDefault(); try { await api('/auth/me', { method: 'PATCH', body: { currentPassword: pw.current, password: pw.next } }); setPw({ current: '', next: '' }); toast(ts('Password changed', 'تغيّرت كلمة المرور')); } catch (e2) { toast(e2.code === 'bad_credentials' ? ts('Current password is incorrect', 'كلمة المرور الحالية غير صحيحة') : ts('Use at least 8 characters', 'استخدم ٨ أحرف على الأقل')); } };
  const resend = async () => { await api('/auth/resend-verify', { method: 'POST' }); toast(ts('Confirmation email sent', 'أُرسل بريد التأكيد')); };
  const remove = async () => { try { await api('/auth/me', { method: 'DELETE', body: { password: del } }); await signOut(); nav('/'); toast(ts('Account deleted', 'حُذف الحساب')); } catch { toast(ts('Password is incorrect', 'كلمة المرور غير صحيحة')); } };
  return (<div className="narrow">
    <div className="card topline" style={{ '--sec': 'var(--teal)' }}>
      <div className="row"><h2>{u.name}</h2><span className="spacer" /><span className="pill" style={{ '--pc': 'var(--violet)' }}>{roleName}</span></div>
      <div className="muted small">{u.email} {u.verified ? <span style={{ color: 'var(--green)' }}>✓ {ts('confirmed', 'مؤكَّد')}</span> : <><span style={{ color: 'var(--amber)' }}>· {ts('not confirmed', 'غير مؤكَّد')}</span> <button className="linkbtn" onClick={resend}>{ts('resend email', 'أعِد الإرسال')}</button></>}</div>
      <div className="small muted" style={{ marginTop: 6 }}>{S.sync === 'synced' ? ts('✓ Progress saved to your account', '✓ التقدّم محفوظ في حسابك') : S.sync === 'offline' ? ts('Offline — progress will sync when you reconnect', 'غير متصل — سيُزامَن التقدّم عند الاتصال') : ts('Syncing…', 'جارٍ المزامنة…')}</div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link className="btn" to="/classes">{ts('My classes', 'صفوفي')}</Link>
        {(u.role === 'admin') && <Link className="btn" to="/admin">{ts('Admin', 'لوحة الإدارة')}</Link>}
        <button className="btn ghost" onClick={async () => { await signOut(); nav('/'); }}>{ts('Sign out', 'تسجيل الخروج')}</button>
      </div>
    </div>
    <div className="card"><h3>{ts('Your name', 'اسمك')}</h3>
      <form onSubmit={saveName} className="row"><input className="inp" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /><button className="btn primary">{ts('Save', 'احفظ')}</button></form>
      <div className="tiny faint" style={{ marginTop: 4 }}>{ts('Teachers of classes you join see this name.', 'يرى معلّمو الصفوف التي تنضمّ إليها هذا الاسم.')}</div>
    </div>
    <div className="card"><h3>{ts('Change password', 'تغيير كلمة المرور')}</h3>
      <form onSubmit={savePw}>
        <Field label={ts('Current password', 'كلمة المرور الحالية')} type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" />
        <Field label={ts('New password', 'كلمة المرور الجديدة')} type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} autoComplete="new-password" />
        <button className="btn primary">{ts('Change password', 'غيِّر كلمة المرور')}</button>
      </form>
    </div>
    <div className="card"><h3 style={{ color: 'var(--red)' }}>{ts('Delete account', 'حذف الحساب')}</h3>
      <div className="small muted">{t('This permanently erases your account, your saved progress and your class memberships.', 'يمحو هذا حسابك وتقدّمك المحفوظ وعضويّتك في الصفوف نهائيًا.')}</div>
      {!askDel ? <button className="btn ghost" style={{ color: 'var(--red)', marginTop: 8 }} onClick={() => setAskDel(true)}>{ts('Delete my account', 'احذف حسابي')}</button> : (
        <div className="row" style={{ marginTop: 8 }}><input className="inp" type="password" placeholder={ts('Your password', 'كلمة المرور')} value={del} onChange={(e) => setDel(e.target.value)} /><button className="btn" style={{ color: 'var(--red)' }} onClick={remove}>{ts('Delete permanently', 'احذف نهائيًا')}</button><button className="btn ghost" onClick={() => setAskDel(false)}>{ts('Cancel', 'إلغاء')}</button></div>)}
    </div>
  </div>);
}
