/* DTZ-Puls · screen-leaderboard
 * Points race (opt-in leaderboard).
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* points race: opt-in, only name + points (SQL function leaderboard) */
var TOP = { rows: null, at: 0, err: '', busy: false, period: 'week' };
function loadTop() {
  if (!SB || !ME || TOP.busy) return;
  TOP.busy = true;
  SB.rpc('leaderboard').then(
    function (r) {
      TOP.busy = false;
      if (r.error) {
        TOP.err = r.error.message || 'error';
      } else {
        TOP.err = '';
        TOP.rows = r.data || [];
        TOP.at = Date.now();
      }
      if (view === 'top') render();
    },
    function () {
      TOP.busy = false;
      TOP.err = 'offline';
      if (view === 'top') render();
    }
  );
}
function vTop() {
  var h =
    header() +
    '<section><div class="eyebrow">' +
    esc(t('tab.top')) +
    '</div><h1>' +
    esc(t('top.h')) +
    '</h1><p class="small muted" style="margin:6px 0 0">' +
    esc(t('top.p')) +
    '</p></section>';
  if (S.rank !== '1') {
    return (
      h +
      '<section class="card" style="display:flex;flex-direction:column;gap:10px">' +
      (S.name
        ? ''
        : '<label class="small" for="tn">' +
          esc(t('top.name')) +
          '</label><input class="txt" id="tn" maxlength="30" style="max-width:none">') +
      '<button class="btn" data-a="topjoin">' +
      esc(t('top.join')) +
      '</button></section>'
    );
  }
  if (!TOP.rows && !TOP.err) {
    loadTop();
    return h + '<div class="card">' + esc(t('boot')) + '</div>';
  }
  if (TOP.err) return h + '<div class="card">' + esc(t('top.err')) + '</div>';
  if (Date.now() - TOP.at > 60000) loadTop();
  var key = TOP.period === 'week' ? 'week_xp' : 'xp',
    rows = TOP.rows.slice().sort(function (a, b) {
      return (b[key] || 0) - (a[key] || 0);
    });
  h +=
    '<div class="seg2" role="group"><button data-a="topper" data-v="week" aria-pressed="' +
    (TOP.period === 'week') +
    '">' +
    esc(t('top.week')) +
    '</button><button data-a="topper" data-v="all" aria-pressed="' +
    (TOP.period === 'all') +
    '">' +
    esc(t('top.all')) +
    '</button></div>';
  if (!rows.length) return h + '<div class="card">' + esc(t('top.empty')) + '</div>';
  var medal = ['🥇', '🥈', '🥉'];
  h +=
    '<ol class="race">' +
    rows
      .map(function (r, i) {
        var top = rows[0][key] || 1,
          pct = Math.max(4, Math.round(((r[key] || 0) / top) * 100));
        return (
          '<li class="' +
          (r.me ? 'me' : '') +
          (i < 3 ? ' podium' : '') +
          '"><span class="pos num">' +
          (medal[i] || i + 1) +
          '</span><span class="grow"><span class="nm">' +
          (r.avatar ? esc(r.avatar) + ' ' : '') +
          esc(r.name) +
          (r.me ? ' · ' + esc(t('top.you')) : '') +
          '</span><span class="track"><i style="width:' +
          pct +
          '%"></i></span></span><b class="num">' +
          (r[key] || 0) +
          '</b></li>'
        );
      })
      .join('') +
    '</ol>';
  return (
    h +
    '<div class="row"><button class="btn small ghost" data-a="topleave">' +
    esc(t('top.leave')) +
    '</button></div>'
  );
}

function doPw() {
  var a = $('#pw1').value,
    b = $('#pw2').value;
  if (a.length < 8) return toast(t('pw.short'));
  if (a !== b) return toast(t('pw.diff'));
  SB.auth.updateUser({ password: a }).then(
    function (r) {
      if (r.error) {
        toast(t('pw.err', { m: r.error.message }));
        return;
      }
      $('#pw1').value = '';
      $('#pw2').value = '';
      toast(t('pw.ok'));
    },
    function (e) {
      toast(t('pw.err', { m: String((e && e.message) || e) }));
    }
  );
}
