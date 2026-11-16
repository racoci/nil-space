import { generateInterleavedPenroseLattice } from '../src/math/interleaving';

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

console.log('🧪 Running Chiral Interleaving & Lattice Verification Tests...');

const numTriangles = 6;
const sideLength = 5.0;
const torsion = 1.0;

const lattice = generateInterleavedPenroseLattice({
  numTriangles,
  sideLength,
  torsion,
  spacingFactor: 1.0
});

// 1. Verify triangle count
assert(lattice.length === numTriangles, `Expected ${numTriangles} triangles, got ${lattice.length}`);
console.log(`✅ Lattice generated ${lattice.length} interleaved triangles`);

// 2. Verify Chiral Balance: Even count of +z and -z holonomy
let sumHolonomy = 0;
let positiveCount = 0;
let negativeCount = 0;

for (let i = 0; i < lattice.length; i++) {
  const tri = lattice[i];
  sumHolonomy += tri.holonomyShift;
  if (tri.loopArea > 0) {
    positiveCount++;
  } else {
    negativeCount++;
  }
}

assert(positiveCount === negativeCount, `Expected balanced chirality: ${positiveCount} vs ${negativeCount}`);
assertClose(sumHolonomy, 0.0, 1e-5, 'Net topological flux across chiral lattice must sum to zero');
console.log('✅ Net topological holonomy flux = 0.00000 (perfect chiral cancellation)');

// 3. Verify Non-Coincidence: Distinct centroids
for (let i = 0; i < lattice.length; i++) {
  for (let j = i + 1; j < lattice.length; j++) {
    const c1 = lattice[i].center;
    const c2 = lattice[j].center;
    const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y, c1.z - c2.z);
    assert(dist > 0.5, `Triangles ${i} and ${j} centroids must not collide (dist = ${dist})`);
  }
}
console.log('✅ All interleaved triangles have distinct, non-colliding spatial envelopes');

// 4. Canonical Camera Vantage Vector Verification
for (let i = 0; i < lattice.length; i++) {
  const tri = lattice[i];
  const camPos = tri.canonicalCamera.position;
  const target = tri.canonicalCamera.target;
  const camDist = Math.hypot(camPos.x - target.x, camPos.y - target.y, camPos.z - target.z);

  assert(camDist > sideLength * 2.0, `Camera distance (${camDist}) must provide full field of view`);
  assert(camPos.z > target.z, 'Canonical camera must maintain positive Z elevation to look along fiber');
}
console.log('✅ Canonical perspective camera parameters verified for all triangles');

console.log('🎉 All Chiral Interleaving lattice invariants PASSED successfully!\n');
