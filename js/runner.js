/* DTZ-Puls · runner
 * Lesson and practice runner: tasks, checking answers, results.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- lesson / practice runner ---------- */
function openLesson(i) {
  var D = ALL[i],
    isNew = !S.done[D.id];
  if (isNew && i !== nextIdx() && !(D.opt && i < nextIdx())) return toast(t('toast.prev'));
  if (isNew && newToday() >= capToday()) return toast(t('toast.cap'));
  var q = (D.cards || [])
    .map(function (c) {
      return { k: 'card', c: c };
    })
    .concat(
      D._tasks.map(function (x) {
        return { k: 'task', t: x, first: true };
      })
    );
  startRun({ id: D.id, title: L(D.title), kind: 'lesson', boss: !!D.boss }, q, isNew);
}
function startRun(meta, q, isNew) {
  stopSay();
  if (view !== 'run' && view !== 'result') {
    BACK = view;
    try {
      history.pushState({ dtzRun: 1 }, '');
    } catch (e) {}
  }
  R = { L: meta, q: q, pos: 0, ok: 0, fixed: 0, isNew: !!isNew };
  T = null;
  view = 'run';
  render();
  window.scrollTo(0, 0);
}
function leaveRun() {
  stopSay();
  clearInterval(tmrI);
  var wasRun = view === 'run';
  R = null;
  T = null;
  view = BACK || 'path';
  try {
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  } catch (e) {}
  render();
  window.scrollTo(0, 0);
  return wasRun;
}
window.addEventListener('popstate', function () {
  if (view === 'run' || view === 'result') {
    if (leaveRun()) toast(t('toast.quit'));
  }
});
function pickFrom(pool, n) {
  var miss = shuffle(
      pool.filter(function (x) {
        return S.missed[x._k];
      })
    ),
    fresh = shuffle(
      pool.filter(function (x) {
        return !S.missed[x._k] && !S.seen[x._k];
      })
    ),
    old = pool
      .filter(function (x) {
        return !S.missed[x._k] && S.seen[x._k];
      })
      .sort(function (a, b) {
        return (S.seen[a._k] || '').localeCompare(S.seen[b._k] || '');
      });
  var all = miss.slice(0, Math.ceil(n / 2)).concat(fresh, old, miss.slice(Math.ceil(n / 2))),
    out = [],
    fr = {},
    kind = {};
  /* first pass: one task per situation (e.g. not two "Durchsage · Bahnhof" in a row); second pass fills up */
  [true, false].forEach(function (distinct) {
    all.forEach(function (x) {
      if (out.length >= n || out.indexOf(x) >= 0) return;
      if (x.fr && fr[x.fr]) return;
      if (distinct && x.k && kind[x.k]) return;
      if (x.fr) fr[x.fr] = 1;
      if (x.k) kind[x.k] = 1;
      out.push(x);
    });
  });
  return out;
}
/* Parts of a practice section that can be trained on their own (e.g. only Sprechen Teil 2). */
var HOEREN_KIND = function (re) {
  return function (x) {
    return re.test(String(x.k || ''));
  };
};
var PRAC_PARTS = {
  sprechen: [
    {
      id: '1',
      key: 'part.sp1',
      f: function (x) {
        return x.teil === 1;
      }
    },
    {
      id: '2',
      key: 'part.sp2',
      f: function (x) {
        return x.teil === 2;
      }
    },
    {
      id: '3',
      key: 'part.sp3',
      f: function (x) {
        return x.teil === 3;
      }
    }
  ],
  hoeren: [
    { id: 'ann', key: 'part.ann', f: HOEREN_KIND(/^(Durchsage|Telefonansage)/) },
    { id: 'phone', key: 'part.phone', f: HOEREN_KIND(/^(Anrufbeantworter|Telefonnachricht|Nachricht)/) },
    { id: 'radio', key: 'part.radio', f: HOEREN_KIND(/^Radio/) },
    { id: 'talk', key: 'part.talk', f: HOEREN_KIND(/^Gespräch/) }
  ]
};
function pracPart(sec, part) {
  return (PRAC_PARTS[sec] || []).filter(function (p) {
    return p.id === part;
  })[0];
}
function openPractice(sec, part) {
  var pp = part ? pracPart(sec, part) : null;
  var pool = (C.bank[sec] || []).filter(
    pp
      ? pp.f
      : function () {
          return true;
        }
  );
  if (!pool.length) return;
  var n = { sprechen: 3, schreiben: 1, lesen: 4, hoeren: 5 }[sec] || 8;
  var tasks = shuffle(pickFrom(pool, n));
  startRun(
    {
      id: 'prac-' + sec + (pp ? '-' + pp.id : ''),
      title: t('sec.' + sec) + (pp ? ' · ' + t(pp.key) : ''),
      kind: 'practice',
      sec: sec,
      part: pp ? pp.id : ''
    },
    tasks.map(function (x) {
      return { k: 'task', t: x, first: true };
    }),
    false
  );
}
function openReview() {
  var pool = [];
  ALL.forEach(function (d) {
    if (S.done[d.id])
      d._tasks.forEach(function (x) {
        pool.push(x);
      });
  });
  if (!pool.length) return toast(t('toast.noreview'));
  var tasks = pickFrom(pool, 8);
  startRun(
    { id: 'review', title: t('btn.review'), kind: 'review' },
    shuffle(tasks).map(function (x) {
      return { k: 'task', t: x, first: true };
    }),
    false
  );
}

function initTask(x) {
  T = { done: false, right: false };
  if (x.t === 'mc' || x.t === 'listen' || x.t === 'read') {
    T.opts = shuffle(
      x.o.map(function (_, i) {
        return i;
      })
    );
    T.sel = -1;
    T.plays = 0;
  }
  if (x.t === 'order') {
    T.pool = shuffle(
      x.w.map(function (_, i) {
        return i;
      })
    );
    if (
      T.pool.every(function (v, i) {
        return v === i;
      })
    )
      T.pool.reverse();
    T.ans = [];
  }
  if (x.t === 'match') {
    T.right_ = shuffle(
      x.pairs.map(function (_, i) {
        return i;
      })
    );
    T.l = -1;
    T.ok = {};
    T.err = 0;
    T.bad = null;
  }
  if (x.t === 'fill') {
    T.val = '';
    T.chips = x.o ? shuffle(x.o) : null;
  }
  if (x.t === 'speak') {
    T.shown = false;
    T.left = x.time || 60;
  }
  if (x.t === 'write') {
    T.sel = x.b.map(function () {
      return -1;
    });
    T.vals = {};
    T.tries = {};
    T.ok = false;
  }
}
function sayBtn(text, label, cls) {
  return (
    '<button class="btn small ghost say ' +
    (cls || '') +
    '" data-a="say" data-txt="' +
    esc(text) +
    '">▶ ' +
    esc(label || t('btn.listen')) +
    '</button>'
  );
}
function de(s) {
  return '<span lang="de" dir="ltr">' + s + '</span>';
}
function glTip(x) {
  return !S.glTip && x.gw && x.gw.length && C.glossF
    ? '<p class="small gltip">💡 ' + esc(t('gl.tip')) + '</p>'
    : '';
}
function vTask(st) {
  var x = st.t,
    h =
      glTip(x) +
      '<div class="eyebrow">' +
      esc(st.first ? t('sec.' + (x._s || 'kasus')) : t('run.again')) +
      '</div>';
  if (x.t === 'mc') {
    h +=
      '<h2>' +
      de(esc(x.q)) +
      '</h2>' +
      (x.qx ? '<p class="small muted">' + esc(L(x.qx)) + '</p>' : '') +
      optsHtml(x);
  }
  if (x.t === 'listen') {
    h +=
      '<h2>' +
      de(gz(x.q)) +
      '</h2><p class="small muted">' +
      esc(L(x.k) || t('run.listen')) +
      '</p><div class="row"><button class="play" data-a="play" aria-label="' +
      esc(t('btn.listen')) +
      '"><svg viewBox="0 0 24 24"><path class="pl" d="M8 5v14l11-7z"/><rect class="st" x="6" y="6" width="12" height="12" rx="2"/></svg></button><span class="small muted num">' +
      (T.plays ? esc(t('run.plays', { n: T.plays })) : esc(t('run.first'))) +
      '</span></div>' +
      optsHtml(x) +
      (T.done ? '<div class="tx" lang="de" dir="ltr">' + esc(x.text) + '</div>' : '');
  }
  if (x.t === 'read') {
    h +=
      '<div class="tx read" lang="de" dir="ltr">' +
      gz(x.text).replace(/\n/g, '<br>') +
      '</div><h2>' +
      de(gz(x.q)) +
      '</h2>' +
      optsHtml(x);
  }
  if (x.t === 'fill') {
    var inp =
      '<input id="fillin" class="gap" aria-label="' +
      esc(t('run.gap')) +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' +
      esc(T.val) +
      '"' +
      (T.done ? ' disabled' : '') +
      '>';
    h +=
      '<h2 class="sent">' +
      de(gz(x.s).replace('___', inp)) +
      '</h2>' +
      (x.qx ? '<p class="small muted">' + esc(L(x.qx)) + '</p>' : '');
    if (T.chips && !T.done)
      h +=
        '<div class="row">' +
        T.chips
          .map(function (c) {
            return (
              '<button class="chipbtn" data-a="chip" data-v="' +
              esc(c) +
              '" lang="de">' +
              esc(c) +
              '</button>'
            );
          })
          .join('') +
        '</div>';
    if (T.done && !T.right)
      h += '<p class="small">' + esc(t('run.right')) + ' <b lang="de">' + esc(x.a[0]) + '</b></p>';
  }
  if (x.t === 'order') {
    h +=
      '<h2>' +
      esc(L(x.qx) || t('run.order')) +
      '</h2><div class="lines words" dir="ltr" lang="de" aria-label="' +
      esc(t('run.yours')) +
      '">' +
      (T.ans.length
        ? T.ans
            .map(function (j) {
              return (
                '<button class="ln" data-a="unpick" data-j="' +
                j +
                '"' +
                (T.done ? ' disabled' : '') +
                '>' +
                esc(x.w[j]) +
                '</button>'
              );
            })
            .join('')
        : '<span class="small muted">' + esc(t('run.tap')) + '</span>') +
      '</div><div class="pool words" dir="ltr" lang="de">' +
      T.pool
        .filter(function (j) {
          return T.ans.indexOf(j) < 0;
        })
        .map(function (j) {
          return (
            '<button class="ln" data-a="pick" data-j="' +
            j +
            '"' +
            (T.done ? ' disabled' : '') +
            '>' +
            esc(x.w[j]) +
            '</button>'
          );
        })
        .join('') +
      '</div>';
    if (T.done && !T.right)
      h +=
        '<p class="small">' +
        esc(t('run.right')) +
        ' <b lang="de" dir="ltr">' +
        gz(x.w.join(' ')) +
        '</b></p>';
  }
  if (x.t === 'match') {
    h += '<h2>' + esc(t('run.match')) + '</h2><div class="match">';
    for (var i = 0; i < x.pairs.length; i++) {
      var r = T.right_[i];
      h +=
        '<button class="' +
        (T.ok[i] ? 'good' : T.l === i ? 'sel' : '') +
        '" data-a="ml" data-j="' +
        i +
        '"' +
        (T.ok[i] ? ' disabled' : '') +
        ' lang="de" dir="ltr">' +
        esc(x.pairs[i][0]) +
        '</button><button class="' +
        (T.ok[r] ? 'good' : T.bad === r ? 'wrong' : '') +
        '" data-a="mr" data-j="' +
        r +
        '"' +
        (T.ok[r] ? ' disabled' : '') +
        '>' +
        esc(L(x.pairs[r][1])) +
        '</button>';
    }
    h += '</div>';
  }
  if (x.t === 'speak') h += vSpeak(x);
  if (x.t === 'write') h += vWrite(x);
  if (T.done && x.t !== 'speak' && x.t !== 'write') {
    var ex = x.t === 'order' && !T.right && orderMidOnly(x) ? rule('mitte') || explain(x) : explain(x);
    h +=
      '<div class="fb ' +
      (T.right ? 'ok' : 'bad') +
      '" role="status"><b>' +
      esc(T.right ? t('run.ok') : t('run.no')) +
      '</b>' +
      (ex ? '<span>' + esc(ex) + '</span>' : '') +
      (T.right ? '' : '<span class="small">' + esc(t('run.back')) + '</span>') +
      '</div>';
    if (x.t === 'listen')
      h +=
        '<details class="trans"><summary>' +
        esc(t('gl.text')) +
        '</summary><div class="tx" lang="de" dir="ltr">' +
        gz(x.text) +
        '</div></details><div>' +
        sayBtn(x.text, t('run.shadow')) +
        '</div>';
    h += '<div class="foot"><button class="btn" data-a="next">' + esc(t('btn.next')) + '</button></div>';
  } else if (!T.done && x.t !== 'match' && x.t !== 'speak' && x.t !== 'write') {
    var ready =
      x.t === 'mc' || x.t === 'listen' || x.t === 'read'
        ? T.sel >= 0
        : x.t === 'order'
          ? T.ans.length === x.w.length
          : true;
    h +=
      '<div class="foot"><button class="btn" data-a="check"' +
      (ready ? '' : ' disabled') +
      '>' +
      esc(t('btn.check')) +
      '</button></div>';
  } else if (T.done && x.t === 'match')
    h += '<div class="foot"><button class="btn" data-a="next">' + esc(t('btn.next')) + '</button></div>';
  return h;
}
function optsHtml(x) {
  return (
    '<div class="opts" lang="de" dir="ltr">' +
    T.opts
      .map(function (j) {
        var cl = T.done ? (j === x.a ? ' good' : j === T.sel ? ' wrong' : '') : j === T.sel ? ' sel' : '';
        return (
          '<button class="opt' +
          cl +
          '" data-a="sel" data-j="' +
          j +
          '"' +
          (T.done ? ' disabled' : '') +
          '>' +
          esc(x.o[j]) +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}
function vSpeak(x) {
  var h = '<h2>' + esc(t('speak.teil' + x.teil)) + '</h2>';
  if (x.img) h += '<img class="bild" src="' + esc(x.img) + '" alt="' + esc(x.alt || '') + '" loading="lazy">';
  else if (x.sc) h += '<div class="scene" aria-hidden="true">' + esc(x.sc) + '</div>';
  h +=
    '<div class="prompt" lang="de" dir="ltr">' +
    gz(x.q).replace(/\n/g, '<br>') +
    '</div>' +
    (x.pts
      ? '<ul class="pts" lang="de" dir="ltr">' +
        x.pts
          .map(function (p) {
            return '<li>' + gz(p) + '</li>';
          })
          .join('') +
        '</ul>'
      : '');
  h += '<p class="small muted">' + esc(t('speak.how' + x.teil)) + '</p>';
  h +=
    '<div class="row">' +
    sayBtn(x.q, t('speak.hear')) +
    '<button class="btn small ghost" data-a="timer" id="tmr">⏱ ' +
    fmt(T.left) +
    '</button></div>';
  if (!T.shown)
    h +=
      '<div class="foot"><button class="btn" data-a="model">' +
      esc(x.teil === 2 ? t('speak.desc') : t('speak.model')) +
      '</button></div>';
  else {
    h +=
      '<div class="tx" lang="de" dir="ltr"><div class="eyebrow" dir="auto">' +
      esc(t('speak.modelh')) +
      '</div>' +
      (x.model || [])
        .map(function (m, i) {
          return '<p>' + (x.steps ? '<b>' + esc(x.steps[i] || '') + '</b><br>' : '') + gz(m) + '</p>';
        })
        .join('') +
      '</div><div>' +
      sayBtn((x.model || []).join(' '), t('speak.hearmodel')) +
      '</div>' +
      '<p class="small">' +
      esc(t('speak.rate')) +
      '</p><div class="foot"><button class="btn" data-a="srate" data-v="1">' +
      esc(t('speak.good')) +
      '</button><button class="btn ghost" data-a="srate" data-v="0">' +
      esc(t('speak.hard')) +
      '</button></div>';
  }
  return h;
}
function fmt(s) {
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
}
function gapHtml(s, pi) {
  var gi = 0;
  return esc(s).replace(/\{([^|}]+)\|([^}]+)\}/g, function (_, a, hn) {
    var id = pi + '_' + gi++,
      v = T.vals[id] || '',
      cls = T.tries[id] == null ? '' : T.tries[id] === 'ok' ? ' good' : ' bad';
    return (
      '<input class="gap' +
      cls +
      '" data-g="' +
      id +
      '" data-ans="' +
      esc(a) +
      '" value="' +
      esc(v) +
      '" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="' +
      esc(t('run.gap')) +
      '"' +
      (T.ok ? ' disabled' : '') +
      '><span class="hint" dir="auto">' +
      esc(hn) +
      (T.tries[id] >= 2 ? ' → <b>' + esc(a) + '</b>' : '') +
      '</span>'
    );
  });
}
function vWrite(x) {
  var h =
    '<h2>' +
    esc(t('write.h')) +
    '</h2><div class="prompt" lang="de" dir="ltr">' +
    gz(x.sit) +
    '<ul class="pts">' +
    x.p
      .map(function (p) {
        return '<li>' + gz(p) + '</li>';
      })
      .join('') +
    '</ul></div><p class="small muted">' +
    esc(t('write.how')) +
    '</p>';
  h +=
    '<div class="wb" lang="de" dir="ltr"><div class="pt"><div class="eyebrow">' +
    esc(t('write.greet')) +
    '</div>' +
    esc(x.g) +
    '</div>';
  x.b.forEach(function (opts, i) {
    h +=
      '<div class="pt"><div class="eyebrow" dir="auto">' +
      esc(t('write.point', { n: i + 1 })) +
      ' · ' +
      esc(x.p[i]) +
      '</div><div class="ideas">' +
      opts
        .map(function (o, j) {
          return (
            '<button class="idea' +
            (T.sel[i] === j ? ' on' : '') +
            '" data-a="idea" data-p="' +
            i +
            '" data-j="' +
            j +
            '" dir="auto">' +
            esc(L(o[0])) +
            '</button>'
          );
        })
        .join('') +
      '</div>' +
      (T.sel[i] >= 0 ? '<div class="sent">' + gapHtml(opts[T.sel[i]][1], i) + '</div>' : '') +
      '</div>';
  });
  h +=
    '<div class="pt"><div class="eyebrow" dir="auto">' +
    esc(t('write.close')) +
    '</div>' +
    esc(x.c).replace(/\n/g, '<br>') +
    '</div></div>';
  if (T.ok) {
    var full = assemble(x);
    h +=
      '<div class="tx" lang="de" dir="ltr">' +
      esc(full).replace(/\n/g, '<br>') +
      '</div><div>' +
      sayBtn(full, t('btn.listen')) +
      '</div><p class="small">' +
      esc(t('write.after')) +
      '</p><div class="foot"><button class="btn" data-a="next">' +
      esc(t('btn.next')) +
      '</button></div>';
  } else
    h += '<div class="foot"><button class="btn" data-a="wcheck">' + esc(t('btn.check')) + '</button></div>';
  return h;
}
function assemble(x) {
  return (
    x.g +
    '\n\n' +
    x.b
      .map(function (o, i) {
        return o[T.sel[i]][1].replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
      })
      .join(' ') +
    '\n\n' +
    x.c
  );
}
function vRun() {
  var st = R.q[R.pos],
    pct = Math.round((R.pos / R.q.length) * 100);
  var h =
    '<div class="runhead"><button class="x" data-a="quit">✕ ' +
    esc(t('run.quit')) +
    '</button><div class="bar acc grow"><i style="width:' +
    pct +
    '%"></i></div></div><section class="lesson">';
  if (st.k === 'card') {
    var c = st.c;
    h +=
      '<div class="eyebrow">' +
      esc(R.L.title) +
      '</div><h1>' +
      esc(L(c.h)) +
      '</h1>' +
      (c.t ? '<p>' + esc(L(c.t)) + '</p>' : '') +
      (c.de
        ? '<div class="tx" lang="de" dir="ltr">' +
          c.de
            .map(function (l) {
              return esc(l);
            })
            .join('<br>') +
          '</div>' +
          sayBtn(c.de.join(' '), t('btn.listen'))
        : '') +
      '<div class="foot"><button class="btn" data-a="next">' +
      esc(t('btn.next')) +
      '</button></div>';
  } else {
    if (!T) initTask(st.t);
    h += vTask(st);
  }
  return h + '</section>';
}
function norm(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[.,!?;:'"„“”‚‘’«»]/g, '')
    .replace(/\s+/g, ' ');
}
function settle(right) {
  var st = R.q[R.pos],
    x = st.t;
  T.done = true;
  T.right = right;
  S.seen[x._k] = today();
  if (right) {
    if (st.first) R.ok++;
    else R.fixed++;
    if (S.missed[x._k] && (R.L.kind !== 'lesson' || !st.first)) delete S.missed[x._k];
  } else {
    S.missed[x._k] = (S.missed[x._k] || 0) + 1;
    R.q.push({ k: 'task', t: x, first: false });
  }
  render();
}
function check() {
  var x = R.q[R.pos].t,
    ok = false;
  if (x.t === 'mc' || x.t === 'listen' || x.t === 'read') {
    if (x.t === 'listen' && !T.plays) return toast(t('toast.listenfirst'));
    ok = T.sel === x.a;
    stopSay();
  }
  if (x.t === 'fill') {
    T.val = $('#fillin').value;
    var v = norm(T.val);
    if (!v) return toast(t('toast.empty'));
    ok = x.a.some(function (a) {
      return norm(a) === v;
    });
  }
  if (x.t === 'order') {
    var got = norm(
      T.ans
        .map(function (j) {
          return x.w[j];
        })
        .join(' ')
    );
    ok = [x.w.join(' ')].concat(x.alt || []).some(function (a) {
      return norm(a) === got;
    });
  }
  settle(ok);
}
/* Order task answered wrong, but no verb was moved (the verbs stand right):
   the mistake is in the middle, so the verb-position hint would not help. */
function isVerbWord(w) {
  var raw = w.replace(/[.,!?]/g, ''),
    l = glemma(raw);
  if (
    /^(muss|musst|müssen|kann|kannst|können|will|willst|wollen|darf|darfst|dürfen|soll|sollst|sollen|möchte|möchtest|möchten|ist|bin|bist|sind|seid|war|hat|habe|hast|haben|wird|werden)$/i.test(
      raw
    )
  )
    return true;
  return (
    !!l &&
    l === l.toLowerCase() &&
    /(en|ern|eln)$/.test(l) &&
    !/^(einen|seinen|ihren|meinen|deinen|unseren|keinen|diesen|den)$/i.test(raw)
  );
}
function orderMidOnly(x) {
  var got = T.ans.map(function (j) {
    return x.w[j];
  });
  return [x.w.join(' ')].concat(x.alt || []).some(function (a) {
    var c = a.split(' ');
    if (c.length !== got.length || norm(c[c.length - 1]) !== norm(got[got.length - 1])) return false;
    for (var i = 0; i < c.length; i++)
      if (norm(c[i]) !== norm(got[i]) && (isVerbWord(c[i]) || isVerbWord(got[i]))) return false;
    return true;
  });
}
function next() {
  stopSay();
  clearInterval(tmrI);
  T = null;
  R.pos++;
  if (R.pos >= R.q.length) finish();
  else {
    render();
    window.scrollTo(0, 0);
  }
}
function finish() {
  var LV0 = level().i,
    D = R.L,
    td = today(),
    first = S.days[td] === undefined,
    gain,
    tasks = R.ok + R.fixed,
    perfect = R.fixed === 0 && tasks > 0;
  if (D.kind === 'review') {
    gain = tasks * 3;
    S.reviews++;
  } else if (D.kind === 'practice') {
    gain = R.ok * 5 + R.fixed * 2;
    S.prac[D.sec] = (S.prac[D.sec] || 0) + 1;
  } else if (!R.isNew) gain = 5;
  else gain = R.ok * 10 + R.fixed * 5 + (D.boss ? 50 : 20);
  S.xp += gain;
  S.days[td] = (S.days[td] || 0) + gain;
  if (R.isNew && D.kind === 'lesson') {
    S.done[D.id] = { d: td, p: perfect ? 1 : 0 };
    if (perfect) S.perfect++;
    if (S.newDay !== td) {
      S.newDay = td;
      S.newN = 0;
    }
    S.newN++;
    notifyObs('lesson', { day: D.id, n: (LBY[D.id] ? LBY[D.id].idx : 0) + 1, title: D.title });
  }
  var s = streak(),
    fz = false;
  if (s > S.best) S.best = s;
  if (first && s > 0 && s % 7 === 0 && S.freezes < 2) {
    S.freezes++;
    fz = true;
  }
  save();
  RES = {
    gain: gain,
    ok: R.ok,
    tasks: tasks,
    streak: s,
    fz: fz,
    title: D.title,
    kind: D.kind,
    sec: D.sec,
    isNew: R.isNew,
    perfect: perfect
  };
  R = null;
  view = 'result';
  render();
  window.scrollTo(0, 0);
  if (tasks)
    setTimeout(function () {
      confetti(perfect || D.boss || level().i > LV0);
    }, 250);
}
function vResult() {
  var r = RES,
    lv = level(),
    ni = nextIdx(),
    more = ni >= 0 && newToday() < capToday();
  var head =
    r.kind === 'review'
      ? t('res.review')
      : r.kind === 'practice'
        ? t('res.prac')
        : r.isNew
          ? t('res.day')
          : t('res.again');
  return (
    '<section class="result"><svg class="ecg" viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 55 H90 Q100 42 110 55 H128 L138 64 L152 8 L166 78 L176 55 H196 Q214 34 232 55 H400"/></svg><div><div class="eyebrow">' +
    esc(r.title) +
    '</div><h1>' +
    esc(head) +
    '</h1><p style="margin:8px 0 0">' +
    esc(t('res.streak', { n: r.streak })) +
    (r.fz ? ' ' + esc(t('res.freeze')) : '') +
    (r.perfect ? ' ' + esc(t('res.perfect')) : '') +
    '</p></div>' +
    (r.tasks && r.kind !== 'review'
      ? '<div class="stamp" lang="de" dir="ltr">' + (r.perfect ? 'SEHR GUT' : 'BESTANDEN') + '</div>'
      : '') +
    '<div class="stats"><div class="stat"><b class="num" data-count="' +
    r.gain +
    '" data-pre="+">+' +
    r.gain +
    '</b><span class="small muted">XP</span></div><div class="stat"><b class="num">' +
    r.ok +
    ' / ' +
    r.tasks +
    '</b><span class="small muted">' +
    esc(t('res.first')) +
    '</span></div><div class="stat"><b class="num">' +
    daysLeft() +
    '</b><span class="small muted">' +
    esc(t('path.days')) +
    '</span></div></div>' +
    '<div class="card"><div class="row small" style="justify-content:space-between"><span><b>' +
    esc(t('lvl.label', { n: lv.i + 1 })) +
    '</b> ' +
    esc(lv.name) +
    '</span><span class="muted num">' +
    S.xp +
    (lv.to ? ' / ' + lv.to : '') +
    ' XP</span></div><div class="bar" style="margin-top:6px"><i style="width:' +
    (lv.to ? Math.round(((S.xp - lv.from) / (lv.to - lv.from)) * 100) : 100) +
    '%"></i></div></div>' +
    '<div class="foot"><button class="btn" data-a="home">' +
    esc(t('btn.home')) +
    '</button>' +
    (r.kind === 'practice'
      ? '<button class="btn ghost" data-a="prac" data-v="' +
        r.sec +
        '" data-p="' +
        esc(r.part || '') +
        '">' +
        esc(t('res.more')) +
        '</button>'
      : more && r.kind === 'lesson'
        ? '<button class="btn ghost" data-a="open" data-i="' + ni + '">' + esc(t('res.next')) + '</button>'
        : '') +
    '</div></section>'
  );
}
