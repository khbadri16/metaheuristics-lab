// Steepest-descent hill climbing over the 2-opt neighbourhood, with restarts.
// Each step scans every 2-opt move, applies the best improving one, and stops
// at a local optimum (no improving move). It then restarts from a new random
// tour until the restart budget is spent.

import { randomTour, tourLength, twoOptDelta, reverseSegment } from '../core/tsp.js';

export class HillClimbing {
  constructor(inst, params, rng) {
    this.inst = inst;
    this.rng = rng;
    this.maxRestarts = params.restarts;
    this.restarts = 0;
    this.localOptima = 0;
    this.iteration = 0;
    this.evaluations = 0;
    this.done = false;
    this.#restart();
    this.best = this.current.slice();
    this.bestLength = this.currentLength;
  }

  #restart() {
    this.current = randomTour(this.inst.n, this.rng);
    this.currentLength = tourLength(this.current, this.inst);
    this.evaluations++;
  }

  step() {
    if (this.done) return;
    const { n } = this.inst;
    const tour = this.current;
    let bestDelta = -1e-12;
    let bi = -1;
    let bj = -1;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const delta = twoOptDelta(tour, i, j, this.inst);
        if (delta < bestDelta) {
          bestDelta = delta;
          bi = i;
          bj = j;
        }
      }
    }
    this.evaluations += (n * (n - 1)) / 2 - 1;
    this.iteration++;

    if (bi >= 0) {
      reverseSegment(tour, bi, bj);
      this.currentLength += bestDelta;
      if (this.currentLength < this.bestLength - 1e-12) {
        this.best.set(tour);
        this.bestLength = this.currentLength;
      }
      return;
    }

    // Local optimum reached: no single 2-opt move improves the tour.
    this.localOptima++;
    if (this.restarts < this.maxRestarts) {
      this.restarts++;
      this.#restart();
    } else {
      this.done = true;
    }
  }

  info() {
    return [
      ['Restarts', `${this.restarts} / ${this.maxRestarts}`],
      ['Local optima', String(this.localOptima)],
    ];
  }
}
