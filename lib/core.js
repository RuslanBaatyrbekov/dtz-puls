/*
 * DTZ-Puls core logic: pure functions with no DOM, network or global state.
 * Loaded in the browser before js/*.js (as window.DTZCore) and in Node for unit tests.
 */
(function (root) {
  'use strict';

  /** Format a Date as local YYYY-MM-DD. */
  function dateKey(date) {
    var month = date.getMonth() + 1;
    var day = date.getDate();
    return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  /** Return a new Date shifted by `days` (negative goes back). */
  function addDays(date, days) {
    var copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  /* ---------- learner state ---------- */

  /** Object-valued fields of the learner state (always present, never arrays). */
  var MAP_FIELDS = ['done', 'days', 'frozen', 'missed', 'seen', 'prac', 'nt', 'cards', 'my'];

  /** A fresh, empty learner state. `t` is the time of the last local save (ms). */
  function defaultState() {
    return {
      name: '',
      lang: '',
      xp: 0,
      done: {},
      days: {},
      frozen: {},
      freezes: 0,
      missed: {},
      seen: {},
      prac: {},
      cards: {},
      newDay: '',
      newN: 0,
      best: 0,
      perfect: 0,
      reviews: 0,
      t: 0
    };
  }

  /** Deep-copy any stored value into a well-formed learner state. */
  function normalizeState(value) {
    var source = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : {};
    var state = Object.assign(defaultState(), source);
    MAP_FIELDS.forEach(function (key) {
      if (!state[key] || typeof state[key] !== 'object' || Array.isArray(state[key])) state[key] = {};
    });
    state.xp = +state.xp || 0;
    return state;
  }

  /** Progress fields merged as a union (the newer copy wins on conflicts). */
  var UNION_FIELDS = ['done', 'frozen', 'seen', 'nt', 'my'];
  /** Progress fields merged by keeping the larger number per key. */
  var MAX_FIELDS = ['days', 'prac'];
  /** Counters that only ever grow. */
  var COUNTERS = ['xp', 'best', 'perfect', 'reviews', 'cn'];

  /**
   * Merge two copies of the same learner's state so that no device can wipe progress made on another.
   * Settings come from the newer copy; progress is united. A deliberate reset or import sets `wipe`
   * and cuts off every copy saved before it.
   */
  function mergeStates(a, b) {
    a = normalizeState(a);
    b = normalizeState(b);
    var newer = (a.t || 0) >= (b.t || 0) ? a : b;
    var older = newer === a ? b : a;
    if ((newer.wipe || 0) > (older.t || 0)) return newer;

    var result = normalizeState(newer);

    function unite(key) {
      Object.keys(older[key] || {}).forEach(function (k) {
        if (!(k in result[key])) result[key][k] = older[key][k];
      });
    }
    function keepMax(key) {
      Object.keys(older[key] || {}).forEach(function (k) {
        var value = +older[key][k] || 0;
        if (!(k in result[key]) || value > (+result[key][k] || 0)) result[key][k] = older[key][k];
      });
    }

    UNION_FIELDS.forEach(unite);
    MAX_FIELDS.forEach(keepMax);

    // Flashcards: keep the copy that reached the higher Leitner box.
    Object.keys(older.cards || {}).forEach(function (id) {
      var theirs = older.cards[id];
      var ours = result.cards[id];
      if (!ours || (theirs && theirs[0] > ours[0])) result.cards[id] = theirs;
    });

    // Mistakes to review: only borrow them when the newer copy is behind or has none.
    if (
      Object.keys(result.done).length < Object.keys(older.done || {}).length ||
      !Object.keys(result.missed).length
    ) {
      unite('missed');
    }

    COUNTERS.forEach(function (key) {
      if (newer[key] === undefined && older[key] === undefined) return;
      result[key] = Math.max(+newer[key] || 0, +older[key] || 0);
    });

    if (!result.tourDone && older.tourDone) result.tourDone = older.tourDone;
    if (!result.tour && older.tour) result.tour = older.tour;
    if (!result.name && older.name) result.name = older.name;
    if (older.wipe && !(result.wipe >= older.wipe)) result.wipe = older.wipe;
    return result;
  }

  /** True when two states serialize identically. */
  function sameState(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) {
      return false;
    }
  }

  /* ---------- streak ---------- */

  /** A day counts for the streak if the learner studied or a streak freeze covered it. */
  function isActiveDay(state, key) {
    return state.days[key] !== undefined || !!(state.frozen && state.frozen[key]);
  }

  /**
   * Number of study days in the current streak. Today may still be open: the streak then
   * counts back from yesterday. Frozen days keep the streak alive but do not add to it.
   */
  function streak(state, now) {
    var day = new Date(now);
    if (!isActiveDay(state, dateKey(day))) {
      day = addDays(day, -1);
      if (!isActiveDay(state, dateKey(day))) return 0;
    }
    var count = 0;
    while (isActiveDay(state, dateKey(day))) {
      if (state.days[dateKey(day)] !== undefined) count++;
      day = addDays(day, -1);
    }
    return count;
  }

  /* ---------- flashcards (Leitner boxes) ---------- */

  /** Days until the next review for boxes 1..5 (index = box). */
  var CARD_INTERVALS = [0, 1, 3, 7, 14, 30];
  var GRADE = { AGAIN: 0, HARD: 1, GOOD: 2 };

  /**
   * Next scheduling entry [box, dueDateKey] for a card after a grade.
   * AGAIN: back to box 1, due today. HARD: same box (at least 1), due tomorrow.
   * GOOD: one box up (max 5), due after that box's interval.
   */
  function scheduleCard(entry, grade, now) {
    var box = entry ? entry[0] : 0;
    if (grade === GRADE.AGAIN) return [1, dateKey(now)];
    if (grade === GRADE.HARD) return [Math.max(1, box), dateKey(addDays(now, 1))];
    box = Math.min(5, box + 1);
    return [box, dateKey(addDays(now, CARD_INTERVALS[box]))];
  }

  /** A card counts as learned from box 3 (review interval of a week or more). */
  function isLearned(entry) {
    return !!entry && entry[0] >= 3;
  }

  var api = {
    dateKey: dateKey,
    addDays: addDays,
    defaultState: defaultState,
    normalizeState: normalizeState,
    mergeStates: mergeStates,
    sameState: sameState,
    isActiveDay: isActiveDay,
    streak: streak,
    CARD_INTERVALS: CARD_INTERVALS,
    GRADE: GRADE,
    scheduleCard: scheduleCard,
    isLearned: isLearned
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DTZCore = api;
})(this);
