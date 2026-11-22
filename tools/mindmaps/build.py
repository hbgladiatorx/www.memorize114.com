"""Build web/public/data/mindmaps.json for the mind-map view.

  topics: hand-written topic branches (tools/mindmaps/topics.py) and the duʿāʾ sections
  ruku:   rukūʿ starts for every sūrah (Tanzil Qurʾān metadata, CC BY 3.0), used to
          outline sūrahs that have no topic map yet

Checks: every topic map covers its sūrah's verses exactly once, in order; and every part
of an Arabic title that quotes the Qurʾān is found, word for word, in that branch's verses
(titles that summarise rather than quote are listed for review).
Run from the repo root:  python3 tools/mindmaps/build.py tools/mindmaps/ruku.json
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'web' / 'public' / 'data'
sys.path.insert(0, str(Path(__file__).parent))
from topics import TOPICS, DUA_ICONS  # noqa: E402

MARKS = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')


def norm(w):
    w = MARKS.sub('', w)
    for a, b in (('ٱ', 'ا'), ('أ', 'ا'), ('إ', 'ا'), ('آ', 'ا'), ('ؤ', 'و'), ('ئ', 'ي'), ('ى', 'ي'), ('ة', 'ه')):
        w = w.replace(a, b)
    return re.sub('[اءيو]', '', w)      # compare the consonant skeleton: Uthmani spelling differs in alif, yāʾ and wāw


def main(ruku_path):
    idx = json.loads((DATA / 'index.json').read_text())
    ayat = {s['n']: s['ay'] for s in idx['surahs']}
    out = {'topics': {}, 'ruku': json.loads(Path(ruku_path).read_text())}
    review = []
    for n, branches in TOPICS.items():
        s = json.loads((DATA / f's{n:03d}.json').read_text())
        expect = 1
        for (f, t, icon, en, ar) in branches:
            assert f == expect and t >= f, (n, f, t, 'gap or overlap')
            expect = t + 1
            words = [norm(w) for v in s['v'][f - 1:t] for w in v['w']]
            text = ''.join(words)
            for part in ar.split('—'):
                p = ''.join(norm(w) for w in re.sub('[…:؟?«»“”,،]', ' ', part).split())
                if p and p not in text:
                    review.append(f'{n}:{f}-{t}  {part.strip()}')
        assert expect == ayat[n] + 1, (n, expect - 1, ayat[n], 'does not reach the end')
        out['topics'][str(n)] = [{'f': f, 't': t, 'i': i, 'en': en, 'ar': ar} for (f, t, i, en, ar) in branches]
    for n, icons in DUA_ICONS.items():
        e = json.loads((DATA / f'e{n:03d}.json').read_text())
        secs = e['sections']
        assert len(icons) == len(secs), n
        out['topics'][str(n)] = [{'f': x['from'], 't': x['to'], 'i': i, 'en': x['title'], 'ar': x['ar']} for x, i in zip(secs, icons)]
    assert len(out['ruku']) == 114 and sum(len(v) for v in out['ruku'].values()) == 556
    (DATA / 'mindmaps.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(f"{len(TOPICS)} sūrah topic maps + {len(DUA_ICONS)} duʿāʾ maps; rukūʿ outline for the rest")
    print('Arabic title parts that are not word-for-word quotations (review):')
    for r in review:
        print('  ', r)


if __name__ == '__main__':
    main(sys.argv[1])
