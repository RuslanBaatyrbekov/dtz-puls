/* DTZ-Puls · glossary
 * Tap-to-translate glossary and the "My words" deck.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* glossary: tap an underlined word for its translation; looked-up words go to the "My words" deck */
var GRE = /[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g;
function G() {
  return C.gloss || {};
}
function glemma(w) {
  var f = C.glossF || {};
  return f[w] || f[w.charAt(0).toLowerCase() + w.slice(1)] || '';
}
function gz(s) {
  s = String(s == null ? '' : s);
  if (!C.glossF) return esc(s);
  var out = '',
    last = 0,
    m;
  GRE.lastIndex = 0;
  while ((m = GRE.exec(s))) {
    var l = glemma(m[0]);
    if (!l || !G()[l]) continue;
    out +=
      esc(s.slice(last, m.index)) +
      '<span class="gw" data-a="gw" data-g="' +
      esc(l) +
      '" role="button" tabindex="0">' +
      esc(m[0]) +
      '</span>';
    last = m.index + m[0].length;
  }
  return out + esc(s.slice(last));
}
function gSay(de) {
  return de
    .replace(/,\s*[-¨][^\s;/]*/g, '')
    .replace(/\((Sg\.|Pl\.?)\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function gAdd(l) {
  S.my = S.my || {};
  if (!S.my[l]) {
    S.my[l] = today();
    save();
  }
}
function gPop(l) {
  var g = G()[l];
  if (!g) return;
  gAdd(l);
  S.glTip = 1;
  S.glN = (S.glN || 0) + 1;
  save();
  var p = $('#gpop');
  if (!p) {
    p = document.createElement('div');
    p.id = 'gpop';
    p.className = 'gpop';
    p.setAttribute('role', 'dialog');
    document.body.appendChild(p);
  }
  p.dataset.g = l;
  gPaint();
  p.classList.add('on');
}
function gPaint() {
  var p = $('#gpop');
  if (!p) return;
  var l = p.dataset.g,
    g = G()[l];
  if (!g) return;
  var inMy = !!(S.my && S.my[l]);
  p.innerHTML =
    '<div class="gph"><div class="gpw" lang="de" dir="ltr">' +
    cWord(g.de) +
    '</div><button class="x" data-a="gx" aria-label="' +
    esc(t('news.close')) +
    '">✕</button></div>' +
    '<div class="gpt" dir="auto">' +
    esc(L(g.t)) +
    '</div>' +
    '<div class="row gpr"><button class="btn small ghost say" data-a="say" data-txt="' +
    esc(gSay(g.de)) +
    '" aria-label="' +
    esc(t('btn.listen')) +
    '">🔊</button>' +
    (inMy
      ? '<span class="small grow" style="color:var(--ok)">✓ ' +
        esc(t('gl.in')) +
        '</span><button class="linkbtn small" data-a="gdel">' +
        esc(t('gl.remove')) +
        '</button>'
      : '<span class="grow"></span><button class="btn small" data-a="gadd">+ ' +
        esc(t('cards.my')) +
        '</button>') +
    '</div>';
}
function gClose() {
  var p = $('#gpop');
  if (p) p.classList.remove('on');
}
document.addEventListener(
  'click',
  function (e) {
    var p = $('#gpop');
    if (!p || !p.classList.contains('on')) return;
    if (p.contains(e.target) || e.target.closest('.gw')) return;
    gClose();
  },
  true
);
document.addEventListener('keydown', function (e) {
  var el = e.target;
  if (el && el.classList && el.classList.contains('gw') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    gPop(el.dataset.g);
  }
  if (e.key === 'Escape') gClose();
});
function myCards() {
  var g = G(),
    out = [];
  Object.keys(S.my || {}).forEach(function (l) {
    var x = g[l];
    if (x) out.push({ id: 'g:' + l, de: x.de, say: gSay(x.de), t: x.t, d: 'my' });
  });
  return out;
}
