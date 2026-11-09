"""Build the duʿāʾ data files for the web app.

Reads tools/duas/<slug>.json (curated text, one entry per memorisation segment)
and the Qurʾān files in web/public/data, then writes:
  web/public/data/s<n>.json  words, normalised words, phrase starts, look-alikes
  web/public/data/t<n>.json  English working translation
  web/public/data/e<n>.json  sections, about text, variant notes
and adds the duʿāʾs to web/public/data/index.json under "duas".

Run from the repo root:  python3 tools/duas/build.py
"""
import difflib, json, math, re, sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'web' / 'public' / 'data'
SRC = Path(__file__).resolve().parent
COLORS = ['#2F7D5B', '#B26B14', '#2D5F8E', '#7A4A8C', '#B23A5E', '#0F766E', '#8A6D1F', '#3B6E8F']

MARKS = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')
PUNCT = re.compile(r'[،؛.؟!,:;?«»"“”()\[\]]')


def norm(w):
    """Same normalisation as the Qurʾān files: no vowels, one alif, ة→ه, ى→ي."""
    w = MARKS.sub('', w)
    w = w.replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    w = w.replace('ؤ', 'و').replace('ئ', 'ي').replace('ى', 'ي').replace('ة', 'ه')
    return w


def key(n):
    """Looser key for matching against the Uthmani spelling (which drops many alifs)."""
    return n.replace('ا', '').replace('ء', '')


def words(text):
    return [w for w in (PUNCT.sub('', x) for x in text.split()) if w]


def chunk_starts(clauses, total):
    """Phrase starts: each clause begins a phrase; long clauses split every ~5 words."""
    starts, i = [], 0
    for c in clauses:
        n = len(words(c))
        if not n:
            continue
        starts.append(i)
        if n > 7:
            for k in range(5, n - 2, 5):
                starts.append(i + k)
        i += n
    assert i == total, (i, total)
    return starts


def blocks(a, b, minlen):
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    return [[m.a, m.b, m.size] for m in sm.get_matching_blocks() if m.size >= minlen]


def load_quran():
    verses = []
    for n in range(1, 115):
        s = json.loads((DATA / f's{n:03d}.json').read_text())
        for v in s['v']:
            verses.append((n, v['a'], s['en'], v['w'], [key(x) for x in v['n']]))
    return verses


def build(slug, quran, qdf):
    src = json.loads((SRC / f'{slug}.json').read_text())
    n = src['n']
    secs = src['sections']
    for i, s in enumerate(secs):
        s['id'] = chr(65 + i)
        s['color'] = COLORS[i % len(COLORS)]
    out_v, tr, ev = [], {}, {}
    for a, seg in enumerate(src['v'], 1):
        w = words(seg['ar'])
        nn = [norm(x) for x in w]
        v = {'a': a, 'w': w, 'n': nn}
        cl = seg.get('cl')
        v['c'] = chunk_starts(cl, len(w)) if cl else None
        out_v.append(v)
        tr[str(a)] = seg['en']
        extra = {k: seg[k] for k in ('var', 'var_ar', 'note', 'note_ar') if k in seg}
        if extra:
            ev[str(a)] = extra
    # look-alike segments inside the same duʿāʾ (3+ shared words in runs of 2+)
    keys = [[key(x) for x in v['n']] for v in out_v]
    for i, v in enumerate(out_v):
        sims = []
        for j, o in enumerate(out_v):
            if i == j:
                continue
            b = blocks(keys[i], keys[j], 2)
            shared = sum(x[2] for x in b)
            if shared < 3:
                continue
            sc = round(100 * shared / max(len(keys[i]), len(keys[j])) + shared, 1)
            sims.append({'s': n, 'a': o['a'], 'en': src['en'], 'w': o['w'], 'b': b, 'sc': sc})
        sims.sort(key=lambda x: -x['sc'])
        v['sim'] = sims[:4]
    # quotations of / echoes from the Qurʾān: a shared run of 3+ words, or 2 rare ones
    for i, v in enumerate(out_v):
        weight = lambda run: sum(math.log(6236 / qdf[t]) for t in run)
        found = []
        for (sn, qa, en, qw, qk) in quran:
            if not set(keys[i]) & set(qk):
                continue
            b = [x for x in blocks(keys[i], qk, 2)
                 if weight(keys[i][x[0]:x[0] + x[2]]) > (9 if x[2] >= 3 else 13)]
            if not b:
                continue
            shared = sum(x[2] for x in b)
            found.append({'s': sn, 'a': qa, 'en': en, 'w': qw, 'b': b, 'sc': round(shared * 10 + 100 * shared / len(qk), 1), 'q': 1})
        found.sort(key=lambda x: -x['sc'])
        found = [x for x in found if x['sc'] >= found[0]['sc'] / 2][:3] if found else []
        v['sim'] = found + v['sim']
    s_out = {'n': n, 'ar': src['ar'], 'en': src['en'], 'kind': 'dua', 'v': out_v}
    e_out = {'note': src['about'], 'sections': secs, 'verses': ev}
    t_out = {'name': src['tr'], 'src': src['src'], 'v': tr}
    (DATA / f's{n:03d}.json').write_text(json.dumps(s_out, ensure_ascii=False, separators=(',', ':')))
    (DATA / f'e{n:03d}.json').write_text(json.dumps(e_out, ensure_ascii=False, separators=(',', ':')))
    (DATA / f't{n:03d}.json').write_text(json.dumps(t_out, ensure_ascii=False, separators=(',', ':')))
    q = sum(1 for v in out_v for x in v['sim'] if x.get('q'))
    print(f'{slug}: {len(out_v)} segments, {sum(len(v["w"]) for v in out_v)} words, {q} Qurʾān links')
    return {'n': n, 'ar': src['ar'], 'en': src['en'], 'ay': len(out_v), 'kind': 'dua'}


def main():
    quran = load_quran()
    qdf = Counter(t for (_, _, _, _, k) in quran for t in set(k))
    metas = [build(slug, quran, qdf) for slug in ('kumayl', 'ahd')]
    idx = json.loads((DATA / 'index.json').read_text())
    idx['duas'] = metas
    (DATA / 'index.json').write_text(json.dumps(idx, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    sys.exit(main())
