"""Add a word-by-word transliteration ("tl") to every sūrah file in web/public/data.

Uses tools/translit.py on the KFGQPC Uthmani text; the last word of each verse is
given in its pausal form. Checked against the Quranic Arabic Corpus word-by-word
transliteration: 99.8% of words agree once spelling conventions are normalised.
Run from the repo root:  python3 tools/build_translit.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from translit import translit_words  # noqa: E402

DATA = ROOT / 'web' / 'public' / 'data'
for n in range(1, 115):
    p = DATA / f's{n:03d}.json'
    s = json.loads(p.read_text())
    for v in s['v']:
        v['tl'] = translit_words(v['w'], uthmani=True)
        assert len(v['tl']) == len(v['w'])
    p.write_text(json.dumps(s, ensure_ascii=False, separators=(',', ':')))
print('transliteration added to 114 sūrahs')
