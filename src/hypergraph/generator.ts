import { generateInterleavedPenroseLattice } from '../math/interleaving';
import type {
  HypergraphNode,
  HypergraphEdge,
  HypergraphHyperEdge,
  HypergraphState,
  HypergraphGeneratorConfig
} from './types';

/**
 * Fast seedable PRNG (Mulberry32)
 */
class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed === 0 ? 0x12345678 : seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Builds the complete Nil hypergraph state with interleaved Penrose macro-structures
 * and pseudo-random satellite hyperedges.
 */
export function generateNilHypergraph(config: HypergraphGeneratorConfig): HypergraphState {
  const rng = new Mulberry32(config.seed);
  const nodes: HypergraphNode[] = [];
  const edges: HypergraphEdge[] = [];
  const hyperedges: HypergraphHyperEdge[] = [];

  const triangles = generateInterleavedPenroseLattice({
    numTriangles: config.numTriangles,
    sideLength: config.sideLength,
    torsion: config.torsion,
    spacingFactor: config.spacingFactor ?? 1.0
  });

  let edgeIdCounter = 0;
  let hyperedgeIdCounter = 0;

  // Track the primary corner node IDs for each triangle
  const triangleCornerNodes: Map<number, number[]> = new Map();

  for (const tri of triangles) {
    const triNodeStart = nodes.length;
    const triCorners: number[] = [];

    // Each triangle has beam vertices
    for (let i = 0; i < tri.beamVertices.length; i++) {
      const pt = tri.beamVertices[i];
      const isCorner = i % 4 === 0;
      const nodeId = nodes.length;

      nodes.push({
        id: nodeId,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        triangleId: tri.id,
        isCorner,
        subIndex: i
      });

      if (isCorner) {
        triCorners.push(nodeId);
      }
    }

    triangleCornerNodes.set(tri.id, triCorners);

    // Close the beam cycle for this triangle
    const triNodeCount = tri.beamVertices.length;
    for (let i = 0; i < triNodeCount; i++) {
      const u = triNodeStart + i;
      const v = triNodeStart + ((i + 1) % triNodeCount);
      edges.push({
        id: edgeIdCounter++,
        u,
        v,
        type: 'penrose_beam',
        triangleId: tri.id
      });
    }

    // Register the 3-uniform Penrose triad hyperedge
    if (triCorners.length >= 3) {
      hyperedges.push({
        id: hyperedgeIdCounter++,
        nodeIds: [triCorners[0], triCorners[1], triCorners[2]],
        type: 'penrose_triad',
        triangleId: tri.id
      });
    }

    // Interleave with previous triangle via bridging hyperedges
    if (tri.id > 0) {
      const prevCorners = triangleCornerNodes.get(tri.id - 1);
      if (prevCorners && prevCorners.length >= 3) {
        // Bridge nearest corners
        edges.push({
          id: edgeIdCounter++,
          u: prevCorners[0],
          v: triCorners[0],
          type: 'interleave_bridge',
          triangleId: tri.id
        });

        // 4-uniform relational hyperedge linking adjacent interleaved triangles
        hyperedges.push({
          id: hyperedgeIdCounter++,
          nodeIds: [prevCorners[0], prevCorners[1], triCorners[0], triCorners[1]],
          type: 'relational_clique',
          triangleId: tri.id
        });
      }
    }
  }

  // Generate pseudo-random satellite nodes and cross-cutting hyperedges
  const macroNodeCount = nodes.length;
  const extraNodeCount = Math.floor(macroNodeCount * config.randomDensity * 0.4);
  const nominalHolonomy = config.torsion * 0.5 * config.sideLength * ((Math.sqrt(3) / 2) * config.sideLength);

  for (let i = 0; i < extraNodeCount; i++) {
    const parentNode = nodes[Math.floor(rng.next() * macroNodeCount)];
    const ox = rng.range(-config.sideLength * 0.35, config.sideLength * 0.35);
    const oy = rng.range(-config.sideLength * 0.35, config.sideLength * 0.35);
    const oz = rng.range(-nominalHolonomy * 0.35, nominalHolonomy * 0.35);

    const newNodeId = nodes.length;
    nodes.push({
      id: newNodeId,
      x: parentNode.x + ox,
      y: parentNode.y + oy,
      z: parentNode.z + oz,
      triangleId: -1, // Satellite
      isCorner: false,
      subIndex: -1
    });

    edges.push({
      id: edgeIdCounter++,
      u: parentNode.id,
      v: newNodeId,
      type: 'random_hyper',
      triangleId: -1
    });
  }

  // Pseudo-random higher order hyperedges (3- and 4-hyperedges)
  const totalNodes = nodes.length;
  const randomHyperCount = Math.floor(totalNodes * config.randomDensity * 0.3);

  for (let i = 0; i < randomHyperCount; i++) {
    const size = rng.next() > 0.5 ? 4 : 3;
    const anchor = Math.floor(rng.next() * totalNodes);
    const clique: number[] = [anchor];

    for (let s = 1; s < size; s++) {
      const offset = Math.floor(rng.next() * 14) + 1;
      const target = (anchor + offset) % totalNodes;
      if (!clique.includes(target)) {
        clique.push(target);
      }
    }

    if (clique.length >= 3) {
      hyperedges.push({
        id: hyperedgeIdCounter++,
        nodeIds: clique,
        type: 'relational_clique',
        triangleId: -1
      });
    }
  }

  return {
    nodes,
    edges,
    hyperedges,
    triangles,
    selectedTriangleId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
    hoveredTriangleId: null,
    hoveredNodeId: null,
    hoveredEdgeId: null
  };
}
