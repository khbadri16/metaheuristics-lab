// Draws cities and tours on a canvas.

import { fitCanvas, cssVar } from './canvas.js';

export const ASPECT = 1.6;

/** Map from problem space ([0, ASPECT] × [0, 1]) to canvas pixels. */
export function projection(width, height, pad = 14) {
  const scale = Math.min((width - 2 * pad) / ASPECT, height - 2 * pad);
  const ox = (width - ASPECT * scale) / 2;
  const oy = (height - scale) / 2;
  return {
    toScreen: (p) => [ox + p.x * scale, oy + p.y * scale],
    toWorld: (sx, sy) => ({ x: (sx - ox) / scale, y: (sy - oy) / scale }),
    scale,
  };
}

function strokePath(ctx, pts, order, proj, closed) {
  if (!order || order.length < 2) return;
  ctx.beginPath();
  const [x0, y0] = proj.toScreen(pts[order[0]]);
  ctx.moveTo(x0, y0);
  for (let k = 1; k < order.length; k++) {
    const [x, y] = proj.toScreen(pts[order[k]]);
    ctx.lineTo(x, y);
  }
  if (closed) ctx.closePath();
  ctx.stroke();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{points: {x:number,y:number}[], best?: ArrayLike<number>|null,
 *          current?: ArrayLike<number>|null, currentClosed?: boolean,
 *          color?: string, mini?: boolean}} opts
 */
export function drawMap(canvas, opts) {
  const { ctx, width, height } = fitCanvas(canvas);
  const { points, best, current, currentClosed = true, color = '#fff', mini = false } = opts;
  ctx.clearRect(0, 0, width, height);
  const proj = projection(width, height, mini ? 8 : 18);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Faint "current" tour (what the search is looking at right now).
  if (current && current !== best) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = mini ? 1 : 1.25;
    ctx.setLineDash(mini ? [] : [4, 4]);
    strokePath(ctx, points, current, proj, currentClosed);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Best tour found so far.
  if (best) {
    ctx.strokeStyle = color;
    ctx.lineWidth = mini ? 1.4 : 2.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = mini ? 0 : 8;
    strokePath(ctx, points, best, proj, true);
    ctx.shadowBlur = 0;
  }

  // Cities.
  const r = mini ? 1.6 : points.length > 150 ? 2.6 : 3.4;
  ctx.fillStyle = cssVar('--city') || '#e8ecea';
  for (const p of points) {
    const [x, y] = proj.toScreen(p);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return proj;
}
