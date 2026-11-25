/* DTZ-Puls · screen-profile
 * Profile, progress and settings screen.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* progress + settings */
function badges() {
  var s = Math.max(S.best, streak()),
    dn = doneCount(),
    seen = Object.keys(S.seen).length;
  return [
    [t('b.first'), dn >= 1],
    [t('b.s3'), s >= 3],
    [t('b.s7'), s >= 7],
    [t('b.s14'), s >= 14],
    [t('b.clean'), S.perfect >= 1],
    [t('b.clean5'), S.perfect >= 5],
    [t('b.w1'), dn >= 7],
    [t('b.half'), dn >= Math.ceil(TOTAL / 2)],
    [t('b.all'), TOTAL > 0 && dn >= TOTAL],
    [t('b.t100'), seen >= 100],
    [t('b.t300'), seen >= 300]
  ];
}
function syncLine() {
  return (
    {
      local: t('sync.local'),
      connecting: t('sync.conn'),
      cloud: t('sync.cloud'),
      error: t('sync.err'),
      owner: t('sync.owner')
    }[syncState] || ''
  );
}
function vProg() {
  var lv = level(),
    dn = doneCount(),
    seen = Object.keys(S.seen).length,
    pct = lv.to ? Math.round(((S.xp - lv.from) / (lv.to - lv.from)) * 100) : 100;
  var h =
    header() +
    '<section class="card hero"><div class="row" style="gap:14px;flex-wrap:nowrap"><div class="me-av" aria-hidden="true">' +
    esc(S.avatar || '🙂') +
    '</div><div class="grow"><div class="eyebrow">' +
    esc(t('tab.progress')) +
    '</div><h1 style="margin:2px 0">' +
    esc(S.name || t('prog.you')) +
    '</h1><div class="small"><b>' +
    esc(t('lvl.label', { n: lv.i + 1 })) +
    '</b> ' +
    esc(lv.name) +
    ' · <span class="num muted">' +
    S.xp +
    ' XP</span></div></div></div><div class="bar"><i style="width:' +
    pct +
    '%"></i></div></section>' +
    '<div class="eyebrow" style="margin-top:4px">' +
    esc(t('prof.prog')) +
    '</div>';
  h +=
    '<div class="stats"><div class="stat"><b class="num">' +
    dn +
    ' / ' +
    TOTAL +
    '</b><span class="small muted">' +
    esc(t('prog.days')) +
    '</span></div><div class="stat"><b class="num">' +
    seen +
    '</b><span class="small muted">' +
    esc(t('prog.tasks')) +
    '</span></div><div class="stat"><b class="num">' +
    Math.max(S.best, streak()) +
    '</b><span class="small muted">' +
    esc(t('prog.best')) +
    '</span></div></div>';
  var cells = '',
    tt = new Date(),
    start = addDays(tt, -(((tt.getDay() + 6) % 7) + 28));
  for (var i = 0; i < 35; i++) {
    var d = addDays(start, i),
      k = ds(d);
    cells +=
      '<i class="' +
      (S.days[k] !== undefined ? 'a' : S.frozen[k] ? 'f' : '') +
      (k === today() ? ' t' : '') +
      '" title="' +
      k +
      '"></i>';
  }
  h +=
    '<section class="card"><h3>' +
    esc(t('prof.pulse')) +
    '</h3><div style="margin-top:10px">' +
    stripSvg() +
    '</div><p class="small muted" style="margin:8px 0 0"><b class="num" style="color:var(--pulse)">♥ ' +
    streak() +
    '</b> ' +
    esc(t('chip.streak')) +
    '</p></section>';
  h +=
    '<section class="card"><h3>' +
    esc(t('prog.heat')) +
    '</h3><div class="heat" style="margin-top:10px">' +
    cells +
    '</div></section>';
  var bySec = SECTIONS.map(function (sec) {
    var st = secStats(sec);
    return st.n
      ? '<div><div class="row small" style="justify-content:space-between"><span>' +
          esc(t('sec.' + sec)) +
          '</span><span class="num muted">' +
          st.seen +
          ' / ' +
          st.n +
          '</span></div><div class="bar acc" style="margin-top:4px"><i style="width:' +
          Math.round((st.seen / st.n) * 100) +
          '%"></i></div></div>'
      : '';
  }).join('');
  h +=
    '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h3>' +
    esc(t('prog.secs')) +
    '</h3>' +
    bySec +
    '</section>';
  h +=
    '<section><h3 style="margin-bottom:8px">' +
    esc(t('prog.badges')) +
    '</h3><div class="badges">' +
    badges()
      .map(function (b) {
        return (
          '<div class="badge' + (b[1] ? '' : ' off') + '"><b>' + (b[1] ? '✓ ' : '') + esc(b[0]) + '</b></div>'
        );
      })
      .join('') +
    '</div></section>';
  h +=
    '<section class="card" style="display:flex;flex-direction:column;gap:12px"><h3>' +
    esc(t('set.h')) +
    '</h3>' +
    '<div><div class="small" style="margin-bottom:6px"><b>' +
    esc(t('prof.theme')) +
    '</b></div><div class="themes">' +
    THEMES.map(function (x) {
      var cur = (S.theme || 'auto') === x[0];
      return (
        '<button class="th" data-a="theme" data-v="' +
        x[0] +
        '" aria-pressed="' +
        cur +
        '"><span class="sw">' +
        (x[2]
          ? x[2]
              .map(function (c) {
                return '<i style="background:' + c + '"></i>';
              })
              .join('')
          : '<i style="background:#f4f3ee"></i><i style="background:#151515"></i>') +
        '</span>' +
        esc(x[1] || t('th.auto')) +
        '</button>'
      );
    }).join('') +
    '</div></div>' +
    '<div><div class="small" style="margin-bottom:6px"><b>' +
    esc(t('prof.avatar')) +
    '</b></div><div class="avs">' +
    AVATARS.map(function (a) {
      return (
        '<button class="av" data-a="avatar" data-v="' +
        a +
        '" aria-pressed="' +
        (S.avatar === a) +
        '">' +
        a +
        '</button>'
      );
    }).join('') +
    '</div></div>' +
    '<div class="row"><span class="small" style="min-width:90px">' +
    esc(t('set.lang')) +
    '</span>' +
    langSelect('lg1') +
    '</div>' +
    voiceBlock() +
    remBlock() +
    '<div class="row"><label for="nm" class="small" style="min-width:90px">' +
    esc(t('set.name')) +
    '</label><input class="txt" id="nm" value="' +
    esc(S.name) +
    '" maxlength="30"><button class="btn small" data-a="name">' +
    esc(t('btn.save')) +
    '</button></div>' +
    '<p class="small muted" style="margin:0">' +
    esc(syncLine()) +
    (EMAIL ? ' · ' + esc(EMAIL) : '') +
    '</p>' +
    '<details><summary class="small">' +
    esc(t('set.code')) +
    '</summary><p class="small muted">' +
    esc(t('set.code.p')) +
    '</p><textarea id="code" class="txt" style="max-width:none;min-height:80px" dir="ltr" spellcheck="false"></textarea><div class="row" style="margin-top:8px"><button class="btn small ghost" data-a="exp">' +
    esc(t('set.exp')) +
    '</button><button class="btn small" data-a="imp">' +
    esc(t('set.imp')) +
    '</button></div></details>' +
    (SB && ME
      ? '<details><summary class="small">' +
        esc(t('pw.h')) +
        '</summary><form id="pwf" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"><input type="email" autocomplete="username" value="' +
        esc(EMAIL) +
        '" hidden><input class="txt" style="max-width:none" id="pw1" type="password" dir="ltr" autocomplete="new-password" placeholder="' +
        esc(t('pw.new')) +
        '"><input class="txt" style="max-width:none" id="pw2" type="password" dir="ltr" autocomplete="new-password" placeholder="' +
        esc(t('pw.rep')) +
        '"><button class="btn small" type="submit">' +
        esc(t('pw.btn')) +
        '</button></form></details>'
      : '') +
    '<div class="row"><button class="btn small ghost" data-a="tour">' +
    esc(t('tour.again')) +
    '</button>' +
    (SB && ME
      ? '<button class="btn small ghost" data-a="logout">' + esc(t('btn.logout')) + '</button>'
      : '') +
    '<button class="btn small ghost" data-a="reset" style="color:var(--bad)">' +
    esc(t('set.reset')) +
    '</button></div></section>';
  return h;
}
