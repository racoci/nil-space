import * as THREE from 'three';

export interface CameraTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class SmoothCameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3;
  public domElement: HTMLElement;

  private isDragging = false;
  private isPanning = false;
  private previousMousePosition = { x: 0, y: 0 };

  // Animation interpolation state
  private animating = false;
  private animStartTime = 0;
  private animDuration = 1000; // ms
  private startPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private destPos = new THREE.Vector3();
  private destTarget = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);

    this.setupListeners();
  }

  private setupListeners(): void {
    this.domElement.addEventListener('pointerdown', (e) => {
      this.isDragging = e.button === 0;
      this.isPanning = e.button === 2;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      if (this.animating) {
        this.animating = false; // User interrupt cancels animation
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging && !this.isPanning) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.isDragging) {
        // Orbit around target
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
        const radius = offset.length();

        let theta = Math.atan2(offset.x, offset.y);
        let phi = Math.acos(Math.max(-1, Math.min(1, offset.z / radius)));

        theta -= deltaX * 0.007;
        phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi - deltaY * 0.007));

        offset.x = radius * Math.sin(phi) * Math.sin(theta);
        offset.y = radius * Math.sin(phi) * Math.cos(theta);
        offset.z = radius * Math.cos(phi);

        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
      } else if (this.isPanning) {
        // Pan in camera plane
        const panSpeed = 0.012;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const panOffset = right.clone().multiplyScalar(-deltaX * panSpeed)
          .add(up.clone().multiplyScalar(deltaY * panSpeed));

        this.camera.position.add(panOffset);
        this.target.add(panOffset);
        this.camera.lookAt(this.target);
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
      offset.multiplyScalar(zoomFactor);
      if (offset.length() > 1.0 && offset.length() < 300.0) {
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
      }
    }, { passive: false });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Smoothly interpolates the camera to a canonical vantage angle
   */
  animateTo(dest: CameraTarget, durationMs: number = 1000): void {
    this.startPos.copy(this.camera.position);
    this.startTarget.copy(this.target);
    this.destPos.copy(dest.position);
    this.destTarget.copy(dest.target);

    this.animDuration = durationMs;
    this.animStartTime = performance.now();
    this.animating = true;
  }

  update(): void {
    if (!this.animating) return;

    const now = performance.now();
    const elapsed = now - this.animStartTime;
    const progress = Math.min(1.0, elapsed / this.animDuration);

    // Smooth cubic ease-in-out
    const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.camera.position.lerpVectors(this.startPos, this.destPos, t);
    this.target.lerpVectors(this.startTarget, this.destTarget, t);
    this.camera.lookAt(this.target);

    if (progress >= 1.0) {
      this.animating = false;
    }
  }
}
