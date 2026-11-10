"""Word timings for recitation highlighting.

Source: quran-align (Collin Fair), release 2016-11-24, timing for the EveryAyah
recording Alafasy_128kbps — the same files the app streams. Licensed CC BY 4.0.
Each segment is [first_word, word_after_last, start_ms, end_ms] within the verse's
own MP3. quran-align counts words by splitting Tanzil's Uthmani text on spaces;
this keeps only verses whose word count agrees with the app's KFGQPC text (or
where the timing covers fewer words), so a highlight never lands on the wrong word.

Input: a JSON object {"surah:ayah": [segments...]} (the release data, keyed by verse).
Run:   python3 tools/timing/build.py alafasy /path/to/alafasy.json
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'web' / 'public' / 'data'


def main(reciter, src):
    T = json.loads(Path(src).read_text())
    out_dir = DATA / 'timing' / reciter
    out_dir.mkdir(parents=True, exist_ok=True)
    kept = skipped = 0
    for n in range(1, 115):
        s = json.loads((DATA / f's{n:03d}.json').read_text())
        out = {}
        for v in s['v']:
            seg = T.get(f'{n}:{v["a"]}')
            if not seg:
                skipped += 1
                continue
            seg = sorted(seg, key=lambda x: x[2])
            ok = all(0 <= a < b <= len(v['w']) and 0 <= t0 < t1 for a, b, t0, t1 in seg)
            if not ok:
                skipped += 1
                continue
            out[str(v['a'])] = seg
            kept += 1
        (out_dir / f's{n:03d}.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'{reciter}: {kept} verses with word timing, {skipped} left without')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
