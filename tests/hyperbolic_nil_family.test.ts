import { HyperbolicNilSpace } from '../src/math/hyperbolicNil';

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

console.log('🧪 Running Hyperbolic-Nil Space (SL̃₂(ℝ) ↔ Nil) Family Tests...');

// 1. Manifold Classification Invariants
const spaceNil = new HyperbolicNilSpace(0.0, 1.0);
assert(spaceNil.classify().includes('Nil Geometry'), 'kappa=0, c=1 must classify as Nil');

const spaceSL2 = new HyperbolicNilSpace(-1.0, 1.0);
assert(spaceSL2.classify().includes('Hyperbolic-Nil'), 'kappa=-1, c=1 must classify as Hyperbolic-Nil (SL̃₂(ℝ))');

const spaceH2R = new HyperbolicNilSpace(-1.0, 0.0);
assert(spaceH2R.classify().includes('Hyperbolic Product'), 'kappa=-1, c=0 must classify as ℍ² × ℝ');

const spaceE3 = new HyperbolicNilSpace(0.0, 0.0);
assert(spaceE3.classify().includes('Euclidean'), 'kappa=0, c=0 must classify as Euclidean E³');
console.log('✅ Thurston 3-manifold family classification verified');

// 2. Conformal Factor and Metric Tensor at Origin
const tensorNil = spaceNil.metricTensor(0, 0);
assertClose(tensorNil.gxx, 4.0, 1e-5, 'Nil g_xx at origin');
assertClose(tensorNil.gyy, 4.0, 1e-5, 'Nil g_yy at origin');
assertClose(tensorNil.gzz, 1.0, 1e-5, 'Nil g_zz at origin');
assertClose(tensorNil.gxy, 0.0, 1e-5, 'Nil g_xy at origin');

const tensorSL2 = spaceSL2.metricTensor(0, 0);
assertClose(tensorSL2.gxx, 4.0, 1e-5, 'SL̃₂(ℝ) g_xx at origin');
assertClose(tensorSL2.gyy, 4.0, 1e-5, 'SL̃₂(ℝ) g_yy at origin');
assertClose(tensorSL2.gzz, 1.0, 1e-5, 'SL̃₂(ℝ) g_zz at origin');
console.log('✅ Metric tensor matches Poincaré conformal factor at origin');

// 3. Hyperbolic Warping at Radius r > 0
// In H^2 (kappa = -1) at r = 0.5:
// lambda = 2 / (1 - 0.25) = 2 / 0.75 = 8/3 = 2.6666...
// In Nil (kappa = 0) at r = 0.5:
// lambda = 2 / (1 - 0) = 2.0
const lambdaNil = spaceNil.conformalFactor(0.5, 0.0);
const lambdaSL2 = spaceSL2.conformalFactor(0.5, 0.0);

assertClose(lambdaNil, 2.0, 1e-5, 'Nil conformal factor is constant 2.0');
assertClose(lambdaSL2, 8.0 / 3.0, 1e-5, 'Poincaré metric conformal factor at r=0.5');
assert(lambdaSL2 > lambdaNil, 'Hyperbolic metric scales up towards boundary r -> 1');
console.log('✅ Hyperbolic base plane metric dilation verified');

// 4. Gauss-Bonnet Holonomy Shift in SL̃₂(ℝ)
// For an ideal hyperbolic triangle, angles alpha = beta = gamma = 0
// Gauss-Bonnet Area = pi - (0 + 0 + 0) = pi = 3.14159265...
const idealArea = Math.PI;
const holonomySL2 = spaceSL2.computeHolonomyFromArea(idealArea);
assertClose(holonomySL2, Math.PI, 1e-5, 'Ideal triangle vertical holonomy shift Delta z = c * pi');

// For an equilateral hyperbolic triangle with angles 45° (pi/4):
const alpha = Math.PI / 4.0;
const regularArea = Math.PI - 3.0 * alpha; // pi / 4
const holonomyRegular = spaceSL2.computeHolonomyFromArea(regularArea);
assertClose(holonomyRegular, Math.PI / 4.0, 1e-5, 'Regular hyperbolic triangle holonomy');
console.log('✅ Gauss-Bonnet hyperbolic holonomy shift Delta z = c * Area(H²) verified');

console.log('🎉 ALL Hyperbolic-Nil Space (SL̃₂(ℝ) ↔ Nil) Family tests PASSED!\n');
