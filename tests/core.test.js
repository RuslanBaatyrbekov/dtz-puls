'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../lib/core.js');

const richCloud = {
  name: 'Ekaterina',
  xp: 500,
  t: 100,
  tourDone: 1,
  done: { d01: { d: '2026-11-18', p: 1 }, d02: { d: '2026-11-19', p: 0 } },
  days: { '2026-11-18': 120, '2026-11-19': 110 },
  prac: { kasus: 4 },
  cards: { c2: [2, '2026-11-25'] },
  missed: { k12: 1 }
};

test.describe('mergeStates', () => {
  test('a fresh device never wipes progress stored in the cloud', () => {
    // The bug from 22.11: an empty browser picked a language (newer timestamp) and overwrote the cloud.
    const freshDevice = { lang: 'ru', t: 200 };
    const merged = core.mergeStates(freshDevice, richCloud);
    assert.equal(merged.xp, 500);
    assert.deepEqual(Object.keys(merged.done).sort(), ['d01', 'd02']);
    assert.equal(merged.days['2026-11-19'], 110);
    assert.equal(merged.prac.kasus, 4);
    assert.deepEqual(merged.cards.c2, [2, '2026-11-25']);
    assert.equal(merged.name, 'Ekaterina');
    assert.equal(merged.tourDone, 1);
    assert.equal(merged.lang, 'ru', 'settings come from the newer copy');
  });

  test('progress from two devices is united, not replaced', () => {
    const phone = {
      xp: 520,
      t: 300,
      done: { d01: {}, d03: {} },
      days: { '2026-11-19': 40, '2026-11-20': 90 },
      cards: { c2: [1, 'x'], c5: [1, 'y'] }
    };
    const merged = core.mergeStates(phone, richCloud);
    assert.equal(merged.xp, 520);
    assert.deepEqual(Object.keys(merged.done).sort(), ['d01', 'd02', 'd03']);
    assert.equal(merged.days['2026-11-19'], 110, 'keeps the larger XP of the same day');
    assert.equal(merged.days['2026-11-20'], 90);
    assert.deepEqual(merged.cards.c2, [2, '2026-11-25'], 'keeps the higher Leitner box');
    assert.ok(merged.cards.c5);
  });

  test('the result does not depend on argument order', () => {
    const phone = { xp: 50, t: 300, done: { d05: {} } };
    assert.deepEqual(core.mergeStates(phone, richCloud), core.mergeStates(richCloud, phone));
  });

  test('a deliberate reset wins over copies saved before it', () => {
    const reset = { xp: 0, t: 300, wipe: 250 };
    const merged = core.mergeStates(reset, richCloud);
    assert.equal(merged.xp, 0);
    assert.deepEqual(merged.done, {});
  });

  test('progress made after a reset is kept', () => {
    const reset = { xp: 0, t: 300, wipe: 250 };
    const later = { xp: 30, t: 400, done: { d01: {} } };
    const merged = core.mergeStates(reset, later);
    assert.equal(merged.xp, 30);
    assert.ok(merged.done.d01);
    assert.equal(merged.wipe, 250);
  });

  test('merging with itself changes nothing', () => {
    const state = core.normalizeState(richCloud);
    assert.ok(core.sameState(core.mergeStates(state, state), state));
  });
});

test.describe('normalizeState', () => {
  test('repairs broken stored values', () => {
    const state = core.normalizeState({ xp: '12', done: null, days: [], cards: 'x' });
    assert.equal(state.xp, 12);
    assert.deepEqual(state.done, {});
    assert.deepEqual(state.days, {});
    assert.deepEqual(state.cards, {});
  });

  test('does not share objects with the input', () => {
    const input = { done: { d01: {} } };
    core.normalizeState(input).done.d02 = {};
    assert.deepEqual(Object.keys(input.done), ['d01']);
  });
});

test.describe('streak', () => {
  const now = new Date(2026, 10, 23, 12); // 23 Nov 2026, local time

  test('counts consecutive study days up to today', () => {
    const state = core.normalizeState({ days: { '2026-11-21': 1, '2026-11-22': 1, '2026-11-23': 1 } });
    assert.equal(core.streak(state, now), 3);
  });

  test('today still open: counts from yesterday', () => {
    const state = core.normalizeState({ days: { '2026-11-21': 1, '2026-11-22': 1 } });
    assert.equal(core.streak(state, now), 2);
  });

  test('a missed day breaks the streak', () => {
    const state = core.normalizeState({ days: { '2026-11-20': 1, '2026-11-21': 1 } });
    assert.equal(core.streak(state, now), 0);
  });

  test('a frozen day bridges the gap but does not count', () => {
    const state = core.normalizeState({
      days: { '2026-11-21': 1, '2026-11-23': 1 },
      frozen: { '2026-11-22': 1 }
    });
    assert.equal(core.streak(state, now), 2);
  });
});

test.describe('scheduleCard', () => {
  const now = new Date(2026, 10, 23, 12);
  const { AGAIN, HARD, GOOD } = core.GRADE;

  test('new card answered GOOD goes to box 1, due tomorrow', () => {
    assert.deepEqual(core.scheduleCard(undefined, GOOD, now), [1, '2026-11-24']);
  });

  test('GOOD climbs the boxes with growing intervals', () => {
    assert.deepEqual(core.scheduleCard([1, 'x'], GOOD, now), [2, '2026-11-26']);
    assert.deepEqual(core.scheduleCard([2, 'x'], GOOD, now), [3, '2026-11-30']);
    assert.deepEqual(core.scheduleCard([5, 'x'], GOOD, now), [5, '2026-12-23']);
  });

  test('HARD keeps the box and repeats tomorrow', () => {
    assert.deepEqual(core.scheduleCard([3, 'x'], HARD, now), [3, '2026-11-24']);
    assert.deepEqual(core.scheduleCard(undefined, HARD, now), [1, '2026-11-24']);
  });

  test('AGAIN sends the card back to box 1 for today', () => {
    assert.deepEqual(core.scheduleCard([4, 'x'], AGAIN, now), [1, '2026-11-23']);
  });

  test('a card counts as learned from box 3', () => {
    assert.equal(core.isLearned([2, 'x']), false);
    assert.equal(core.isLearned([3, 'x']), true);
  });
});

test.describe('dateKey', () => {
  test('pads month and day', () => {
    assert.equal(core.dateKey(new Date(2026, 0, 5)), '2026-01-05');
  });
  test('addDays crosses month and year', () => {
    assert.equal(core.dateKey(core.addDays(new Date(2026, 11, 31), 1)), '2027-01-01');
  });
});
