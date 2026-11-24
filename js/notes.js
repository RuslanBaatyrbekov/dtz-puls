/* DTZ-Puls · notes
 * Cheat sheets.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* cheat sheets */
var NCAT = 'all',
  NQ = '',
  NOTE = null,
  NCATS = ['gram', 'write', 'speak', 'exam'];
function notes() {
  return (C.notes || []).filter(function (n) {
    return n && n.id;
  });
}
/** Text in a cheat sheet is either German (string) or localized ({ru: …, en: …}). **x** is bold. */
function tx(x) {
  return x && typeof x === 'object' ? L(x) : x == null ? '' : String(x);
}
function md(x) {
  return esc(tx(x)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
/** Table header / row label: 'main|small' shows a second, smaller line. */
function cellLabel(x) {
  var p = tx(x).split('|');
  return md(p[0]) + (p[1] ? '<small class="nsub">' + md(p[1]) + '</small>' : '');
}
function plain(x) {
  return String(x).replace(/\*\*/g, '').replace(/…/g, ' ');
}
/** All text of a sheet (German and the learner's language), flattened for search. */
function flatText(x) {
  if (Array.isArray(x)) return x.map(flatText).join(' ');
  return tx(x);
}
function nHay(n) {
  var b = (n.b || [])
    .map(function (x) {
      return [x.h, x.head, x.r, x.l].map(flatText).join(' ');
    })
    .join(' ');
  return (n.de + ' ' + L(n.tip) + ' ' + b).replace(/\*\*/g, '').toLowerCase();
}
function vNotes() {
  var ns = notes(),
    h =
      header() +
      '<section><div class="eyebrow">' +
      esc(t('tab.notes')) +
      '</div><h1>' +
      esc(t('notes.h')) +
      '</h1><p class="small muted" style="margin:6px 0 0;max-width:60ch">' +
      esc(t('notes.p')) +
      '</p></section>';
  if (!ns.length)
    return (
      h + '<section class="card"><p class="small" style="margin:0">' + esc(t('notes.none')) + '</p></section>'
    );
  h +=
    '<input class="txt nsearch" id="nq" type="search" dir="auto" autocomplete="off" placeholder="' +
    esc(t('notes.search')) +
    '" value="' +
    esc(NQ) +
    '">';
  h +=
    '<div class="ncats" role="tablist">' +
    ['all']
      .concat(NCATS)
      .map(function (c) {
        return (
          '<button class="chip' +
          (NCAT === c ? ' on' : '') +
          '" role="tab" aria-selected="' +
          (NCAT === c) +
          '" data-a="ncat" data-v="' +
          c +
          '">' +
          esc(c === 'all' ? t('notes.all') : t('notes.cat.' + c)) +
          '</button>'
        );
      })
      .join('') +
    '</div><div class="secs nlist">';
  ns.forEach(function (n) {
    var hide = (NCAT !== 'all' && n.cat !== NCAT) || (NQ && nHay(n).indexOf(NQ.toLowerCase()) < 0);
    h +=
      '<button class="sec nrow" data-a="note" data-v="' +
      esc(n.id) +
      '" data-cat="' +
      esc(n.cat) +
      '" data-q="' +
      esc(nHay(n)) +
      '"' +
      (hide ? ' hidden' : '') +
      '><span class="ico nico" aria-hidden="true">' +
      esc(n.ico || '📒') +
      '</span><span class="grow"><span class="tt" lang="de" dir="ltr">' +
      esc(n.de) +
      '</span><span class="st">' +
      esc(nShort(n)) +
      '</span></span><span aria-hidden="true" class="muted chev">›</span></button>';
  });
  h +=
    '</div><p class="small muted nempty"' +
    (nVisible() ? ' hidden' : '') +
    '>' +
    esc(t('notes.empty')) +
    '</p>';
  return h;
}
function nShort(n) {
  var x = L(n.tip) || '';
  var m = x.match(/^[^.。।။۔!?]+/);
  return m ? m[0] : x;
}
function nVisible() {
  return notes().some(function (n) {
    return !((NCAT !== 'all' && n.cat !== NCAT) || (NQ && nHay(n).indexOf(NQ.toLowerCase()) < 0));
  });
}
function nFilter() {
  document.querySelectorAll('.nrow').forEach(function (b) {
    b.hidden =
      (NCAT !== 'all' && b.dataset.cat !== NCAT) || (NQ && b.dataset.q.indexOf(NQ.toLowerCase()) < 0);
  });
  var e = document.querySelector('.nempty');
  if (e) e.hidden = nVisible();
}
function vNote() {
  var n = notes().filter(function (x) {
    return x.id === NOTE;
  })[0];
  if (!n) return vNotes();
  var h =
    header() +
    '<button class="btn small ghost nback" data-a="nback">← ' +
    esc(t('notes.back')) +
    '</button><section class="card note"><div class="eyebrow">' +
    esc(n.ico || '') +
    ' ' +
    esc(t('notes.cat.' + n.cat)) +
    '</div><h1 lang="de" dir="ltr">' +
    esc(n.de) +
    '</h1><p class="ntip">' +
    esc(L(n.tip)) +
    '</p></section>';
  (n.b || []).forEach(function (b) {
    // Default headings are bilingual: German first, the learner's language after it.
    var DE_HEAD = { key: 'Das Wichtigste', ex: 'Beispiele', err: 'Typische Fehler' };
    var title = b.h || (DE_HEAD[b.t] ? DE_HEAD[b.t] + ' · ' + t('notes.' + b.t) : '');
    var local = b.t === 'key';
    h +=
      '<section class="card nblock nb-' +
      b.t +
      '"' +
      (local ? '' : ' lang="de" dir="ltr"') +
      '>' +
      (title ? '<h3>' + (b.t === 'key' ? '💡 ' : b.t === 'err' ? '⚠️ ' : '') + md(title) + '</h3>' : '');
    if (b.t === 'key') {
      h +=
        '<ol class="nkey">' +
        b.l
          .map(function (x) {
            return '<li>' + md(x) + '</li>';
          })
          .join('') +
        '</ol>';
    } else if (b.t === 'ex') {
      h +=
        '<div class="nsay">' +
        b.l
          .map(function (x) {
            return (
              '<button class="nline nex" data-a="say" data-txt="' +
              esc(plain(x[0])) +
              '"><span class="nplay" aria-hidden="true">▶</span><span><span class="nde">' +
              md(x[0]) +
              '</span><span class="ntr" dir="auto" lang="' +
              LANG +
              '">' +
              md(x[1]) +
              '</span></span></button>'
            );
          })
          .join('') +
        '</div>';
    } else if (b.t === 'err') {
      h +=
        '<div class="nerr">' +
        b.l
          .map(function (x) {
            return (
              '<div class="nerow"><div class="nbad">✗ <s>' +
              md(x[0]) +
              '</s></div><div class="ngood">✓ ' +
              md(x[1]) +
              '</div><div class="nwhy" dir="auto" lang="' +
              LANG +
              '">' +
              md(x[2]) +
              '</div></div>'
            );
          })
          .join('') +
        '</div>';
    } else if (b.t === 'tab') {
      h +=
        '<div class="ntab' +
        ((b.head || []).length >= 4 ? ' nw' : '') +
        (b.g ? ' ng' : '') +
        '"><table><thead><tr>' +
        (b.head || [])
          .map(function (c) {
            return '<th>' + cellLabel(c) + '</th>';
          })
          .join('') +
        '</tr></thead><tbody>' +
        (b.r || [])
          .map(function (r) {
            return (
              '<tr>' +
              r
                .map(function (c, i) {
                  return i === 0 && r.length > 2
                    ? '<th scope="row"' +
                        (typeof c === 'object' ? ' dir="auto" lang="' + LANG + '"' : '') +
                        '>' +
                        cellLabel(c) +
                        '</th>'
                    : '<td>' + md(c) + '</td>';
                })
                .join('') +
              '</tr>'
            );
          })
          .join('') +
        '</tbody></table></div>';
    } else if (b.t === 'say') {
      h +=
        '<div class="nsay">' +
        (b.l || [])
          .map(function (x) {
            return (
              '<button class="nline" data-a="say" data-txt="' +
              esc(plain(x)) +
              '"><span class="nplay" aria-hidden="true">▶</span><span>' +
              md(x) +
              '</span></button>'
            );
          })
          .join('') +
        '</div>';
    } else
      h +=
        '<ul class="nlst">' +
        (b.l || [])
          .map(function (x) {
            return '<li>' + md(x) + '</li>';
          })
          .join('') +
        '</ul>';
    h += '</section>';
  });
  return h;
}
function openNote(id) {
  stopSay();
  S.nt = S.nt || {};
  S.nt[id] = (S.nt[id] || 0) + 1;
  save();
  if (view !== 'note') {
    try {
      history.pushState({ dtzNote: 1 }, '');
    } catch (e) {}
  }
  NOTE = id;
  view = 'note';
  render();
  window.scrollTo(0, 0);
}
function closeNote() {
  stopSay();
  NOTE = null;
  view = 'notes';
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', function () {
  if (view === 'note') closeNote();
});
