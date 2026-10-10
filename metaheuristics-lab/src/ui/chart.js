// Convergence chart: best tour length against compute time, one line per algorithm.

import { fitCanvas, cssVar } from './canvas.js';

function niceStep(range, targetTicks) {
  const raw = range / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s` : `${Math.round(ms)}ms`;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{color:string, label:string, history:[number,number][], time:number}[]} series
 */
export function drawChart(canvas, series) {
  const { ctx, width, height } = fitCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  const muted = cssVar('--muted');
  const line = cssVar('--line');
  const mono = cssVar('--font-mono');
  const pad = { l: 58, r: 16, t: 28, b: 30 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const finite = series.flatMap((s) => s.history.filter((h) => Number.isFinite(h[1])));
  if (!finite.length) {
    ctx.fillStyle = muted;
    ctx.font = `13px ${mono}`;
    ctx.textAlign = 'center';
    ctx.fillText('Run the algorithms to see how fast each one converges.', width / 2, height / 2);
    return;
  }

  const best = Math.min(...finite.map((h) => h[1]));
  const yMin = best * 0.985;
  const yMax = best * 1.5;
  const xMax = Math.max(1, ...series.map((s) => s.time));

  const X = (t) => pad.l + (t / xMax) * plotW;
  const Y = (v) => pad.t + (1 - (Math.min(v, yMax) - yMin) / (yMax - yMin)) * plotH;

  // Grid and axes.
  ctx.font = `11px ${mono}`;
  ctx.fillStyle = muted;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;

  const yStep = niceStep(yMax - yMin, 4);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
    const y = Math.round(Y(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
    ctx.fillText(v.toFixed(yStep < 0.1 ? 2 : 1), pad.l - 8, y);
  }

  const xStep = niceStep(xMax, Math.max(2, Math.floor(plotW / 110)));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = 0; t <= xMax + 1e-9; t += xStep) {
    const x = Math.round(X(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + plotH);
    ctx.stroke();
    ctx.fillText(formatMs(t), x, pad.t + plotH + 8);
  }

  // Lines: step functions (the best length only changes on improvement).
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.l, pad.t, plotW, plotH);
  ctx.clip();
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (const s of series) {
    const pts = s.history.filter((h) => Number.isFinite(h[1]));
    if (!pts.length) continue;
    ctx.strokeStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let k = 1; k < pts.length; k++) {
      ctx.lineTo(X(pts[k][0]), Y(pts[k - 1][1]));
      ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
    }
    const lastV = pts[pts.length - 1][1];
    ctx.lineTo(X(s.time), Y(lastV));
    ctx.stroke();

    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(X(s.time), Y(lastV), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Axis titles.
  ctx.fillStyle = muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('tour length ↓', 6, 4);
  ctx.textAlign = 'right';
  ctx.fillText('compute time →', width - pad.r, 4);
}
