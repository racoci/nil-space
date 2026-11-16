import { NilSpace, type Vector3D } from './nil';

export interface PenroseTriangleGeometry {
  id: number;
  center: Vector3D;
  sideLength: number;
  corners: [Vector3D, Vector3D, Vector3D];
  beamVertices: Vector3D[];
  loopArea: number;
  holonomyShift: number;
  canonicalCamera: {
    position: Vector3D;
    target: Vector3D;
  };
}

/**
 * Builds an impossible Penrose Triangle that physically closes in Nil geometry
 */
export function createNilPenroseTriangle(
  id: number,
  centerX: number,
  centerY: number,
  baseZ: number,
  sideLength: number,
  torsion: number,
  orientation: number = 1.0 // +1 for CCW (+area), -1 for CW (-area)
): PenroseTriangleGeometry {
  const nil = new NilSpace(torsion);
  const h = (Math.sqrt(3) / 2) * sideLength;
  const loopArea = 0.5 * sideLength * h * orientation;
  const holonomyShift = nil.computeHolonomy(loopArea);

  // 3 Corners in Nil coordinates
  const cornerA: Vector3D = {
    x: centerX - sideLength * 0.5,
    y: centerY - (h / 3.0) * orientation,
    z: baseZ
  };

  const cornerB: Vector3D = {
    x: centerX + sideLength * 0.5,
    y: centerY - (h / 3.0) * orientation,
    z: baseZ
  };

  const cornerC: Vector3D = {
    x: centerX,
    y: centerY + (2.0 * h / 3.0) * orientation,
    z: baseZ + holonomyShift * 0.5
  };

  const corners: [Vector3D, Vector3D, Vector3D] = [cornerA, cornerB, cornerC];

  // Discretize the 3 beams into curved Nil geodesic segments
  const beamVertices: Vector3D[] = [];
  const segmentsPerBeam = 4;

  for (let i = 0; i < 3; i++) {
    const start = corners[i];
    const end = corners[(i + 1) % 3];
    const pts = nil.interpolateGeodesic(start, end, segmentsPerBeam);
    // Exclude the last point to avoid duplicating corners
    for (let j = 0; j < pts.length - 1; j++) {
      beamVertices.push(pts[j]);
    }
  }

  // Centroid of the triangle
  const center: Vector3D = {
    x: centerX,
    y: centerY,
    z: baseZ + holonomyShift * 0.25
  };

  // Canonical vantage point:
  // In Euclidean space, the Reutersvard-Penrose illusion is viewed from an isometric angle:
  // azimuth = 45° or 30° / 60°, elevation = 35.26° (arctan(1 / sqrt(2)))
  // In Nil space, looking down along the fiber with a 35° isometric tilt reveals the
  // seamless closed structure while aligning the three beams into the classic tribar.
  const dist = sideLength * 2.8;
  const elevAngle = Math.PI * 0.22; // ~39.6 degrees
  const azimAngle = orientation > 0 ? Math.PI * 0.25 : -Math.PI * 0.25;

  const camPos: Vector3D = {
    x: center.x + dist * Math.cos(elevAngle) * Math.sin(azimAngle),
    y: center.y - dist * Math.cos(elevAngle) * Math.cos(azimAngle),
    z: center.z + dist * Math.sin(elevAngle) + holonomyShift * 0.5
  };

  return {
    id,
    center,
    sideLength,
    corners,
    beamVertices,
    loopArea,
    holonomyShift,
    canonicalCamera: {
      position: camPos,
      target: center
    }
  };
}
