/* DTZ-Puls · push
 * App install prompt and daily reminders (Web Push).
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* app install + daily reminders (Web Push) */
var INSTALL_EVT = null,
  PUSHBUSY = false;
var IOS =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function standalone() {
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true
  );
}
function pushOk() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!(window.PULS_CONFIG || {}).vapidPublic
  );
}
function needHome() {
  return IOS && !standalone();
}
function remH() {
  return S.remind && S.remind.h != null ? S.remind.h : 19;
}
function hh(h) {
  return (h < 10 ? '0' : '') + h + ':00';
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  INSTALL_EVT = e;
  if (view === 'progress' || view === 'path') render();
});
window.addEventListener('appinstalled', function () {
  INSTALL_EVT = null;
  render();
});
function b64u(x) {
  var p = '='.repeat((4 - (x.length % 4)) % 4),
    b = atob((x + p).replace(/-/g, '+').replace(/_/g, '/')),
    a = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
function subRow(sub, h) {
  var j = sub.toJSON();
  var tz = 'Europe/Berlin';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz;
  } catch (e) {}
  return {
    endpoint: j.endpoint,
    user_id: ME,
    p256dh: j.keys.p256dh,
    auth: j.keys.auth,
    hour: h,
    tz: tz,
    updated_at: new Date().toISOString()
  };
}
function pushOn(h) {
  if (PUSHBUSY) return;
  if (!pushOk()) {
    toast(t(needHome() ? 'rem.ios' : 'rem.unsup'));
    return;
  }
  if (!SB || !ME) {
    toast(t('rem.err'));
    return;
  }
  PUSHBUSY = true;
  render();
  Notification.requestPermission()
    .then(function (perm) {
      if (perm !== 'granted') throw new Error('denied');
      return navigator.serviceWorker.ready;
    })
    .then(function (reg) {
      return reg.pushManager.getSubscription().then(function (old) {
        return (
          old ||
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64u(window.PULS_CONFIG.vapidPublic)
          })
        );
      });
    })
    .then(function (sub) {
      return SB.from('push_subs')
        .upsert(subRow(sub, h), { onConflict: 'endpoint' })
        .then(function (r) {
          if (r.error) throw r.error;
        });
    })
    .then(function () {
      S.remind = { on: 1, h: h };
      S.remindAsk = 1;
      save();
      PUSHBUSY = false;
      render();
      toast(t('rem.ok', { h: hh(h) }));
    })
    .catch(function (e) {
      PUSHBUSY = false;
      render();
      toast(t(String(e && e.message) === 'denied' ? 'rem.denied' : 'rem.err'));
    });
}
function pushOff() {
  if (PUSHBUSY) return;
  PUSHBUSY = true;
  var done = function () {
    S.remind = { on: 0, h: remH() };
    save();
    PUSHBUSY = false;
    render();
  };
  if (!pushOk()) {
    done();
    return;
  }
  navigator.serviceWorker.ready
    .then(function (reg) {
      return reg.pushManager.getSubscription();
    })
    .then(function (sub) {
      if (!sub) return;
      var ep = sub.endpoint;
      return sub.unsubscribe().then(function () {
        if (SB && ME) return SB.from('push_subs').delete().eq('endpoint', ep);
      });
    })
    .then(done, done);
}
function pushHour(h) {
  if (!(S.remind && S.remind.on)) {
    S.remind = { on: 0, h: h };
    save();
    render();
    return;
  }
  if (!pushOk() || !SB || !ME) return;
  navigator.serviceWorker.ready
    .then(function (reg) {
      return reg.pushManager.getSubscription();
    })
    .then(function (sub) {
      if (!sub) {
        pushOn(h);
        return;
      }
      return SB.from('push_subs')
        .upsert(subRow(sub, h), { onConflict: 'endpoint' })
        .then(function (r) {
          if (r.error) throw r.error;
          S.remind = { on: 1, h: h };
          save();
          render();
          toast(t('rem.ok', { h: hh(h) }));
        });
    })
    .catch(function () {
      toast(t('rem.err'));
    });
}
/* keep the server copy of this device's subscription fresh (new keys, new user on the same phone) */
function pushSync() {
  if (!pushOk() || !SB || !ME || !(S.remind && S.remind.on) || Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready
    .then(function (reg) {
      return reg.pushManager.getSubscription();
    })
    .then(function (sub) {
      if (sub)
        SB.from('push_subs')
          .upsert(subRow(sub, remH()), { onConflict: 'endpoint' })
          .then(
            function () {},
            function () {}
          );
    })
    .catch(function () {});
}
function remCard() {
  if (S.remindAsk || (S.remind && S.remind.on) || !S.tourDone || TOUR >= 0) return '';
  if (!pushOk() && !needHome()) return '';
  if (window.Notification && Notification.permission === 'denied') return '';
  return (
    '<section class="card remcard"><div class="row" style="gap:12px;align-items:flex-start"><span class="rci" aria-hidden="true">🔔</span><div class="grow"><b>' +
    esc(t('rem.ask', { h: hh(remH()) })) +
    '</b><p class="small muted" style="margin:4px 0 0">' +
    esc(needHome() ? t('rem.ios') : t('rem.asksub')) +
    '</p></div></div>' +
    '<div class="foot">' +
    (needHome() ? '' : '<button class="btn small" data-a="remon">' + esc(t('rem.on')) + '</button>') +
    '<button class="linkbtn" data-a="remlater">' +
    esc(t('rem.later')) +
    '</button></div></section>'
  );
}
function remBlock() {
  var on = S.remind && S.remind.on,
    h = remH(),
    opts = '';
  for (var i = 6; i <= 22; i++)
    opts += '<option value="' + i + '"' + (i === h ? ' selected' : '') + '>' + hh(i) + '</option>';
  var st = !pushOk()
    ? needHome()
      ? t('rem.ios')
      : t('rem.unsup')
    : window.Notification && Notification.permission === 'denied'
      ? t('rem.denied')
      : t('rem.p');
  var inst = INSTALL_EVT
    ? '<button class="btn small ghost" data-a="install">📲 ' + esc(t('app.install')) + '</button>'
    : '';
  return (
    '<div class="remblk"><div class="small" style="margin-bottom:6px"><b>🔔 ' +
    esc(t('rem.h')) +
    '</b></div><p class="small muted" style="margin:0 0 8px">' +
    esc(st) +
    '</p>' +
    (pushOk()
      ? '<div class="row" style="gap:8px;flex-wrap:wrap"><label class="small" for="remh">' +
        esc(t('rem.time')) +
        '</label><select id="remh" class="txt" style="width:auto" data-ch="remh">' +
        opts +
        '</select>' +
        (on
          ? '<button class="btn small ghost" data-a="remoff"' +
            (PUSHBUSY ? ' disabled' : '') +
            '>' +
            esc(t('rem.off')) +
            '</button><span class="small" style="color:var(--ok)">✓ ' +
            esc(t('rem.active')) +
            '</span>'
          : '<button class="btn small" data-a="remon"' +
            (PUSHBUSY ? ' disabled' : '') +
            '>' +
            esc(t('rem.on')) +
            '</button>') +
        '</div>'
      : '') +
    (inst
      ? '<div style="margin-top:10px">' +
        inst +
        '<p class="small muted" style="margin:6px 0 0">' +
        esc(t('app.installp')) +
        '</p></div>'
      : '') +
    '</div>'
  );
}
