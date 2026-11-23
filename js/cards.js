/* DTZ-Puls · cards
 * Word flashcards with Leitner spaced repetition.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* word cards: Leitner boxes 1..5, intervals in days; ~10 new a day */
var CS = null,
  CMAP = null,
  CMAPC = null;
function cards() {
  var b = C.cards || [],
    m = C.gloss ? myCards() : [];
  return m.length ? m.concat(b) : b;
}
function cDecks() {
  var d = C.cardDecks || [],
    n = C.gloss ? myCards().length : 0;
  if (!n) return d;
  var tt = {};
  tt[LANG] = t('cards.my');
  tt.en = tt.en || t('cards.my');
  return [{ id: 'my', t: tt, n: n }].concat(d);
}
function cardBy(id) {
  if (id.indexOf('g:') === 0) {
    var x = G()[id.slice(2)];
    return x ? { id: id, de: x.de, say: gSay(x.de), t: x.t, d: 'my' } : null;
  }
  if (CMAPC !== C.cards) {
    CMAP = {};
    cards().forEach(function (c) {
      CMAP[c.id] = c;
    });
    CMAPC = C.cards;
  }
  return CMAP[id];
}
function cdeck() {
  var d = S.cdeck || 'all';
  return d === 'all' ||
    cDecks().some(function (x) {
      return x.id === d;
    })
    ? d
    : 'all';
}
function cPool() {
  var d = cdeck();
  return cards().filter(function (c) {
    return d === 'all' || c.d === d;
  });
}
function cNew() {
  var td = today();
  if (!S.cnew || S.cnew.d !== td) S.cnew = { d: td, n: 0, x: 0 };
  return S.cnew;
}
function cNewLeft() {
  var n = S.cnew && S.cnew.d === today() ? S.cnew : { n: 0, x: 0 };
  return Math.max(0, 10 + (n.x || 0) - (n.n || 0));
}
function cQueue() {
  var td = today(),
    due = [],
    nw = [],
    k = cNewLeft();
  cPool().forEach(function (c) {
    var s = S.cards[c.id];
    if (s) {
      if (s[1] <= td) due.push(c.id);
    } else if (nw.length < k) nw.push(c.id);
  });
  return { due: due, nw: nw };
}
function cLearned(st) {
  st = st || S;
  var n = 0;
  Object.keys(st.cards || {}).forEach(function (k) {
    if (st.cards[k][0] >= 3) n++;
  });
  return n;
}
function cToday() {
  var q = cQueue();
  return q.due.length + q.nw.length;
}
function cStart() {
  var q = cQueue();
  CS = { q: shuffle(q.due).concat(q.nw), pos: 0, flip: false, n: 0, again: {} };
  render();
  window.scrollTo(0, 0);
}
function cGrade(g) {
  if (!CS || !CS.flip) return;
  var id = CS.q[CS.pos],
    s = S.cards[id];
  stopSay();
  if (!s) cNew().n++;
  S.cards[id] = Core.scheduleCard(s, g, new Date());
  if (g === Core.GRADE.AGAIN && !CS.again[id]) {
    CS.again[id] = 1;
    CS.q.push(id);
  }
  if (g === Core.GRADE.GOOD) S.xp += 1;
  CS.n++;
  S.cn = (S.cn || 0) + 1;
  save();
  CS.pos++;
  CS.flip = false;
  CS.anim = 'fnew';
  CS.busy = false;
  render();
  if (CS.pos >= CS.q.length)
    setTimeout(function () {
      confetti(CS && CS.n >= 10);
    }, 150);
}
function cFlip() {
  if (!CS || CS.flip || CS.busy) return;
  var el = document.querySelector('.fcard');
  if (!el || RM) {
    CS.flip = true;
    render();
    return;
  }
  CS.busy = true;
  el.classList.add('fout');
  setTimeout(function () {
    if (!CS) return;
    CS.busy = false;
    CS.flip = true;
    CS.anim = 'fin';
    render();
  }, 170);
}
function cGo(g) {
  if (!CS || !CS.flip || CS.busy) return;
  var el = document.querySelector('.fcard');
  if (!el || RM) {
    cGrade(g);
    return;
  }
  CS.busy = true;
  el.classList.add(['gno', 'ghard', 'gok'][g]);
  setTimeout(function () {
    if (CS) cGrade(g);
  }, 230);
}
function cWord(de) {
  var m = de.match(/^(der|die|das) (.*)$/);
  if (!m) return esc(de);
  var i = m[2].indexOf(','),
    w = i < 0 ? m[2] : m[2].slice(0, i),
    r = i < 0 ? '' : m[2].slice(i);
  return (
    '<span class="art a-' +
    m[1] +
    '">' +
    m[1] +
    '</span> ' +
    esc(w) +
    (r ? '<span class="pl">' + esc(r) + '</span>' : '')
  );
}
function cCard() {
  var c = cardBy(CS.q[CS.pos]);
  if (!c) {
    CS.pos++;
    return vCards();
  }
  var h =
    '<div class="row small muted cbar"><span class="num">' +
    esc(t('cards.left', { n: CS.q.length - CS.pos })) +
    '</span><button class="linkbtn" data-a="cstop">' +
    esc(t('cards.stop')) +
    '</button></div>';
  var an = CS.anim || '';
  CS.anim = '';
  h +=
    '<section class="card fcard' +
    (CS.flip ? ' flip' : '') +
    (an ? ' ' + an : '') +
    '"><button class="fcw" data-a="cflip" lang="de" dir="ltr">' +
    cWord(c.de) +
    '</button>' +
    '<div class="row" style="justify-content:center"><button class="btn small ghost say" data-a="say" data-txt="' +
    esc(c.say || c.de) +
    '" aria-label="' +
    esc(t('btn.listen')) +
    '">🔊</button></div>';
  if (CS.flip) {
    h +=
      '<div class="fcb"><div class="fct" dir="auto">' +
      esc(L(c.t)) +
      '</div>' +
      (c.ex
        ? '<div class="fcex"><div class="eyebrow">' +
          esc(t('cards.ex')) +
          '</div><button class="nline" data-a="say" data-txt="' +
          esc(c.ex) +
          '" lang="de" dir="ltr"><span class="nplay" aria-hidden="true">▶</span><span>' +
          esc(c.ex) +
          '</span></button>' +
          (LANG === 'ru' && c.exr
            ? '<p class="small muted" style="margin:4px 0 0">' + esc(c.exr) + '</p>'
            : '') +
          '</div>'
        : '') +
      '</div>';
  }
  h += '</section>';
  h += CS.flip
    ? '<div class="cgr"><button class="btn cg0" data-a="cgrade" data-v="0">' +
      esc(t('cards.no')) +
      '</button><button class="btn cg1" data-a="cgrade" data-v="1">' +
      esc(t('cards.hard')) +
      '</button><button class="btn cg2" data-a="cgrade" data-v="2">' +
      esc(t('cards.yes')) +
      '</button></div>'
    : '<div class="foot"><button class="btn big-cta" data-a="cflip">' +
      esc(t('cards.flip')) +
      '</button></div>';
  return h;
}
function vCards() {
  var h =
    header() +
    '<button class="btn small ghost nback" data-a="cback">← ' +
    esc(t('tab.practice')) +
    '</button>';
  if (!cards().length)
    return (
      h + '<section class="card"><p class="small" style="margin:0">' + esc(t('notes.none')) + '</p></section>'
    );
  if (CS && CS.pos < CS.q.length) return h + cCard();
  var q = cQueue(),
    pool = cPool(),
    n = q.due.length + q.nw.length,
    lr = 0,
    stt = 0;
  pool.forEach(function (c) {
    var x = S.cards[c.id];
    if (x) {
      stt++;
      if (x[0] >= 3) lr++;
    }
  });
  h +=
    '<section><div class="eyebrow">🃏 ' +
    esc(t('tab.practice')) +
    '</div><h1>' +
    esc(t('cards.h')) +
    '</h1><p class="small muted" style="margin:6px 0 0;max-width:60ch">' +
    esc(t('cards.p')) +
    '</p></section>';
  h +=
    '<section class="card hero cstart">' +
    (CS && CS.n
      ? '<p class="small" style="margin:0;color:var(--ok)"><b>✓ ' +
        esc(t('cards.res', { n: CS.n })) +
        '</b></p>'
      : '') +
    '<div class="stats"><div class="stat"><b class="num">' +
    q.due.length +
    '</b><span class="small muted">' +
    esc(t('cards.due', { n: '' }).split(/[:：]/)[0]) +
    '</span></div><div class="stat"><b class="num">' +
    q.nw.length +
    '</b><span class="small muted">' +
    esc(t('cards.new', { n: '' }).split(/[:：]/)[0]) +
    '</span></div><div class="stat"><b class="num">' +
    (stt - lr) +
    '</b><span class="small muted">' +
    esc(t('cards.inwork')) +
    '</span></div></div>' +
    '<div><div class="bar acc cbar2"><i class="st" style="width:' +
    (pool.length ? Math.round((stt / pool.length) * 100) : 0) +
    '%"></i><i style="width:' +
    (pool.length ? Math.round((lr / pool.length) * 100) : 0) +
    '%"></i></div>' +
    '<p class="small" style="margin:6px 0 0"><b>' +
    esc(t('cards.learned', { a: lr, b: pool.length })) +
    '</b></p><p class="small muted" style="margin:2px 0 0">' +
    esc(t('cards.lhint')) +
    '</p></div>' +
    (n
      ? '<div class="foot"><button class="btn big-cta" data-a="cstart">' +
        esc(t('cards.start', { n: n })) +
        ' →</button></div>'
      : '<p class="small" style="margin:0">' +
        esc(t('cards.done')) +
        '</p><div class="foot"><button class="btn ghost" data-a="cmore">+ ' +
        esc(t('cards.more')) +
        '</button></div>') +
    '</section>';
  var d = cdeck();
  h +=
    '<div class="ncats cdecks">' +
    [['all', t('cards.all'), cards().length]]
      .concat(
        cDecks().map(function (x) {
          return [x.id, L(x.t).replace('Linie 1 B1 · ', ''), x.n];
        })
      )
      .map(function (x) {
        return (
          '<button class="chip' +
          (d === x[0] ? ' on' : '') +
          '" aria-pressed="' +
          (d === x[0]) +
          '" data-a="cdeck" data-v="' +
          esc(x[0]) +
          '"' +
          (/^l\d/.test(x[0]) ? ' lang="de" dir="ltr"' : '') +
          '>' +
          (x[0] === 'my' ? '⭐ ' : '') +
          esc(x[1]) +
          ' <span class="muted num">' +
          x[2] +
          '</span></button>'
        );
      })
      .join('') +
    '</div>';
  return h;
}
