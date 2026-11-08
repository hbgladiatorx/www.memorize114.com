import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { S, signedIn } from '../lib/store.js';
import { ts } from '../lib/i18n.jsx';
import { Field, toast } from '../components/ui.jsx';

function AuthCard({ title, sub, children }) {
  return (<div className="auth">
    <div className="card topline" style={{ '--sec': 'var(--teal)' }}>
      <h2>{title}</h2>{sub && <div className="muted small" style={{ marginBottom: 12 }}>{sub}</div>}
      {children}
    </div>
  </div>);
}
const ErrorLine = ({ err }) => (err ? <div className="formerr">{err}</div> : null);
const msg = (e) => {
  const map = {
    email_taken: ts('An account with this email already exists. Try signing in.', 'يوجد حساب بهذا البريد. جرّب تسجيل الدخول.'),
    bad_credentials: ts('Email or password is incorrect.', 'البريد أو كلمة المرور غير صحيحة.'),
    weak_password: ts('Use at least 8 characters for the password.', 'استخدم ٨ أحرف على الأقل لكلمة المرور.'),
    bad_email: ts('Enter a valid email address.', 'أدخل بريدًا إلكترونيًا صحيحًا.'),
    bad_token: ts('This link is invalid or has expired. Ask for a new one.', 'هذا الرابط غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا.'),
    rate_limited: ts('Too many attempts. Wait a few minutes and try again.', 'محاولات كثيرة. انتظر دقائق ثم أعِد المحاولة.'),
  };
  return map[e.code] || e.message || ts('Something went wrong.', 'حدث خطأ ما.');
};

export function Register() {
  const nav = useNavigate(); const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/auth/register', { method: 'POST', body: f }); await signedIn(r.user); toast(ts('Account created — your progress is now saved to it', 'أُنشئ الحساب — تقدّمك محفوظ فيه الآن')); nav('/'); }
    catch (e2) { setErr(msg(e2)); } finally { setBusy(false); }
  };
  return (<AuthCard title={ts('Create your account', 'إنشاء حساب')} sub={ts('Free. Your memorisation follows you to every device, and you can join a teacher\'s class. Anything you already did on this device is kept.', 'مجاني. يرافقك حفظك على كل أجهزتك، ويمكنك الانضمام إلى صفّ معلّمك. ويُحفظ ما أنجزته على هذا الجهاز.')}>
    <form onSubmit={submit}>
      <Field label={ts('Name', 'الاسم')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} autoComplete="name" />
      <Field label={ts('Email', 'البريد الإلكتروني')} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" />
      <Field label={ts('Password (8+ characters)', 'كلمة المرور (٨ أحرف فأكثر)')} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" />
      <ErrorLine err={err} />
      <button className="btn primary wide" disabled={busy}>{busy ? '…' : ts('Create account', 'إنشاء حساب')}</button>
    </form>
    <div className="small muted authalt">{ts('Already have an account? ', 'لديك حساب؟ ')}<Link to="/login">{ts('Sign in', 'تسجيل الدخول')}</Link></div>
  </AuthCard>);
}

export function Login() {
  const nav = useNavigate(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/auth/login', { method: 'POST', body: f }); await signedIn(r.user); nav('/'); }
    catch (e2) { setErr(msg(e2)); } finally { setBusy(false); }
  };
  return (<AuthCard title={ts('Sign in', 'تسجيل الدخول')}>
    <form onSubmit={submit}>
      <Field label={ts('Email', 'البريد الإلكتروني')} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="email" />
      <Field label={ts('Password', 'كلمة المرور')} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="current-password" />
      <ErrorLine err={err} />
      <button className="btn primary wide" disabled={busy}>{busy ? '…' : ts('Sign in', 'دخول')}</button>
    </form>
    <div className="small muted authalt"><Link to="/forgot">{ts('Forgot your password?', 'نسيت كلمة المرور؟')}</Link> · <Link to="/register">{ts('Create an account', 'إنشاء حساب')}</Link></div>
  </AuthCard>);
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await api('/auth/forgot', { method: 'POST', body: { email } }); setSent(true); } catch (e2) { setErr(msg(e2)); } };
  return (<AuthCard title={ts('Reset your password', 'إعادة تعيين كلمة المرور')} sub={ts('We will email you a link to choose a new password.', 'سنرسل إليك رابطًا لاختيار كلمة مرور جديدة.')}>
    {sent ? <div className="note">{ts('If an account exists for that email, a reset link is on its way. It works for one hour.', 'إن كان لهذا البريد حساب فرابط إعادة التعيين في الطريق، وهو صالح لساعة واحدة.')}</div> : (
      <form onSubmit={submit}>
        <Field label={ts('Email', 'البريد الإلكتروني')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <ErrorLine err={err} /><button className="btn primary wide">{ts('Send reset link', 'أرسل الرابط')}</button>
      </form>)}
  </AuthCard>);
}

export function Reset() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await api('/auth/reset', { method: 'POST', body: { token: sp.get('token'), password: pw } }); await signedIn(r.user); toast(ts('Password changed', 'تغيّرت كلمة المرور')); nav('/'); }
    catch (e2) { setErr(msg(e2)); }
  };
  return (<AuthCard title={ts('Choose a new password', 'اختر كلمة مرور جديدة')}>
    <form onSubmit={submit}>
      <Field label={ts('New password (8+ characters)', 'كلمة المرور الجديدة (٨ أحرف فأكثر)')} type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
      <ErrorLine err={err} /><button className="btn primary wide">{ts('Save password', 'احفظ')}</button>
    </form>
  </AuthCard>);
}

export function Verify() {
  const [sp] = useSearchParams(); const [state, setState] = useState('…');
  useEffect(() => { api('/auth/verify', { method: 'POST', body: { token: sp.get('token') } }).then(() => { setState('ok'); if (S.user) S.user.verified = true; }).catch(() => setState('bad')); }, [sp]);
  return (<AuthCard title={ts('Email confirmation', 'تأكيد البريد')}>
    {state === 'ok' ? <div className="note">{ts('Your email is confirmed. Thank you.', 'تأكّد بريدك. شكرًا لك.')}</div> : state === 'bad' ? <div className="formerr">{ts('This link is invalid or has expired.', 'هذا الرابط غير صالح أو منتهي الصلاحية.')}</div> : '…'}
    <div className="authalt"><Link to="/">{ts('Go to the app', 'إلى التطبيق')}</Link></div>
  </AuthCard>);
}
