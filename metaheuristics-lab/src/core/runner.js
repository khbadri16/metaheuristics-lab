// Runs several algorithms side by side on the same instance.
//
// Everything runs on the main thread with time slicing: on each animation
// frame every active algorithm gets an equal slice of compute time. Each
// algorithm also has its own compute-time budget, so the comparison is
// "best tour found for the same amount of CPU time".

import { mulberry32 } from './rng.js';

export class Race {
  constructor(inst, entries, { seed, budgetMs }) {
    this.inst = inst;
    this.budgetMs = budgetMs;
    this.entries = entries.map(({ def, params }, k) => {
      const rng = mulberry32((seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0);
      const t0 = now();
      const alg = new def.Impl(inst, params, rng);
      const setup = now() - t0;
      return {
        def,
        alg,
        time: setup,
        history: [[setup, alg.bestLength]],
        status: alg.done ? 'done' : 'running',
      };
    });
  }

  get finished() {
    return this.entries.every((e) => e.status !== 'running');
  }

  /**
   * Advance every running algorithm by at most `maxSteps` steps or
   * `frameMs / active` milliseconds, whichever comes first.
   */
  tick({ maxSteps, frameMs }) {
    const active = this.entries.filter((e) => e.status === 'running');
    if (!active.length) return;
    const slice = frameMs / active.length;

    for (const e of active) {
      const start = now();
      let steps = 0;
      let last = e.alg.bestLength;
      while (steps < maxSteps && !e.alg.done) {
        e.alg.step();
        steps++;
        const used = now() - start;
        if (e.alg.bestLength < last) {
          last = e.alg.bestLength;
          e.history.push([e.time + used, last]);
        }
        if (used >= slice || e.time + used >= this.budgetMs) break;
      }
      e.time += now() - start;
      if (e.alg.done) e.status = 'done';
      else if (e.time >= this.budgetMs) e.status = 'budget';
    }
  }

  /** Run synchronously until every algorithm stops (used by tests). */
  runToEnd() {
    while (!this.finished) this.tick({ maxSteps: Infinity, frameMs: 50 });
  }

  bestOverall() {
    let best = Infinity;
    for (const e of this.entries) best = Math.min(best, e.alg.bestLength);
    return best;
  }
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
