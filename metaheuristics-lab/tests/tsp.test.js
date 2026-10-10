import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/core/rng.js';
import {
  createInstance, generatePoints, tourLength, twoOptDelta, reverseSegment,
  randomMove, randomTour, isValidTour, identityTour,
} from '../src/core/tsp.js';

test('tour length of a unit square is 4', () => {
  const inst = createInstance([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  assert.equal(tourLength(identityTour(4), inst), 4);
});

test('2-opt delta equals the real change in tour length', () => {
  const rng = mulberry32(42);
  const inst = createInstance(generatePoints(40, 'uniform', rng));
  const tour = randomTour(inst.n, rng);
  for (let k = 0; k < 500; k++) {
    const [i, j] = randomMove(inst.n, rng);
    const before = tourLength(tour, inst);
    const delta = twoOptDelta(tour, i, j, inst);
    reverseSegment(tour, i, j);
    assert.ok(Math.abs(tourLength(tour, inst) - (before + delta)) < 1e-9, `move ${i},${j}`);
  }
});

test('random moves are always valid and respect the span limit', () => {
  const rng = mulberry32(7);
  for (const n of [4, 5, 10, 100]) {
    for (let k = 0; k < 2000; k++) {
      const [i, j] = randomMove(n, rng, 3);
      assert.ok(i >= 0 && i < j && j < n);
      assert.ok(!(i === 0 && j === n - 1));
      assert.ok(j - i <= 3);
    }
  }
});

test('every layout produces n points inside the unit square', () => {
  for (const layout of ['uniform', 'clusters', 'circle']) {
    const pts = generatePoints(50, layout, mulberry32(1));
    assert.equal(pts.length, 50);
    for (const p of pts) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  }
});

test('random tours are permutations', () => {
  const rng = mulberry32(3);
  for (let k = 0; k < 50; k++) assert.ok(isValidTour(randomTour(30, rng), 30));
});
