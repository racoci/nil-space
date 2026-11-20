import { GeodesicRayVisualizer } from '../src/rendering/geodesicRayVisualizer';
import type { Vector3D } from '../src/math/nil';

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

console.log('🧪 Running Geodesic Light Ray Visualizer Tests...');

const visualizer = new GeodesicRayVisualizer(1.0);

const cameraPos: Vector3D = { x: 10.0, y: -12.0, z: 8.0 };
const targetPos: Vector3D = { x: 2.0, y: 3.0, z: 1.5 };

const ray = visualizer.computeRay(cameraPos, targetPos, 42, 24);

// 1. Invariant: Endpoint Preservation
assert(ray.points.length === 25, 'Ray must have 25 points for 24 segments');

const pStart = ray.points[0];
assertClose(pStart.x, cameraPos.x, 1e-4, 'Ray starts at camera X');
assertClose(pStart.y, cameraPos.y, 1e-4, 'Ray starts at camera Y');
assertClose(pStart.z, cameraPos.z, 1e-4, 'Ray starts at camera Z');

const pEnd = ray.points[ray.points.length - 1];
assertClose(pEnd.x, targetPos.x, 1e-3, 'Ray terminates at target X');
assertClose(pEnd.y, targetPos.y, 1e-3, 'Ray terminates at target Y');
assertClose(pEnd.z, targetPos.z, 1e-3, 'Ray terminates at target Z');
console.log('✅ Geodesic light ray endpoints C and P exactly match camera and target');

// 2. Invariant: Non-Euclidean Bending (Helical Curvature)
// Compare ray midpoints against Euclidean straight line midpoints
let maxCurvatureDeviation = 0;
for (let i = 0; i < ray.points.length; i++) {
  const t = i / (ray.points.length - 1);
  const euclidStraight: Vector3D = {
    x: cameraPos.x + (targetPos.x - cameraPos.x) * t,
    y: cameraPos.y + (targetPos.y - cameraPos.y) * t,
    z: cameraPos.z + (targetPos.z - cameraPos.z) * t
  };
  const rayPt = ray.points[i];
  const dist = Math.hypot(
    rayPt.x - euclidStraight.x,
    rayPt.y - euclidStraight.y,
    rayPt.z - euclidStraight.z
  );
  if (dist > maxCurvatureDeviation) {
    maxCurvatureDeviation = dist;
  }
}

assert(
  maxCurvatureDeviation > 0.05,
  `Geodesic light ray must curve away from Euclidean straight line (max dev = ${maxCurvatureDeviation.toFixed(3)})`
);
console.log(`✅ Geodesic light curvature verified: light beam bends by ${maxCurvatureDeviation.toFixed(3)} units along Heisenberg connection`);

// 3. Invariant: WebGL Line Buffer Generation
const targets = [
  { id: 1, x: 0, y: 0, z: 0 },
  { id: 2, x: 5, y: -2, z: 3 },
  { id: 3, x: -4, y: 4, z: -2 }
];

const numSegments = 16;
const buffer = visualizer.generateLinesBuffer(cameraPos, targets, numSegments);
const expectedLen = targets.length * numSegments * 6;
assert(buffer.length === expectedLen, `Buffer length must be ${expectedLen}, got ${buffer.length}`);

for (let i = 0; i < buffer.length; i++) {
  assert(!isNaN(buffer[i]) && isFinite(buffer[i]), `Buffer element ${i} must be valid finite number`);
}
console.log(`✅ WebGL GPU buffer generation verified: ${buffer.length} floats generated with zero NaN/Inf`);

console.log('🎉 ALL Geodesic Light Ray Visualizer tests PASSED!\n');
