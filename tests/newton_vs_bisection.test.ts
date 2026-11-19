import {
  nilInverseExpNewton,
  nilInverseExpBisection,
  evalNilZ
} from '../src/math/safeNewton';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${msg}`);
  }
}

function assertClose(a: number, b: number, eps: number = 1e-4, msg: string = '') {
  if (Math.abs(a - b) > eps) {
    throw new Error(`[ASSERTION FAILED]: |${a} - ${b}| = ${Math.abs(a - b)} > ${eps}. ${msg}`);
  }
}

console.log('🧪 Running Safe Newton vs Bisection Mathematical & Performance Tests...');

// 1. Basic Invariance at Origin and Pure Fibers
const vZero = nilInverseExpNewton(0, 0, 0);
assert(vZero.vx === 0 && vZero.vy === 0 && vZero.vz === 0, 'Zero vector maps to zero');

const vFiber = nilInverseExpNewton(0, 0, 4.0);
assert(vFiber.vx === 0 && vFiber.vy === 0 && vFiber.vz === 4.0, 'Pure vertical fiber maps to straight line');

const vPlane = nilInverseExpNewton(2.0, 3.0, 3.0); // side = 3 - 0.5 * 2 * 3 = 0
assertClose(vPlane.vz, 0, 1e-6, 'Points on contact zero-set have vz = 0');

console.log('✅ Edge cases (zero, vertical fiber, horizontal contact plane) verified');

// 2. Convergence Comparison on Canonical Set
const testCases = [
  { hx: 1.0, hy: 1.0, hz: 2.0 },
  { hx: 2.5, hy: -1.8, hz: 4.5 },
  { hx: -3.2, hy: 2.1, hz: -5.0 },
  { hx: 0.8, hy: 0.6, hz: 0.35 },
  { hx: 4.0, hy: 3.0, hz: 12.0 },
  { hx: 0.001, hy: 0.002, hz: 0.0005 } // Near zero singularity
];

for (const tc of testCases) {
  const newton = nilInverseExpNewton(tc.hx, tc.hy, tc.hz, 3);
  const bisect = nilInverseExpBisection(tc.hx, tc.hy, tc.hz, 50);

  // Both must produce the same initial tangent vector within Float32 tolerance
  assertClose(newton.vx, bisect.vx, 1e-3, `VX match at (${tc.hx}, ${tc.hy}, ${tc.hz})`);
  assertClose(newton.vy, bisect.vy, 1e-3, `VY match at (${tc.hx}, ${tc.hy}, ${tc.hz})`);
  assertClose(newton.vz, bisect.vz, 1e-3, `VZ match at (${tc.hx}, ${tc.hy}, ${tc.hz})`);

  // Newton must converge in <= 3 iterations
  assert(newton.iterations <= 3, `Newton required ${newton.iterations} iterations (expected <= 3)`);
  assert(newton.residualError < 1e-5, `Newton residual error too high: ${newton.residualError}`);
}

console.log('✅ Canonical set: Safe Newton (3 steps) accurately matches 50-step Bisection');

// 3. Monte-Carlo Benchmarking: 2,000 Points
const N = 2000;
const points: Array<{ hx: number; hy: number; hz: number }> = [];

let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed >>> 8) / 16777216.0;
}

for (let i = 0; i < N; i++) {
  points.push({
    hx: (random() - 0.5) * 8.0,
    hy: (random() - 0.5) * 8.0,
    hz: (random() - 0.5) * 12.0
  });
}

// Benchmark Newton
const t0Newton = performance.now();
let totalNewtonIters = 0;
for (let i = 0; i < N; i++) {
  const p = points[i];
  const res = nilInverseExpNewton(p.hx, p.hy, p.hz, 3);
  totalNewtonIters += res.iterations;
}
const dtNewton = performance.now() - t0Newton;

// Benchmark Bisection (50 steps)
const t0Bisect = performance.now();
for (let i = 0; i < N; i++) {
  const p = points[i];
  nilInverseExpBisection(p.hx, p.hy, p.hz, 50);
}
const dtBisect = performance.now() - t0Bisect;

const speedup = dtBisect / dtNewton;
const avgIters = totalNewtonIters / N;

console.log(`⏱️  Benchmark Results (${N} points):`);
console.log(`   - Safe Newton (avg ${avgIters.toFixed(1)} iters): ${dtNewton.toFixed(2)} ms`);
console.log(`   - Bisection   (50 iters):            ${dtBisect.toFixed(2)} ms`);
console.log(`   - Acceleration Speedup:              ${speedup.toFixed(2)}x faster!`);

assert(speedup > 2.0, `Safe Newton must be significantly faster than 50-step bisection (got ${speedup.toFixed(1)}x)`);
console.log('🎉 Safe Newton vs Bisection verification & performance benchmark PASSED!\n');
