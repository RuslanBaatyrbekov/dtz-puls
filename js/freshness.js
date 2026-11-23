/* DTZ-Puls · freshness
 * Freshness: reload on a new app version, refresh course data after an upload.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* freshness: new app version -> reload; new course upload -> reload course data */
// The running version is the ?v= this script was loaded with (index.html is updated by tools/bump.py).
var APP_VER = +((document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src)) || [0, 0])[1],
  COURSE_AT = '',
  UPD = false,
  FRESH_T = 0;
function busyNow() {
  return (
    view === 'run' ||
    view === 'login' ||
    view === 'boot' ||
    (view === 'cards' && CS && CS.pos < CS.q.length) ||
    (UP.st && UP.st !== 'done' && UP.st !== 'err') ||
    TOUR >= 0 ||
    !!document.querySelector('input:focus,textarea:focus')
  );
}
function hardReload() {
  try {
    sessionStorage.setItem('dtz-reloaded', String(Date.now()));
  } catch (e) {}
  location.replace(location.pathname + '?r=' + Date.now() + (location.hash || ''));
}
function checkFresh(force) {
  if (document.hidden || (!force && Date.now() - FRESH_T < 60000)) return;
  FRESH_T = Date.now();
  try {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(
        function (j) {
          if (!j || !(+j.v > APP_VER)) return;
          var last = 0;
          try {
            last = +sessionStorage.getItem('dtz-reloaded') || 0;
          } catch (e) {}
          if (!busyNow() && Date.now() - last > 120000) hardReload();
          else if (!UPD) {
            UPD = true;
            render();
          }
        },
        function () {}
      );
  } catch (e) {}
  if (SB && ME && COURSE_AT && !busyNow())
    SB.from('course_content')
      .select('updated_at')
      .eq('id', 'dtz')
      .maybeSingle()
      .then(
        function (r) {
          var at = r && r.data && r.data.updated_at;
          if (at && at !== COURSE_AT && !busyNow())
            loadCourse().then(function (ok) {
              if (ok) {
                render();
                toast(t('upd.course'));
              }
            });
        },
        function () {}
      );
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) checkFresh();
});
window.addEventListener('focus', function () {
  checkFresh();
});
setInterval(function () {
  checkFresh();
}, 15 * 60000);
setTimeout(function () {
  checkFresh(true);
}, 8000);
try {
  if (/[?&]r=\d/.test(location.search))
    history.replaceState(null, '', location.pathname + (location.hash || ''));
} catch (e) {}
function fromCache() {
  try {
    var c = JSON.parse(localStorage.getItem(CKEY) || 'null');
    if (c && setCourse(c)) {
      toast(t('toast.cache'));
      return true;
    }
  } catch (e) {}
  return false;
}
function initCloud() {
  if (!cfgOk()) return;
  var c = window.PULS_CONFIG;
  SB = window.supabase.createClient(c.url, c.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  view = 'boot';
  render();
  SB.auth.getSession().then(
    function (r) {
      onSession(r && r.data && r.data.session);
    },
    function () {
      onSession(null);
    }
  );
  SB.auth.onAuthStateChange(function (ev) {
    if (ev === 'SIGNED_OUT') onSession(null);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    pull();
    if (OWNER && view === 'watch') loadWatch();
  });
  window.addEventListener('online', function () {
    pull();
  });
}
function doLogin() {
  var em = $('#em').value.trim(),
    pw = $('#pw').value;
  loginEm = em;
  if (!em || !pw) {
    loginErr = t('login.empty');
    render();
    return;
  }
  loginBusy = true;
  loginErr = '';
  render();
  SB.auth.signInWithPassword({ email: em, password: pw }).then(
    function (r) {
      loginBusy = false;
      if (r.error) {
        loginErr = /invalid/i.test(r.error.message)
          ? t('login.wrong')
          : t('login.fail', { m: r.error.message });
        render();
        return;
      }
      onSession(r.data.session);
    },
    function () {
      loginBusy = false;
      loginErr = t('err.offline');
      render();
    }
  );
}
