// Simulated annealing with random 2-opt moves and geometric cooling.
// A worse tour is accepted with probability exp(-delta / T), so early on the
// search wanders freely and escapes local optima; as T cools it settles down.

import { randomTour, tourLength, twoOptDelta, reverseSegment, randomMove } from '../core/tsp.js';

export class SimulatedAnnealing {
  constructor(inst, params, rng) {
    this.inst = inst;
    this.rng = rng;
    this.alpha = params.coolingRate;
    this.movesPerTemp = Math.max(10, Math.round(params.movesPerTemp * inst.n));
    this.current = randomTour(inst.n, rng);
    this.currentLength = tourLength(this.current, inst);
    this.best = this.current.slice();
    this.bestLength = this.currentLength;
    this.iteration = 0;
    this.evaluations = 1;
    this.done = false;
    this.accepted = 0;
    this.proposed = 0;

    // Pick T0 so that an average uphill move is accepted with the requested
    // probability: p0 = exp(-avgDelta / T0)  =>  T0 = -avgDelta / ln(p0).
    let sum = 0;
    let count = 0;
    for (let k = 0; k < 200; k++) {
      const [i, j] = randomMove(inst.n, rng);
      const d = twoOptDelta(this.current, i, j, inst);
      if (d > 0) {
        sum += d;
        count++;
      }
    }
    const avgUphill = count ? sum / count : 0.1;
    this.T0 = -avgUphill / Math.log(params.initialAcceptance);
    this.T = this.T0;
    this.Tmin = this.T0 * 1e-4;
  }

  /** One step = one temperature level. */
  step() {
    if (this.done) return;
    const { n } = this.inst;
    const tour = this.current;
    let accepted = 0;

    for (let k = 0; k < this.movesPerTemp; k++) {
      const [i, j] = randomMove(n, this.rng);
      const delta = twoOptDelta(tour, i, j, this.inst);
      if (delta < 0 || this.rng() < Math.exp(-delta / this.T)) {
        reverseSegment(tour, i, j);
        this.currentLength += delta;
        accepted++;
        if (this.currentLength < this.bestLength - 1e-12) {
          this.best.set(tour);
          this.bestLength = this.currentLength;
        }
      }
    }

    this.evaluations += this.movesPerTemp;
    this.accepted = accepted;
    this.proposed = this.movesPerTemp;
    this.T *= this.alpha;
    this.iteration++;
    if (this.T < this.Tmin) this.done = true;
  }

  info() {
    const rate = this.proposed ? (100 * this.accepted) / this.proposed : 0;
    return [
      ['Temperature', this.T.toExponential(2)],
      ['Acceptance', `${rate.toFixed(1)}%`],
    ];
  }
}
