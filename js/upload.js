/* DTZ-Puls · upload
 * Uploading a new course version (observers only).
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* upload a new course version (observer only; RLS policy "course: observers update") */
var UP = { st: '', pct: 0, res: null, err: '', open: false };
function cStats(c) {
  var b = (c && c.bank) || {},
    per = {},
    n = 0;
  Object.keys(b).forEach(function (k) {
    per[k] = (b[k] || []).length;
    n += per[k];
  });
  var d = 0;
  ((c && c.weeks) || []).forEach(function (w) {
    d += (w.days || []).length;
  });
  return {
    days: d,
    tasks: n,
    per: per,
    notes: ((c && c.notes) || []).length,
    cards: ((c && c.cards) || []).length
  };
}
function vUpload() {
  var h =
    '<details class="card upl"' +
    (UP.open || UP.st ? ' open' : '') +
    '><summary>' +
    esc(t('up.h')) +
    '</summary><p class="small muted">' +
    esc(t('up.p')) +
    '</p>';
  var busy = UP.st && UP.st !== 'done' && UP.st !== 'err';
  h +=
    '<label class="btn small ghost' +
    (busy ? ' disabled' : '') +
    '" style="display:inline-flex;align-items:center;cursor:pointer">' +
    esc(t('up.btn')) +
    '<input type="file" id="upf" accept=".json,application/json" hidden' +
    (busy ? ' disabled' : '') +
    '></label>';
  if (UP.st) {
    h +=
      '<div class="upbar' +
      (UP.st === 'err' ? ' bad' : UP.st === 'done' ? ' ok' : '') +
      '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      UP.pct +
      '"><i style="width:' +
      UP.pct +
      '%"></i></div>' +
      '<p class="small" style="margin:6px 0 0">' +
      (UP.st === 'err'
        ? '<b style="color:var(--pulse)">' + esc(UP.err) + '</b>'
        : UP.st === 'done'
          ? '<b style="color:var(--ok)">' + esc(t('up.done')) + '</b>'
          : esc(t('up.' + UP.st)) + ' ' + UP.pct + '%') +
      '</p>';
  }
  if (UP.st === 'done' && UP.res) {
    var r = UP.res,
      a = r.after,
      bf = r.before;
    h +=
      '<div class="upres"><div class="stats"><div class="stat"><b class="num">' +
      a.days +
      '</b><span class="small muted">' +
      esc(t('up.days')) +
      '</span></div><div class="stat"><b class="num">' +
      a.tasks +
      '</b><span class="small muted">' +
      esc(t('up.tasks')) +
      '</span></div><div class="stat"><b class="num">' +
      a.notes +
      '</b><span class="small muted">' +
      esc(t('up.notes')) +
      '</span></div></div>' +
      '<div class="small wtags">' +
      Object.keys(a.per)
        .map(function (k) {
          var dd = bf ? a.per[k] - (bf.per[k] || 0) : 0;
          return (
            '<span class="tag">' +
            esc(t('sec.' + k)) +
            ' · ' +
            a.per[k] +
            (dd
              ? ' <b style="color:' +
                (dd > 0 ? 'var(--ok)' : 'var(--pulse)') +
                '">' +
                (dd > 0 ? '+' : '') +
                dd +
                '</b>'
              : '') +
            '</span>'
          );
        })
        .join(' ') +
      (a.cards ? ' <span class="tag">' + esc(t('sec.cards')) + ' · ' + a.cards + '</span>' : '') +
      '</div>' +
      (bf
        ? '<p class="small muted" style="margin:6px 0 0">' +
          esc(t('up.diff', { a: bf.tasks, b: a.tasks })) +
          '</p>'
        : '') +
      (r.at
        ? '<p class="small muted" style="margin:2px 0 0">' +
          esc(t('up.saved', { t: new Date(r.at).toLocaleString() })) +
          '</p>'
        : '') +
      '</div>';
  }
  return h + '</details>';
}
function upSet(st, pct) {
  UP.st = st;
  UP.pct = Math.round(pct);
  if (view === 'watch') renderKeep();
}
function doUpload(file) {
  var before = C && C.bank ? cStats(C) : null,
    creep = null;
  UP = { st: 'read', pct: 0, res: null, err: '', open: true };
  upSet('read', 0);
  var fail = function (m) {
    clearInterval(creep);
    UP.err = m;
    upSet('err', 100);
    toast(m);
  };
  var rd = new FileReader();
  rd.onprogress = function (e) {
    if (e.lengthComputable) upSet('read', (e.loaded / e.total) * 30);
  };
  rd.onerror = function () {
    fail(t('up.bad'));
  };
  rd.onload = function () {
    upSet('check', 35);
    var c = null;
    try {
      c = JSON.parse(rd.result);
    } catch (e) {}
    if (!c || !Array.isArray(c.weeks) || !c.bank || !c.rules) return fail(t('up.bad'));
    upSet('send', 45);
    creep = setInterval(function () {
      if (UP.st === 'send' && UP.pct < 90) upSet('send', UP.pct + Math.max(1, (90 - UP.pct) / 8));
    }, 400);
    var at = new Date().toISOString();
    SB.from('course_content')
      .upsert({ id: 'dtz', data: c, updated_at: at })
      .then(
        function (r) {
          if (r.error) return fail(t('up.err', { m: r.error.message }));
          return SB.from('course_content')
            .select('updated_at')
            .eq('id', 'dtz')
            .maybeSingle()
            .then(function (q) {
              clearInterval(creep);
              setCourse(c);
              try {
                localStorage.setItem(CKEY, JSON.stringify(c));
              } catch (e) {}
              UP.res = { before: before, after: cStats(c), at: (q && q.data && q.data.updated_at) || at };
              upSet('done', 100);
              toast(t('up.ok', { n: TOTAL }));
            });
        },
        function (e) {
          fail(t('up.err', { m: String((e && e.message) || e) }));
        }
      );
  };
  rd.readAsText(file);
}
