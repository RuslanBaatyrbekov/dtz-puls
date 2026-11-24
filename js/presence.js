/* DTZ-Puls · presence
 * Presence: who has the app open right now (Supabase Realtime) and heartbeat.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* presence: who has the app open right now (Supabase Realtime, no table) */
var PCH = null,
  ONLINE = {};
function presStart() {
  if (!SB || !ME || PCH || !SB.channel) return;
  try {
    PCH = SB.channel('dtz-online', { config: { presence: { key: ME } } });
    PCH.on('presence', { event: 'sync' }, function () {
      var st = PCH.presenceState() || {},
        o = {};
      Object.keys(st).forEach(function (k) {
        o[k] = 1;
      });
      ONLINE = o;
      presPaint();
    });
    PCH.subscribe(function (status) {
      if (status === 'SUBSCRIBED' && !document.hidden) PCH.track({ at: Date.now() });
    });
  } catch (e) {
    PCH = null;
  }
}
function presStop() {
  if (PCH) {
    try {
      SB.removeChannel(PCH);
    } catch (e) {}
    PCH = null;
    ONLINE = {};
  }
}
var BEAT = null;
function beat() {
  if (!SB || !ME || document.hidden) return;
  SB.from('progress')
    .select('state')
    .eq('user_id', ME)
    .maybeSingle()
    .then(
      function (r) {
        if (r.error) return;
        var c = r.data && r.data.state;
        if (c) {
          PULLED = true;
          var m = mergeS(S, c);
          m.uid = ME;
          if (!same(m, S) && view !== 'run') adopt(m);
        }
        S.lastOn = Date.now();
        try {
          localStorage.setItem(KEY, JSON.stringify(S));
        } catch (e) {}
        if (view !== 'run') push();
      },
      function () {}
    );
}
function beatStart() {
  clearInterval(BEAT);
  setTimeout(beat, 1500);
  BEAT = setInterval(beat, 5 * 60000);
}
function presPaint() {
  document.querySelectorAll('[data-uid]').forEach(function (el) {
    var on = !!ONLINE[el.dataset.uid];
    el.classList.toggle('on', on);
    el.title = on ? t('w.online') : '';
  });
  document.querySelectorAll('[data-seen]').forEach(function (el) {
    var on = !!ONLINE[el.dataset.seen];
    el.textContent = on ? t('w.now') : t('w.seen', { t: ago(+el.dataset.ts) });
    el.classList.toggle('onl', on);
  });
}
document.addEventListener('visibilitychange', function () {
  if (!PCH) return;
  try {
    if (document.hidden) PCH.untrack();
    else PCH.track({ at: Date.now() });
  } catch (e) {}
});
document.addEventListener('visibilitychange', function () {
  if (!document.hidden && ME) beat();
});
function onSession(sess) {
  var id = sess && sess.user ? sess.user.id : null;
  if (!id) {
    presStop();
    ME = null;
    EMAIL = '';
    OWNER = false;
    syncState = 'local';
    view = 'login';
    if (!tryInvite()) render();
    return;
  }
  // An invite for another account (shared device): sign out here, then the invite signs in.
  if (INVITE && sess.user.email && sess.user.email.toLowerCase() !== INVITE.e.toLowerCase()) {
    SB.auth.signOut({ scope: 'local' }).then(
      function () {
        onSession(null);
      },
      function () {
        onSession(null);
      }
    );
    return;
  }
  if (INVITE) INVITE = null;
  if (id === ME && view !== 'boot' && view !== 'login') return;
  ME = id;
  EMAIL = sess.user.email || '';
  setTimeout(presStart, 0);
  beatStart();
  setTimeout(pushSync, 3000);
  PULLED = false;
  if (S.uid && S.uid !== ME) {
    var l = LANG;
    S = def();
    S.lang = l;
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }
  S.uid = ME;
  S.email = EMAIL;
  if (!S.lang) S.lang = LANG;
  if (!S.name && sess.user.user_metadata && sess.user.user_metadata.name)
    S.name = String(sess.user.user_metadata.name).slice(0, 30);
  SB.from('observers')
    .select('user_id')
    .eq('user_id', ME)
    .maybeSingle()
    .then(
      function (r) {
        OWNER = !!(r && r.data);
      },
      function () {
        OWNER = false;
      }
    )
    .then(loadCourse)
    .then(function (ok) {
      if (!ok) {
        view = 'nocourse';
        render();
        return;
      }
      syncState = 'connecting';
      pull();
      if (view === 'login') {
        view = 'path';
        try {
          history.replaceState(null, '', '#path');
        } catch (e) {}
      } else if (view === 'boot' || view === 'nocourse') view = fromHash();
      render();
    });
}
function loadCourse() {
  return SB.from('course_content')
    .select('data,updated_at')
    .eq('id', 'dtz')
    .maybeSingle()
    .then(
      function (r) {
        if (!r.error && r.data && setCourse(r.data.data)) {
          courseErr = '';
          COURSE_AT = r.data.updated_at || '';
          try {
            localStorage.setItem(CKEY, JSON.stringify(r.data.data));
          } catch (e) {}
          return true;
        }
        courseErr = r.error ? t('err.server', { m: r.error.message || '' }) : t('err.nocontent');
        return fromCache();
      },
      function () {
        courseErr = t('err.offline');
        return fromCache();
      }
    );
}
