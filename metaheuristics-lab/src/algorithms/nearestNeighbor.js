// Nearest neighbour: a greedy constructive heuristic, used as a baseline.
// From a start city, always travel to the closest city not yet visited.
// With "multi-start" on, the tour is rebuilt from every city and the best kept.

import { tourLength } from '../core/tsp.js';

export class NearestNeighbor {
  constructor(inst, params) {
    this.inst = inst;
    this.multiStart = !!params.multiStart;
    this.starts = this.multiStart ? inst.n : 1;
    this.startIndex = 0;
    this.best = null;
    this.bestLength = Infinity;
    this.iteration = 0;
    this.evaluations = 0;
    this.done = false;
    this.#begin(0);
  }

  #begin(start) {
    this.visited = new Uint8Array(this.inst.n);
    this.path = [start];
    this.visited[start] = 1;
  }

  /** One step adds one city to the tour under construction. */
  step() {
    if (this.done) return;
    const { n, dist } = this.inst;
    const last = this.path[this.path.length - 1];
    let next = -1;
    let nextDist = Infinity;
    for (let c = 0; c < n; c++) {
      if (this.visited[c]) continue;
      this.evaluations++;
      const d = dist[last * n + c];
      if (d < nextDist) {
        nextDist = d;
        next = c;
      }
    }
    if (next >= 0) {
      this.path.push(next);
      this.visited[next] = 1;
    }
    this.iteration++;

    if (this.path.length === n) {
      const tour = Int32Array.from(this.path);
      const len = tourLength(tour, this.inst);
      if (len < this.bestLength) {
        this.best = tour;
        this.bestLength = len;
      }
      this.startIndex++;
      if (this.startIndex >= this.starts) this.done = true;
      else this.#begin(this.startIndex);
    }
  }

  /** The partial path being built (open, not yet a cycle). */
  get current() {
    return this.done ? null : this.path;
  }

  info() {
    return [['Start city', this.multiStart ? `${Math.min(this.startIndex + 1, this.starts)} / ${this.starts}` : '1']];
  }
}
