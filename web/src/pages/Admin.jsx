import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { S } from '../lib/store.js';
import { meta } from '../lib/data.js';
import { toAr } from '../lib/arabic.js';
import { ts, nn, isAr } from '../lib/i18n.jsx';
import { toast, useAsync } from '../components/ui.jsx';

const when = (ms) => (ms ? new Date(ms).toLocaleDateString(isAr() ? 'ar' : undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Bars({ rows, color }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (<div className="bars">{rows.map((r) => (
    <div key={r.day} className="bar" title={`${r.day}: ${r.count}`}><i style={{ height: Math.max(2, (r.count / max) * 100) + '%', background: color }} /></div>))}</div>);
}

export default function Admin() {
  const [q, setQ] = useState(''); const [query, setQuery] = useState('');
  const [stats] = useAsync(() => api('/admin/stats'), []);
  const [users, reload] = useAsync(() => api('/admin/users?q=' + encodeURIComponent(query)), [query]);
  if (S.user === null) return <Navigate to="/login" replace />;
  if (S.user && S.user.role !== 'admin') return <div className="empty">{ts('Administrators only.', 'للمدير فقط.')}</div>;
  if (stats.loading || !stats.data) return <div className="empty">…</div>;
  const s = stats.data;
  const setRole = async (id, role) => { await api('/admin/users/' + id, { method: 'PATCH', body: { role } }); toast(ts('Role updated', 'تغيّر الدور')); reload(); };
  const tiles = [
    ['var(--teal)', s.users, ts('registered users', 'مستخدم مسجَّل')],
    ['var(--green)', s.newUsers7, ts('joined this week', 'انضمّوا هذا الأسبوع')],
    ['var(--blue)', s.active7, ts('active this week', 'نشطون هذا الأسبوع')],
    ['var(--amber)', s.active30, ts('active this month', 'نشطون هذا الشهر')],
    ['var(--violet)', s.teachers, ts('teachers', 'معلّمون')],
    ['var(--rose)', s.classes, ts('classes', 'صفوف')],
  ];
  return (<div>
    <div className="card topline" style={{ '--sec': 'var(--violet)' }}>
      <h2>{ts('Admin dashboard', 'لوحة الإدارة')}</h2>
      <div className="statgrid">{tiles.map(([c, n, l]) => <div key={l} className="stat" style={{ '--c': c }}><b>{nn(n)}</b><span>{l}</span></div>)}</div>
      <div className="row" style={{ marginTop: 14, alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 240 }}><div className="tiny faint">{ts('Sign-ups, last 30 days', 'التسجيلات — آخر ٣٠ يومًا')}</div><Bars rows={s.signupsByDay} color="var(--green)" /></div>
        <div style={{ flex: 1, minWidth: 240 }}><div className="tiny faint">{ts('Active users, last 30 days', 'المستخدمون النشطون — آخر ٣٠ يومًا')}</div><Bars rows={s.activeByDay} color="var(--blue)" /></div>
      </div>
    </div>
    {s.topSurahs.length > 0 && <div className="card topline" style={{ '--sec': 'var(--amber)' }}>
      <h2>{ts('Most memorised sūrahs', 'أكثر السور حفظًا')}</h2>
      {s.topSurahs.map((x) => <div key={x.n} className="row small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
        <span className="ar-inline">{meta(x.n).ar}</span>{!isAr() && <span>{meta(x.n).en}</span>}<span className="spacer" />
        <span className="muted">{ts(`${x.users} users · ${x.verses} verses started`, `${toAr(x.users)} مستخدم · ${toAr(x.verses)} آية`)}</span></div>)}
    </div>}
    <div className="card topline" style={{ '--sec': 'var(--teal)' }}>
      <h2>{ts('Users', 'المستخدمون')}</h2>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery(q); }}><input className="inp" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ts('Search name or email', 'ابحث بالاسم أو البريد')} /><button className="btn">{ts('Search', 'بحث')}</button></form>
      <div className="tablewrap"><table className="tbl">
        <thead><tr><th>{ts('Name', 'الاسم')}</th><th>{ts('Email', 'البريد')}</th><th>{ts('Joined', 'انضمّ')}</th><th>{ts('Last active', 'آخر نشاط')}</th><th>{ts('Verses', 'الآيات')}</th><th>{ts('Role', 'الدور')}</th></tr></thead>
        <tbody>{(users.data?.users || []).map((u) => (
          <tr key={u.id}><td>{u.name}</td><td className="tiny">{u.email}{!u.verified && <span style={{ color: 'var(--amber)' }}> ·?</span>}</td><td className="tiny">{when(u.createdAt)}</td><td className="tiny">{when(u.lastActive)}</td><td>{nn(u.versesStarted)}</td>
            <td><select value={u.role} disabled={u.id === S.user?.id} onChange={(e) => setRole(u.id, e.target.value)}>
              <option value="student">{ts('Student', 'طالب')}</option><option value="teacher">{ts('Teacher', 'معلّم')}</option><option value="admin">{ts('Admin', 'مدير')}</option></select></td></tr>))}</tbody>
      </table></div>
      <div className="tiny faint" style={{ marginTop: 6 }}>{ts(`${users.data?.total ?? 0} users`, `${toAr(users.data?.total ?? 0)} مستخدم`)}{users.data?.total > 100 ? ts(' — showing the 100 most recent; search to narrow.', ' — تُعرض أحدث ١٠٠؛ ابحث للتضييق.') : ''}</div>
    </div>
  </div>);
}
