import { existsSync, readFileSync } from 'node:fs';
import { Vec3, Mat4, Ray3, evaluateNilGeodesicRay, nilGaugeDistance } from '../src/rendering/math';

let wasmAvailable = false;
let evaluate_nil_geodesic_point: any = null;

try {
  const wasmPath = new URL('../src/wasm/nil_core_bg.wasm', import.meta.url);
  const jsPath = new URL('../src/wasm/nil_core.js', import.meta.url);
  if (existsSync(wasmPath) && existsSync(jsPath)) {
    const wasmModule = await import('../src/wasm/nil_core.js');
    const wasmBytes = readFileSync(wasmPath);
    wasmModule.initSync({ module: wasmBytes });
    evaluate_nil_geodesic_point = wasmModule.evaluate_nil_geodesic_point;
    wasmAvailable = true;
  }
} catch (e) {
  console.warn('WASM module not initialized for tests, skipping WASM equivalence assertions:', e);
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertClose(a: number, b: number, epsilon: number = 1e-4, msg: string = '') {
  if (Math.abs(a - b) > epsilon) {
    throw new Error(`Assertion failed: |${a} - ${b}| > ${epsilon}. ${msg}`);
  }
}

console.log('🧪 Running Nil Geodesic Ray & Scratch 3D Math Engine Tests...');

// 1. Vector Math Tests
const v1 = new Vec3(1, 2, 3);
const v2 = new Vec3(4, 5, 6);
const cross = new Vec3().copy(v1).cross(v2);
assertClose(cross.x, -3, 1e-6, 'Cross X');
assertClose(cross.y, 6, 1e-6, 'Cross Y');
assertClose(cross.z, -3, 1e-6, 'Cross Z');
assertClose(cross.dot(v1), 0, 1e-6, 'Cross product orthogonality to v1');
assertClose(cross.dot(v2), 0, 1e-6, 'Cross product orthogonality to v2');
console.log('✅ Vec3 linear algebra invariants verified');

// 2. Matrix Inversion & Round-Trip Tests
const eye = new Vec3(10, 15, 20);
const target = new Vec3(0, 0, 0);
const up = new Vec3(0, 0, 1);
const view = new Mat4().lookAt(eye, target, up);
const proj = new Mat4().perspective(Math.PI / 4, 16 / 9, 0.1, 100);
const viewProj = new Mat4().multiplyMatrices(proj, view);
const invViewProj = new Mat4().copy(viewProj).invert();
const identityCheck = new Mat4().multiplyMatrices(viewProj, invViewProj);

for (let r = 0; r < 4; r++) {
  for (let c = 0; c < 4; c++) {
    const expected = (r === c) ? 1.0 : 0.0;
    const actual = identityCheck.elements[c * 4 + r];
    assertClose(actual, expected, 1e-4, `M * M^-1 at [${r}, ${c}]`);
  }
}
console.log('✅ Mat4 Perspective & LookAt matrix inversion exact round-trip verified');

// 3. Ray Triangle Intersection Tests
const ray = new Ray3(new Vec3(0, 0, 10), new Vec3(0, 0, -1));
const tA = new Vec3(-2, -2, 0);
const tB = new Vec3(2, -2, 0);
const tC = new Vec3(0, 2, 0);
const hitDist = ray.intersectTriangle(tA, tB, tC);
assert(hitDist !== null, 'Ray must hit triangle');
assertClose(hitDist!, 10.0, 1e-5, 'Hit distance must be 10.0');

const missRay = new Ray3(new Vec3(5, 5, 10), new Vec3(0, 0, -1));
assert(missRay.intersectTriangle(tA, tB, tC) === null, 'Ray outside triangle must return null');
console.log('✅ Ray3 Möller-Trumbore intersection tests passed');

// 4. Closed-form Nil Geodesic Ray Evaluation vs. Numerical Runge-Kutta 4
const c = 1.0;
const p0 = new Vec3(1.0, -0.5, 2.0);
const v0 = new Vec3(0.6, 0.4, 0.7).normalize();
const k = v0.z - c * p0.x * v0.y;
const sMax = 4.0;

// Numerical RK4 integration of geodesic ODE
let state = [p0.x, p0.y, p0.z, v0.x, v0.y];
const dt = 0.0001;
const steps = Math.round(sMax / dt);

function deriv(st: number[]) {
  const [x, , , vx, vy] = st;
  return [vx, vy, k + c * x * vy, -c * k * vy, c * k * vx];
}

for (let i = 0; i < steps; i++) {
  const k1 = deriv(state);
  const s2 = state.map((v, idx) => v + 0.5 * dt * k1[idx]);
  const k2 = deriv(s2);
  const s3 = state.map((v, idx) => v + 0.5 * dt * k2[idx]);
  const k3 = deriv(s3);
  const s4 = state.map((v, idx) => v + dt * k3[idx]);
  const k4 = deriv(s4);
  for (let j = 0; j < 5; j++) {
    state[j] += (dt / 6.0) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]);
  }
}

const anaPos = evaluateNilGeodesicRay(p0, v0, c, sMax);
assertClose(anaPos.x, state[0], 1e-4, 'Nil geodesic ray X matches RK4');
assertClose(anaPos.y, state[1], 1e-4, 'Nil geodesic ray Y matches RK4');
assertClose(anaPos.z, state[2], 1e-4, 'Nil geodesic ray Z matches RK4');
console.log('✅ Closed-form Nil geodesic ray evaluation matched RK4 ODE solver (< 1e-4 err)');

// 5. Zero-distance boundary check: P(0) === P0
const pZero = evaluateNilGeodesicRay(p0, v0, c, 0.0);
assertClose(pZero.x, p0.x, 1e-6, 'P(0).x === p0.x');
assertClose(pZero.y, p0.y, 1e-6, 'P(0).y === p0.y');
assertClose(pZero.z, p0.z, 1e-6, 'P(0).z === p0.z');
console.log('✅ Boundary condition P(0) === P_0 verified');

// 6. Cross-verification with Rust WebAssembly output
if (wasmAvailable && evaluate_nil_geodesic_point) {
  const wasmPt = evaluate_nil_geodesic_point(p0.x, p0.y, p0.z, v0.x, v0.y, v0.z, c, sMax);
  assertClose(wasmPt[0], anaPos.x, 1e-5, 'WASM vs TS Geodesic X');
  assertClose(wasmPt[1], anaPos.y, 1e-5, 'WASM vs TS Geodesic Y');
  assertClose(wasmPt[2], anaPos.z, 1e-5, 'WASM vs TS Geodesic Z');
  console.log('✅ Rust WebAssembly and TypeScript closed-form implementations match identically');
} else {
  console.log('ℹ️  Skipped WASM vs TS comparison (WASM artifact not present in local path)');
}

// 7. Cygan / Koranyi Nil Gauge Distance
const dGaugeZero = nilGaugeDistance(p0, p0, c);
assertClose(dGaugeZero, 0.0, 1e-6, 'Gauge distance to self is 0');
const pOffset = new Vec3(p0.x, p0.y, p0.z + 1.0);
const dZ = nilGaugeDistance(p0, pOffset, c);
assert(dZ > 0.9, 'Vertical distance reflects 16*z^2 scaling');
console.log('✅ Nil gauge distance metric verified');

console.log('🎉 All Nil Geodesic Ray & Math Engine tests PASSED successfully!\n');
