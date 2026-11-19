/**
 * Safe Newton-Raphson Solver for the Inverse Exponential Map in Nil Geometry
 * 
 * Replaces the 50-iteration bisection from HyperRogue with a 3-iteration quadratic
 * Newton solver with analytical derivative, Taylor-series singularity removal,
 * and interval clamping safeguards.
 */

export interface InverseExpResult {
  vx: number;
  vy: number;
  vz: number;
  iterations: number;
  residualError: number;
}

/**
 * Evaluates the Nil vertical function z(w) = b^2 * (s + g(w)) + w
 * where g(w) = (w - sin(w)) / (1 - cos(w)).
 */
export function evalNilZ(w: number, b2: number, s: number): number {
  if (Math.abs(w) < 0.1) {
    // 5th-order Taylor series for w ~ 0 to eliminate 0/0 numerical singularity
    const w2 = w * w;
    const gw = w * (1.0 / 3.0 + w2 / 90.0 + (w2 * w2) / 2520.0);
    return b2 * (s + gw) + w;
  }
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const gw = (w - sw) / (1.0 - cw);
  return b2 * (s + gw) + w;
}

/**
 * Analytical derivative z'(w) = b^2 * g'(w) + 1
 * where g'(w) = (2*(1-cos(w)) - w*sin(w)) / (1-cos(w))^2.
 */
export function evalNilDz(w: number, b2: number): number {
  if (Math.abs(w) < 0.1) {
    const w2 = w * w;
    const dgw = 1.0 / 3.0 + w2 / 30.0 + (w2 * w2) / 504.0;
    return b2 * dgw + 1.0;
  }
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const den = 1.0 - cw;
  const dgw = (2.0 * den - w * sw) / (den * den);
  return b2 * dgw + 1.0;
}

/**
 * Solves exp_cam(v) = h for v = (vx, vy, vz) using Safe Newton-Raphson.
 */
export function nilInverseExpNewton(
  hx: number,
  hy: number,
  hz: number,
  maxIterations: number = 4
): InverseExpResult {
  const r2 = hx * hx + hy * hy;
  if (r2 < 1e-12) {
    return { vx: hx, vy: hy, vz: hz, iterations: 0, residualError: 0 };
  }

  const b2 = 0.25 * r2;
  const b = Math.sqrt(b2);
  const side = hz - 0.5 * hx * hy;

  if (Math.abs(side) < 1e-6) {
    return { vx: hx, vy: hy, vz: 0, iterations: 0, residualError: 0 };
  }

  const wMin = side > 0 ? 0.0001 : -Math.PI * 2.0 + 0.001;
  const wMax = side > 0 ? Math.PI * 2.0 - 0.001 : -0.0001;

  // 1. Initial guess via 1st-order Taylor expansion around w = 0
  let w = Math.max(wMin, Math.min(wMax, side / (b2 / 3.0 + 1.0)));

  // 2. Safe Newton-Raphson iterations with interval clamping
  let iter = 0;
  for (iter = 0; iter < maxIterations; iter++) {
    const zw = evalNilZ(w, b2, 0); // we use z(w) - side directly
    const f = zw - side;
    const df = evalNilDz(w, b2);

    const step = f / df;
    w = Math.max(wMin, Math.min(wMax, w - step));

    if (Math.abs(f) < 1e-7) {
      iter++;
      break;
    }
  }

  const alphaTotal = Math.atan2(hy, hx);
  const alpha = alphaTotal - w * 0.5;
  const sinHalfW = Math.sin(w * 0.5);
  const c = Math.abs(sinHalfW) > 1e-7 ? b / sinHalfW : b / (w * 0.5);

  const vx = c * w * Math.cos(alpha);
  const vy = c * w * Math.sin(alpha);
  const vz = w;

  const finalResidual = Math.abs(evalNilZ(w, b2, 0) - side);

  return {
    vx,
    vy,
    vz,
    iterations: iter,
    residualError: finalResidual
  };
}

/**
 * Baseline Bisection method (HyperRogue) for comparative validation and benchmarking.
 */
export function nilInverseExpBisection(
  hx: number,
  hy: number,
  hz: number,
  iterations: number = 50
): InverseExpResult {
  const r2 = hx * hx + hy * hy;
  if (r2 < 1e-12) {
    return { vx: hx, vy: hy, vz: hz, iterations: 0, residualError: 0 };
  }

  const b2 = 0.25 * r2;
  const b = Math.sqrt(b2);
  const side = hz - 0.5 * hx * hy;

  if (Math.abs(side) < 1e-6) {
    return { vx: hx, vy: hy, vz: 0, iterations: 0, residualError: 0 };
  }

  let wMin = side > 0 ? 0 : -Math.PI * 2.0;
  let wMax = side > 0 ? Math.PI * 2.0 : 0;

  for (let it = 0; it < iterations; it++) {
    const w = (wMin + wMax) * 0.5;
    const z = evalNilZ(w, b2, 0);
    if (side > z) {
      wMin = w;
    } else {
      wMax = w;
    }
  }

  const w = (wMin + wMax) * 0.5;
  const alphaTotal = Math.atan2(hy, hx);
  const alpha = alphaTotal - w * 0.5;
  const sinHalfW = Math.sin(w * 0.5);
  const c = Math.abs(sinHalfW) > 1e-7 ? b / sinHalfW : b / (w * 0.5);

  const vx = c * w * Math.cos(alpha);
  const vy = c * w * Math.sin(alpha);
  const vz = w;

  const finalResidual = Math.abs(evalNilZ(w, b2, 0) - side);

  return {
    vx,
    vy,
    vz,
    iterations,
    residualError: finalResidual
  };
}
