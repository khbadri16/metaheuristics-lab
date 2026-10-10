// Genetic algorithm for permutations.
// Selection: tournament. Crossover: order crossover (OX), which keeps a slice
// of one parent and fills the rest in the other parent's order, so children
// are always valid tours. Mutation: inversion (reverse a random segment).
// Elitism carries the best tours unchanged into the next generation.

import { randomTour, tourLength, reverseSegment, randomMove } from '../core/tsp.js';
import { randInt } from '../core/rng.js';

export class GeneticAlgorithm {
  constructor(inst, params, rng) {
    this.inst = inst;
    this.rng = rng;
    this.popSize = params.population;
    this.crossoverRate = params.crossoverRate;
    this.mutationRate = params.mutationRate;
    this.elites = Math.min(params.elites, this.popSize - 1);
    this.tournament = params.tournament;
    this.maxGenerations = params.generations;

    this.population = [];
    for (let k = 0; k < this.popSize; k++) {
      const tour = randomTour(inst.n, rng);
      this.population.push({ tour, length: tourLength(tour, inst) });
    }
    this.evaluations = this.popSize;
    this.population.sort((a, b) => a.length - b.length);
    this.best = this.population[0].tour.slice();
    this.bestLength = this.population[0].length;
    this.iteration = 0;
    this.done = false;
    this.scratch = new Uint8Array(inst.n);
  }

  #select() {
    let winner = null;
    for (let k = 0; k < this.tournament; k++) {
      const cand = this.population[randInt(this.rng, this.popSize)];
      if (!winner || cand.length < winner.length) winner = cand;
    }
    return winner.tour;
  }

  /** Order crossover (OX1). */
  #crossover(p1, p2) {
    const n = this.inst.n;
    const child = new Int32Array(n);
    const used = this.scratch;
    used.fill(0);
    let a = randInt(this.rng, n);
    let b = randInt(this.rng, n);
    if (a > b) [a, b] = [b, a];
    for (let i = a; i <= b; i++) {
      child[i] = p1[i];
      used[p1[i]] = 1;
    }
    let pos = (b + 1) % n;
    for (let k = 0; k < n; k++) {
      const gene = p2[(b + 1 + k) % n];
      if (used[gene]) continue;
      child[pos] = gene;
      pos = (pos + 1) % n;
    }
    return child;
  }

  /** One step = one generation. */
  step() {
    if (this.done) return;
    const next = [];
    for (let k = 0; k < this.elites; k++) {
      next.push({ tour: this.population[k].tour.slice(), length: this.population[k].length });
    }
    while (next.length < this.popSize) {
      const p1 = this.#select();
      const p2 = this.#select();
      const child = this.rng() < this.crossoverRate ? this.#crossover(p1, p2) : p1.slice();
      if (this.rng() < this.mutationRate) {
        const [i, j] = randomMove(this.inst.n, this.rng);
        reverseSegment(child, i, j);
      }
      next.push({ tour: child, length: tourLength(child, this.inst) });
    }
    this.evaluations += this.popSize - this.elites;
    next.sort((a, b) => a.length - b.length);
    this.population = next;

    if (next[0].length < this.bestLength - 1e-12) {
      this.best = next[0].tour.slice();
      this.bestLength = next[0].length;
    }
    this.iteration++;
    if (this.iteration >= this.maxGenerations) this.done = true;
  }

  /** Show the best tour of the current generation as the "current" tour. */
  get current() {
    return this.population[0].tour;
  }

  info() {
    const lens = this.population.map((p) => p.length);
    const mean = lens.reduce((s, v) => s + v, 0) / lens.length;
    return [
      ['Generation', `${this.iteration} / ${this.maxGenerations}`],
      ['Mean length', mean.toFixed(3)],
    ];
  }
}
