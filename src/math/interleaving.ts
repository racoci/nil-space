import { createNilPenroseTriangle, type PenroseTriangleGeometry } from './penrose';

export interface InterleavedLatticeConfig {
  numTriangles: number;
  sideLength: number;
  torsion: number;
  spacingFactor: number;
}

/**
 * Generates an interleaved macro-structure of Penrose Triangles in Nil Geometry
 * following a chiral screw-axis and Kagome base projection.
 */
export function generateInterleavedPenroseLattice(
  config: InterleavedLatticeConfig
): PenroseTriangleGeometry[] {
  const { numTriangles, sideLength, torsion, spacingFactor } = config;
  const triangles: PenroseTriangleGeometry[] = [];

  const h = (Math.sqrt(3) / 2) * sideLength;
  const nominalHolonomy = torsion * 0.5 * sideLength * h;

  for (let k = 0; k < numTriangles; k++) {
    // Chiral orientation alternates (+1 for CCW, -1 for CW)
    const orientation = k % 2 === 0 ? 1.0 : -1.0;

    // Arrange triangles along concentric hexagonal rings with a screw pitch along z
    const ring = Math.floor(k / 3);
    const sector = k % 3;
    const baseAngle = sector * ((2 * Math.PI) / 3) + ring * 0.523; // 30° twist per ring

    const radius = ring === 0 ? (k === 0 ? 0 : sideLength * 0.7 * spacingFactor) : (ring * sideLength * 0.95 * spacingFactor);
    const cx = radius * Math.cos(baseAngle);
    const cy = radius * Math.sin(baseAngle);

    // Stagger z-elevation so beams interweave without intersecting bodies
    const zPitch = nominalHolonomy * 0.65;
    const baseZ = (k - (numTriangles - 1) * 0.5) * zPitch;

    const tri = createNilPenroseTriangle(k, cx, cy, baseZ, sideLength, torsion, orientation);
    triangles.push(tri);
  }

  return triangles;
}
