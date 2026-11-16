/**
 * Nil Geometry and Heisenberg Group H3 Mathematical Primitives
 * 
 * Nil is one of the eight Thurston 3-manifold geometries.
 * It is modeled on the 3-dimensional Heisenberg Lie group H3(R):
 * 
 * Matrix representation:
 *   [ 1  x  z ]
 *   [ 0  1  y ]
 *   [ 0  0  1 ]
 * 
 * Group operation:
 *   (x1, y1, z1) * (x2, y2, z2) = (x1 + x2, y1 + y2, z1 + z2 + c * x1 * y2)
 * 
 * Left-invariant Riemannian metric:
 *   ds^2 = dx^2 + dy^2 + (dz - c * x * dy)^2
 * 
 * Contact 1-form:
 *   omega = dz - c * x * dy
 * 
 * Holonomy along a horizontal loop:
 *   Delta z = c * \oint x dy = c * Area_xy(Loop)
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export class NilSpace {
  public torsion: number;

  constructor(torsion: number = 1.0) {
    this.torsion = torsion;
  }

  /**
   * Heisenberg group multiplication: p1 * p2
   */
  multiply(p1: Vector3D, p2: Vector3D): Vector3D {
    return {
      x: p1.x + p2.x,
      y: p1.y + p2.y,
      z: p1.z + p2.z + this.torsion * p1.x * p2.y
    };
  }

  /**
   * Heisenberg group inversion: p^-1
   */
  inverse(p: Vector3D): Vector3D {
    return {
      x: -p.x,
      y: -p.y,
      z: -p.z + this.torsion * p.x * p.y
    };
  }

  /**
   * Lie bracket of horizontal vector fields [X, Y] = c * Z
   */
  lieBracketMagnitude(): number {
    return this.torsion;
  }

  /**
   * Computes the vertical holonomy shift for a closed horizontal loop
   * Delta z = c * Area_xy
   */
  computeHolonomy(areaXY: number): number {
    return this.torsion * areaXY;
  }

  /**
   * Signed planar area of a closed polygonal loop in the XY projection
   */
  static signedPolygonArea(points: Array<{ x: number; y: number }>): number {
    const n = points.length;
    if (n < 3) return 0;
    let area = 0;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      area += p1.x * p2.y - p2.x * p1.y;
    }
    return area * 0.5;
  }

  /**
   * Nil gauge / Koranyi distance from origin:
   * d_gauge(p, 0) = ((x^2 + y^2)^2 + 16 * z^2)^(1/4)
   */
  gaugeDistance(p: Vector3D): number {
    const r2 = p.x * p.x + p.y * p.y;
    return Math.pow(r2 * r2 + 16.0 * p.z * p.z, 0.25);
  }

  /**
   * Nil distance between two points: d(p1, p2) = gaugeDistance(p1^-1 * p2)
   */
  distance(p1: Vector3D, p2: Vector3D): number {
    const rel = this.multiply(this.inverse(p1), p2);
    return this.gaugeDistance(rel);
  }

  /**
   * Evaluate a discretized Nil geodesic segment connecting pStart to pEnd
   * Following the contact connection dz = c * 0.5 * (x dy - y dx) + dz_drift
   */
  interpolateGeodesic(pStart: Vector3D, pEnd: Vector3D, steps: number): Vector3D[] {
    const path: Vector3D[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = pStart.x + (pEnd.x - pStart.x) * t;
      const y = pStart.y + (pEnd.y - pStart.y) * t;
      
      // Horizontal contact connection holonomy
      const dx = x - pStart.x;
      const dy = y - pStart.y;
      const contactTwist = this.torsion * 0.5 * (pStart.x * dy - pStart.y * dx);
      const z = pStart.z + (pEnd.z - pStart.z) * t + contactTwist;

      path.push({ x, y, z });
    }
    return path;
  }
}
