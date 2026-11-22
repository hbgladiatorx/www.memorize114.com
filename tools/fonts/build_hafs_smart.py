"""Split the KFGQPC Hafs Smart (v8) text into words aligned with the app's Hafs v18 words.

Hafs Smart stores each verse as private-use glyph codes, one code per glyph, words separated
by spaces (each code preceded by U+200F) and the verse-number ornament as the last word. Where the word count matches the
v18 text, the verse is written as a list of words; otherwise null, and the app keeps the v18
text (drawn by the Hafs font) for that verse.

Source: hafs_smart_v8.json from the KFGQPC Hafs Smart release (https://qurancomplex.gov.sa).
Run:  python3 tools/fonts/build_hafs_smart.py path/to/hafs_smart_v8.json
Writes web/public/data/hs/s###.json
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'web', 'public', 'data')
src = json.load(open(sys.argv[1]))
by = {}
for v in src:
    # Keep the RLM before every glyph code: private-use characters are left-to-right, and the
    # marks keep the glyphs in right-to-left order.
    by.setdefault(v['sura_no'], {})[v['aya_no']] = [x for x in v['aya_text'].split(' ') if x.replace('\u200f', '')]
os.makedirs(os.path.join(DATA, 'hs'), exist_ok=True)
ok = bad = 0
for n in range(1, 115):
    verses = json.load(open(os.path.join(DATA, f's{n:03d}.json')))['v']
    out = []
    for v in verses:
        t = by[n][v['a']]
        if len(t) == len(v['w']) + 1 and all(all(0xE000 <= ord(c) <= 0xF8FF or c == '\u200f' for c in x) for x in t):
            out.append(t[:-1]); ok += 1
        else:
            out.append(None); bad += 1
    json.dump(out, open(os.path.join(DATA, 'hs', f's{n:03d}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'aligned {ok}, kept v18 text for {bad}')
