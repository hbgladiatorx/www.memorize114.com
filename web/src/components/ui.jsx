import { useEffect, useRef, useState } from 'react';
import { emit } from '../lib/store.js';

const PATHS = {
  today: '<path d="M4 5h16v15H4z"/><path d="M4 9h16M9 3v4M15 3v4"/>',
  learn: '<path d="M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z"/><path d="M12 5.5V19"/>',
  test: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="8.5"/>',
  similar: '<rect x="3.5" y="5" width="11" height="11" rx="2"/><rect x="9.5" y="9" width="11" height="11" rx="2"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  play: '<path d="M7 5v14l11-7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
};
export function Icon({ name }) {
  return <svg className="i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: PATHS[name] }} />;
}

/* toast */
let toastMsg = '', toastTimer;
export function toast(msg) { toastMsg = msg; emit(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg = ''; emit(); }, 2200); }
export function Toast() { return <div className={'toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>; }

/* bottom sheet */
export function Sheet({ onClose, children }) {
  return (
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">{children}</div>
    </div>
  );
}

export function Seg({ options, value, onChange, accent }) {
  return (
    <div className="seg" style={accent ? { '--accent': accent } : null}>
      {options.map(([v, label]) => <button key={String(v)} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>)}
    </div>
  );
}

export function useScrollActive(dep) {
  const ref = useRef(null);
  useEffect(() => { const on = ref.current?.querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [dep]);
  return ref;
}

export function Field({ label, ...props }) {
  return <label className="field"><span>{label}</span><input {...props} /></label>;
}

export function useAsync(fn, deps) {
  const [st, setSt] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let live = true; setSt((s) => ({ ...s, loading: true }));
    fn().then((data) => live && setSt({ loading: false, data, error: null })).catch((error) => live && setSt({ loading: false, data: null, error }));
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return [st, () => fn().then((data) => setSt({ loading: false, data, error: null }))];
}
