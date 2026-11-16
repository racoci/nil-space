import type { PenroseTriangleGeometry } from '../math/penrose';

export interface HypergraphNode {
  id: number;
  x: number;
  y: number;
  z: number;
  triangleId: number; // -1 if satellite / random
  isCorner: boolean;
  subIndex: number;
}

export interface HypergraphEdge {
  id: number;
  u: number;
  v: number;
  type: 'penrose_beam' | 'interleave_bridge' | 'random_hyper';
  triangleId: number;
}

export interface HypergraphHyperEdge {
  id: number;
  nodeIds: number[];
  type: 'penrose_triad' | 'relational_clique';
  triangleId: number;
}

export interface HypergraphState {
  nodes: HypergraphNode[];
  edges: HypergraphEdge[];
  hyperedges: HypergraphHyperEdge[];
  triangles: PenroseTriangleGeometry[];
  selectedTriangleId: number | null;
  selectedNodeId: number | null;
  selectedEdgeId: number | null;
  hoveredTriangleId: number | null;
  hoveredNodeId: number | null;
  hoveredEdgeId: number | null;
}

export interface HypergraphGeneratorConfig {
  numTriangles: number;
  sideLength: number;
  torsion: number;
  randomDensity: number;
  seed: number;
  spacingFactor?: number;
}
