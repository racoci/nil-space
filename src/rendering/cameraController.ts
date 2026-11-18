import { Vec3, Mat4 } from './math';

export interface CameraTarget {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

/**
 * High-Precision Zero-Dependency Smooth Camera Controller
 * Supports smooth spherical orbiting, planar panning, scroll zooming, and canonical vantage tweening.
 */
export class SmoothCameraController {
  public position: Vec3;
  public target: Vec3;
  public up: Vec3;
  public fov: number = 45; // degrees
  public aspect: number = 1.0;
  public near: number = 0.1;
  public far: number = 1000.0;

  public viewMatrix = new Mat4();
  public projectionMatrix = new Mat4();
  public viewProjMatrix = new Mat4();
  public invViewProjMatrix = new Mat4();

  public domElement: HTMLElement;

  private isDragging = false;
  private isPanning = false;
  private previousMousePosition = { x: 0, y: 0 };

  // Spherical Coordinates around target
  private radius = 34.0;
  private theta = 0.85; // Azimuth
  private phi = 1.15;   // Elevation

  // Animation interpolation state
  private animating = false;
  private animStartTime = 0;
  private animDuration = 1000;
  private startPos = new Vec3();
  private startTarget = new Vec3();
  private destPos = new Vec3();
  private destTarget = new Vec3();

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.position = new Vec3(20, -22, 18);
    this.target = new Vec3(0, 0, 0);
    this.up = new Vec3(0, 0, 1); // Z is vertical in Nil geometry!

    this.syncSphericalFromPosition();
    this.updateMatrices();
    this.setupListeners();
  }

  private syncSphericalFromPosition(): void {
    const dx = this.position.x - this.target.x;
    const dy = this.position.y - this.target.y;
    const dz = this.position.z - this.target.z;

    this.radius = Math.hypot(dx, dy, dz);
    if (this.radius < 1e-5) this.radius = 1.0;

    this.phi = Math.acos(Math.max(-1.0, Math.min(1.0, dz / this.radius)));
    this.theta = Math.atan2(dy, dx);
  }

  private updatePositionFromSpherical(): void {
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);

    this.position.set(
      this.target.x + this.radius * sinPhi * cosTheta,
      this.target.y + this.radius * sinPhi * sinTheta,
      this.target.z + this.radius * cosPhi
    );
  }

  public setAspect(aspect: number): void {
    this.aspect = aspect;
    this.updateMatrices();
  }

  public updateMatrices(): void {
    const fovyRad = (this.fov * Math.PI) / 180.0;
    this.projectionMatrix.perspective(fovyRad, this.aspect, this.near, this.far);
    this.viewMatrix.lookAt(this.position, this.target, this.up);
    this.viewProjMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
    this.invViewProjMatrix.copy(this.viewProjMatrix).invert();
  }

  private setupListeners(): void {
    this.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 0) {
        this.isDragging = true;
      } else if (e.button === 2) {
        this.isPanning = true;
      }
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      if (this.isDragging) {
        this.animating = false;
        const rotSpeed = 0.006;
        this.theta -= deltaX * rotSpeed;
        this.phi = Math.max(0.08, Math.min(Math.PI - 0.08, this.phi - deltaY * rotSpeed));
        this.updatePositionFromSpherical();
        this.updateMatrices();
      } else if (this.isPanning) {
        this.animating = false;
        const panSpeed = 0.022 * (this.radius / 25.0);

        // Camera right vector = normalize(cross(forward, up))
        const fwd = new Vec3(this.target.x - this.position.x, this.target.y - this.position.y, this.target.z - this.position.z).normalize();
        const right = new Vec3().copy(fwd).cross(this.up).normalize();
        const camUp = new Vec3().copy(right).cross(fwd).normalize();

        const pan = new Vec3()
          .copy(right).scale(-deltaX * panSpeed)
          .add(new Vec3().copy(camUp).scale(deltaY * panSpeed));

        this.position.add(pan);
        this.target.add(pan);
        this.updateMatrices();
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    this.domElement.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.animating = false;
      const zoomFactor = Math.exp(e.deltaY * 0.001);
      this.radius = Math.max(2.0, Math.min(180.0, this.radius * zoomFactor));
      this.updatePositionFromSpherical();
      this.updateMatrices();
    }, { passive: false });

    this.domElement.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  /**
   * Smoothly interpolates the camera to a canonical vantage angle
   */
  public animateTo(dest: CameraTarget, durationMs: number = 1000): void {
    this.animating = true;
    this.animStartTime = performance.now();
    this.animDuration = durationMs;

    this.startPos.copy(this.position);
    this.startTarget.copy(this.target);
    this.destPos.set(dest.position.x, dest.position.y, dest.position.z);
    this.destTarget.set(dest.target.x, dest.target.y, dest.target.z);
  }

  public update(): void {
    if (!this.animating) return;

    const elapsed = performance.now() - this.animStartTime;
    const progress = Math.min(1.0, elapsed / this.animDuration);

    // Smooth cubic ease-in-out
    const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.position.x = this.startPos.x + (this.destPos.x - this.startPos.x) * t;
    this.position.y = this.startPos.y + (this.destPos.y - this.startPos.y) * t;
    this.position.z = this.startPos.z + (this.destPos.z - this.startPos.z) * t;

    this.target.x = this.startTarget.x + (this.destTarget.x - this.startTarget.x) * t;
    this.target.y = this.startTarget.y + (this.destTarget.y - this.startTarget.y) * t;
    this.target.z = this.startTarget.z + (this.destTarget.z - this.startTarget.z) * t;

    this.syncSphericalFromPosition();
    this.updateMatrices();

    if (progress >= 1.0) {
      this.animating = false;
    }
  }
}
