/* DTZ-Puls · screen-observer
 * Observer screen: learners' progress for the teacher / organiser.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* observer */
var W = { docs: null, at: 0, err: '', ch: null, poll: null, busy: false };
function ago(ts) {
  if (!ts) return '—';
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return t('ago.now');
  if (m < 60) return t('ago.min', { n: m });
  var hh = Math.round(m / 60);
  if (hh < 24) return t('ago.h', { n: hh });
  return t('ago.d', { n: Math.round(hh / 24) });
}
function loadWatch() {
  if (!SB || !OWNER || W.busy) return;
  W.busy = true;
  SB.from('progress')
    .select('user_id,state,updated_at')
    .then(
      function (r) {
        W.busy = false;
        if (r.error) {
          W.err = r.error.message || 'error';
        } else {
          W.err = '';
          W.at = Date.now();
          W.docs = (r.data || [])
            .filter(function (x) {
              return x.user_id !== ME && x.state;
            })
            .map(function (x) {
              var o = fix(x.state);
              o._id = x.user_id;
              return o;
            });
        }
        if (view === 'watch') renderKeep();
      },
      function () {
        W.busy = false;
        W.err = 'offline';
        if (view === 'watch') render();
      }
    );
}
/* re-render without losing what the observer is typing: open <details>, field values, focus */
function renderKeep() {
  var app = $('#app');
  if (!app) {
    render();
    return;
  }
  var det = [].map.call(app.querySelectorAll('details'), function (d) {
    return d.open;
  });
  var vals = {};
  app.querySelectorAll('input,select,textarea').forEach(function (f, i) {
    var k = f.id || f.name || '#' + i;
    vals[k] = f.type === 'checkbox' || f.type === 'radio' ? { c: f.checked } : { v: f.value };
  });
  var ae = document.activeElement,
    fk = ae && app.contains(ae) ? ae.id || ae.name : null,
    sel = null;
  try {
    if (fk && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd];
  } catch (e) {}
  var y = window.scrollY;
  render();
  [].forEach.call(app.querySelectorAll('details'), function (d, i) {
    if (det[i] != null && !d.classList.contains('upl')) d.open = det[i];
  });
  app.querySelectorAll('input,select,textarea').forEach(function (f, i) {
    var k = f.id || f.name || '#' + i,
      o = vals[k];
    if (!o) return;
    if ('c' in o) f.checked = o.c;
    else if (f.type !== 'file') f.value = o.v;
  });
  if (fk) {
    var n = document.getElementById(fk) || app.querySelector('[name="' + fk + '"]');
    if (n) {
      try {
        n.focus({ preventScroll: true });
        if (sel) n.setSelectionRange(sel[0], sel[1]);
      } catch (e) {}
    }
  }
  window.scrollTo(0, y);
}
function startWatch() {
  if (!SB || !OWNER) return;
  if (!W.docs && !W.busy) loadWatch();
  if (!W.ch && SB.channel) {
    try {
      W.ch = SB.channel('progress-watch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'progress' }, function () {
          clearTimeout(W.deb);
          W.deb = setTimeout(loadWatch, 4000);
        })
        .subscribe();
    } catch (e) {
      W.ch = null;
    }
  }
  if (!W.poll)
    W.poll = setInterval(function () {
      if (view === 'watch' && !document.hidden) loadWatch();
    }, 60000);
}
function learnerRow(st) {
  var name = st.name || st.email || '—',
    s = streak(st),
    dn = doneCount(st),
    td = st.days[today()] !== undefined,
    wk = 0,
    tt = new Date();
  for (var i = 0; i < 7; i++) if (st.days[ds(addDays(tt, -i))] !== undefined) wk++;
  var miss = {};
  Object.keys(st.missed || {}).forEach(function (k) {
    var x = BANK[k];
    if (x) miss[x._s] = (miss[x._s] || 0) + 1;
  });
  return (
    '<section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="row" style="justify-content:space-between"><h2>' +
    (st.avatar ? esc(st.avatar) + ' ' : '') +
    esc(name) +
    '</h2><span class="chip" style="' +
    (td ? 'border-color:var(--ok);color:var(--ok)' : '') +
    '">' +
    esc(td ? t('w.today') : t('w.notyet')) +
    '</span></div>' +
    '<p class="small muted" style="margin:0">' +
    esc(t('w.last', { t: ago(st.t) })) +
    ' · ' +
    (st.lang ? esc(st.lang.toUpperCase()) : '') +
    ' · ' +
    esc(st.tourDone ? t('w.tour') : t('w.notour')) +
    '</p>' +
    stripSvg(st) +
    '<div class="stats"><div class="stat"><b class="num" style="color:var(--pulse)">' +
    s +
    '</b><span class="small muted">' +
    esc(t('chip.streak')) +
    '</span></div><div class="stat"><b class="num">' +
    dn +
    ' / ' +
    TOTAL +
    '</b><span class="small muted">' +
    esc(t('prog.days')) +
    '</span></div><div class="stat"><b class="num">' +
    wk +
    '/7</b><span class="small muted">' +
    esc(t('w.week')) +
    '</span></div></div>' +
    wTags(
      t('w.prac'),
      Object.keys(st.prac || {})
        .sort(function (a, b) {
          return st.prac[b] - st.prac[a];
        })
        .map(function (k) {
          return [t('sec.' + k), st.prac[k]];
        })
    ) +
    wTags(
      t('w.notes'),
      Object.keys(st.nt || {})
        .sort(function (a, b) {
          return st.nt[b] - st.nt[a];
        })
        .map(function (k) {
          var n = notes().filter(function (x) {
            return x.id === k;
          })[0];
          return [n ? n.de : k, st.nt[k]];
        })
    ) +
    '<div class="small wtags"><b>' +
    esc(t('w.cards')) +
    ':</b> ' +
    (Object.keys(st.cards || {}).length
      ? '<span class="tag">' +
        esc(t('w.cardsv', { a: cLearned(st), b: Object.keys(st.cards).length })) +
        '</span>'
      : '<span class="muted">' + esc(t('w.nothing')) + '</span>') +
    '</div>' +
    wTags(
      t('w.miss'),
      Object.keys(miss).map(function (k) {
        return [t('sec.' + k), miss[k]];
      })
    ) +
    '</section>'
  );
}
function wTags(label, items) {
  return (
    '<div class="small wtags"><b>' +
    esc(label) +
    ':</b> ' +
    (items.length
      ? items
          .map(function (x) {
            return '<span class="tag">' + esc(x[0]) + ' · ' + x[1] + '</span>';
          })
          .join(' ')
      : '<span class="muted">' + esc(t('w.nothing')) + '</span>') +
    '</div>'
  );
}
function vWatch() {
  if (!OWNER) return header() + '<div class="card">' + esc(t('w.only')) + '</div>';
  startWatch();
  var h =
    header() +
    '<section><div class="eyebrow">' +
    esc(t('tab.watch')) +
    '</div><h1>' +
    esc(t('w.h')) +
    '</h1>' +
    (W.at
      ? '<p class="small muted" style="margin:6px 0 0">' + esc(t('w.at', { t: ago(W.at) })) + '</p>'
      : '') +
    '<p class="small muted wleg" style="margin:6px 0 0"><span class="wst on"></span> ' +
    esc(t('w.online')) +
    ' · <span class="wtd">' +
    esc(t('w.today')) +
    '</span></p></section>' +
    vAdd() +
    vUpload();
  if (W.err) return h + '<div class="card">' + esc(t('w.err')) + '</div>';
  if (!W.docs) return h + '<div class="card">' + esc(t('boot')) + '</div>';
  if (!W.docs.length) return h + '<div class="card">' + esc(t('w.none')) + '</div>';
  var td = today(),
    act = W.docs.filter(function (x) {
      return x.days[td] !== undefined;
    }).length,
    sort = W.sort || 'recent';
  var keyf = {
    recent: function (x) {
      return x.t || 0;
    },
    streak: function (x) {
      return streak(x);
    },
    days: function (x) {
      return doneCount(x) * 1e6 + (x.xp || 0);
    },
    name: function (x) {
      return 0;
    }
  }[sort];
  var docs = W.docs.slice().sort(
    sort === 'name'
      ? function (a, b) {
          return String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''));
        }
      : function (a, b) {
          return keyf(b) - keyf(a);
        }
  );
  h +=
    '<div class="wsum"><b class="num">' +
    act +
    ' / ' +
    W.docs.length +
    '</b><span class="small">' +
    esc(t('w.sum')) +
    '</span></div>';
  h +=
    '<div class="row small" style="gap:6px"><span class="muted">' +
    esc(t('w.sort')) +
    '</span>' +
    ['recent', 'streak', 'days', 'name']
      .map(function (k) {
        return (
          '<button class="chipbtn' +
          (sort === k ? ' on' : '') +
          '" data-a="wsort" data-v="' +
          k +
          '">' +
          esc(t('w.s.' + k)) +
          '</button>'
        );
      })
      .join('') +
    '</div>';
  return h + '<div class="wlist">' + docs.map(learnerLine).join('') + '</div>';
}
function learnerLine(st) {
  var id = st._id,
    open = W.open && W.open[id],
    name = st.name || st.email || '—',
    s = streak(st),
    dn = doneCount(st),
    td = st.days[today()] !== undefined,
    seenTs = Math.max(st.lastOn || 0, st.t || 0),
    dots = '',
    tt = new Date();
  for (var i = 6; i >= 0; i--) {
    dots += '<i class="' + (st.days[ds(addDays(tt, -i))] !== undefined ? 'a' : '') + '"></i>';
  }
  var row =
    '<button class="wline' +
    (open ? ' open' : '') +
    '" data-a="wopen" data-v="' +
    esc(id) +
    '" aria-expanded="' +
    !!open +
    '"><span class="wst' +
    (ONLINE[id] ? ' on' : '') +
    '" data-uid="' +
    esc(id) +
    '" title="' +
    (ONLINE[id] ? esc(t('w.online')) : '') +
    '"></span><span class="wav">' +
    esc(st.avatar || '🙂') +
    '</span><span class="grow wnm"><b>' +
    esc(name) +
    '</b>' +
    (td ? '<span class="wtd">' + esc(t('w.today')) + '</span>' : '') +
    '<span class="small muted wseen' +
    (ONLINE[id] ? ' onl' : '') +
    '" data-seen="' +
    esc(id) +
    '" data-ts="' +
    seenTs +
    '">' +
    esc(ONLINE[id] ? t('w.now') : t('w.seen', { t: ago(seenTs) })) +
    '</span></span><span class="wdots" aria-label="' +
    esc(t('w.week')) +
    '">' +
    dots +
    '</span><span class="wnum num wxp" title="XP">★' +
    (st.xp || 0) +
    '</span><span class="wnum num" title="' +
    esc(t('chip.streak')) +
    '">♥' +
    s +
    '</span><span class="wnum num" title="' +
    esc(t('prog.days')) +
    '">' +
    dn +
    '/' +
    TOTAL +
    '</span></button>';
  return row + (open ? learnerRow(st) : '');
}
