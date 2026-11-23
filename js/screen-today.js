/* DTZ-Puls · screen-today
 * Header, Today screen and the course path.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- screens ---------- */
var BRAND =
  '<div class="brand"><svg viewBox="0 0 28 16"><path d="M0 9h7l2-3 3 9 3-14 3 8h10"/></svg>DTZ-Puls</div>';
function langSelect(id) {
  return (
    '<label class="sr" for="' +
    id +
    '">' +
    esc(t('set.lang')) +
    '</label><select class="txt sel' +
    (id === 'lgh' ? ' lgh' : '') +
    '" id="' +
    id +
    '" data-ch="lang" title="Language">' +
    LANGS.map(function (l) {
      return (
        '<option value="' +
        l[0] +
        '"' +
        (l[0] === LANG ? ' selected' : '') +
        '>' +
        (id === 'lgh' ? l[0].toUpperCase() : l[1]) +
        '</option>'
      );
    }).join('') +
    '</select>'
  );
}
function updBar() {
  return UPD
    ? '<button class="updbar" data-a="reload"><span aria-hidden="true">🔄</span><span class="grow">' +
        esc(t('upd.h')) +
        '</span><b>' +
        esc(t('upd.btn')) +
        '</b></button>'
    : '';
}
function header() {
  var nm = (S.name || '').trim().split(/\s+/)[0] || t('tab.progress'),
    on = view === 'progress';
  return (
    '<div class="top hdr"><div class="hl">' +
    BRAND +
    '<div class="chips">' +
    langSelect('lgh') +
    '<span class="chip num" title="' +
    esc(t('chip.exam')) +
    '"><b>⏳</b> ' +
    daysLeft() +
    '</span><span class="chip num" title="' +
    esc(t('chip.streak')) +
    '"><b>♥</b> ' +
    streak() +
    '</span><span class="chip xp num" title="XP"><b>★</b> ' +
    S.xp +
    '</span></div></div>' +
    '<button class="mebtn' +
    (on ? ' on' : '') +
    '" data-a="tab" data-v="progress" aria-label="' +
    esc(t('tab.progress')) +
    '"' +
    (on ? ' aria-current="page"' : '') +
    '><span class="meav avc" aria-hidden="true">' +
    esc(S.avatar || '👤') +
    '</span><span class="mename" dir="auto">' +
    esc(nm) +
    '</span></button></div>'
  );
}
function vNoCourse() {
  var noCfg = !cfgOk();
  return (
    '<div class="top">' +
    BRAND +
    '</div><section class="card hero"><h1>' +
    esc(noCfg ? t('nc.cfg.h') : t('nc.h')) +
    '</h1><p class="small muted" style="margin:0">' +
    esc(noCfg ? t('nc.cfg.p') : courseErr) +
    '</p>' +
    (noCfg
      ? ''
      : '<div class="foot"><button class="btn" data-a="retry">' +
        esc(t('btn.retry')) +
        '</button>' +
        (ME ? '<button class="btn ghost" data-a="logout">' + esc(t('btn.logout')) + '</button>' : '') +
        '</div>') +
    '</section>'
  );
}
function langGrid() {
  return (
    '<div class="langs">' +
    LANGS.map(function (l) {
      return (
        '<button class="lgb' +
        (l[0] === LANG ? ' on' : '') +
        '" data-a="pick-lang" data-v="' +
        l[0] +
        '" lang="' +
        l[0] +
        '" dir="' +
        (l[2] ? 'rtl' : 'ltr') +
        '">' +
        l[1] +
        '</button>'
      );
    }).join('') +
    '</div>'
  );
}
var LANGHEAD = '🌐 Sprache · Language · Язык · Dil · اللغة · زبان · Jezik · Idioma · भाषा';
function vLogin() {
  if (!LANGCHOSEN)
    return (
      '<div class="top">' +
      BRAND +
      '</div><section class="card hero"><h1 style="font-size:20px">' +
      LANGHEAD +
      '</h1>' +
      langGrid() +
      '</section>'
    );
  return (
    '<div class="top">' +
    BRAND +
    langSelect('lg0') +
    '</div>' +
    '<section class="card hero"><div class="eyebrow">' +
    esc(t('login.eyebrow')) +
    '</div><h1>' +
    esc(t('login.h')) +
    '</h1><p class="small muted" style="margin:0">' +
    esc(t('login.p')) +
    '</p>' +
    '<form id="lf" style="display:flex;flex-direction:column;gap:10px"><label class="small" for="em">Email</label><input class="txt" style="max-width:none" id="em" type="email" dir="ltr" autocomplete="username" inputmode="email" required value="' +
    esc(loginEm) +
    '">' +
    '<label class="small" for="pw">' +
    esc(t('login.pw')) +
    '</label><input class="txt" style="max-width:none" id="pw" type="password" dir="ltr" autocomplete="current-password" required>' +
    (loginErr
      ? '<p class="small" role="alert" style="margin:0;color:var(--bad)">' + esc(loginErr) + '</p>'
      : '') +
    '<button class="btn" type="submit"' +
    (loginBusy ? ' disabled' : '') +
    '>' +
    esc(loginBusy ? t('login.busy') : t('login.btn')) +
    '</button></form><p class="small muted" style="margin:0">' +
    esc(t('login.noacc')) +
    '</p></section><p class="small muted" lang="de" dir="ltr" style="margin:0">Privates, kostenloses Lernprojekt. Nicht offiziell, nicht verbunden mit BAMF, g.a.s.t. oder telc.</p>'
  );
}
function vBoot() {
  return '<div class="card">' + esc(t('boot')) + '</div>';
}

function dayRow(D) {
  var done = !!S.done[D.id],
    ni = nextIdx(),
    nx = ni === D.idx,
    skipped = !done && D.opt && D.idx < ni,
    cls = done ? 'done' : nx ? 'next' : skipped ? 'opt' : 'lock';
  var st = done
    ? S.done[D.id].p
      ? t('day.perfect')
      : t('day.done')
    : skipped
      ? t('day.opt')
      : nx
        ? D.boss
          ? t('day.boss')
          : t('day.min', { n: D.min || 20 })
        : t('day.locked');
  return (
    '<button class="day ' +
    cls +
    '" data-a="open" data-i="' +
    D.idx +
    '"' +
    (cls === 'lock' ? ' aria-disabled="true"' : '') +
    '><span class="n">' +
    (done ? '✓' : D.idx + 1) +
    '</span><span class="grow"><span class="tt">' +
    esc(L(D.title)) +
    '</span><br><span class="st">' +
    esc(st) +
    '</span></span>' +
    (D.tag ? '<span class="tag">' + esc(t('sec.' + D.tag)) + '</span>' : '') +
    '</button>'
  );
}
function vPath() {
  var ni = nextIdx(),
    did = S.days[today()] !== undefined,
    cap = newToday() >= capToday(),
    h = header(),
    dc = doneCount();
  var rev = dc ? '<button class="linkbtn" data-a="review">' + esc(t('btn.review')) + '</button>' : '';
  var pace =
    ni >= 0 && (capToday() > 2 || behind())
      ? '<p class="small" style="margin:0;color:var(--pulse)"><b>' +
        esc(t('path.pace', { n: capToday() })) +
        '</b></p>'
      : '';
  if (S.tour && !S.tourDone && TOUR < 0)
    h +=
      '<button class="tourcard" data-a="tour"><span class="tci" aria-hidden="true">🎓</span><span class="grow"><b>' +
      esc(t('tour.card')) +
      '</b><br><span class="small">' +
      esc(t('tour.cardsub')) +
      '</span></span><span class="tcb" aria-hidden="true">▶</span></button>';
  var body;
  if (ni < 0) {
    body =
      '<div class="eyebrow">🏁</div><h2 class="daytitle">' +
      esc(t('path.alldone')) +
      '</h2><div class="foot"><button class="btn" data-a="review">' +
      esc(t('btn.review')) +
      '</button></div>';
  } else if (!did) {
    var D = ALL[ni];
    body =
      '<div class="eyebrow">' +
      esc(t('path.today', { n: ni + 1 })) +
      '</div><h2 class="daytitle">' +
      esc(L(D.title)) +
      '</h2><p class="small muted" style="margin:0">' +
      esc(t('path.dur', { m: D.min || 20 })) +
      '</p>' +
      pace +
      (dc < 3 ? '<p class="small muted" style="margin:0">' + esc(t('path.min')) + '</p>' : '') +
      '<div class="foot"><button class="btn big-cta" data-a="open" data-i="' +
      ni +
      '">' +
      esc(t('path.start', { n: ni + 1 })) +
      ' →</button></div>' +
      rev;
  } else {
    body =
      '<div class="eyebrow">✅</div><h2 class="daytitle">' +
      esc(t('path.donet', { n: Math.max(1, ni) })) +
      '</h2><p class="small" style="margin:0">' +
      esc(cap ? t('path.cap', { n: ni + 1 }) : t('path.did')) +
      '</p>' +
      pace +
      '<div class="foot">' +
      (cap
        ? '<button class="btn ghost" data-a="tab" data-v="practice">' + esc(t('tab.practice')) + '</button>'
        : '<button class="btn ghost" data-a="open" data-i="' +
          ni +
          '">' +
          esc(t('path.more', { n: ni + 1 })) +
          '</button>') +
      '</div>' +
      rev;
  }
  var exam =
    '<p class="examline"><span aria-hidden="true">⏳</span> ' +
    esc(t('path.exam', { n: '\u0001' })).replace('\u0001', '<b class="num">' + daysLeft() + '</b>') +
    '</p>';
  if (C.gloss && S.tour && S.tourDone && TOUR < 0 && !(S.news && S.news.gloss))
    h +=
      '<section class="card news"><div class="eyebrow">🆕 ' +
      esc(t('news.gl.h')) +
      '</div><p class="small" style="margin:6px 0 10px">' +
      esc(t('news.gl.p')) +
      '</p><div class="row"><button class="btn small ghost" data-a="newsgx">' +
      esc(t('news.close')) +
      '</button></div></section>';
  else if (cards().length && S.tour && S.tourDone && TOUR < 0 && !(S.news && S.news.cards))
    h +=
      '<section class="card news"><div class="eyebrow">🆕 ' +
      esc(t('news.cards.h')) +
      '</div><p class="small" style="margin:6px 0 10px">' +
      esc(t('news.cards.p')) +
      '</p><div class="row"><button class="btn small" data-a="newsopen">🃏 ' +
      esc(t('news.open')) +
      '</button><button class="btn small ghost" data-a="newsx">' +
      esc(t('news.close')) +
      '</button></div></section>';
  h += remCard();
  var cn = cards().length ? cToday() : 0,
    cline = cn
      ? '<button class="cline" data-a="cards"><span aria-hidden="true">🃏</span><span>' +
        esc(t('cards.today', { n: '\u0001' })).replace('\u0001', '<b class="num">' + cn + '</b>') +
        '</span><span aria-hidden="true" class="muted">›</span></button>'
      : '';
  h +=
    '<section class="card hero todayc' +
    (did && ni >= 0 ? ' done' : '') +
    '">' +
    exam +
    '<div class="todaygo">' +
    body +
    '</div></section>' +
    cline;
  WK.forEach(function (w, wi) {
    var d = w.days.filter(function (x) {
      return S.done[x.id];
    }).length;
    h +=
      '<section class="week"><div><div class="eyebrow">' +
      esc(t('path.week', { n: wi + 1 })) +
      ' · <span class="num">' +
      d +
      ' / ' +
      w.days.length +
      '</span></div><h2>' +
      esc(L(w.title)) +
      '</h2>' +
      (w.sub ? '<p class="small muted" style="margin:4px 0 0">' + esc(L(w.sub)) + '</p>' : '') +
      '</div><div class="days">' +
      w.days.map(dayRow).join('') +
      '</div></section>';
  });
  return h;
}
