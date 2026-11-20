/**
 * Hyperbolic-Nil Space Unified Metric & Geometry (SL̃₂(ℝ) ↔ Nil Family)
 * 
 * Unifies Nil geometry (Heisenberg group H3) and SL̃₂(ℝ) into a single continuous family
 * parameterized by the base Gaussian curvature kappa <= 0 and torsion c >= 0.
 * 
 * Metric tensor on D^2 x R:
 *   ds^2 = 4 (dx^2 + dy^2) / (1 + kappa * (x^2 + y^2))^2 + (dz - 2c * (x dy - y dx) / (1 + kappa * (x^2 + y^2)))^2
 * 
 * - When kappa = 0: Pure Nil geometry (Heisenberg group H3)
 * - When kappa < 0: Hyperbolic-Nil geometry (universal cover of SL(2, R))
 * - When c = 0 and kappa < 0: Pure direct product H^2 x R
 * - When c = 0 and kappa = 0: Flat Euclidean space E^3
 */

export interface HyperbolicNilConfig {
  kappa: number; // Base Gaussian curvature (0 for Nil, -1 for SL̃₂(ℝ))
  torsion: number; // Fiber twist constant c
}

export class HyperbolicNilSpace {
  public kappa: number;
  public torsion: number;

  constructor(kappa: number = 0.0, torsion: number = 1.0) {
    this.kappa = Math.min(0.0, kappa); // Only non-positive base curvatures
    this.torsion = torsion;
  }

  /**
   * Conformal factor lambda(r) = 2 / (1 + kappa * r^2)
   */
  public conformalFactor(x: number, y: number): number {
    const r2 = x * x + y * y;
    const denom = 1.0 + this.kappa * r2;
    if (Math.abs(denom) < 1e-6) return 2.0;
    return 2.0 / denom;
  }

  /**
   * Evaluates the Riemannian metric tensor g_ij at point (x, y, z)
   * Returns components [g_xx, g_yy, g_zz, g_xy, g_xz, g_yz]
   */
  public metricTensor(x: number, y: number): {
    gxx: number;
    gyy: number;
    gzz: number;
    gxy: number;
    gxz: number;
    gyz: number;
  } {
    const lambda = this.conformalFactor(x, y);
    const lambda2 = lambda * lambda;

    // Contact 1-form theta = dz - c * lambda * (x dy - y dx)
    // theta_z = 1
    // theta_x = +c * lambda * y
    // theta_y = -c * lambda * x
    const tx = this.torsion * lambda * y;
    const ty = -this.torsion * lambda * x;

    const gxx = lambda2 + tx * tx;
    const gyy = lambda2 + ty * ty;
    const gzz = 1.0;
    const gxy = tx * ty;
    const gxz = tx;
    const gyz = ty;

    return { gxx, gyy, gzz, gxy, gxz, gyz };
  }

  /**
   * Evaluates the squared norm of a tangent vector v at point p = (x, y, z)
   */
  public normSquared(
    x: number,
    y: number,
    vx: number,
    vy: number,
    vz: number
  ): number {
    const lambda = this.conformalFactor(x, y);
    const baseNorm2 = lambda * lambda * (vx * vx + vy * vy);
    const contactForm = vz - this.torsion * lambda * (x * vy - y * vx);
    return baseNorm2 + contactForm * contactForm;
  }

  /**
   * Computes the holonomy shift Delta z for a triangle in the base geometry.
   * In H^2 (kappa = -1), by Gauss-Bonnet: Area = (pi - (alpha + beta + gamma)) / |kappa|.
   * In E^2 (kappa = 0), Area = 0.5 * base * height.
   * Holonomy is always: Delta z = c * Area(Loop).
   */
  public computeHolonomyFromArea(baseArea: number): number {
    return this.torsion * baseArea;
  }

  /**
   * Classifies the geometry manifold based on (kappa, c)
   */
  public classify(): string {
    if (this.kappa === 0) {
      if (this.torsion === 0) return 'Euclidean E³';
      return 'Nil Geometry (Heisenberg Group H₃)';
    } else {
      if (this.torsion === 0) return 'Hyperbolic Product ℍ² × ℝ';
      return 'Hyperbolic-Nil Space (SL̃₂(ℝ))';
    }
  }
}
