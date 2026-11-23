/* DTZ-Puls · sync
 * Learner state, local storage and Supabase sync (merge-based, see lib/core.js).
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- state + sync: copies from different devices are merged, never overwritten ---------- */
var S = def(),
  SB = null,
  ME = null,
  EMAIL = '',
  OWNER = false,
  syncState = 'local',
  pushT = null,
  pushing = false,
  again = false,
  loginErr = '',
  loginBusy = false,
  loginEm = '';
try {
  var raw = localStorage.getItem(KEY);
  if (raw) S = fix(JSON.parse(raw));
} catch (e) {}
var LANGCHOSEN = false;
(function () {
  var l = S.lang;
  try {
    l = l || localStorage.getItem('dtz-lang');
  } catch (e) {}
  LANGCHOSEN = !!l;
  if (!l) l = 'en';
  setLang(l, true);
  var th = S.theme;
  try {
    th = th || localStorage.getItem('dtz-theme');
  } catch (e) {}
  applyTheme(th || 'auto');
})();
function cfgOk() {
  var c = window.PULS_CONFIG || {};
  return !!(
    c.url &&
    c.anonKey &&
    c.url.indexOf('YOUR') < 0 &&
    window.supabase &&
    window.supabase.createClient
  );
}
function save() {
  S.t = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
  schedulePush();
}
var PULLED = false;
function adopt(c) {
  S = fix(c);
  if (S.lang && S.lang !== LANG) setLang(S.lang, true);
  if (S.theme) applyTheme(S.theme);
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {}
}
function schedulePush() {
  if (!SB || !ME) return;
  clearTimeout(pushT);
  pushT = setTimeout(push, 600);
}
function push() {
  if (!SB || !ME || !PULLED) return;
  if (pushing) {
    again = true;
    return;
  }
  pushing = true;
  again = false;
  SB.from('progress')
    .upsert({ user_id: ME, state: JSON.parse(JSON.stringify(S)), updated_at: new Date().toISOString() })
    .then(
      function (r) {
        syncState = r.error ? 'error' : 'cloud';
      },
      function () {
        syncState = 'error';
      }
    )
    .then(function () {
      pushing = false;
      if (again) push();
      if (view === 'progress') render();
    });
}
function pull() {
  if (!SB || !ME) return;
  SB.from('progress')
    .select('state')
    .eq('user_id', ME)
    .maybeSingle()
    .then(
      function (r) {
        if (r.error) {
          syncState = 'error';
          if (view === 'progress') render();
          return;
        }
        var c = r.data && r.data.state;
        PULLED = true;
        if (!c) {
          if (S.t) push();
          else syncState = 'cloud';
          return;
        }
        var m = mergeS(S, c);
        m.uid = ME;
        if (!same(m, S)) {
          var busy = view === 'run' || view === 'result';
          if (busy) {
            m.t = Math.max(m.t || 0, S.t || 0);
          }
          adopt(m);
          if (!busy) render();
        }
        if (!same(m, fix(c))) push();
        else {
          syncState = 'cloud';
          if (view === 'progress') render();
        }
      },
      function () {
        syncState = 'error';
      }
    );
}
