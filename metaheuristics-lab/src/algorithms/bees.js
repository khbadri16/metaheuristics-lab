// The Bees Algorithm (Pham et al., 2005), adapted to the TSP.
//
// Scout bees sample random tours ("sites"). The best m sites are exploited:
// each recruited bee lands on a random city of the site's tour and inspects
// every 2-opt move whose segment starts there and spans at most `patch`
// cities (its "flower patch"). The site moves to the best improvement any of
// its bees found. Elite sites (top e) get more bees. Patches shrink when a
// site stops improving, and a site stuck for too long is abandoned (its tour
// is remembered if it is the best so far) and replaced by a fresh scout. The
// remaining scouts keep sampling random tours for global exploration.

import { randomTour, tourLength, twoOptDelta, reverseSegment } from '../core/tsp.js';
import { randInt } from '../core/rng.js';

export class BeesAlgorithm {
  constructor(inst, params, rng) {
    this.inst = inst;
    this.rng = rng;
    this.scouts = Math.max(params.scouts, params.sites);
    this.sitesCount = params.sites;
    this.eliteCount = Math.min(params.elite, params.sites);
    this.eliteBees = params.eliteBees;
    this.otherBees = params.otherBees;
    this.stagnationLimit = params.stagnationLimit;
    this.initialPatch = Math.max(2, Math.round(params.patchSize * inst.n));
    this.minPatch = Math.max(3, Math.round(0.1 * inst.n));

    this.evaluations = 0;
    this.abandoned = 0;
    this.sites = [];
    for (let k = 0; k < this.scouts; k++) this.sites.push(this.#scout());
    this.sites.sort((a, b) => a.length - b.length);
    this.best = this.sites[0].tour.slice();
    this.bestLength = this.sites[0].length;
    this.iteration = 0;
    this.done = false;
  }

  #scout() {
    const tour = randomTour(this.inst.n, this.rng);
    this.evaluations++;
    return { tour, length: tourLength(tour, this.inst), patch: this.initialPatch, stagnation: 0 };
  }

  #record(site) {
    if (site.length < this.bestLength - 1e-12) {
      this.best = site.tour.slice();
      this.bestLength = site.length;
    }
  }

  /** One step = one foraging cycle. */
  step() {
    if (this.done) return;
    const { n } = this.inst;

    for (let s = 0; s < this.sitesCount; s++) {
      const site = this.sites[s];
      const bees = s < this.eliteCount ? this.eliteBees : this.otherBees;
      let bestDelta = -1e-12;
      let bi = -1;
      let bj = -1;
      for (let b = 0; b < bees; b++) {
        const i = randInt(this.rng, n - 1);
        const last = Math.min(n - 1, i + site.patch);
        for (let j = i + 1; j <= last; j++) {
          if (i === 0 && j === n - 1) continue;
          const delta = twoOptDelta(site.tour, i, j, this.inst);
          if (delta < bestDelta) {
            bestDelta = delta;
            bi = i;
            bj = j;
          }
        }
        this.evaluations += last - i;
      }

      if (bi >= 0) {
        reverseSegment(site.tour, bi, bj);
        site.length += bestDelta;
        site.stagnation = 0;
        this.#record(site);
      } else {
        // Neighbourhood shrinking, then site abandonment.
        site.stagnation++;
        site.patch = Math.max(this.minPatch, Math.floor(site.patch * 0.9));
        if (site.stagnation > this.stagnationLimit) {
          this.#record(site);
          this.sites[s] = this.#scout();
          this.abandoned++;
        }
      }
    }

    // Remaining bees scout new random sites (global search).
    for (let s = this.sitesCount; s < this.scouts; s++) this.sites[s] = this.#scout();

    this.sites.sort((a, b) => a.length - b.length);
    this.#record(this.sites[0]);
    this.iteration++;
  }

  get current() {
    return this.sites[0].tour;
  }

  info() {
    return [
      ['Best site patch', String(this.sites[0].patch)],
      ['Sites abandoned', String(this.abandoned)],
    ];
  }
}
