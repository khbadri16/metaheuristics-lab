import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/core/rng.js';
import { createInstance, generatePoints, tourLength, isValidTour } from '../src/core/tsp.js';
import { ALGORITHMS, defaultParams } from '../src/algorithms/index.js';
import { Race } from '../src/core/runner.js';

// Cities on a circle: the optimal tour visits them in angular order, so its
// length is the perimeter of a regular polygon.
const N = 30;
const R = 0.42;
const circle = createInstance(generatePoints(N, 'circle', mulberry32(11)));
const optimum = N * 2 * R * Math.sin(Math.PI / N);

// Generous ceilings so the test stays fast while still checking quality.
const overrides = {
  ga: { generations: 1500 },
  ba: {},
};

for (const def of ALGORITHMS) {
  test(`${def.name} returns a valid tour whose length is reported correctly`, () => {
    const params = { ...defaultParams(def), ...(overrides[def.id] || {}) };
    const race = new Race(circle, [{ def, params }], { seed: 5, budgetMs: 1500 });
    race.runToEnd();
    const alg = race.entries[0].alg;
    assert.ok(isValidTour(alg.best, N), 'best is a permutation');
    assert.ok(Math.abs(tourLength(alg.best, circle) - alg.bestLength) < 1e-9, 'reported length matches');
    assert.ok(alg.bestLength >= optimum - 1e-9, 'cannot beat the optimum');
  });
}

test('2-opt based local search reaches the optimum on convex instances', () => {
  for (const id of ['hc', 'sa', 'ba']) {
    const def = ALGORITHMS.find((a) => a.id === id);
    const race = new Race(circle, [{ def, params: defaultParams(def) }], { seed: 9, budgetMs: 1500 });
    race.runToEnd();
    const gap = race.entries[0].alg.bestLength / optimum - 1;
    assert.ok(gap < 1e-9, `${def.name} gap ${(gap * 100).toFixed(3)}%`);
  }
});

test('the genetic algorithm gets within 15% of the optimum', () => {
  const def = ALGORITHMS.find((a) => a.id === 'ga');
  const race = new Race(circle, [{ def, params: { ...defaultParams(def), generations: 1500 } }], { seed: 9, budgetMs: 3000 });
  race.runToEnd();
  const gap = race.entries[0].alg.bestLength / optimum - 1;
  assert.ok(gap < 0.15, `gap ${(gap * 100).toFixed(1)}%`);
});

test('the race stops each algorithm at its compute budget', () => {
  const inst = createInstance(generatePoints(120, 'uniform', mulberry32(2)));
  const entries = ALGORITHMS.map((def) => ({ def, params: defaultParams(def) }));
  const race = new Race(inst, entries, { seed: 1, budgetMs: 150 });
  race.runToEnd();
  for (const e of race.entries) {
    assert.ok(e.status === 'done' || e.status === 'budget');
    // One step may overshoot the budget slightly, never by much.
    assert.ok(e.time < 150 + 250, `${e.def.name} used ${e.time.toFixed(0)}ms`);
  }
});

test('runs are reproducible from the seed', () => {
  const def = ALGORITHMS.find((a) => a.id === 'sa');
  const run = () => {
    const race = new Race(circle, [{ def, params: defaultParams(def) }], { seed: 123, budgetMs: 10_000 });
    race.runToEnd();
    return race.entries[0].alg.bestLength;
  };
  assert.equal(run(), run());
});
