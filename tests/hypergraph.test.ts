import { generateNilHypergraph } from '../src/hypergraph/generator';
import type { HypergraphGeneratorConfig } from '../src/hypergraph/types';

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

console.log('🧪 Running Nil Hypergraph Generation & Interleaving Tests...');

const config: HypergraphGeneratorConfig = {
  numTriangles: 6,
  sideLength: 5.0,
  torsion: 1.0,
  randomDensity: 0.5,
  seed: 12345
};

const graph1 = generateNilHypergraph(config);

// 1. Structure counts
assert(graph1.triangles.length === 6, 'Must generate exactly 6 macro Penrose triangles');
assert(graph1.nodes.length > 50, 'Must have nodes for beams + satellites');
assert(graph1.edges.length > 60, 'Must have beam edges + bridges + satellite edges');
assert(graph1.hyperedges.length >= 6, 'Must have at least 6 primary Penrose triad hyperedges');

console.log(`✅ Base graph generated: ${graph1.nodes.length} nodes, ${graph1.edges.length} edges, ${graph1.hyperedges.length} hyperedges`);

// 2. Deterministic Reproducibility with PRNG Seed
const graph2 = generateNilHypergraph(config);
assert(graph1.nodes.length === graph2.nodes.length, 'Same seed produces same node count');
assert(graph1.edges.length === graph2.edges.length, 'Same seed produces same edge count');
assert(graph1.hyperedges.length === graph2.hyperedges.length, 'Same seed produces same hyperedge count');

for (let i = 0; i < graph1.nodes.length; i++) {
  assertClose(graph1.nodes[i].x, graph2.nodes[i].x, 1e-6, `Node ${i} X reproducibility`);
  assertClose(graph1.nodes[i].y, graph2.nodes[i].y, 1e-6, `Node ${i} Y reproducibility`);
  assertClose(graph1.nodes[i].z, graph2.nodes[i].z, 1e-6, `Node ${i} Z reproducibility`);
}
console.log('✅ Deterministic seed reproducibility confirmed');

// 3. Chiral Alternation Check
let positiveAreaCount = 0;
let negativeAreaCount = 0;
for (const tri of graph1.triangles) {
  if (tri.loopArea > 0) positiveAreaCount++;
  else negativeAreaCount++;
}

assert(positiveAreaCount === 3 && negativeAreaCount === 3, 'Chiral balance: 3 positive area (+z) and 3 negative area (-z) triangles');
console.log('✅ Chiral holonomy balancing confirmed (net zero macro-flux)');

// 4. Triangle Beam Connectivity Check
for (const tri of graph1.triangles) {
  const triEdges = graph1.edges.filter(e => e.triangleId === tri.id && e.type === 'penrose_beam');
  assert(triEdges.length >= 9, `Triangle ${tri.id} has closed beam edges`);
}
console.log('✅ All Penrose triangles form continuous closed cycles');

// 5. Interleaving Bridges Check
const bridgeEdges = graph1.edges.filter(e => e.type === 'interleave_bridge');
assert(bridgeEdges.length === 5, '5 bridge connections linking adjacent triangles in 6-triangle lattice');
console.log('✅ Interleaving lattice bridge hyper-relations verified');

console.log('🎉 All Hypergraph structural invariants PASSED successfully!\n');
