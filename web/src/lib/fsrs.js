// FSRS-4.5 spaced-repetition scheduler with its published default parameters.
// The same file is imported by the server to compute progress summaries.
export const DAY = 864e5;
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const R = (t, S) => Math.pow(1 + (FACTOR * t) / S, DECAY);
const ivl = (S, r) => (S / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
const D0 = (G) => clamp(W[4] - (G - 3) * W[5], 1, 10);
const nextD = (D, G) => clamp(W[7] * D0(3) + (1 - W[7]) * (D - W[6] * (G - 3)), 1, 10);
const sRecall = (D, S, r, G) => S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (G === 2 ? W[15] : 1) * (G === 4 ? W[16] : 1) + 1);
const sForget = (D, S, r) => W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));

// G: 1 Again, 2 Hard, 3 Good, 4 Easy
export function review(card, G, now, retention) {
  const c = card ? { ...card } : null;
  let S, D;
  if (!c || !c.S) { S = W[G - 1]; D = D0(G); }
  else {
    const t = (now - c.last) / DAY;
    const r = R(Math.max(t, 0), c.S);
    if (t < 0.5) { S = G === 1 ? Math.min(c.S, sForget(c.D, c.S, r)) : c.S; D = nextD(c.D, G); }
    else { D = nextD(c.D, G); S = G === 1 ? sForget(c.D, c.S, r) : sRecall(c.D, c.S, r, G); }
  }
  const days = G === 1 ? 0 : Math.max(1, Math.round(ivl(S, retention)));
  return {
    S, D, last: now,
    due: G === 1 ? now + 10 * 6e4 : now + days * DAY,
    reps: (c?.reps || 0) + 1,
    lapses: (c?.lapses || 0) + (G === 1 && c ? 1 : 0),
    learnedAt: c?.learnedAt || now,
    g: G,
  };
}

export const retr = (card, now) => (card && card.S ? R(Math.max(0, (now - card.last) / DAY), card.S) : 0);

export function previewDays(card, now, retention) {
  return [1, 2, 3, 4].map((G) => (G === 1 ? 0 : (review(card, G, now, retention).due - now) / DAY));
}

// Summary of one sūrah's progress blob, used by the dashboard, teacher and admin views.
export function summarize(blob, verseCount, now = Date.now()) {
  const cards = Object.values(blob?.cards || {});
  const started = cards.length;
  const strong = cards.filter((c) => retr(c, now) >= 0.9 && c.S >= 21).length;
  const due = cards.filter((c) => c.due <= now).length;
  const avgRecall = started ? cards.reduce((s, c) => s + retr(c, now), 0) / started : 0;
  const lastReview = cards.reduce((m, c) => Math.max(m, c.last || 0), 0) || null;
  const missed = Object.values(blob?.miss || {}).reduce((s, arr) => s + (arr || []).reduce((a, b) => a + (b || 0), 0), 0);
  return { started, strong, due, avgRecall, lastReview, missed, total: verseCount ?? null };
}
