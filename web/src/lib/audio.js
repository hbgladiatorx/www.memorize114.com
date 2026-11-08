// Recitations streamed per verse from everyayah.com (files named SSSAAA.mp3).
// A plain <audio> element can play them cross-origin, so no download is needed.
export const RECITERS = {
  alafasy: { folder: 'Alafasy_128kbps', en: 'Mishary Rashid al-ʿAfāsī', ar: 'مشاري راشد العفاسي' },
  husary_muallim: { folder: 'Husary_Muallim_128kbps', en: 'al-Ḥuṣarī — muʿallim (teaching)', ar: 'الحُصَري — المعلِّم' },
  husary: { folder: 'Husary_128kbps', en: 'al-Ḥuṣarī — murattal', ar: 'الحُصَري — مرتَّل' },
  minshawi: { folder: 'Minshawy_Murattal_128kbps', en: 'al-Minshāwī — murattal', ar: 'المنشاوي — مرتَّل' },
};

const pad3 = (n) => String(n).padStart(3, '0');
export function verseUrl(surah, ayah, reciter = 'alafasy') {
  const r = RECITERS[reciter] || RECITERS.alafasy;
  return `https://everyayah.com/data/${r.folder}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

// One shared player so starting one recitation stops any other.
let current = null;
export function stopAudio() { if (current) { current.stop(); current = null; } }
export function claimAudio(handle) { stopAudio(); current = handle; }
export function releaseAudio(handle) { if (current === handle) current = null; }
