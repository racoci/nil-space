/**
 * Master Test Orchestrator for Hyperbolic Nil Space
 * 
 * Runs all unit and mathematical verification test suites sequentially.
 * New tests can simply be registered here without modifying package.json.
 */

async function runAllUnitTests() {
  console.log('===========================================================');
  console.log('🚀 RUNNING ALL HYPERBOLIC NIL SPACE UNIT & MATH SUITES');
  console.log('===========================================================\n');

  const suites = [
    { name: 'Nil Geometry & Heisenberg Group Algebra', file: './nil_math.test.ts' },
    { name: 'Chiral Lattice & Screw-Axis Interleaving', file: './interleaving.test.ts' },
    { name: 'Non-Euclidean Hypergraph & PRNG Invariance', file: './hypergraph.test.ts' },
    { name: 'Nil Geodesic Rays & Scratch Math Invariants', file: './nil_geodesic_ray.test.ts' },
    { name: 'Safe Newton-Raphson vs 50-Step Bisection', file: './newton_vs_bisection.test.ts' },
    { name: 'Lie Commutator Loop & Metric Invariance', file: './holonomy_commutator.test.ts' }
  ];

  const startTime = performance.now();
  let passedCount = 0;

  for (const suite of suites) {
    console.log(`▶ Running Suite: ${suite.name} (${suite.file})`);
    try {
      await import(suite.file);
      passedCount++;
    } catch (err) {
      console.error(`\n❌ FAILED SUITE: ${suite.name}`);
      console.error(err);
      process.exit(1);
    }
  }

  const totalTime = (performance.now() - startTime).toFixed(2);
  console.log('===========================================================');
  console.log(`✨ ALL ${passedCount}/${suites.length} TEST SUITES PASSED SUCCESSFULLY in ${totalTime}ms!`);
  console.log('===========================================================\n');
}

runAllUnitTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
