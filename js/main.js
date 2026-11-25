/* DTZ-Puls · main
 * Rendering, event handlers and app start.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- render + events ---------- */
function render() {
  maybeTour();
  var a = $('#app'),
    tabs = $('#tabs'),
    inRun = view === 'run' || view === 'result' || view === 'login' || view === 'boot' || view === 'nocourse';
  tabs.hidden = inRun;
  tabs.style.display = inRun ? 'none' : '';
  a.innerHTML =
    (inRun ? '' : updBar()) +
    (view === 'nocourse'
      ? vNoCourse()
      : view === 'login'
        ? vLogin()
        : view === 'boot'
          ? vBoot()
          : view === 'run'
            ? vRun()
            : view === 'result'
              ? vResult()
              : view === 'practice'
                ? vPractice()
                : view === 'cards'
                  ? vCards()
                  : view === 'notes'
                    ? vNotes()
                    : view === 'note'
                      ? vNote()
                      : view === 'top'
                        ? vTop()
                        : view === 'progress'
                          ? vProg()
                          : view === 'watch'
                            ? vWatch()
                            : vPath());
  tabs.classList.add('ready');
  tabs.querySelectorAll('button').forEach(function (b) {
    b.textContent = t('tab.' + b.dataset.v);
    if (
      b.dataset.v === view ||
      (view === 'note' && b.dataset.v === 'notes') ||
      (view === 'cards' && b.dataset.v === 'practice')
    )
      b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  var wt = $('#watchtab');
  if (wt) wt.hidden = !OWNER;
  document.title = 'DTZ-Puls';
  var old = document.querySelector('.tour');
  if (old) old.remove();
  if (TOUR >= 0) {
    var tg = TOURT[TOUR] && document.querySelector(TOURT[TOUR]);
    if (tg && tg.closest('#app')) window.scrollBy(0, tg.getBoundingClientRect().top - 80);
    document.body.insertAdjacentHTML('beforeend', vTour());
    placeTour();
  }
  viewIn();
  countUps();
  var f = $('#fillin');
  if (f && !f.disabled && view === 'run') f.focus({ preventScroll: true });
}
var tmrI = null,
  resetArmed = false,
  impArmed = false;
function importCode(v) {
  var o = null;
  try {
    o = JSON.parse(decodeURIComponent(escape(atob(v))));
  } catch (e) {}
  if (!o || typeof o !== 'object') return null;
  if (o.src === 'dtz-trainer') {
    var n = fix(S);
    n.xp = Math.max(n.xp, +o.xp || 0);
    Object.keys(o.days || {}).forEach(function (k) {
      if (n.days[k] === undefined) n.days[k] = 10;
    });
    if (o.name && !n.name) n.name = o.name;
    return n;
  }
  if (typeof o.xp === 'number' && typeof o.days === 'object') return fix(o);
  return null;
}
var A = {
  tab: function (el) {
    stopSay();
    view = el.dataset.v;
    try {
      location.hash = view;
    } catch (e) {}
    render();
    window.scrollTo(0, 0);
  },
  open: function (el) {
    if (el.getAttribute('aria-disabled')) return toast(t('toast.prev'));
    openLesson(+el.dataset.i);
  },
  prac: function (el) {
    openPractice(el.dataset.v, el.dataset.p || '');
  },
  review: openReview,
  next: next,
  check: check,
  home: function () {
    leaveRun();
    try {
      if (history.state && history.state.dtzRun) history.back();
    } catch (e) {}
  },
  quit: function () {
    leaveRun();
    try {
      if (history.state && history.state.dtzRun) history.back();
    } catch (e) {}
    toast(t('toast.quit'));
  },
  sel: function (el) {
    if (T.done) return;
    T.sel = +el.dataset.j;
    render();
  },
  chip: function (el) {
    if (T.done) return;
    T.val = el.dataset.v;
    render();
  },
  pick: function (el) {
    if (T.done) return;
    T.ans.push(+el.dataset.j);
    render();
  },
  unpick: function (el) {
    if (T.done) return;
    T.ans = T.ans.filter(function (j) {
      return j !== +el.dataset.j;
    });
    render();
  },
  ml: function (el) {
    T.l = +el.dataset.j;
    T.bad = null;
    render();
  },
  mr: function (el) {
    if (T.l < 0) return toast(t('toast.left'));
    var j = +el.dataset.j,
      st = R.q[R.pos],
      x = st.t;
    if (j === T.l) {
      T.ok[j] = 1;
      T.l = -1;
      T.bad = null;
      if (Object.keys(T.ok).length === x.pairs.length) {
        var clean = T.err === 0;
        T.done = true;
        T.right = true;
        S.seen[x._k] = today();
        if (clean && st.first) R.ok++;
        else R.fixed++;
        if (!clean) S.missed[x._k] = (S.missed[x._k] || 0) + 1;
        else delete S.missed[x._k];
      }
    } else {
      T.err++;
      T.bad = j;
    }
    render();
  },
  say: function (el) {
    say(el, el.dataset.txt, 0.92);
  },
  play: function (el) {
    var x = R.q[R.pos].t;
    if (say(el, x.text, 1)) {
      T.plays++;
      var s = el.parentNode.querySelector('.num');
      if (s) s.textContent = t('run.plays', { n: T.plays });
    }
  },
  timer: function (el) {
    clearInterval(tmrI);
    T.left = R.q[R.pos].t.time || 60;
    var me = T;
    el.textContent = '⏱ ' + fmt(T.left);
    tmrI = setInterval(function () {
      if (T !== me) {
        clearInterval(tmrI);
        return;
      }
      T.left--;
      var b = $('#tmr');
      if (b) {
        b.textContent = '⏱ ' + fmt(Math.max(0, T.left));
        if (T.left <= 10) b.style.color = 'var(--bad)';
      }
      if (T.left <= 0) {
        clearInterval(tmrI);
        toast(t('toast.time'));
      }
    }, 1000);
  },
  model: function () {
    T.shown = true;
    clearInterval(tmrI);
    render();
  },
  srate: function (el) {
    var good = el.dataset.v === '1';
    var st = R.q[R.pos];
    S.seen[st.t._k] = today();
    if (good) {
      if (st.first) R.ok++;
      else R.fixed++;
      delete S.missed[st.t._k];
    } else {
      S.missed[st.t._k] = (S.missed[st.t._k] || 0) + 1;
      R.fixed++;
    }
    next();
  },
  idea: function (el) {
    var i = +el.dataset.p,
      keep = {};
    document.querySelectorAll('[data-g]').forEach(function (x) {
      if (x.dataset.g.indexOf(i + '_') !== 0) keep[x.dataset.g] = { v: x.value, c: x.className };
    });
    T.sel[i] = +el.dataset.j;
    render();
    Object.keys(keep).forEach(function (k) {
      var x = document.querySelector('[data-g="' + k + '"]');
      if (x) {
        x.value = keep[k].v;
        x.className = keep[k].c;
      }
    });
    var g = document.querySelector('[data-g^="' + i + '_"]');
    if (g) g.focus({ preventScroll: true });
  },
  wcheck: function () {
    var x = R.q[R.pos].t;
    if (
      T.sel.some(function (v) {
        return v < 0;
      })
    )
      return toast(t('toast.ideas'));
    var bad = 0;
    document.querySelectorAll('input[data-g]').forEach(function (inp) {
      var id = inp.dataset.g;
      T.vals[id] = inp.value;
      if (norm(inp.value) === norm(inp.dataset.ans)) T.tries[id] = 'ok';
      else {
        bad++;
        T.tries[id] = (typeof T.tries[id] === 'number' ? T.tries[id] : 0) + 1;
      }
    });
    if (bad) {
      render();
      return toast(t('toast.gaps', { n: bad }));
    }
    T.ok = true;
    var st = R.q[R.pos];
    S.seen[x._k] = today();
    if (st.first) R.ok++;
    else R.fixed++;
    delete S.missed[x._k];
    render();
  },
  logout: function () {
    if (!SB) return;
    try {
      history.replaceState(null, '', '#path');
    } catch (e) {}
    try {
      localStorage.removeItem(CKEY);
    } catch (e) {}
    setCourse({ weeks: [], bank: {}, rules: {} });
    SB.auth.signOut({ scope: 'local' }).then(
      function () {},
      function () {}
    );
    onSession(null);
  },
  retry: function () {
    view = 'boot';
    render();
    SB.auth.getSession().then(function (r) {
      ME = null;
      onSession(r && r.data && r.data.session);
    });
  },
  addreset: function () {
    doAdd(true);
  },
  addcopy: function () {
    var ta = $('#amsg');
    ta.select();
    try {
      navigator.clipboard.writeText(ta.value).then(
        function () {
          toast(t('toast.copied'));
        },
        function () {
          toast(t('toast.copyman'));
        }
      );
    } catch (e) {
      toast(t('toast.copyman'));
    }
  },
  topjoin: function () {
    var n = $('#tn');
    if (n) {
      var v = n.value.trim().slice(0, 30);
      if (!v) return toast(t('top.name'));
      S.name = v;
    }
    S.rank = '1';
    save();
    TOP.rows = null;
    render();
    setTimeout(loadTop, 1500);
  },
  topleave: function () {
    S.rank = '0';
    save();
    TOP.rows = null;
    render();
  },
  topper: function (el) {
    TOP.period = el.dataset.v;
    render();
  },
  'pick-lang': function (el) {
    LANGCHOSEN = true;
    setLang(el.dataset.v);
    if (!(view === 'login' && tryInvite())) render();
  },
  tournext: function () {
    TOURQ = false;
    if (TOUR < TOURN - 1) {
      TOUR++;
      render();
    } else {
      TOUR = -1;
      S.tour = 1;
      S.tourDone = 1;
      save();
      render();
      toast(t('tour.done'));
      confetti(false);
    }
  },
  tourask: function () {
    TOURQ = true;
    render();
  },
  tourcont: function () {
    TOURQ = false;
    render();
  },
  remon: function () {
    var el = document.getElementById('remh');
    pushOn(el ? +el.value : remH());
  },
  remoff: function () {
    pushOff();
  },
  remlater: function () {
    S.remindAsk = 1;
    save();
    render();
  },
  install: function () {
    if (!INSTALL_EVT) return;
    var e = INSTALL_EVT;
    e.prompt();
    (e.userChoice || Promise.resolve()).then(function () {
      INSTALL_EVT = null;
      render();
    });
  },
  tourskip: function () {
    TOURQ = false;
    TOUR = -1;
    S.tour = 1;
    save();
    render();
  },
  note: function (el) {
    openNote(el.dataset.v);
  },
  gw: function (el) {
    gPop(el.dataset.g);
  },
  gx: gClose,
  gadd: function () {
    var p = $('#gpop');
    if (p) {
      gAdd(p.dataset.g);
      gPaint();
    }
  },
  gdel: function () {
    var p = $('#gpop');
    if (p && S.my) {
      delete S.my[p.dataset.g];
      save();
      gPaint();
    }
  },

  reload: hardReload,
  cards: function () {
    stopSay();
    CS = null;
    view = 'cards';
    try {
      location.hash = 'cards';
    } catch (e) {}
    render();
    window.scrollTo(0, 0);
  },
  cback: function () {
    stopSay();
    CS = null;
    view = 'practice';
    try {
      location.hash = 'practice';
    } catch (e) {}
    render();
    window.scrollTo(0, 0);
  },
  cstart: cStart,
  cflip: cFlip,
  cgrade: function (el) {
    cGo(+el.dataset.v);
  },
  cstop: function () {
    stopSay();
    if (CS) CS.q = CS.q.slice(0, CS.pos);
    render();
    window.scrollTo(0, 0);
  },
  cmore: function () {
    cNew().x += 10;
    save();
    cStart();
  },
  cdeck: function (el) {
    S.cdeck = el.dataset.v;
    save();
    CS = null;
    render();
  },
  newsopen: function () {
    S.news = S.news || {};
    S.news.cards = 1;
    save();
    A.cards();
  },
  newsx: function () {
    S.news = S.news || {};
    S.news.cards = 1;
    save();
    render();
  },
  newsgx: function () {
    S.news = S.news || {};
    S.news.gloss = 1;
    save();
    render();
  },
  ncat: function (el) {
    NCAT = el.dataset.v;
    document.querySelectorAll('.ncats .chip').forEach(function (c) {
      var on = c.dataset.v === NCAT;
      c.classList.toggle('on', on);
      c.setAttribute('aria-selected', on);
    });
    nFilter();
  },
  nback: function () {
    try {
      if (history.state && history.state.dtzNote) {
        history.back();
        return;
      }
    } catch (e) {}
    closeNote();
  },
  tour: function () {
    TOURQ = false;
    TOUR = LANGCHOSEN ? 1 : 0;
    view = 'path';
    try {
      location.hash = 'path';
    } catch (e) {}
    render();
  },
  wsort: function (el) {
    W.sort = el.dataset.v;
    render();
  },
  wntest: notifyTest,
  whide: function (el) {
    var id = el.dataset.v,
      d = (W.docs || []).filter(function (x) {
        return x._id === id;
      })[0];
    S.whide = Object.assign({}, hiddenW());
    S.whide[id] = (d && (d.name || d.email)) || 1;
    if (W.open) delete W.open[id];
    save();
    render();
    toast(t('w.hidden.ok'));
  },
  wunhide: function (el) {
    S.whide = Object.assign({}, hiddenW());
    delete S.whide[el.dataset.v];
    save();
    render();
  },
  wopen: function (el) {
    W.open = W.open || {};
    W.open[el.dataset.v] = !W.open[el.dataset.v];
    render();
  },
  theme: function (el) {
    S.theme = el.dataset.v;
    applyTheme(S.theme);
    save();
    render();
  },
  avatar: function (el) {
    S.avatar = el.dataset.v;
    save();
    render();
  },
  exp: function () {
    var code = btoa(unescape(encodeURIComponent(JSON.stringify(S)))),
      ta = $('#code');
    ta.value = code;
    ta.select();
    try {
      navigator.clipboard.writeText(code).then(
        function () {
          toast(t('toast.copied'));
        },
        function () {
          toast(t('toast.copyman'));
        }
      );
    } catch (e) {
      toast(t('toast.copyman'));
    }
  },
  imp: function () {
    var v = $('#code').value.replace(/\s+/g, '');
    if (!v) return toast(t('toast.paste'));
    var o = importCode(v);
    if (!o) return toast(t('toast.badcode'));
    if (o.xp < S.xp && !impArmed) {
      impArmed = true;
      setTimeout(function () {
        impArmed = false;
      }, 6000);
      return toast(t('toast.lessxp', { a: o.xp, b: S.xp }));
    }
    impArmed = false;
    var uid = S.uid,
      em = S.email;
    S = o;
    S.uid = uid;
    S.email = em;
    S.lang = S.lang || LANG;
    S.wipe = Date.now();
    save();
    render();
    toast(t('toast.imported', { n: S.xp }));
  },
  name: function () {
    S.name = $('#nm').value.trim().slice(0, 30);
    save();
    render();
    toast(t('toast.saved'));
  },
  reset: function (el) {
    if (!resetArmed) {
      resetArmed = true;
      el.textContent = t('set.reset2');
      setTimeout(function () {
        resetArmed = false;
      }, 5000);
      return;
    }
    resetArmed = false;
    var n = S.name,
      l = S.lang,
      u = S.uid,
      e = S.email;
    S = def();
    S.name = n;
    S.lang = l;
    S.uid = u;
    S.email = e;
    S.wipe = Date.now();
    save();
    render();
    toast(t('toast.reset'));
  }
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  var f = A[el.dataset.a];
  if (f) f(el);
});
document.addEventListener(
  'toggle',
  function (e) {
    if (e.target.classList && e.target.classList.contains('upl')) UP.open = e.target.open;
  },
  true
);
document.addEventListener('change', function (e) {
  if (e.target.id === 'upf' && e.target.files && e.target.files[0]) {
    doUpload(e.target.files[0]);
    e.target.value = '';
    return;
  }
  if (e.target.dataset && e.target.dataset.ch === 'lang') {
    setLang(e.target.value);
    render();
  }
  if (e.target.dataset && e.target.dataset.ch === 'remh') {
    pushHour(+e.target.value);
  }
  if (e.target.dataset && e.target.dataset.ch === 'wnotify') {
    setNotifyPref(e.target.dataset.v, e.target.checked);
  }
});
document.addEventListener('submit', function (e) {
  if (e.target.id === 'lf') {
    e.preventDefault();
    doLogin();
  }
  if (e.target.id === 'af') {
    e.preventDefault();
    doAdd();
  }
  if (e.target.id === 'pwf') {
    e.preventDefault();
    doPw();
  }
});
document.addEventListener('keydown', function (e) {
  if (
    view === 'cards' &&
    CS &&
    CS.pos < CS.q.length &&
    !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')
  ) {
    if (!CS.flip && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      cFlip();
      return;
    }
    if (CS.flip && /^[123]$/.test(e.key)) {
      cGo(+e.key - 1);
      return;
    }
  }
  if (e.key === 'Enter' && e.target.id === 'fillin') {
    e.preventDefault();
    check();
  }
});
document.addEventListener('input', function (e) {
  if (e.target.id === 'nq') {
    NQ = e.target.value.trim();
    nFilter();
    return;
  }
  if (e.target.id === 'fillin' && T) T.val = e.target.value;
  if (e.target.dataset && e.target.dataset.g && T && T.vals) T.vals[e.target.dataset.g] = e.target.value;
});

window.DTZ_APP = {
  t: t,
  L: L,
  setCourse: setCourse,
  state: function () {
    return S;
  },
  current: function () {
    return R && R.q[R.pos];
  }
};
applyFreezes();
view = cfgOk() ? 'boot' : ALL.length ? fromHash() : 'nocourse';
render();
initCloud();
