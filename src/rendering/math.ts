/**
 * Zero-dependency High-Performance 3D & Nil Geometry Math Engine
 * Designed for real-time WebGL2 GPU pipelines and zero allocations in hot loops.
 */

export interface IVec3 {
  x: number;
  y: number;
  z: number;
}

export class Vec3 implements IVec3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: IVec3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: IVec3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: IVec3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  dot(v: IVec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: IVec3): this {
    const ax = this.x, ay = this.y, az = this.z;
    const bx = v.x, by = v.y, bz = v.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  normalize(): this {
    const len = this.length();
    if (len > 1e-8) {
      this.scale(1.0 / len);
    }
    return this;
  }

  distanceTo(v: IVec3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  lerp(v: IVec3, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
}

/**
 * 4x4 Matrix for WebGL2 (Column-Major Float32Array)
 */
export class Mat4 {
  public elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity(): this {
    const te = this.elements;
    te.fill(0);
    te[0] = 1;
    te[5] = 1;
    te[10] = 1;
    te[15] = 1;
    return this;
  }

  copy(m: Mat4): this {
    this.elements.set(m.elements);
    return this;
  }

  clone(): Mat4 {
    const m = new Mat4();
    m.copy(this);
    return m;
  }

  /**
   * Standard perspective projection (depth range -1 to 1 for WebGL)
   */
  perspective(fovyRad: number, aspect: number, near: number, far: number): this {
    const te = this.elements;
    te.fill(0);
    const f = 1.0 / Math.tan(fovyRad * 0.5);
    const nf = 1.0 / (near - far);

    te[0] = f / aspect;
    te[5] = f;
    te[10] = (far + near) * nf;
    te[11] = -1.0;
    te[14] = (2.0 * far * near) * nf;
    return this;
  }

  /**
   * LookAt view matrix: eye looking at target with given up vector
   */
  lookAt(eye: IVec3, target: IVec3, up: IVec3): this {
    const te = this.elements;

    // Forward direction: z = normalize(eye - target)
    let zx = eye.x - target.x;
    let zy = eye.y - target.y;
    let zz = eye.z - target.z;
    let zLen = Math.hypot(zx, zy, zz);
    if (zLen < 1e-8) {
      zz = 1;
      zLen = 1;
    }
    zx /= zLen;
    zy /= zLen;
    zz /= zLen;

    // Right vector: x = normalize(up x z)
    let xx = up.y * zz - up.z * zy;
    let xy = up.z * zx - up.x * zz;
    let xz = up.x * zy - up.y * zx;
    let xLen = Math.hypot(xx, xy, xz);
    if (xLen < 1e-8) {
      xx = 1;
      xLen = 1;
    }
    xx /= xLen;
    xy /= xLen;
    xz /= xLen;

    // Up vector: y = z x x
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    te[0] = xx;
    te[4] = xy;
    te[8] = xz;
    te[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);

    te[1] = yx;
    te[5] = yy;
    te[9] = yz;
    te[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);

    te[2] = zx;
    te[6] = zy;
    te[10] = zz;
    te[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);

    te[3] = 0;
    te[7] = 0;
    te[11] = 0;
    te[15] = 1;

    return this;
  }

  /**
   * Matrix multiplication: this = a * b
   */
  multiplyMatrices(a: Mat4, b: Mat4): this {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;

    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    return this;
  }

  /**
   * Invert 4x4 matrix in place
   */
  invert(): this {
    const te = this.elements;
    const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
    const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
    const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
    const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];

    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (Math.abs(det) < 1e-14) {
      return this.identity();
    }

    const idet = 1.0 / det;

    te[0] = t11 * idet;
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * idet;
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * idet;
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * idet;

    te[4] = t12 * idet;
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * idet;
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * idet;
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * idet;

    te[8] = t13 * idet;
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * idet;
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * idet;
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * idet;

    te[12] = t14 * idet;
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * idet;
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * idet;
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * idet;

    return this;
  }
}

/**
 * 3D Ray for screen-space unprojection & picking
 */
export class Ray3 {
  public origin: Vec3;
  public direction: Vec3;

  constructor(origin: Vec3 = new Vec3(), direction: Vec3 = new Vec3(0, 0, -1)) {
    this.origin = origin;
    this.direction = direction;
  }

  /**
   * Set from normalized device coordinates (ndcX, ndcY: -1 to 1) and inverse View-Projection matrix
   */
  setFromCamera(ndcX: number, ndcY: number, invViewProj: Mat4): this {
    // Near point (z = -1)
    const pNear = this.transformPoint(ndcX, ndcY, -1.0, invViewProj);
    // Far point (z = 1)
    const pFar = this.transformPoint(ndcX, ndcY, 1.0, invViewProj);

    this.origin.copy(pNear);
    this.direction.set(pFar.x - pNear.x, pFar.y - pNear.y, pFar.z - pNear.z).normalize();
    return this;
  }

  private transformPoint(x: number, y: number, z: number, m: Mat4): Vec3 {
    const e = m.elements;
    const w = 1.0 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    return new Vec3(
      (e[0] * x + e[4] * y + e[8] * z + e[12]) * w,
      (e[1] * x + e[5] * y + e[9] * z + e[13]) * w,
      (e[2] * x + e[6] * y + e[10] * z + e[14]) * w
    );
  }

  /**
   * Shortest Euclidean distance from ray to point
   */
  distanceToPoint(p: IVec3): number {
    const v = new Vec3(p.x - this.origin.x, p.y - this.origin.y, p.z - this.origin.z);
    const dProj = v.dot(this.direction);
    if (dProj < 0) {
      return v.length();
    }
    const perpSq = v.lengthSq() - dProj * dProj;
    return Math.sqrt(Math.max(0, perpSq));
  }

  /**
   * Shortest distance from ray to line segment [A, B]
   */
  distanceToSegment(a: IVec3, b: IVec3): number {
    const u = new Vec3(b.x - a.x, b.y - a.y, b.z - a.z);
    const v = this.direction;
    const w = new Vec3(a.x - this.origin.x, a.y - this.origin.y, a.z - this.origin.z);

    const aDot = u.dot(u);
    const bDot = u.dot(v);
    const cDot = v.dot(v);
    const dDot = u.dot(w);
    const eDot = v.dot(w);

    const denom = aDot * cDot - bDot * bDot;
    let sN: number, sD = denom;
    let tN: number, tD = denom;

    if (denom < 1e-8) {
      sN = 0.0;
      sD = 1.0;
      tN = eDot;
      tD = cDot;
    } else {
      sN = (bDot * eDot - cDot * dDot);
      tN = (aDot * eDot - bDot * dDot);
      if (sN < 0.0) {
        sN = 0.0;
        tN = eDot;
        tD = cDot;
      } else if (sN > sD) {
        sN = sD;
        tN = eDot + bDot;
        tD = cDot;
      }
    }

    if (tN < 0.0) {
      tN = 0.0;
      if (-dDot < 0.0) sN = 0.0;
      else if (-dDot > aDot) sN = sD;
      else {
        sN = -dDot;
        sD = aDot;
      }
    }

    const sc = Math.abs(sN) < 1e-8 ? 0.0 : sN / sD;
    const tc = Math.abs(tN) < 1e-8 ? 0.0 : tN / tD;

    const dP = new Vec3(
      w.x + sc * u.x - tc * v.x,
      w.y + sc * u.y - tc * v.y,
      w.z + sc * u.z - tc * v.z
    );
    return dP.length();
  }

  /**
   * Ray-triangle intersection (Möller-Trumbore)
   */
  intersectTriangle(a: IVec3, b: IVec3, c: IVec3): number | null {
    const edge1 = new Vec3(b.x - a.x, b.y - a.y, b.z - a.z);
    const edge2 = new Vec3(c.x - a.x, c.y - a.y, c.z - a.z);
    const h = new Vec3().copy(this.direction).cross(edge2);
    const aVal = edge1.dot(h);

    if (Math.abs(aVal) < 1e-7) return null;

    const f = 1.0 / aVal;
    const s = new Vec3(this.origin.x - a.x, this.origin.y - a.y, this.origin.z - a.z);
    const u = f * s.dot(h);
    if (u < 0.0 || u > 1.0) return null;

    const q = new Vec3().copy(s).cross(edge1);
    const v = f * this.direction.dot(q);
    if (v < 0.0 || u + v > 1.0) return null;

    const t = f * edge2.dot(q);
    return t > 1e-7 ? t : null;
  }
}

/**
 * Exact closed-form Nil Geodesic Ray Evaluation
 * Evaluates light ray position P(s) along curved Nil geodesics:
 * ds^2 = dx^2 + dy^2 + (dz - c * x * dy)^2
 */
export function evaluateNilGeodesicRay(
  p0: IVec3,
  v0: IVec3,
  torsion: number,
  s: number
): Vec3 {
  const k = v0.z - torsion * p0.x * v0.y;
  const omega = torsion * k;

  if (Math.abs(omega) < 1e-6) {
    return new Vec3(
      p0.x + v0.x * s,
      p0.y + v0.y * s,
      p0.z + torsion * p0.x * v0.y * s + 0.5 * torsion * v0.x * v0.y * s * s
    );
  }

  const sinW = Math.sin(omega * s);
  const cosW = Math.cos(omega * s);

  const x = p0.x + (1.0 / omega) * (v0.x * sinW + v0.y * (cosW - 1.0));
  const y = p0.y + (1.0 / omega) * (-v0.x * (cosW - 1.0) + v0.y * sinW);

  const a = p0.x - v0.y / omega;
  const term1 = a * (y - p0.y);
  const vxy2 = v0.x * v0.x + v0.y * v0.y;
  const term2 = (vxy2 / (2.0 * omega)) * s;
  const term3 = ((v0.y * v0.y - v0.x * v0.x) / (4.0 * omega * omega)) * Math.sin(2.0 * omega * s);
  const term4 = ((v0.x * v0.y) / (2.0 * omega * omega)) * (1.0 - Math.cos(2.0 * omega * s));

  const z = p0.z + k * s + torsion * (term1 + term2 + term3 + term4);
  return new Vec3(x, y, z);
}

/**
 * Cygan / Koranyi Nil gauge distance:
 * d(p, q) = ||p^-1 * q||_Nil
 */
export function nilGaugeDistance(p: IVec3, q: IVec3, torsion: number): number {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const dz = (q.z - p.z) - torsion * p.x * dy;
  const r2 = dx * dx + dy * dy;
  return Math.pow(r2 * r2 + 16.0 * dz * dz, 0.25);
}
