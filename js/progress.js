/* DTZ-Puls · progress
 * Streak, levels, daily pace and limits.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- streak, levels ---------- */
var LEVELS = [0, 150, 400, 800, 1300, 2000, 2800, 3800, 5000, 6500];
function streak(st) {
  return Core.streak(st || S, new Date());
}
function applyFreezes() {
  var keys = Object.keys(S.days).concat(Object.keys(S.frozen)).sort();
  if (!keys.length || !S.freezes) return;
  var last = keys[keys.length - 1],
    gap = [],
    d = addDays(new Date(), -1);
  while (ds(d) > last && gap.length < 6) {
    gap.push(ds(d));
    d = addDays(d, -1);
  }
  if (gap.length && gap.length <= S.freezes) {
    gap.forEach(function (k) {
      S.frozen[k] = 1;
    });
    S.freezes -= gap.length;
    save();
  }
}
function level(st) {
  st = st || S;
  var i = 0;
  for (var k = 0; k < LEVELS.length; k++) if (st.xp >= LEVELS[k]) i = k;
  return { i: i, name: t('lvl.' + i), from: LEVELS[i], to: LEVELS[i + 1] || null };
}
/* pace: the daily limit grows when the exam is close; optional review days are skipped when behind */
function remaining(st) {
  st = st || S;
  var n = 0;
  for (var i = 0; i < ALL.length; i++) if (!st.done[ALL[i].id]) n++;
  return n;
}
function behind(st) {
  return remaining(st) > Math.max(1, daysLeft()) * 2;
}
function capToday() {
  return Math.min(6, Math.max(2, Math.ceil(remaining() / Math.max(1, daysLeft()))));
}
function nextIdx(st) {
  st = st || S;
  var skip = behind(st),
    first = -1;
  for (var i = 0; i < ALL.length; i++)
    if (!st.done[ALL[i].id]) {
      if (first < 0) first = i;
      if (skip && ALL[i].opt) continue;
      return i;
    }
  return first;
}
function newToday() {
  return S.newDay === today() ? S.newN : 0;
}
function doneCount(st) {
  st = st || S;
  var n = 0;
  Object.keys(st.done || {}).forEach(function (id) {
    if (LBY[id]) n++;
  });
  return n;
}
