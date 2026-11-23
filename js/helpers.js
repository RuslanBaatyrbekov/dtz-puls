/* DTZ-Puls · helpers
 * Small DOM and formatting helpers.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- helpers ---------- */
/* pure logic lives in lib/core.js (unit-tested); short aliases keep the existing call sites */
var Core = window.DTZCore,
  ds = Core.dateKey,
  addDays = Core.addDays,
  def = Core.defaultState,
  fix = Core.normalizeState,
  mergeS = Core.mergeStates,
  same = Core.sameState;
var $ = function (s) {
  return document.querySelector(s);
};
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function today() {
  return ds(new Date());
}
function shuffle(a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var q = a[i];
    a[i] = a[j];
    a[j] = q;
  }
  return a;
}
function daysLeft() {
  var e = new Date((C.exam || '2026-12-19') + 'T00:00:00'),
    n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((e - n) / 864e5));
}
