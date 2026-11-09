// UI position shared across views: the open sūrah and verse, and each tab's sub-state.
import { S, emit, persist } from './store.js';
import { loadSurah, D } from './data.js';

export const cur = { surah: null, verse: 1, learnStep: 'read', fade: 0, mode: 'verse', testMode: null, testState: null, chunk: null };

export function set(patch) { Object.assign(cur, patch); emit(); }

export async function openSurah(n) {
  const s = await loadSurah(n);
  D.mode = s.kind === 'dua' ? 'dua' : 'quran';
  Object.assign(cur, { surah: s, verse: 1, testMode: null, testState: null, chunk: null });
  if (S.settings.surah !== n) { S.settings.surah = n; persist('settings'); } else emit();
}
