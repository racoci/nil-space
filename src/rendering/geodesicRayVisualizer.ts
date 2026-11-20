import { nilInverseExpNewton } from '../math/safeNewton';
import { NilSpace, type Vector3D } from '../math/nil';

export interface GeodesicRayPath {
  targetNodeId: number;
  points: Vector3D[]; // Discretized 3D points from camera to target
}

/**
 * Computes authentic curved 3D geodesic light rays connecting the observer/camera
 * to target nodes in Nil geometry.
 */
export class GeodesicRayVisualizer {
  private nil: NilSpace;

  constructor(torsion: number = 1.0) {
    this.nil = new NilSpace(torsion);
  }

  public setTorsion(torsion: number): void {
    this.nil.torsion = torsion;
  }

  /**
   * Evaluates the curved geodesic light path from camera to target point.
   * Discretized into 'numSegments' points.
   */
  public computeRay(
    cameraPos: Vector3D,
    targetPos: Vector3D,
    targetNodeId: number,
    numSegments: number = 20
  ): GeodesicRayPath {
    // 1. Pull target into camera-centered Nil coordinates: h = C^-1 * P
    const camInv = this.nil.inverse(cameraPos);
    const h = this.nil.multiply(camInv, targetPos);

    // 2. Solve for initial tangent velocity v = (vx, vy, vz) using Safe Newton
    const vResult = nilInverseExpNewton(h.x, h.y, h.z, 4);
    const vx = vResult.vx;
    const vy = vResult.vy;
    const vz = vResult.vz;

    // 3. Trace geodesic curve gamma(t) = C * exp(t * v) for t in [0, 1]
    const points: Vector3D[] = [];
    const r2 = vx * vx + vy * vy;
    const b = 0.5 * Math.sqrt(r2);
    const alphaTotal = Math.atan2(vy, vx);

    for (let s = 0; s <= numSegments; s++) {
      const t = s / numSegments;
      if (t === 0) {
        points.push({ x: cameraPos.x, y: cameraPos.y, z: cameraPos.z });
        continue;
      }
      if (t === 1) {
        points.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z });
        continue;
      }

      // Local geodesic in Nil space at fraction t
      const wt = vz * t;
      let localX: number;
      let localY: number;
      let localZ: number;

      if (Math.abs(wt) < 1e-4) {
        // Purely horizontal or very small w
        localX = vx * t;
        localY = vy * t;
        localZ = 0.5 * this.nil.torsion * (vx * vy * t * t) + vz * t;
      } else {
        const alpha = alphaTotal - wt * 0.5;

        localX = 2.0 * b * Math.sin(wt * 0.5) * Math.cos(alpha);
        localY = 2.0 * b * Math.sin(wt * 0.5) * Math.sin(alpha);

        // Nil vertical coordinate with Heisenberg contact connection
        const w2 = wt * wt;
        const gw = Math.abs(wt) < 0.1
          ? wt * (1.0 / 3.0 + w2 / 90.0)
          : (wt - Math.sin(wt)) / (1.0 - Math.cos(wt));

        localZ = b * b * gw + wt;
      }

      // 4. Translate back to global space: P(t) = C * localP
      const globalPt = this.nil.multiply(cameraPos, { x: localX, y: localY, z: localZ });
      points.push(globalPt);
    }

    return {
      targetNodeId,
      points
    };
  }

  /**
   * Generates a flat Float32Array suitable for WebGL line buffer rendering.
   * Returns positions [x, y, z, x, y, z, ...] for GL_LINES.
   */
  public generateLinesBuffer(
    cameraPos: Vector3D,
    targets: Array<{ id: number; x: number; y: number; z: number }>,
    numSegments: number = 16
  ): Float32Array {
    const totalLines = targets.length * numSegments;
    const buffer = new Float32Array(totalLines * 6); // 2 vertices * 3 coords per segment
    let offset = 0;

    for (const target of targets) {
      const ray = this.computeRay(cameraPos, target, target.id, numSegments);
      for (let i = 0; i < ray.points.length - 1; i++) {
        const p1 = ray.points[i];
        const p2 = ray.points[i + 1];

        buffer[offset++] = p1.x;
        buffer[offset++] = p1.y;
        buffer[offset++] = p1.z;

        buffer[offset++] = p2.x;
        buffer[offset++] = p2.y;
        buffer[offset++] = p2.z;
      }
    }

    return buffer;
  }
}
