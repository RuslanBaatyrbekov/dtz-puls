/* DTZ-Puls · i18n
 * Interface languages: picking, applying and translating UI strings.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* DTZ-Puls: daily lessons + free practice for the Deutsch-Test für Zuwanderer (A2–B1).
 Fork of the Pulse engine: Supabase auth + RLS progress sync, observer view, review queue.
 UI and explanations in 12 languages; all exam material stays German. */

/* ---------- languages ---------- */
var LANGS = [
  ['ru', 'Русский'],
  ['uk', 'Українська'],
  ['en', 'English'],
  ['tr', 'Türkçe'],
  ['ar', 'العربية', 1],
  ['ur', 'اردو', 1],
  ['fa', 'فارسی', 1],
  ['hr', 'Hrvatski'],
  ['sr', 'Srpski'],
  ['my', 'မြန်မာ'],
  ['es', 'Español'],
  ['hi', 'हिन्दी']
];
var I18N = window.DTZ_I18N || {},
  LANG = 'ru';
var FONTS = {
  ar: 'Noto+Sans+Arabic:wght@400;600;700',
  ur: 'Noto+Nastaliq+Urdu:wght@400;600',
  fa: 'Vazirmatn:wght@400;600;700',
  my: 'Noto+Sans+Myanmar:wght@400;600;700',
  hi: 'Noto+Sans+Devanagari:wght@400;600;700'
};
function t(k, v) {
  var s = (I18N[LANG] && I18N[LANG][k]) || (I18N.en && I18N.en[k]) || (I18N.ru && I18N.ru[k]) || k;
  if (v)
    s = s.replace(/\{(\w+)\}/g, function (_, n) {
      return v[n] != null ? v[n] : '';
    });
  return s;
}
function L(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  return x[LANG] || x.en || x.ru || '';
}
function isRtl(l) {
  for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === l) return !!LANGS[i][2];
  return false;
}
function setLang(l, keep) {
  if (!I18N[l] && l !== 'ru' && l !== 'en') l = 'en';
  LANG = l;
  var h = document.documentElement;
  h.lang = l;
  h.dir = isRtl(l) ? 'rtl' : 'ltr';
  if (FONTS[l] && !document.getElementById('font-' + l)) {
    var k = document.createElement('link');
    k.id = 'font-' + l;
    k.rel = 'stylesheet';
    k.href = 'https://fonts.googleapis.com/css2?family=' + FONTS[l] + '&display=swap';
    document.head.appendChild(k);
  }
  h.style.setProperty(
    '--f-local',
    FONTS[l] ? '"' + decodeURIComponent(FONTS[l].split(':')[0]).replace(/\+/g, ' ') + '"' : '"Golos Text"'
  );
  try {
    localStorage.setItem('dtz-lang', l);
  } catch (e) {}
  if (!keep && S) {
    S.lang = l;
    save();
  }
}
