/* DTZ-Puls · screen-practice
 * Free practice screen.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* free practice */
function secStats(sec) {
  var a = C.bank[sec] || [],
    seen = 0,
    miss = 0;
  a.forEach(function (x) {
    if (S.seen[x._k]) seen++;
    if (S.missed[x._k]) miss++;
  });
  return { n: a.length, seen: seen, miss: miss };
}
var SEC_ICON = {
  kasus: 'der·den·dem',
  satz: 'weil … ist',
  hoeren: '♪',
  lesen: '¶',
  wort: 'A↔Б',
  sprechen: '„…“',
  schreiben: '✎'
};
function vPractice() {
  var h =
    header() +
    '<section><div class="eyebrow">' +
    esc(t('tab.practice')) +
    '</div><h1>' +
    esc(t('prac.h')) +
    '</h1><p class="small muted" style="margin:6px 0 0;max-width:60ch">' +
    esc(t('prac.p')) +
    '</p></section><div class="secs">';
  if (cards().length) {
    var cn = cToday();
    h +=
      '<button class="sec" data-a="cards"><span class="ico" aria-hidden="true" style="font-size:24px">🃏</span><span class="grow"><span class="tt">' +
      esc(t('sec.cards')) +
      '</span><br><span class="st">' +
      esc(t('sec.cards.d')) +
      '</span></span><span class="num small muted" style="text-align:end">' +
      Object.keys(S.cards).length +
      '/' +
      cards().length +
      (cn
        ? '<br><span style="color:var(--pulse);white-space:nowrap">' +
          esc(t('cards.left', { n: cn })) +
          '</span>'
        : '') +
      '</span></button>';
  }
  SECTIONS.forEach(function (sec) {
    var st = secStats(sec);
    if (!st.n) return;
    h +=
      '<button class="sec" data-a="prac" data-v="' +
      sec +
      '"><span class="ico" lang="de" dir="ltr">' +
      esc(SEC_ICON[sec]) +
      '</span><span class="grow"><span class="tt">' +
      esc(t('sec.' + sec)) +
      '</span><br><span class="st">' +
      esc(t('sec.' + sec + '.d')) +
      '</span></span><span class="num small muted" style="text-align:end">' +
      st.seen +
      '/' +
      st.n +
      (st.miss
        ? '<br><span style="color:var(--bad)">' + esc(t('prac.miss', { n: st.miss })) + '</span>'
        : '') +
      '</span></button>' +
      pracPartsRow(sec);
  });
  h +=
    '</div><section class="card"><h3>' +
    esc(t('prac.mock.h')) +
    '</h3><p class="small" style="margin:6px 0 10px">' +
    esc(t('prac.mock.p')) +
    '</p><div class="row"><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/DTZ_UEbungssatz_1_Erwachsene.pdf" target="_blank" rel="noopener">Übungssatz 1 PDF</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/Audio/gast_Deutsch-Test_fuer_Zuwanderer_UEbungssatz_1.mp3" target="_blank" rel="noopener">MP3 1</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/PDF/DTZ_UEbungssatz_2_Erwachsene.pdf" target="_blank" rel="noopener">Übungssatz 2 PDF</a><a class="btn small ghost" href="https://www.gast.de/fileadmin/gast.de/GAST/5_DTZ/Audio/gast_Deutsch-Test_fuer_Zuwanderer_UEbungssatz_2.mp3" target="_blank" rel="noopener">MP3 2</a></div></section>';
  return h;
}

/** Chips under a section to train just one part of it (Sprechen Teil 1/2/3, Hören by type). */
function pracPartsRow(sec) {
  var parts = PRAC_PARTS[sec];
  if (!parts) return '';
  var pool = C.bank[sec] || [];
  return (
    '<div class="secparts">' +
    parts
      .map(function (p) {
        var n = pool.filter(p.f).length;
        if (!n) return '';
        return (
          '<button class="chip" data-a="prac" data-v="' +
          sec +
          '" data-p="' +
          p.id +
          '">' +
          esc(t(p.key)) +
          ' <span class="muted num">' +
          n +
          '</span></button>'
        );
      })
      .join('') +
    '</div>'
  );
}
