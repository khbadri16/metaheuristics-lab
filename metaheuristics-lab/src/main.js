// Metaheuristics Lab — UI controller.

import { mulberry32 } from './core/rng.js';
import { createInstance, generatePoints } from './core/tsp.js';
import { Race } from './core/runner.js';
import { ALGORITHMS, defaultParams, byId } from './algorithms/index.js';
import { drawMap, projection, ASPECT } from './ui/map.js';
import { drawChart } from './ui/chart.js';

const $ = (sel) => document.querySelector(sel);

const SPEEDS = [
  { label: 'Watch', steps: 1 },
  { label: 'Slow', steps: 4 },
  { label: 'Normal', steps: 25 },
  { label: 'Fast', steps: 200 },
  { label: 'Max', steps: Infinity },
];
const FRAME_MS = 14;
const MIN_CITIES = 4;
const MAX_CITIES = 300;

const state = {
  n: 60,
  layout: 'uniform',
  seed: 2024,
  custom: false,
  points: [],
  instance: null,
  enabled: new Set(ALGORITHMS.filter((a) => a.enabled).map((a) => a.id)),
  params: Object.fromEntries(ALGORITHMS.map((a) => [a.id, defaultParams(a)])),
  budgetMs: 5000,
  speed: 3,
  race: null,
  running: false,
  focus: 'auto', // 'auto' follows whichever algorithm currently leads
  raf: 0,
};

/* ---------------- Instance ---------------- */

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const n = parseInt(h.get('n'), 10);
  const seed = parseInt(h.get('seed'), 10);
  const layout = h.get('layout');
  if (n >= MIN_CITIES && n <= MAX_CITIES) state.n = n;
  if (Number.isFinite(seed)) state.seed = seed >>> 0;
  if (['uniform', 'clusters', 'circle'].includes(layout)) state.layout = layout;
  return { autorun: h.get('run') === '1' };
}

function writeHash() {
  if (state.custom) {
    history.replaceState(null, '', location.pathname + location.search);
    return;
  }
  const h = new URLSearchParams({ n: state.n, layout: state.layout, seed: state.seed });
  history.replaceState(null, '', `#${h}`);
}

function generate() {
  state.custom = false;
  state.points = generatePoints(state.n, state.layout, mulberry32(state.seed), ASPECT);
  rebuildInstance();
  writeHash();
}

function rebuildInstance() {
  state.instance = state.points.length >= 2 ? createInstance(state.points) : null;
  resetRace();
}

/* ---------------- Race control ---------------- */

function selectedEntries() {
  return ALGORITHMS.filter((a) => state.enabled.has(a.id)).map((def) => ({ def, params: { ...state.params[def.id] } }));
}

function canRun() {
  return state.points.length >= MIN_CITIES && state.enabled.size > 0;
}

function ensureRace() {
  if (state.race) return true;
  if (!canRun()) return false;
  state.race = new Race(state.instance, selectedEntries(), { seed: state.seed, budgetMs: state.budgetMs });
  if (state.focus !== 'auto' && !state.enabled.has(state.focus)) state.focus = 'auto';
  buildResultCards();
  return true;
}

function resetRace() {
  stop();
  state.race = null;
  buildResultCards();
  render();
}

function start() {
  if (state.race && state.race.finished) state.race = null;
  if (!ensureRace()) return;
  state.running = true;
  loop();
  renderControls();
}

function stop() {
  state.running = false;
  cancelAnimationFrame(state.raf);
  renderControls();
}

function loop() {
  if (!state.running) return;
  const speed = SPEEDS[state.speed - 1];
  state.race.tick({ maxSteps: speed.steps, frameMs: FRAME_MS });
  render();
  if (state.race.finished) {
    stop();
    return;
  }
  state.raf = requestAnimationFrame(loop);
}

function stepOnce() {
  stop();
  if (state.race && state.race.finished) return;
  if (!ensureRace()) return;
  state.race.tick({ maxSteps: 1, frameMs: Infinity });
  render();
  renderControls();
}

/* ---------------- Rendering ---------------- */

const fmtLen = (v) => (Number.isFinite(v) ? v.toFixed(4) : '—');
const fmtTime = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`);
const STATUS = { running: 'Running', done: 'Finished', budget: 'Budget used' };

function render() {
  renderMap();
  renderResults();
  renderChart();
}

/** The algorithm shown on the big map: the chosen one, or the current leader. */
function focusId() {
  if (state.focus !== 'auto') return state.focus;
  const entries = state.race?.entries ?? [];
  let best = null;
  for (const e of entries) {
    if (Number.isFinite(e.alg.bestLength) && (!best || e.alg.bestLength < best.alg.bestLength)) best = e;
  }
  return best ? best.def.id : [...state.enabled][0];
}

function renderMap() {
  const canvas = $('#map');
  const id = focusId();
  const entry = state.race?.entries.find((e) => e.def.id === id);
  const def = byId(id);
  const alg = entry?.alg;
  drawMap(canvas, {
    points: state.points,
    best: alg?.best ?? null,
    current: alg?.current ?? null,
    currentClosed: !(alg && id === 'nn'),
    color: def?.color,
  });

  $('#map-empty').hidden = state.points.length >= MIN_CITIES;
  const meta = $('#map-meta');
  if (alg) {
    meta.innerHTML = `${state.focus === 'auto' ? 'Leader: ' : ''}<span class="dot" style="--c:${def.color}"></span>${def.name}` +
      `<span class="sep">·</span>best <b>${fmtLen(alg.bestLength)}</b>` +
      `<span class="sep">·</span>${alg.iteration.toLocaleString()} iterations`;
  } else {
    meta.textContent = `${state.points.length} cities${state.custom ? ' · custom map' : ''}`;
  }

  // Focus tabs.
  document.querySelectorAll('.focus-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', String(tab.dataset.id === state.focus));
  });
}

function buildResultCards() {
  const wrap = $('#results');
  wrap.innerHTML = '';
  const tabs = $('#focus-tabs');
  tabs.innerHTML = '';
  const auto = document.createElement('button');
  auto.type = 'button';
  auto.className = 'focus-tab focus-auto';
  auto.dataset.id = 'auto';
  auto.innerHTML = '★ Leader';
  auto.title = 'Always show the algorithm with the shortest tour';
  auto.addEventListener('click', () => setFocus('auto'));
  tabs.appendChild(auto);
  for (const def of ALGORITHMS.filter((a) => state.enabled.has(a.id))) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'focus-tab';
    tab.dataset.id = def.id;
    tab.style.setProperty('--c', def.color);
    tab.innerHTML = `<span class="dot"></span>${def.short}`;
    tab.title = `Show ${def.name} on the map`;
    tab.addEventListener('click', () => setFocus(def.id));
    tabs.appendChild(tab);

    const card = document.createElement('article');
    card.className = 'result';
    card.dataset.id = def.id;
    card.style.setProperty('--c', def.color);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Show ${def.name} on the map`);
    card.innerHTML = `
      <header class="result-head">
        <span class="dot"></span><h3>${def.name}</h3>
      </header>
      <div class="mini-wrap">
        <canvas class="mini" aria-hidden="true"></canvas>
        <span class="badge" data-field="status">Ready</span>
      </div>
      <dl class="result-stats">
        <div><dt>Best length</dt><dd data-field="best">—</dd></div>
        <div><dt>Gap to leader</dt><dd data-field="gap">—</dd></div>
        <div><dt>Iterations</dt><dd data-field="iter">0</dd></div>
        <div><dt>Compute time</dt><dd data-field="time">0 ms</dd></div>
      </dl>
      <dl class="result-extra" data-field="extra"></dl>`;
    card.addEventListener('click', () => setFocus(def.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setFocus(def.id);
      }
    });
    wrap.appendChild(card);
  }
}

function renderResults() {
  const race = state.race;
  const leader = race ? race.bestOverall() : Infinity;
  const shown = focusId();
  document.querySelectorAll('.result').forEach((card) => {
    const id = card.dataset.id;
    const def = byId(id);
    const entry = race?.entries.find((e) => e.def.id === id);
    const set = (field, value) => {
      const el = card.querySelector(`[data-field="${field}"]`);
      if (el && el.textContent !== value) el.textContent = value;
    };
    card.classList.toggle('is-focus', id === shown);

    if (!entry) {
      set('status', 'Ready');
      card.querySelector('[data-field="status"]').dataset.state = 'ready';
      drawMap(card.querySelector('.mini'), { points: state.points, mini: true, color: def.color });
      card.classList.remove('is-leader');
      return;
    }
    const { alg } = entry;
    const statusEl = card.querySelector('[data-field="status"]');
    const status = entry.status === 'running' && !state.running ? 'paused' : entry.status;
    statusEl.dataset.state = status;
    set('status', status === 'paused' ? 'Paused' : STATUS[entry.status]);
    set('best', fmtLen(alg.bestLength));
    set('gap', Number.isFinite(alg.bestLength) && Number.isFinite(leader)
      ? (alg.bestLength - leader < 1e-9 ? 'Leader' : `+${((alg.bestLength / leader - 1) * 100).toFixed(2)}%`)
      : '—');
    set('iter', alg.iteration.toLocaleString());
    set('time', fmtTime(entry.time));
    card.classList.toggle('is-leader', Number.isFinite(leader) && alg.bestLength - leader < 1e-9);

    const extra = card.querySelector('[data-field="extra"]');
    const html = alg.info().map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    if (extra.innerHTML !== html) extra.innerHTML = html;

    drawMap(card.querySelector('.mini'), {
      points: state.points,
      best: alg.best,
      current: id === 'nn' ? alg.current : null,
      currentClosed: false,
      color: def.color,
      mini: true,
    });
  });
}

function renderChart() {
  const series = (state.race?.entries ?? []).map((e) => ({
    color: e.def.color,
    label: e.def.name,
    history: e.history,
    time: e.time,
  }));
  drawChart($('#chart'), series);
}

function renderControls() {
  const run = $('#run');
  const label = run.querySelector('span');
  const finished = state.race?.finished;
  label.textContent = state.running ? 'Pause' : finished ? 'Run again' : state.race ? 'Resume' : 'Run';
  run.querySelector('.i-play').hidden = state.running;
  run.querySelector('.i-pause').hidden = !state.running;
  run.disabled = !canRun();
  $('#step').disabled = !canRun() || state.running || !!finished;
  $('#run-hint').textContent = state.points.length < MIN_CITIES
    ? `Add at least ${MIN_CITIES} cities to run.`
    : state.enabled.size === 0 ? 'Select at least one algorithm.' : '';
}

function setFocus(id) {
  state.focus = id;
  render();
}

/* ---------------- Controls ---------------- */

function buildAlgorithmList() {
  const list = $('#algo-list');
  for (const def of ALGORITHMS) {
    const item = document.createElement('div');
    item.className = 'algo';
    item.style.setProperty('--c', def.color);
    const sliders = def.params.map((p) => {
      const id = `p-${def.id}-${p.key}`;
      if (p.type === 'toggle') {
        return `<label class="param param-toggle" for="${id}"><input type="checkbox" id="${id}" data-key="${p.key}" ${p.default ? 'checked' : ''}><span>${p.label}</span></label>`;
      }
      return `<label class="param" for="${id}">
          <span class="param-label">${p.label}<output>${format(p, p.default)}</output></span>
          <input type="range" id="${id}" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}">
        </label>`;
    }).join('');
    item.innerHTML = `
      <label class="algo-head">
        <input type="checkbox" ${state.enabled.has(def.id) ? 'checked' : ''} aria-label="Include ${def.name}">
        <span class="swatch"></span>
        <span class="algo-name">${def.name}</span>
      </label>
      <details class="algo-params">
        <summary>Parameters</summary>
        <div class="params">${sliders}
          <button type="button" class="link-btn" data-reset>Reset to defaults</button>
        </div>
      </details>`;

    item.querySelector('.algo-head input').addEventListener('change', (e) => {
      if (e.target.checked) state.enabled.add(def.id);
      else state.enabled.delete(def.id);
      if (state.focus !== 'auto' && !state.enabled.has(state.focus)) state.focus = 'auto';
      resetRace();
    });

    item.querySelectorAll('.params input').forEach((input) => {
      input.addEventListener('input', () => {
        const spec = def.params.find((p) => p.key === input.dataset.key);
        const value = spec.type === 'toggle' ? input.checked : Number(input.value);
        state.params[def.id][spec.key] = value;
        const out = input.parentElement.querySelector('output');
        if (out) out.textContent = format(spec, value);
        resetRace();
      });
    });

    item.querySelector('[data-reset]').addEventListener('click', () => {
      state.params[def.id] = defaultParams(def);
      item.querySelectorAll('.params input').forEach((input) => {
        const spec = def.params.find((p) => p.key === input.dataset.key);
        if (spec.type === 'toggle') input.checked = spec.default;
        else input.value = spec.default;
        const out = input.parentElement.querySelector('output');
        if (out) out.textContent = format(spec, spec.default);
      });
      resetRace();
    });

    list.appendChild(item);
  }
}

function format(spec, v) {
  return spec.digits ? Number(v).toFixed(spec.digits) : String(v);
}

function bindSegmented(el, onChange) {
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    el.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onChange(btn.dataset.v);
  });
}

function syncInstanceControls() {
  $('#n').value = state.n;
  $('#n-out').textContent = state.n;
  $('#seed').value = state.seed;
  $('#layout').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.layout)));
}

function bindControls() {
  const n = $('#n');
  n.addEventListener('input', () => {
    state.n = Number(n.value);
    $('#n-out').textContent = state.n;
    generate();
  });

  bindSegmented($('#layout'), (v) => {
    state.layout = v;
    generate();
  });

  $('#seed').addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    state.seed = Number.isFinite(v) ? v >>> 0 : 0;
    e.target.value = state.seed;
    generate();
  });

  $('#dice').addEventListener('click', () => {
    state.seed = Math.floor(Math.random() * 1e6);
    $('#seed').value = state.seed;
    generate();
  });

  $('#clear').addEventListener('click', () => {
    state.points = [];
    state.custom = true;
    rebuildInstance();
    writeHash();
  });

  $('#map').addEventListener('click', (e) => {
    if (state.points.length >= MAX_CITIES) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const proj = projection(rect.width, rect.height, 18);
    const p = proj.toWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (p.x < 0 || p.x > ASPECT || p.y < 0 || p.y > 1) return;
    state.points = [...state.points, p];
    state.custom = true;
    rebuildInstance();
    writeHash();
  });

  $('#run').addEventListener('click', () => (state.running ? stop() : start()));
  $('#step').addEventListener('click', stepOnce);
  $('#reset').addEventListener('click', resetRace);

  const speed = $('#speed');
  speed.addEventListener('input', () => {
    state.speed = Number(speed.value);
    $('#speed-out').textContent = SPEEDS[state.speed - 1].label;
  });

  bindSegmented($('#budget'), (v) => {
    state.budgetMs = Number(v);
    resetRace();
  });

  $('#share').addEventListener('click', async () => {
    const btn = $('#share');
    const label = btn.querySelector('span');
    try {
      await navigator.clipboard.writeText(location.href);
      label.textContent = state.custom ? 'Link copied (random map)' : 'Link copied';
    } catch {
      label.textContent = 'Copy failed';
    }
    setTimeout(() => (label.textContent = 'Share this map'), 1800);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select, button, [role="button"], summary')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      state.running ? stop() : start();
    }
  });

  new ResizeObserver(() => render()).observe($('#map'));
}

/* ---------------- Boot ---------------- */

const { autorun } = readHash();
buildAlgorithmList();
syncInstanceControls();
bindControls();
$('#speed').value = state.speed;
$('#speed-out').textContent = SPEEDS[state.speed - 1].label;
generate();
if (autorun) start(); // e.g. #n=80&layout=clusters&seed=7&run=1
