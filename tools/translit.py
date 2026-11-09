"""Readable transliteration of fully vowelled Arabic, for learners.

Style: ā ī ū for long vowels; ḥ ṣ ḍ ṭ ẓ; th dh kh gh sh; ʿ for ʿayn, ʾ for hamza
(not written at the start of a word). The article assimilates to sun letters
(ar-raḥmān), and a connecting alif (hamzat al-waṣl) is dropped after a vowel, as it
is pronounced in connected speech (allāhumma ghfir lī). The last word of a passage
is given in its pausal form (… kulla shayʾ), as one stops there when reciting.

Works on ordinary vowelled Arabic (the duʿāʾ texts) and on the KFGQPC Uthmani
Hafs text (its sukūn, open tanwīn, small wāw/yāʾ, silent-letter and madd marks).
"""
import re

CONS = {'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
        'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'y', 'ة': 't',
        'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ٔ': 'ʾ'}
SUN = set('تثدذرزسشصضطظلن')
FATHA, KASRA, DAMMA = 'َ', 'ِ', 'ُ'
SUKUN = {'ْ', 'ۡ'}
SHADDA = 'ّ'
TAN_A, TAN_I, TAN_U = {'ً', 'ࣰ'}, {'ٍ', 'ࣲ'}, {'ٌ', 'ࣱ'}
DAGGER = 'ٰ'
MADDA = 'ٓ'
SMALL_WAW, SMALL_YA = 'ۥ', 'ۦ'
SILENT = {'۟', '۠'}  # small high rounded / rectangular zero: letter not pronounced
IGNORE = {'ـ', 'ۜ', 'ۢ', 'ۭ', 'ۨ', '۪', '۫', '۬', 'ٔ', 'ٕ', '‌'}
ALIFS = {'ا', 'ٱ', 'آ'}
UTHMANI = [False]  # set True for the KFGQPC text: mid-word آ is a long ā, hamza is written separately


def letters(word):
    """Split a word into [letter, set_of_marks] units."""
    out = []
    for ch in word:
        if ch in IGNORE or ch in '۞۩':
            continue
        if 'ً' <= ch <= 'ٟ' or ch in (DAGGER, MADDA, SMALL_WAW, SMALL_YA) or ch in SILENT or ch in SUKUN or 'ࣰ' <= ch <= 'ࣲ':
            if out:
                out[-1][1].append(ch)
            continue
        if 'ء' <= ch <= 'ي' or ch in 'ٱ':
            out.append([ch, []])
    return out


def vowel_of(m):
    if FATHA in m: return 'a'
    if KASRA in m: return 'i'
    if DAMMA in m: return 'u'
    return ''


def word_tl(word, prev_vowel_end, pausal):
    """Transliterate one word. prev_vowel_end: the previous word ended in a vowel
    (so a connecting alif is silent). Returns (text, ends_in_vowel)."""
    L = letters(word)
    if not L:
        return '', prev_vowel_end
    s = ''
    n = len(L)
    # Allah and allāhumma
    bare = ''.join(c for c, _ in L)
    i = 0
    res = []
    assim = False
    # prefixes like wa-, fa-, bi-, li-, ka- before the article: handled naturally.
    while i < n:
        c, m = L[i]
        nxt = L[i + 1] if i + 1 < n else None
        # connecting alif / article
        if c in ('ا', 'ٱ') and not vowel_of(m) and not any(t in m for t in TAN_A) and i == 0:
            # word-initial alif without a vowel: hamzat al-waṣl
            third = L[i + 2] if i + 2 < n else None
            start = '' if prev_vowel_end else 'a'
            if nxt and nxt[0] == 'ل' and SHADDA in nxt[1]:   # al + lām merged: allatī, alladhīna, allayl
                res.append(start)
                i += 1
                continue
            is_article = nxt and nxt[0] == 'ل' and not vowel_of(nxt[1])
            if is_article:
                if third and third[0] == 'ل' and SHADDA in third[1]:
                    res.append(start)          # al-lām + lām: allatī, allāh…
                    i += 2
                    continue
                if third and third[0] in SUN and SHADDA in third[1]:
                    res.append(start)          # sun letter: ar-raḥmān / r-raḥmān
                    assim = True
                    i += 2
                    continue
                res.append(start + 'l-')
                i += 2
                continue
            if not prev_vowel_end:  # start of speech before a verb: helping vowel i or u
                res.append('u' if third and DAMMA in third[1] else 'i')
            i += 1
            continue
        if c in ('ا', 'آ') or (c == 'ٱ'):
            if c == 'آ':
                res.append('ʾā' if i and not UTHMANI[0] else 'ā')
                i += 1
                continue
            if set(m) & SILENT:
                i += 1
                continue
            v = vowel_of(m)
            if v:  # alif carrying a vowel: hamza (spelling without the hamza sign)
                res.append(('ʾ' if i else '') + v)
                i += 1
                continue
            if any(t in m for t in TAN_A):
                res.append('an')
                i += 1
                continue
            third = L[i + 2] if i + 2 < n else None
            prevc, prevm = L[i - 1] if i else ('', [])
            after_article = prevc == 'ل' and i >= 2 and L[i - 2][0] in ALIFS and not vowel_of(L[i - 2][1])
            if after_article or (prevc == 'ل' and (SUKUN & set(prevm)) and i >= 2):   # al-ittiṣāl: connecting alif after the article
                res.append('i')
                i += 1
                continue
            wasl = nxt and ((SUKUN & set(nxt[1])) or (nxt[0] == 'ل' and not vowel_of(nxt[1]) and third and (SHADDA in third[1] or SUKUN & set(nxt[1]))))
            if i and wasl and c != 'آ':
                if nxt[0] == 'ل' and i <= 2 and all(L[k][0] in 'وفبكل' and vowel_of(L[k][1]) for k in range(i)):   # prefix + article: wa-l-arḍ, bi-r-raḥmah
                    if third and third[0] in SUN and SHADDA in third[1] and third[0] != 'ل':
                        res.append('-'); assim = True
                    elif third and third[0] == 'ل' and SHADDA in third[1]:
                        res.append('-')
                    else:
                        res.append('-l-')
                    i += 2
                    continue
                i += 1          # connecting alif after a vowel: silent (bismika, washdud)
                continue
            # long ā after fatha, silent alif after wāw at word end, or alif of tanwīn
            prevm = L[i - 1][1] if i else []
            if i == n - 1 and i and L[i - 1][0] == 'و' and (SUKUN & set(prevm) or not vowel_of(prevm)):
                i += 1
                continue
            if i and any(t in prevm for t in TAN_A):
                i += 1
                continue
            res.append('ā')
            i += 1
            continue
        if c == 'ى':
            v = vowel_of(m)
            if v or SHADDA in m:
                pass  # consonant y
            elif any(t in m for t in TAN_A):
                res.append('an')
                i += 1
                continue
            else:
                res.append('ā' if (i and FATHA in L[i - 1][1]) or DAGGER in m else 'ā')
                i += 1
                continue
        if set(m) & SILENT:
            i += 1
            continue
        # long ī / ū written with yāʾ / wāw and no vowel of their own
        if c in ('ي', 'و') and not m and nxt and nxt[0] == 'ا' and not vowel_of(nxt[1]) and not (set(nxt[1]) & SILENT) and i:
            res.append(CONS[c] + ('an' if set(nxt[1]) & TAN_A else 'ā'))
            i += 2
            continue
        if c in ('ي', 'ى') and i and not m and KASRA in L[i - 1][1]:
            res.append('ī')
            i += 1
            continue
        if c == 'و' and i and not m and DAMMA in L[i - 1][1]:
            res.append('ū')
            i += 1
            continue
        cons = CONS.get(c, '')
        if c in 'أإؤئء' and i == 0:
            cons = ''
        if c == 'ة':
            cons = 't'
        if SHADDA in m:
            cons = (cons + '-' + cons) if assim else cons + cons
        assim = False
        v = vowel_of(m)
        tan = 'an' if set(m) & TAN_A else 'in' if set(m) & TAN_I else 'un' if set(m) & TAN_U else ''
        if DAGGER in m:
            v = 'ā'
        if SMALL_WAW in m:
            v = (v or 'u') + 'ū' if not v else v + 'ū'
            v = 'ū' if v in ('uū', 'ū') else v
        if SMALL_YA in m:
            v = 'ī' if v in ('i', '') else v + 'ī'
        if MADDA in m and c in ('ا',):
            v = 'ā'
        res.append(cons + v + tan)
        i += 1
    text = ''.join(res).replace('l-ʾ', 'l-')
    # tidy
    text = text.replace('aā', 'ā').replace('iī', 'ī').replace('uū', 'ū').replace('āā', 'ā')
    text = re.sub(r'ayy?ī', lambda x: x.group(0), text)
    if pausal:
        text = re.sub(r'(at|t)(un|in|an|u|i|a)$', 'ah', text) if bare.endswith('ة') else text
        text = re.sub(r'an$', 'ā', text) if not bare.endswith('ة') else text
        text = re.sub(r'(un|in)$', '', text)
        text = re.sub(r'(?<=[^aiuāīū])[aiu]$', '', text) if not re.search(r'[āīū]$', text) else text
    ends_vowel = bool(re.search(r'[aiuāīū]$', text))
    return text, ends_vowel


SPECIAL = {
    # God's name and allāhumma, in either spelling
    'الله': 'allāh', 'اللهم': 'allāhumma',
}


def special(word):
    b = re.sub(r'[ً-ٰٟۖ-ۭـ]', '', word).replace('ٱ', 'ا')
    return b


HIDDEN_A = {'هذا': 1, 'هذه': 1, 'هذان': 1, 'هكذا': 1, 'هؤلاء': 1, 'لكن': 1, 'لكنك': 1, 'لكنه': 1, 'لكنني': 1, 'اله': 2, 'الهي': 2, 'الها': 2, 'الهك': 2}


def restore_a(w):
    """Insert the dagger alif that ordinary spelling leaves out (hādhā, lākin, ilāh)."""
    b = special(w)
    k = HIDDEN_A.get(re.sub('^[وف]', '', b).replace('أ', 'ا').replace('إ', 'ا'))
    if not k or DAGGER in w:
        return w
    seen = -1 if re.match('^[وف]', b) else 0
    out = ''
    for ch in w:
        out += ch
        if '\u0621' <= ch <= '\u064A':
            seen += 1
            if seen == k:
                out += DAGGER
    return re.sub('\u0670([\u064E])', '\u0670', out).replace('\u064E\u0670', '\u0670')


def translit_words(words, pausal_last=True):
    out = []
    words = [restore_a(w) for w in words]
    prev_vowel = False
    for k, w in enumerate(words):
        last = pausal_last and k == len(words) - 1
        b = special(w)
        # God's name, with or without a prefix
        m = re.match(r'^(و|ف)?(ب|ل)?(الله|لله)(م)?$', b)
        if m:
            pre = ''
            if m.group(1): pre += {'و': 'wa', 'ف': 'fa'}[m.group(1)]
            if m.group(2): pre += {'ب': 'bi', 'ل': 'li'}[m.group(2)]
            elif m.group(3) == 'لله': pre += 'li'
            core = 'llāhumma' if m.group(4) else ('llāh' if (last or not re.search(r'[َُِ]$', w.rstrip('ّ'))) else 'llāh' + {'َ': 'a', 'ِ': 'i', 'ُ': 'u'}[w.rstrip()[-1]])
            if not m.group(4) and not last:
                endv = [ch for ch in w if ch in (FATHA, KASRA, DAMMA)]
                core = 'llāh' + ({FATHA: 'a', KASRA: 'i', DAMMA: 'u'}[endv[-1]] if endv and w.endswith(endv[-1]) else '')
            if pre:
                t = pre + '-' + core if not pre.endswith(('i', 'a')) else pre[:-1] + ('i' if pre.endswith('i') else 'a') + core
                t = pre + core
            elif prev_vowel:
                t = core
            else:
                t = 'a' + core
            out.append(t)
            prev_vowel = bool(re.search(r'[aiuāīū]$', t))
            continue
        t, prev_vowel = word_tl(w, prev_vowel, last)
        out.append(t)
    if out:
        out[0] = out[0][:1] + out[0][1:]
    return out


def translit(words, uthmani=False):
    UTHMANI[0] = uthmani
    return ' '.join(translit_words(words))


if __name__ == '__main__':
    import json, sys
    tests = ['اللّٰهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ',
             'اللّٰهُمَّ اغْفِرْ لِيَ الذُّنُوبَ الَّتِي تَهْتِكُ الْعِصَمَ',
             'يَا نُورُ يَا قُدُّوسُ يَا أَوَّلَ الْأَوَّلِينَ وَيَا آخِرَ الْآخِرِينَ',
             'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ', 'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ',
             'صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ ٱلۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا ٱلضَّآلِّينَ',
             'قُلۡ هُوَ ٱللَّهُ أَحَدٌ']
    for x in tests:
        print(translit(x.split(), uthmani='ۡ' in x or 'ٱ' in x))
