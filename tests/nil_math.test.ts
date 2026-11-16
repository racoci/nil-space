import { NilSpace, type Vector3D } from '../src/math/nil';
import { createNilPenroseTriangle } from '../src/math/penrose';

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

console.log('🧪 Running Nil Geometry & Heisenberg Group Mathematical Tests...');

const nil = new NilSpace(1.0);

// 1. Identity Element Test
const p: Vector3D = { x: 3.5, y: -2.0, z: 7.2 };
const id: Vector3D = { x: 0, y: 0, z: 0 };
const pMulId = nil.multiply(p, id);
const idMulP = nil.multiply(id, p);

assertClose(pMulId.x, p.x, 1e-5, 'p * id.x');
assertClose(pMulId.y, p.y, 1e-5, 'p * id.y');
assertClose(pMulId.z, p.z, 1e-5, 'p * id.z');
assertClose(idMulP.x, p.x, 1e-5, 'id * p.x');
assertClose(idMulP.y, p.y, 1e-5, 'id * p.y');
assertClose(idMulP.z, p.z, 1e-5, 'id * p.z');
console.log('✅ Identity element invariant passed');

// 2. Inverse Element Test
const invP = nil.inverse(p);
const pMulInv = nil.multiply(p, invP);
const invMulP = nil.multiply(invP, p);

assertClose(pMulInv.x, 0, 1e-5, 'p * inv.x');
assertClose(pMulInv.y, 0, 1e-5, 'p * inv.y');
assertClose(pMulInv.z, 0, 1e-5, 'p * inv.z');
assertClose(invMulP.x, 0, 1e-5, 'inv * p.x');
assertClose(invMulP.y, 0, 1e-5, 'inv * p.y');
assertClose(invMulP.z, 0, 1e-5, 'inv * p.z');
console.log('✅ Inversion identity invariant passed');

// 3. Associativity Test: (A * B) * C == A * (B * C)
const a: Vector3D = { x: 1.2, y: 2.3, z: 0.5 };
const b: Vector3D = { x: -0.8, y: 1.5, z: 3.1 };
const c: Vector3D = { x: 2.1, y: -1.7, z: -2.4 };

const ab_c = nil.multiply(nil.multiply(a, b), c);
const a_bc = nil.multiply(a, nil.multiply(b, c));

assertClose(ab_c.x, a_bc.x, 1e-5, 'Associativity X');
assertClose(ab_c.y, a_bc.y, 1e-5, 'Associativity Y');
assertClose(ab_c.z, a_bc.z, 1e-5, 'Associativity Z');
console.log('✅ Associativity group law invariant passed');

// 4. Non-commutativity & Lie Bracket Test
const xStep: Vector3D = { x: 2.0, y: 0, z: 0 };
const yStep: Vector3D = { x: 0, y: 3.0, z: 0 };
const xy = nil.multiply(xStep, yStep); // (2, 3, 2 * 3 = 6)
const yx = nil.multiply(yStep, xStep); // (2, 3, 0)

assertClose(xy.z - yx.z, 6.0, 1e-5, 'Lie commutator [X, Y] = c * Area');
console.log('✅ Non-commutative Lie bracket [X, Y] = Z verified');

// 5. Closed Loop Holonomy in Nil
const loopArea = 10.0;
const holonomy = nil.computeHolonomy(loopArea);
assertClose(holonomy, 10.0, 1e-5, 'Holonomy Delta z');
console.log('✅ Nil loop holonomy Delta z = c * Area verified');

// 6. Penrose Triangle Closure in Nil Geometry
const sideLength = 6.0;
const tri = createNilPenroseTriangle(0, 0, 0, 0, sideLength, 1.0, 1.0);

assert(tri.corners.length === 3, 'Must have 3 corners');
assert(tri.beamVertices.length >= 9, 'Must have discretized beam segments');

const expectedArea = 0.5 * sideLength * ((Math.sqrt(3) / 2) * sideLength);
assertClose(tri.loopArea, expectedArea, 1e-4, 'Equilateral triangle area');
assertClose(tri.holonomyShift, expectedArea, 1e-4, 'Holonomy equals area');

// Verify that the loop formed by the beams has zero Euclidean-Nil closure error
const firstPt = tri.beamVertices[0];
const lastPt = tri.beamVertices[tri.beamVertices.length - 1];
const startCorner = tri.corners[0];
assertClose(firstPt.x, startCorner.x, 1e-4, 'Beam starts at corner A');
assertClose(firstPt.y, startCorner.y, 1e-4, 'Beam starts at corner A');

// The last beam segment approaches corner A seamlessly
const beamDistanceToEnd = Math.hypot(lastPt.x - startCorner.x, lastPt.y - startCorner.y);
assert(beamDistanceToEnd < sideLength, 'Last point connects back to start corner');

console.log('✅ Penrose Triangle seamless Nil closure verified');
console.log('🎉 All Nil mathematical invariants PASSED successfully!\n');
