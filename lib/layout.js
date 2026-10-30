import { FLAVORS, DIMENSIONS } from './flavors.js';

/**
 * Deterministic 3D layout for the constellation: PCA of the 8-D taste profiles
 * (power iteration with deflation), scaled to a sphere-ish volume, then a few
 * passes of pairwise repulsion so no two nodes overlap. Same input → same map.
 */
function pca3(rows) {
  const n = rows.length;
  const d = rows[0].length;
  const mean = Array.from({ length: d }, (_, j) => rows.reduce((s, r) => s + r[j], 0) / n);
  const X = rows.map((r) => r.map((v, j) => v - mean[j]));
  // covariance
  let C = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) / (n - 1)));
  const comps = [];
  for (let k = 0; k < 3; k++) {
    let v = Array.from({ length: d }, (_, i) => 1 / Math.sqrt(d) + (i === k ? 0.1 : 0));
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      const w = C.map((row) => row.reduce((s, c, j) => s + c * v[j], 0));
      const norm = Math.hypot(...w) || 1;
      lambda = norm;
      v = w.map((x) => x / norm);
    }
    comps.push(v);
    // deflate
    C = C.map((row, i) => row.map((c, j) => c - lambda * v[i] * v[j]));
  }
  return X.map((r) => comps.map((c) => r.reduce((s, x, j) => s + x * c[j], 0)));
}

function computeLayout(radius = 4.2) {
  const pts = pca3(FLAVORS.map((f) => f.profile));
  // normalise each axis by its spread, then soft-clamp with tanh so a few
  // extreme flavors don't squeeze everyone else into the middle
  for (let a = 0; a < 3; a++) {
    const mean = pts.reduce((s, p) => s + p[a], 0) / pts.length;
    const std = Math.sqrt(pts.reduce((s, p) => s + (p[a] - mean) ** 2, 0) / pts.length) || 1;
    pts.forEach((p) => {
      p[a] = Math.tanh((p[a] - mean) / (1.6 * std)) * radius * (a === 1 ? 0.7 : 1);
    });
  }
  // relax overlaps
  const minD = 0.85;
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0];
        const dy = pts[j][1] - pts[i][1];
        const dz = pts[j][2] - pts[i][2];
        const dist = Math.hypot(dx, dy, dz) || 1e-3;
        if (dist < minD) {
          const push = (minD - dist) / 2 / dist;
          pts[i][0] -= dx * push;
          pts[i][1] -= dy * push;
          pts[i][2] -= dz * push;
          pts[j][0] += dx * push;
          pts[j][1] += dy * push;
          pts[j][2] += dz * push;
        }
      }
    }
  }
  return pts;
}

export const LAYOUT = computeLayout();

/** Which taste dimension each principal axis loads on most (for axis hints). */
export const AXIS_DIMENSIONS = DIMENSIONS;
