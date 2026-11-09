// App state: settings and per-sūrah progress. Kept in localStorage for guests and
// synced to the server when signed in (newest copy wins, per sūrah).
import { useSyncExternalStore } from 'react';
import { api } from './api.js';

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
};

const DEFAULTS = { t: 0, size: 30, newPerDay: 2, retention: 0.9, showTr: true, showTl: true, showTrAr: false, surah: 62, days: {}, lang: 'en', reciter: 'alafasy', rep: 3, echo: false, rate: 1 };

export const S = {
  settings: { ...DEFAULTS, ...LS.get('m114.settings', {}) },
  prog: {},
  user: undefined, // undefined = not checked yet, null = signed out
  sync: 'local',   // local | syncing | synced | offline
};

const listeners = new Set();
let version = 0;
export function emit() { version++; listeners.forEach((f) => f()); }
const subscribe = (f) => { listeners.add(f); return () => listeners.delete(f); };
export function useStore() { return useSyncExternalStore(subscribe, () => version); }

const blank = () => ({ t: 0, cards: {}, miss: {}, hint: {}, reads: {} });
export function prog(n) { return S.prog[n] || (S.prog[n] = LS.get('m114.s' + n, blank())); }

/* ---------- server sync ---------- */
const timers = {}, chains = {};
function push(key) {
  if (!S.user) return;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    const body = { data: JSON.parse(JSON.stringify(key === 'settings' ? S.settings : prog(key))) };
    const path = key === 'settings' ? '/progress/settings' : `/progress/surah/${key}`;
    S.sync = 'syncing'; emit();
    chains[key] = (chains[key] || Promise.resolve())
      .then(() => api(path, { method: 'PUT', body }))
      .then(() => { S.sync = 'synced'; emit(); })
      .catch(() => { S.sync = 'offline'; emit(); });
  }, 1200);
}

export function persist(key) {
  const obj = key === 'settings' ? S.settings : prog(key);
  obj.t = Date.now();
  LS.set(key === 'settings' ? 'm114.settings' : 'm114.s' + key, obj);
  push(key);
  emit();
}

// Merge server copy with the local one: the newer one wins; push local if newer.
async function pullAll() {
  const remote = await api('/progress');
  if (remote.settings && (remote.settings.t || 0) > (S.settings.t || 0)) {
    S.settings = { ...DEFAULTS, ...remote.settings };
    LS.set('m114.settings', S.settings);
  } else if (S.settings.t) push('settings');
  const localKeys = Object.keys(localStorage).filter((k) => /^m114\.s\d+$/.test(k)).map((k) => +k.slice(6));
  const keys = new Set([...localKeys, ...Object.keys(remote.surahs || {}).map(Number)]);
  for (const n of keys) {
    const r = remote.surahs?.[n]; const l = prog(n);
    if (r && (r.t || 0) > (l.t || 0)) { S.prog[n] = r; LS.set('m114.s' + n, r); }
    else if (l.t && (!r || (l.t || 0) > (r.t || 0))) push(n);
  }
  S.sync = 'synced';
}

export async function loadUser() {
  try { const r = await api('/auth/me'); S.user = r.user; } catch { S.user = null; }
  if (S.user) { try { await pullAll(); } catch { S.sync = 'offline'; } }
  emit();
}

export async function signedIn(user) { S.user = user; try { await pullAll(); } catch { S.sync = 'offline'; } emit(); }
export async function signOut() {
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* already gone */ }
  S.user = null; S.sync = 'local'; emit();
}

export function logActivity() {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  S.settings.days[d] = (S.settings.days[d] || 0) + 1;
  const keys = Object.keys(S.settings.days).sort();
  while (keys.length > 120) delete S.settings.days[keys.shift()];
  persist('settings');
}

export function resetSurah(n) { S.prog[n] = blank(); persist(n); }
