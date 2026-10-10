// Travelling Salesman Problem: instances, tours and the 2-opt move.
//
// A tour is an Int32Array permutation of city indices; the salesman returns
// to the first city, so the tour is a closed cycle.

import { randInt, shuffle, gaussian } from './rng.js';

export const LAYOUTS = ['uniform', 'clusters', 'circle'];

/**
 * Generate n points in the rectangle [0, aspect] × [0, 1] for the given layout.
 * The UI uses a wide map (aspect 1.6); tests use the unit square.
 */
export function generatePoints(n, layout, rng, aspect = 1) {
  const pts = [];
  const margin = 0.04;
  const clampX = (v) => Math.min(aspect - margin, Math.max(margin, v));
  const clampY = (v) => Math.min(1 - margin, Math.max(margin, v));

  if (layout === 'circle') {
    const offset = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      pts.push({ x: aspect / 2 + 0.42 * Math.cos(a), y: 0.5 + 0.42 * Math.sin(a) });
    }
    // Shuffle so the input order does not hand anyone the optimal tour.
    return shuffle(pts, rng);
  }

  if (layout === 'clusters') {
    const k = Math.max(2, Math.min(7, Math.round(Math.sqrt(n) / 1.6)));
    const centres = [];
    for (let c = 0; c < k; c++) {
      centres.push({ x: 0.15 * aspect + rng() * 0.7 * aspect, y: 0.15 + rng() * 0.7 });
    }
    for (let i = 0; i < n; i++) {
      const c = centres[randInt(rng, k)];
      pts.push({ x: clampX(c.x + gaussian(rng) * 0.07), y: clampY(c.y + gaussian(rng) * 0.07) });
    }
    return pts;
  }

  for (let i = 0; i < n; i++) pts.push({ x: clampX(rng() * aspect), y: clampY(rng()) });
  return pts;
}

/** Build an instance with a precomputed distance matrix. */
export function createInstance(points) {
  const n = points.length;
  const dist = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      dist[i * n + j] = d;
      dist[j * n + i] = d;
    }
  }
  return { n, points, dist };
}

export function tourLength(tour, inst) {
  const { n, dist } = inst;
  let len = 0;
  for (let i = 0; i < n; i++) len += dist[tour[i] * n + tour[(i + 1) % n]];
  return len;
}

export function identityTour(n) {
  const t = new Int32Array(n);
  for (let i = 0; i < n; i++) t[i] = i;
  return t;
}

export function randomTour(n, rng) {
  return shuffle(identityTour(n), rng);
}

/**
 * Change in tour length if the segment tour[i..j] is reversed (a 2-opt move).
 * Requires 0 <= i < j < n and not (i === 0 && j === n - 1).
 * Runs in O(1): only the two edges at the segment's ends change.
 */
export function twoOptDelta(tour, i, j, inst) {
  const { n, dist } = inst;
  const a = tour[(i - 1 + n) % n];
  const b = tour[i];
  const c = tour[j];
  const d = tour[(j + 1) % n];
  return dist[a * n + c] + dist[b * n + d] - dist[a * n + b] - dist[c * n + d];
}

/** Reverse tour[i..j] in place. */
export function reverseSegment(tour, i, j) {
  while (i < j) {
    const t = tour[i];
    tour[i] = tour[j];
    tour[j] = t;
    i++;
    j--;
  }
}

/**
 * Random valid 2-opt move [i, j]. If maxSpan is given, the reversed segment
 * is at most maxSpan + 1 cities long (a "neighbourhood size").
 */
export function randomMove(n, rng, maxSpan = n - 1) {
  const span = 1 + randInt(rng, Math.max(1, Math.min(maxSpan, n - 2)));
  const i = randInt(rng, n - span);
  return [i, i + span];
}

/** True if tour is a permutation of 0..n-1. */
export function isValidTour(tour, n) {
  if (tour.length !== n) return false;
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const c = tour[i];
    if (c < 0 || c >= n || seen[c]) return false;
    seen[c] = 1;
  }
  return true;
}
