import {
  generateBarabasiAlbert,
  generateWattsStrogatz,
  generateNilGeometricGraph,
  computeGraphAnalytics,
  buildComplexGraph
} from '../src/hypergraph/complexGraphs';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${msg}`);
  }
}

console.log('🧪 Running Complex Graph Topologies & Analytics Tests...');

// 1. Barabási-Albert Scale-Free Topology
const N_ba = 150;
const m_ba = 3;
const graphBA = generateBarabasiAlbert(N_ba, m_ba, 1.0, 12345);

assert(graphBA.nodes.length === N_ba, `Expected ${N_ba} nodes in BA graph, got ${graphBA.nodes.length}`);
assert(graphBA.edges.length > N_ba * (m_ba - 1), 'BA edges count must reflect preferential attachment');

const analyticsBA = computeGraphAnalytics(graphBA);
assert(analyticsBA.maxDegree > analyticsBA.avgDegree * 2.5, 'Scale-free network must exhibit dominant hubs');
console.log(`✅ Barabási-Albert Scale-Free Network: N=${analyticsBA.nodeCount}, E=${analyticsBA.edgeCount}, MaxDeg=${analyticsBA.maxDegree}, AvgDeg=${analyticsBA.avgDegree.toFixed(2)}`);

// 2. Watts-Strogatz Small-World Topology
const N_ws = 120;
const K_ws = 6;
const beta_ws = 0.15;
const graphWS = generateWattsStrogatz(N_ws, K_ws, beta_ws, 1.0, 9999);

assert(graphWS.nodes.length === N_ws, `Expected ${N_ws} nodes in WS graph`);
const analyticsWS = computeGraphAnalytics(graphWS);

assert(analyticsWS.clusteringCoefficient > 0.15, `Small-world network must have high clustering coefficient (got ${analyticsWS.clusteringCoefficient.toFixed(3)})`);
console.log(`✅ Watts-Strogatz Small-World Network: N=${analyticsWS.nodeCount}, E=${analyticsWS.edgeCount}, Clustering=${analyticsWS.clusteringCoefficient.toFixed(3)}`);

// 3. Nil Random Geometric Graph (RGG)
const N_rgg = 80;
const radius_rgg = 5.0;
const graphRGG = generateNilGeometricGraph(N_rgg, radius_rgg, 1.2, 42);

assert(graphRGG.nodes.length === N_rgg, `Expected ${N_rgg} nodes in Nil RGG`);
const analyticsRGG = computeGraphAnalytics(graphRGG);
assert(analyticsRGG.edgeCount > 0, 'Geometric graph must connect neighboring nodes in Nil metric');
console.log(`✅ Nil Random Geometric Graph: N=${analyticsRGG.nodeCount}, E=${analyticsRGG.edgeCount}, Density=${analyticsRGG.density.toFixed(3)}`);

// 4. Factory Dispatcher
const factoryBA = buildComplexGraph({
  topology: 'barabasi_albert',
  nodeCount: 100,
  paramA: 2,
  torsion: 1.0,
  seed: 42
});
assert(factoryBA.nodes.length === 100, 'Factory correctly builds Barabási-Albert topology');

const factoryPenrose = buildComplexGraph({
  topology: 'penrose_lattice',
  nodeCount: 72,
  torsion: 1.0,
  seed: 42
});
assert(factoryPenrose.triangles.length > 0, 'Factory correctly builds Penrose lattice topology');

console.log('🎉 ALL Complex Graph Topologies & Analytics tests PASSED!\n');
