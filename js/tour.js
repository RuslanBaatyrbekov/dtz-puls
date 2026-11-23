/* DTZ-Puls · tour
 * First-visit guided tour.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* first-visit tour */
var TOURQ = false,
  TOUR = -1,
  TOURN = 8,
  TOURI = ['🌐', '👋', '📅', '🏋️', '📒', '🏁', '👤', '🗣️'],
  TOURK = ['', '0', '1', '2', 'n', '3', '4', '5'];
var TOURT = [
  null,
  null,
  '.hero .todaygo',
  '#tabs [data-v="practice"]',
  '#tabs [data-v="notes"]',
  '#tabs [data-v="top"]',
  '#app .hdr .mebtn',
  null
];
function vTour() {
  if (TOUR < 0) return '';
  var last = TOUR === TOURN - 1;
  var spot = TOURT[TOUR] && document.querySelector(TOURT[TOUR]);
  return (
    '<div class="tour' +
    (spot ? ' spot' : '') +
    '" role="dialog" aria-modal="true" aria-labelledby="tourh">' +
    (spot ? '<div class="hole"></div>' : '') +
    '<div class="tourbox">' +
    (spot ? '<span class="tarr"></span>' : '') +
    '<div class="tourico" aria-hidden="true">' +
    TOURI[TOUR] +
    '</div>' +
    (TOUR === 0
      ? '<h2 id="tourh" style="font-size:17px">' + LANGHEAD + '</h2>' + langGrid()
      : '<h2 id="tourh">' +
        esc(t('tour.h' + TOURK[TOUR])) +
        '</h2><p>' +
        esc(t('tour.p' + TOURK[TOUR])) +
        '</p>') +
    '<div class="tourdots">' +
    Array.from({ length: TOURN }, function (_, i) {
      return '<i class="' + (i === TOUR ? 'on' : '') + '"></i>';
    }).join('') +
    '</div>' +
    '<p class="tourrw">' +
    esc(t('tour.step', { n: TOUR + 1, m: TOURN })) +
    '</p>' +
    (TOURQ
      ? '<div class="tourq"><p>' +
        esc(t('tour.skipq')) +
        '</p><div class="foot"><button class="btn" data-a="tourcont">' +
        esc(t('tour.cont')) +
        '</button><button class="linkbtn" data-a="tourskip">' +
        esc(t('tour.skipyes')) +
        '</button></div></div>'
      : '<div class="foot">' +
        (last || TOUR === 0
          ? ''
          : '<button class="linkbtn" data-a="tourask">' + esc(t('tour.skip')) + '</button>') +
        '<button class="btn" data-a="tournext">' +
        esc(last ? t('tour.go') : t('tour.next')) +
        '</button></div>') +
    '</div></div>'
  );
}
/* place the highlight over the target and the tip next to it */
function placeTour() {
  var box = document.querySelector('.tour.spot');
  if (!box) return;
  var el = document.querySelector(TOURT[TOUR]);
  if (!el) return;
  var r = el.getBoundingClientRect(),
    vh = window.innerHeight,
    vw = document.documentElement.clientWidth || window.innerWidth,
    pad = 6,
    hole = box.querySelector('.hole'),
    tip = box.querySelector('.tourbox'),
    arr = box.querySelector('.tarr');
  hole.style.left = r.left - pad + 'px';
  hole.style.top = r.top - pad + 'px';
  hole.style.width = r.width + pad * 2 + 'px';
  hole.style.height = r.height + pad * 2 + 'px';
  var w = Math.min(360, vw - 24);
  tip.style.width = w + 'px';
  var cx = r.left + r.width / 2,
    left = Math.max(12, Math.min(vw - w - 12, cx - w / 2));
  tip.style.left = left + 'px';
  arr.style.left = Math.max(16, Math.min(w - 28, cx - left - 8)) + 'px';
  var above = r.top - pad - 14 - 12,
    below = vh - r.bottom - pad - 14 - 12;
  if (above > below) {
    tip.style.top = 'auto';
    tip.style.bottom = vh - r.top + pad + 14 + 'px';
    tip.style.maxHeight = above + 'px';
    arr.className = 'tarr down';
  } else {
    tip.style.bottom = 'auto';
    tip.style.top = r.bottom + pad + 14 + 'px';
    tip.style.maxHeight = below + 'px';
    arr.className = 'tarr up';
  }
  tip.style.overflow = '';
  if (tip.scrollHeight > tip.clientHeight + 2) {
    tip.style.overflow = 'auto';
    arr.style.display = 'none';
  } else arr.style.display = '';
}
window.addEventListener('resize', placeTour);
window.addEventListener('scroll', placeTour, { passive: true });
function maybeTour() {
  if (!S.tour && TOUR < 0 && ALL.length && VIEWS.indexOf(view) >= 0 && view !== 'watch') {
    if (view !== 'path') {
      view = 'path';
      try {
        history.replaceState(null, '', '#path');
      } catch (e) {}
    }
    TOUR = LANGCHOSEN ? 1 : 0;
  }
}
