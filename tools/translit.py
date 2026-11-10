"""Readable transliteration of fully vowelled Arabic, for learners.

Style: ā ī ū for long vowels; ḥ ṣ ḍ ṭ ẓ; th dh kh gh sh; ʿ for ʿayn, ʾ for hamza
(not written at the start of a word). The article joins sun letters (ar-raḥmān),
a connecting alif (hamzat al-waṣl) is dropped after a vowel as in connected
recitation (allāhumma ghfir lī, bismi llāhi), the long vowel of the pronoun is
shown (bihī, lahū), and the last word of a verse or passage is in its pausal
form (… kulli shayʾ), as one stops there.

Two inputs:
  * ordinary vowelled Arabic (the duʿāʾ texts);
  * the KFGQPC Uthmani Hafs v18 text (uthmani=True), whose marks mean:
    U+06E1 sukūn, U+0652 a silent letter, U+0657/065E/0656 open tanwīn,
    U+0653 madd, U+0670 dagger alif, U+06E5/06E6/06E7 small wāw/yāʾ,
    U+0654 hamza on a seat or a tatweel, U+06D6–06DB pause signs.
"""
import re

CONS = {'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
        'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
        'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'y', 'ة': 't',
        'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ'}
SUN = set('تثدذرزسشصضطظلن')
FATHA, KASRA, DAMMA = 'َ', 'ِ', 'ُ'
SHADDA = 'ّ'
SUKUN = {'ْ', 'ۡ'}
TAN_A = {'ً', 'ࣰ', 'ٗ'}
TAN_U = {'ٌ', 'ࣱ', 'ٞ'}
TAN_I = {'ٍ', 'ࣲ', 'ٖ'}
DAGGER, MADDA = 'ٰ', 'ٓ'
SMALL_WAW, SMALL_YA, SMALL_HIGH_YA = 'ۥ', 'ۦ', 'ۧ'
SILENT = {'۟', '۠'}            # the letter is not pronounced (06E0: except in pause)
HAMZA_MARKS = {'ٔ', 'ٕ'}
PAUSE = re.compile('[\u06D6-\u06DB\u06DE\u06E9\u06E4]')
IGNORE = set('\u06DC\u06E8\u06EA\u06EB\u06EC\u06E4\u200c\u0640\u06DD')  # tatweel handled separately
IQLAB = {'\u06E2', '\u06ED'}   # small mīm: nūn / tanwīn read as m before bāʾ
MARKS = set('\u06E2\u06ED\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0656\u0657\u065E\u0670\u06E1\u06E5\u06E6\u06DF\u06E0\u08F0\u08F1\u08F2')
UTHMANI = [False]
VOW = {FATHA: 'a', KASRA: 'i', DAMMA: 'u'}


def letters(word):
    """Split a word into [letter, marks] units."""
    out = []
    for ch in word:
        if PAUSE.match(ch) or ch in '۞۩':
            continue
        if ch == 'ـ':                       # tatweel: a seat for a hamza or a small yāʾ
            out.append(['ـ', []])
            continue
        if ch in IGNORE:
            continue
        if UTHMANI[0] and ch == 'ْ':
            ch = '۟'
        if ch in HAMZA_MARKS and out:
            if out[-1][0] in 'ـاوىي':
                out[-1][0] = 'ء'
            continue
        if ch == SMALL_HIGH_YA and out:
            if out[-1][0] == 'ـ':
                out[-1][0] = 'ي'
            else:
                out[-1][1].append(SMALL_YA)
            continue
        if ch in MARKS:
            if out:
                out[-1][1].append(ch)
            continue
        if 'ء' <= ch <= 'ي' or ch == 'ٱ':
            out.append([ch, []])
    res = []
    for c, m in out:
        if c == 'ـ':
            if res:
                res[-1][1].extend(m)
            continue
        res.append([c, m])
    return res


def vowel_of(m):
    for k, v in VOW.items():
        if k in m:
            return v
    return ''


def tanwin(m):
    s = set(m)
    if s & IQLAB and not (s & SUKUN) and vowel_of(m):
        return 'n'         # KFGQPC writes tanwīn before bāʾ as a vowel plus a small mīm
    return 'an' if s & TAN_A else 'in' if s & TAN_I else 'un' if s & TAN_U else ''


def word_tl(word, prev_vowel_end, pausal):
    """Transliterate one word. prev_vowel_end: the previous word ended in a vowel,
    so a connecting alif is silent. Returns (text, ends_in_vowel)."""
    L = letters(word)
    n = len(L)
    if not n:
        return '', prev_vowel_end
    res = []
    assim = False
    i = 0
    while i < n:
        c, m = L[i]
        nxt = L[i + 1] if i + 1 < n else None
        third = L[i + 2] if i + 2 < n else None
        ms = set(m)
        # ---- connecting alif at the start of the word
        if i == 0 and c in 'اٱ' and not vowel_of(m) and not (ms & TAN_A) and MADDA not in m:
            start = '' if prev_vowel_end else 'a'
            if nxt and nxt[0] == 'ل' and SHADDA in nxt[1]:          # allatī, alladhīna, allayl
                res.append(start)
                i += 1
                continue
            if nxt and nxt[0] == 'ل' and not vowel_of(nxt[1]):       # the article
                if third and third[0] in SUN and SHADDA in third[1] and third[0] != 'ل':
                    res.append(start)
                    assim = True
                else:
                    res.append(start + 'l-')
                i += 2
                continue
            if not prev_vowel_end:                                     # helping vowel before a verb
                res.append('u' if third and DAMMA in third[1] else 'i')
            i += 1
            continue
        # ---- connecting alif after a prefix (wa-, fa-, bi-, li-, ka-)
        prefix_ok = i and all(L[k][0] in 'وفبكلت' and vowel_of(L[k][1]) for k in range(i)) and i <= 2
        if c in 'اٱ' and i and not vowel_of(m) and not (ms & TAN_A) and MADDA not in m and not (ms & SILENT) and (
                c == 'ٱ' or (prefix_ok and nxt and ((set(nxt[1]) & SUKUN) or (nxt[0] == 'ل' and not vowel_of(nxt[1]) and not tanwin(nxt[1]))))):
            if nxt and nxt[0] == 'ل' and not vowel_of(nxt[1]) and prefix_ok:
                if third and third[0] in SUN and SHADDA in third[1] and third[0] != 'ل':
                    res.append('-')
                    assim = True
                elif third and third[0] == 'ل' and SHADDA in third[1]:
                    res.append('-')
                else:
                    res.append('-l-')
                i += 2
                continue
            i += 1        # bismika, washdud, wattaqū, walladhīna
            continue
        # ---- li- + article with its alif dropped: lil-muttaqīn
        if c == 'ل' and KASRA in m and SHADDA not in m and nxt and nxt[0] == 'ل' and (set(nxt[1]) & SUKUN or (third and SHADDA in third[1] and not vowel_of(nxt[1]))) \
                and all(L[k][0] in 'وف' for k in range(i)):
            if third and SHADDA in third[1] and third[0] in SUN and third[0] != 'ل' and not (set(nxt[1]) & SUKUN):
                res.append('li-'); assim = True
            else:
                res.append('lil-')
            i += 2
            continue
        # ---- connecting alif right after the article (al-ittiṣāl)
        if c == 'ا' and not m and i >= 2 and L[i - 1][0] == 'ل' and not vowel_of(L[i - 1][1]) and not tanwin(L[i - 1][1]) \
                and L[i - 2][0] in 'اٱ' and all(L[k][0] in 'وفبكل' for k in range(i - 2)):
            res.append('i')
            i += 1
            continue
        if ms & SILENT:
            i += 1
            continue
        # ---- alif in the word
        if c in 'اآ':
            if c == 'آ' or MADDA in m:
                res.append('ʾā' if (i and c == 'آ' and not UTHMANI[0] and FATHA not in L[i - 1][1]) else 'ā')
                i += 1
                continue
            v = vowel_of(m)
            if v:
                res.append(('ʾ' if i else '') + v + tanwin(m))
                i += 1
                continue
            if ms & TAN_A:
                res.append('an')
                i += 1
                continue
            if i and ((set(L[i - 1][1]) & TAN_A) or (set(L[i - 1][1]) & IQLAB and FATHA in L[i - 1][1])):   # the alif that carries tanwīn
                i += 1
                continue
            if i == n - 1 and i and L[i - 1][0] == 'و' and not vowel_of(L[i - 1][1]):   # silent alif after plural wāw
                i += 1
                continue
            res.append('ā')
            i += 1
            continue
        # ---- alif maqṣūra
        if c == 'ى' and not vowel_of(m) and SHADDA not in m:
            if i and ((set(L[i - 1][1]) & TAN_A) or (set(L[i - 1][1]) & IQLAB and FATHA in L[i - 1][1])):   # hudan: the yāʾ only carries the tanwīn
                i += 1
                continue
            if ms & TAN_A:
                res.append('an')
            elif i and KASRA in L[i - 1][1]:
                res.append('ī')
            else:
                res.append('ā')
            i += 1
            continue
        # ---- wāw / yāʾ carrying a dagger alif: read ā (ṣalāh, ḥayāh, zakāh)
        if c in 'وي' and DAGGER in m and not vowel_of(m) and SHADDA not in m:
            res.append('ā')
            i += 1
            continue
        # ---- a yāʾ / wāw with no mark before alif: consonant with implied fatha (ghiyāth, rāḍiyan)
        if not UTHMANI[0] and c in 'يو' and not m and i and nxt and nxt[0] == 'ا' and not vowel_of(nxt[1]) and not (set(nxt[1]) & SILENT):
            res.append(CONS[c] + ('an' if set(nxt[1]) & TAN_A else 'ā'))
            i += 2
            continue
        # ---- long ī / ū written with yāʾ / wāw
        prev = next((L[k] for k in range(i - 1, -1, -1) if not (set(L[k][1]) & SILENT)), None)
        if c == 'ي' and i and ms <= {MADDA} and prev and KASRA in prev[1]:
            res.append('ī')
            i += 1
            continue
        if c == 'و' and i and ms <= {MADDA} and prev and DAMMA in prev[1]:
            res.append('ū')
            i += 1
            continue
        # ---- consonant
        cons = CONS.get(c, '')
        if c in 'أإؤئء' and i == 0:
            cons = ''
        if SHADDA in m:
            if assim:
                cons = cons + '-' + cons
            elif i > 0:
                cons = cons + cons
            # a shadda on the first letter comes from the previous word (idghām): one letter here
        assim = False
        v = vowel_of(m)
        if MADDA in m and c in 'أءإ':
            v = 'ā'
        if DAGGER in m:
            v = 'ā'
        if SMALL_WAW in m:
            v = 'ū'
        if SMALL_YA in m:
            v = 'ī'
        res.append(cons + v + tanwin(m))
        i += 1
    text = ''.join(res).replace('l-ʾ', 'l-')
    text = text.replace('aā', 'ā').replace('iī', 'ī').replace('uū', 'ū').replace('āā', 'ā')
    if pausal:
        if letters(word)[-1][0] == 'ة':
            text = re.sub(r't(un|in|an|u|i|a)$', 'h', text)
        elif text.endswith('an'):
            text = text[:-2] + 'ā'
        else:
            text = re.sub(r'(un|in)$', '', text)
            text = re.sub(r'(?<=[^aiuāīū])[aiu]$', '', text)
            text = re.sub(r'(?<=[^aiuāīū])ī$', 'ī', text)
    return text, bool(re.search(r'[aiuāīū]$', text))


HIDDEN_A = {'هذا': 1, 'هذه': 1, 'هذان': 1, 'هكذا': 1, 'هؤلاء': 1, 'لكن': 1, 'لكنك': 1, 'لكنه': 1, 'لكنني': 1,
            'اله': 2, 'الهي': 2, 'الها': 2, 'الهك': 2}
BARE = re.compile('[ً-ٰٟۖ-ۭـ]')


def bare(w):
    return BARE.sub('', w).replace('ٱ', 'ا')


def restore_a(w):
    """Ordinary spelling leaves out the long ā of hādhā, lākin, ilāh: put the dagger alif back."""
    if UTHMANI[0] or DAGGER in w:
        return w
    b = bare(w)
    core = re.sub('^[وف]', '', b).replace('أ', 'ا').replace('إ', 'ا')
    k = HIDDEN_A.get(core)
    if not k:
        return w
    seen = -1 if re.match('^[وف]', b) else 0
    out = ''
    for ch in w:
        out += ch
        if 'ء' <= ch <= 'ي':
            seen += 1
            if seen == k:
                out += DAGGER
    return out.replace(FATHA + DAGGER, DAGGER)


MUQATTAAT = {'ا': 'alif', 'ل': 'lām', 'م': 'mīm', 'ص': 'ṣād', 'ر': 'rā', 'ك': 'kāf', 'ه': 'hā', 'ي': 'yā', 'ع': 'ʿayn',
             'ط': 'ṭā', 'س': 'sīn', 'ح': 'ḥā', 'ق': 'qāf', 'ن': 'nūn'}


def allah(w, b, last, prev_vowel):
    """God's name, alone or with wa-/fa-/bi-/li-, and allāhumma."""
    m = re.match(r'^([وف])?([بلت])?(الله|لله)(م)?$', b)
    if not m:
        return None
    pre = {'و': 'wa', 'ف': 'fa'}.get(m.group(1) or '', '')
    if m.group(2):
        pre += {'ب': 'bi', 'ل': 'li', 'ت': 'ta'}[m.group(2)]
    elif m.group(3) == 'لله':
        pre += 'li'
    if m.group(4):
        core = 'llāhumma'
    else:
        vs = [ch for ch in w if ch in VOW]
        end = VOW[vs[-1]] if vs and BARE.sub('', PAUSE.sub('', w)) and PAUSE.sub('', w).rstrip(SHADDA).endswith(vs[-1]) else ''
        core = 'llāh' + ('' if last else end)
    if pre:
        return pre + core
    return core if prev_vowel else 'a' + core


def translit_words(words, pausal_last=True, uthmani=None):
    if uthmani is not None:
        UTHMANI[0] = uthmani
    out = []
    prev_vowel = False
    words = [restore_a(PAUSE.sub('', w)) for w in words]
    for k, w in enumerate(words):
        last = pausal_last and k == len(words) - 1
        b = bare(w)
        t = allah(w, b, last, prev_vowel)
        if t is None and UTHMANI[0] and k == 0 and MADDA in w and not any(ch in VOW for ch in w) and all(ch in MUQATTAAT for ch in b) and len(b) <= 5:
            t = '-'.join(MUQATTAAT[ch] for ch in b)        # the disjoined letters: alif-lām-mīm
        if t is None:
            t, _ = word_tl(w, prev_vowel, last)
        out.append(t)
        prev_vowel = bool(re.search(r'[aiuāīū]$', t))
    return out


def translit(words, uthmani=False):
    return ' '.join(translit_words(words, uthmani=uthmani))


if __name__ == '__main__':
    tests = [('اللّٰهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ', 0),
             ('اللّٰهُمَّ اغْفِرْ لِيَ الذُّنُوبَ الَّتِي تَهْتِكُ الْعِصَمَ', 0),
             ('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ', 1), ('ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ', 1),
             ('صِرَٰطَ ٱلَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ ٱلۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا ٱلضَّآلِّينَ', 1),
             ('الٓمٓ', 1), ('ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ', 1),
             ('ٱلَّذِينَ يُؤۡمِنُونَ بِٱلۡغَيۡبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقۡنَٰهُمۡ يُنفِقُونَ', 1)]
    for x, u in tests:
        print(translit(x.split(), uthmani=bool(u)))
