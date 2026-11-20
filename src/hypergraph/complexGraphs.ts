import type { HypergraphNode, HypergraphEdge, HypergraphHyperEdge, HypergraphState } from './types';
import { NilSpace } from '../math/nil';
import { generateNilHypergraph } from './generator';

export type ComplexGraphTopology =
  | 'penrose_lattice'
  | 'barabasi_albert'
  | 'watts_strogatz'
  | 'nil_geometric';

export interface ComplexGraphConfig {
  topology: ComplexGraphTopology;
  nodeCount: number;
  paramA?: number; // m for Barabasi, K for Watts, radius for Nil Geometric
  paramB?: number; // beta for Watts
  torsion: number;
  seed: number;
}

export interface GraphAnalytics {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  maxDegree: number;
  clusteringCoefficient: number;
  density: number;
}

/**
 * Fast seedable PRNG (Mulberry32)
 */
class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed === 0 ? 0x12345678 : seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Generates a Scale-Free / Power-Law network via the Barabási-Albert preferential attachment model,
 * embedded in Nil geometry.
 */
export function generateBarabasiAlbert(
  nodeCount: number,
  m: number = 2,
  torsion: number = 1.0,
  seed: number = 42
): HypergraphState {
  const rng = new Rng(seed);
  const nodes: HypergraphNode[] = [];
  const edges: HypergraphEdge[] = [];
  const hyperedges: HypergraphHyperEdge[] = [];

  const degrees: number[] = new Array(nodeCount).fill(0);
  const repeatedNodes: number[] = [];
  let edgeId = 0;

  // Initial core of m0 = m + 1 connected nodes
  const m0 = Math.max(3, m + 1);
  for (let i = 0; i < m0; i++) {
    const angle = (i / m0) * Math.PI * 2.0;
    const radius = 4.0;
    nodes.push({
      id: i,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      z: (i - m0 * 0.5) * 1.5,
      triangleId: -1,
      isCorner: true,
      subIndex: -1
    });
  }

  // Connect initial ring
  for (let i = 0; i < m0; i++) {
    const next = (i + 1) % m0;
    edges.push({ id: edgeId++, u: i, v: next, type: 'random_hyper', triangleId: -1 });
    degrees[i]++;
    degrees[next]++;
    repeatedNodes.push(i, next);
  }

  // Preferential attachment for remaining nodes
  for (let i = m0; i < nodeCount; i++) {
    // Spatial embedding: hubs pull nodes toward their Nil fibers
    const chosenTargets: number[] = [];
    while (chosenTargets.length < m) {
      const idx = Math.floor(rng.next() * repeatedNodes.length);
      const target = repeatedNodes[idx];
      if (target !== i && !chosenTargets.includes(target)) {
        chosenTargets.push(target);
      }
    }

    // Centroid of targets in Nil space
    let cx = 0, cy = 0, cz = 0;
    for (const t of chosenTargets) {
      cx += nodes[t].x;
      cy += nodes[t].y;
      cz += nodes[t].z;
    }
    cx /= chosenTargets.length;
    cy /= chosenTargets.length;
    cz /= chosenTargets.length;

    // Displacement along contact plane
    const dx = rng.range(-2.5, 2.5);
    const dy = rng.range(-2.5, 2.5);
    const dz = rng.range(-1.5, 1.5) + 0.5 * torsion * (cx * dy - cy * dx);

    nodes.push({
      id: i,
      x: cx + dx,
      y: cy + dy,
      z: cz + dz,
      triangleId: -1,
      isCorner: false,
      subIndex: -1
    });

    for (const target of chosenTargets) {
      edges.push({ id: edgeId++, u: i, v: target, type: 'random_hyper', triangleId: -1 });
      degrees[i]++;
      degrees[target]++;
      repeatedNodes.push(i, target);
    }

    // Register higher-order hyperedge among targets
    if (chosenTargets.length >= 2) {
      hyperedges.push({
        id: hyperedges.length,
        nodeIds: [i, ...chosenTargets],
        type: 'relational_clique',
        triangleId: -1
      });
    }
  }

  return {
    nodes,
    edges,
    hyperedges,
    triangles: [],
    selectedTriangleId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredTriangleId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null
  };
}

/**
 * Generates a Small-World network via the Watts-Strogatz model,
 * embedded around a chiral helix in Nil space.
 */
export function generateWattsStrogatz(
  nodeCount: number,
  K: number = 4,
  beta: number = 0.2,
  torsion: number = 1.0,
  seed: number = 42
): HypergraphState {
  const rng = new Rng(seed);
  const nodes: HypergraphNode[] = [];
  const edges: HypergraphEdge[] = [];
  const hyperedges: HypergraphHyperEdge[] = [];

  const halfK = Math.floor(K / 2);
  const edgeSet = new Set<string>();
  let edgeId = 0;

  // Embed vertices along a chiral screw helix
  const helixRadius = 8.0;
  const zPitch = 0.25 * torsion;
  for (let i = 0; i < nodeCount; i++) {
    const theta = (i / nodeCount) * Math.PI * 4.0;
    nodes.push({
      id: i,
      x: helixRadius * Math.cos(theta),
      y: helixRadius * Math.sin(theta),
      z: (i - nodeCount * 0.5) * zPitch,
      triangleId: -1,
      isCorner: i % 5 === 0,
      subIndex: -1
    });
  }

  // Create ring lattice edges and rewire with probability beta
  for (let i = 0; i < nodeCount; i++) {
    for (let j = 1; j <= halfK; j++) {
      let target = (i + j) % nodeCount;
      if (rng.next() < beta) {
        // Rewire to a random node
        let newTarget = Math.floor(rng.next() * nodeCount);
        while (newTarget === i || newTarget === target) {
          newTarget = Math.floor(rng.next() * nodeCount);
        }
        target = newTarget;
      }

      const key = i < target ? `${i}-${target}` : `${target}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ id: edgeId++, u: i, v: target, type: 'random_hyper', triangleId: -1 });
      }
    }
  }

  return {
    nodes,
    edges,
    hyperedges,
    triangles: [],
    selectedTriangleId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredTriangleId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null
  };
}

/**
 * Generates a Random Geometric Graph (RGG) using Nil geometry (Koranyi gauge metric).
 * Edges form when d_Nil(u, v) <= threshold.
 */
export function generateNilGeometricGraph(
  nodeCount: number,
  connectRadius: number = 4.5,
  torsion: number = 1.0,
  seed: number = 42
): HypergraphState {
  const rng = new Rng(seed);
  const nil = new NilSpace(torsion);
  const nodes: HypergraphNode[] = [];
  const edges: HypergraphEdge[] = [];
  const hyperedges: HypergraphHyperEdge[] = [];

  const boxSize = 14.0;
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i,
      x: rng.range(-boxSize, boxSize),
      y: rng.range(-boxSize, boxSize),
      z: rng.range(-boxSize * 0.75, boxSize * 0.75),
      triangleId: -1,
      isCorner: false,
      subIndex: -1
    });
  }

  let edgeId = 0;
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const p1 = nodes[i];
      const p2 = nodes[j];
      const dist = nil.distance(p1, p2);
      if (dist <= connectRadius) {
        edges.push({ id: edgeId++, u: i, v: j, type: 'random_hyper', triangleId: -1 });
      }
    }
  }

  return {
    nodes,
    edges,
    hyperedges,
    triangles: [],
    selectedTriangleId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredTriangleId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null
  };
}

/**
 * Computes graph analytics: degree distribution, average degree, clustering coefficient, and density.
 */
export function computeGraphAnalytics(state: HypergraphState): GraphAnalytics {
  const n = state.nodes.length;
  if (n === 0) {
    return { nodeCount: 0, edgeCount: 0, avgDegree: 0, maxDegree: 0, clusteringCoefficient: 0, density: 0 };
  }

  const adj = new Map<number, Set<number>>();
  for (let i = 0; i < n; i++) {
    adj.set(i, new Set());
  }

  for (const e of state.edges) {
    adj.get(e.u)?.add(e.v);
    adj.get(e.v)?.add(e.u);
  }

  let totalDegree = 0;
  let maxDegree = 0;
  let totalLocalClustering = 0;

  for (let i = 0; i < n; i++) {
    const neighbors = Array.from(adj.get(i) || []);
    const k = neighbors.length;
    totalDegree += k;
    if (k > maxDegree) maxDegree = k;

    if (k > 1) {
      let trianglesCount = 0;
      for (let u = 0; u < k; u++) {
        for (let v = u + 1; v < k; v++) {
          if (adj.get(neighbors[u])?.has(neighbors[v])) {
            trianglesCount++;
          }
        }
      }
      const maxPossibleTriangles = (k * (k - 1)) / 2;
      totalLocalClustering += trianglesCount / maxPossibleTriangles;
    }
  }

  const edgeCount = state.edges.length;
  const avgDegree = totalDegree / n;
  const clusteringCoefficient = n > 0 ? totalLocalClustering / n : 0;
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  return {
    nodeCount: n,
    edgeCount,
    avgDegree,
    maxDegree,
    clusteringCoefficient,
    density
  };
}

/**
 * Factory dispatching graph generation based on configuration.
 */
export function buildComplexGraph(config: ComplexGraphConfig): HypergraphState {
  switch (config.topology) {
    case 'barabasi_albert':
      return generateBarabasiAlbert(
        config.nodeCount,
        config.paramA ?? 2,
        config.torsion,
        config.seed
      );
    case 'watts_strogatz':
      return generateWattsStrogatz(
        config.nodeCount,
        config.paramA ?? 4,
        config.paramB ?? 0.2,
        config.torsion,
        config.seed
      );
    case 'nil_geometric':
      return generateNilGeometricGraph(
        config.nodeCount,
        config.paramA ?? 4.5,
        config.torsion,
        config.seed
      );
    case 'penrose_lattice':
    default:
      return generateNilHypergraph({
        numTriangles: Math.max(2, Math.floor(config.nodeCount / 12)),
        sideLength: 5.0,
        torsion: config.torsion,
        randomDensity: 0.5,
        seed: config.seed
      });
  }
}
