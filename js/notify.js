/* DTZ-Puls · notify
 * Push news for observers: "learner X is online" and "learner X finished day N".
 * Learners' apps report events to the notify-observers Edge Function; each observer picks what to receive.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

var NOTIFY_LAST_ONLINE = 0;

/** Report an event; silent if the function is not deployed or the network is down. */
function notifyObs(event, extra) {
  if (!SB || !ME || !SB.functions) return;
  if (event === 'online') {
    if (Date.now() - NOTIFY_LAST_ONLINE < 10 * 60000) return; // the server throttles too
    NOTIFY_LAST_ONLINE = Date.now();
  }
  try {
    SB.functions.invoke('notify-observers', { body: Object.assign({ event: event }, extra || {}) }).then(
      function () {},
      function () {}
    );
  } catch (e) {}
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) notifyObs('online');
});

/* ---------- observer's choice ---------- */
var NPREF = null; // {online, lesson} once loaded

function loadNotifyPrefs() {
  if (NPREF || !SB || !ME) return;
  NPREF = { online: false, lesson: false, loading: true };
  SB.from('observer_notify')
    .select('online,lesson')
    .eq('user_id', ME)
    .maybeSingle()
    .then(
      function (r) {
        NPREF = { online: !!(r.data && r.data.online), lesson: !!(r.data && r.data.lesson), ok: !r.error };
        if (view === 'watch') render();
      },
      function () {
        NPREF = { online: false, lesson: false, ok: false };
      }
    );
}
function setNotifyPref(kind, on) {
  if (!NPREF || !SB || !ME) return;
  NPREF[kind] = on;
  render();
  // News arrive as push messages, so this device needs a push subscription (the same as for reminders).
  if (on && !(S.remind && S.remind.on)) pushOn(remH());
  SB.from('observer_notify')
    .upsert(
      { user_id: ME, online: NPREF.online, lesson: NPREF.lesson, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .then(function (r) {
      if (r.error) {
        NPREF[kind] = !on;
        render();
        toast(t('wn.err'));
      }
    });
}
function vNotifyPrefs() {
  loadNotifyPrefs();
  if (!NPREF || NPREF.loading) return '';
  var row = function (kind, label) {
    var on = NPREF[kind];
    return (
      '<label class="row wnrow"><input type="checkbox" data-ch="wnotify" data-v="' +
      kind +
      '"' +
      (on ? ' checked' : '') +
      (NPREF.ok ? '' : ' disabled') +
      '><span>' +
      esc(label) +
      '</span></label>'
    );
  };
  return (
    '<details class="card upl"><summary><b>🔔 ' +
    esc(t('wn.h')) +
    '</b></summary><p class="small muted">' +
    esc(NPREF.ok ? t('wn.p') : t('wn.nosql')) +
    '</p>' +
    row('online', t('wn.online')) +
    row('lesson', t('wn.lesson')) +
    '</details>'
  );
}
