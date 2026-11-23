/* DTZ-Puls · course
 * Course data: loading, caching and indexing lessons and tasks.
 * Classic script: shares the global scope with the other files in js/ (load order is set in index.html). */
'use strict';

/* ---------- course ---------- */
var C = { weeks: [], bank: {}, rules: {}, exam: '2026-12-19' },
  BANK = {},
  WK = [],
  ALL = [],
  LBY = {},
  TOTAL = 0,
  KEY = 'dtz-puls-v1',
  CKEY = 'dtz-puls-course-v1',
  courseErr = '';
var SECTIONS = ['kasus', 'satz', 'hoeren', 'lesen', 'wort', 'sprechen', 'schreiben'];
function setCourse(c) {
  if (!c || !c.weeks) return false;
  C = c;
  BANK = {};
  LBY = {};
  WK = c.weeks;
  ALL = [];
  TOTAL = 0;
  Object.keys(c.bank || {}).forEach(function (sec) {
    (c.bank[sec] || []).forEach(function (x) {
      x._k = x.id;
      x._s = sec;
      BANK[x.id] = x;
    });
  });
  c.weeks.forEach(function (w, wi) {
    w.days.forEach(function (d) {
      d.week = wi;
      d.idx = ALL.length;
      ALL.push(d);
      LBY[d.id] = d;
      TOTAL++;
      d._tasks = (d.tasks || [])
        .map(function (id) {
          return BANK[id];
        })
        .filter(Boolean);
    });
  });
  return true;
}
if (window.COURSE) setCourse(window.COURSE);
function rule(id) {
  var r = (C.rules || {})[id];
  return r ? L(r) : '';
}
function explain(x) {
  var parts = [];
  (x.r || []).forEach(function (id) {
    var s = rule(id);
    if (s) parts.push(s);
  });
  if (x.e) parts.push(L(x.e));
  return parts.join(' · ');
}
