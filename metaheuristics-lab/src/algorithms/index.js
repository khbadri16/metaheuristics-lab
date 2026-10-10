// Registry of algorithms: display metadata and tunable parameters.

import { NearestNeighbor } from './nearestNeighbor.js';
import { HillClimbing } from './hillClimbing.js';
import { SimulatedAnnealing } from './simulatedAnnealing.js';
import { GeneticAlgorithm } from './genetic.js';
import { BeesAlgorithm } from './bees.js';

export const ALGORITHMS = [
  {
    id: 'nn',
    name: 'Nearest neighbour',
    short: 'NN',
    color: '#9aa3ad',
    Impl: NearestNeighbor,
    enabled: true,
    params: [
      { key: 'multiStart', label: 'Try every start city', type: 'toggle', default: true },
    ],
  },
  {
    id: 'hc',
    name: 'Hill climbing',
    short: 'HC',
    color: '#5ec8f2',
    Impl: HillClimbing,
    enabled: true,
    params: [
      { key: 'restarts', label: 'Random restarts', min: 0, max: 50, step: 1, default: 10 },
    ],
  },
  {
    id: 'sa',
    name: 'Simulated annealing',
    short: 'SA',
    color: '#ff7a59',
    Impl: SimulatedAnnealing,
    enabled: true,
    params: [
      { key: 'coolingRate', label: 'Cooling rate α', min: 0.9, max: 0.999, step: 0.001, default: 0.995, digits: 3 },
      { key: 'movesPerTemp', label: 'Moves per temperature (× n)', min: 1, max: 20, step: 1, default: 5 },
      { key: 'initialAcceptance', label: 'Initial uphill acceptance', min: 0.1, max: 0.9, step: 0.05, default: 0.5, digits: 2 },
    ],
  },
  {
    id: 'ga',
    name: 'Genetic algorithm',
    short: 'GA',
    color: '#b18cff',
    Impl: GeneticAlgorithm,
    enabled: true,
    params: [
      { key: 'population', label: 'Population size', min: 20, max: 400, step: 10, default: 150 },
      { key: 'generations', label: 'Max generations', min: 100, max: 50000, step: 100, default: 20000 },
      { key: 'crossoverRate', label: 'Crossover rate', min: 0, max: 1, step: 0.05, default: 0.9, digits: 2 },
      { key: 'mutationRate', label: 'Mutation rate', min: 0, max: 1, step: 0.05, default: 0.3, digits: 2 },
      { key: 'tournament', label: 'Tournament size', min: 2, max: 10, step: 1, default: 3 },
      { key: 'elites', label: 'Elites kept', min: 0, max: 10, step: 1, default: 2 },
    ],
  },
  {
    id: 'ba',
    name: 'Bees algorithm',
    short: 'BA',
    color: '#f5c542',
    Impl: BeesAlgorithm,
    enabled: true,
    params: [
      { key: 'scouts', label: 'Scout bees (n)', min: 5, max: 100, step: 1, default: 15 },
      { key: 'sites', label: 'Selected sites (m)', min: 1, max: 30, step: 1, default: 8 },
      { key: 'elite', label: 'Elite sites (e)', min: 1, max: 10, step: 1, default: 3 },
      { key: 'eliteBees', label: 'Bees per elite site (nep)', min: 1, max: 60, step: 1, default: 15 },
      { key: 'otherBees', label: 'Bees per other site (nsp)', min: 1, max: 40, step: 1, default: 6 },
      { key: 'patchSize', label: 'Initial patch size (× n)', min: 0.05, max: 1, step: 0.05, default: 1, digits: 2 },
      { key: 'stagnationLimit', label: 'Stagnation limit', min: 1, max: 100, step: 1, default: 20 },
    ],
  },
];

export function defaultParams(def) {
  const p = {};
  for (const spec of def.params) p[spec.key] = spec.default;
  return p;
}

export function byId(id) {
  return ALGORITHMS.find((a) => a.id === id);
}
