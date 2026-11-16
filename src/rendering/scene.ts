import * as THREE from 'three';
import type { HypergraphState } from '../hypergraph/types';
import { SmoothCameraController } from './cameraController';

export class NilSceneRenderer {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cameraController: SmoothCameraController;

  // Scene Objects
  private nodeMesh: THREE.InstancedMesh | null = null;
  private edgeLines: THREE.LineSegments | null = null;
  private triangleMembranes: THREE.Mesh[] = [];
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;

  // Cached state & colors
  private currentState: HypergraphState | null = null;
  private dummyMatrix = new THREE.Matrix4();
  private dummyColor = new THREE.Color();

  // Color constants
  private readonly COLOR_NODE_DEFAULT = new THREE.Color(0x00ffff);
  private readonly COLOR_NODE_SELECTED = new THREE.Color(0xffd700);
  private readonly COLOR_NODE_TRIANGLE = new THREE.Color(0x00ffcc);
  private readonly COLOR_EDGE_DEFAULT = new THREE.Color(0x005577);
  private readonly COLOR_EDGE_SELECTED = new THREE.Color(0xffea00);
  private readonly COLOR_EDGE_TRIANGLE = new THREE.Color(0x00e5ff);

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913); // Deep cyber non-Euclidean void

    // Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(20, -22, 18);
    this.camera.up.set(0, 0, 1); // Z is vertical fiber in Nil geometry!
    this.camera.lookAt(0, 0, 0);

    // Renderer setup with graceful fallback for headless/non-WebGL environments
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      container.appendChild(this.renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed, creating placeholder canvas:', e);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = container.clientWidth || 800;
      fallbackCanvas.height = container.clientHeight || 600;
      container.appendChild(fallbackCanvas);
      // Dummy renderer interface
      this.renderer = {
        domElement: fallbackCanvas,
        setSize: () => {},
        setPixelRatio: () => {},
        render: () => {},
        dispose: () => {}
      } as unknown as THREE.WebGLRenderer;
    }

    // Camera Controller
    this.cameraController = new SmoothCameraController(this.camera, this.renderer.domElement);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x223344, 1.5);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0x00ffff, 2.0, 100);
    this.pointLight.position.set(0, 0, 15);
    this.scene.add(this.pointLight);

    // Background particle fog / coordinate dust
    this.createAtmosphericDust();

    // Window resize handler
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createAtmosphericDust(): void {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x1a3355,
      size: 0.25,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
  }

  public setHypergraph(state: HypergraphState): void {
    this.currentState = state;
    this.rebuildMeshes();
  }

  private rebuildMeshes(): void {
    if (!this.currentState) return;

    // Remove existing meshes
    if (this.nodeMesh) {
      this.scene.remove(this.nodeMesh);
      this.nodeMesh.geometry.dispose();
      (this.nodeMesh.material as THREE.Material).dispose();
      this.nodeMesh = null;
    }
    if (this.edgeLines) {
      this.scene.remove(this.edgeLines);
      this.edgeLines.geometry.dispose();
      (this.edgeLines.material as THREE.Material).dispose();
      this.edgeLines = null;
    }
    for (const membrane of this.triangleMembranes) {
      this.scene.remove(membrane);
      membrane.geometry.dispose();
      (membrane.material as THREE.Material).dispose();
    }
    this.triangleMembranes = [];

    const { nodes, edges, triangles } = this.currentState;

    // 1. Build Nodes InstancedMesh
    const sphereGeo = new THREE.SphereGeometry(0.18, 16, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.nodeMesh = new THREE.InstancedMesh(sphereGeo, nodeMat, nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const scale = node.isCorner ? 1.6 : (node.triangleId >= 0 ? 1.1 : 0.85);
      this.dummyMatrix.makeScale(scale, scale, scale);
      this.dummyMatrix.setPosition(node.x, node.y, node.z);
      this.nodeMesh.setMatrixAt(i, this.dummyMatrix);
      this.dummyColor.copy(this.COLOR_NODE_DEFAULT).multiplyScalar(0.4);
      this.nodeMesh.setColorAt(i, this.dummyColor);
    }
    this.nodeMesh.instanceMatrix.needsUpdate = true;
    if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.nodeMesh);

    // 2. Build Edge Lines
    const edgePositions = new Float32Array(edges.length * 6);
    const edgeColors = new Float32Array(edges.length * 6);

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const u = nodes[edge.u];
      const v = nodes[edge.v];

      edgePositions[i * 6 + 0] = u.x;
      edgePositions[i * 6 + 1] = u.y;
      edgePositions[i * 6 + 2] = u.z;
      edgePositions[i * 6 + 3] = v.x;
      edgePositions[i * 6 + 4] = v.y;
      edgePositions[i * 6 + 5] = v.z;

      const col = this.COLOR_EDGE_DEFAULT;
      edgeColors[i * 6 + 0] = col.r * 0.3;
      edgeColors[i * 6 + 1] = col.g * 0.3;
      edgeColors[i * 6 + 2] = col.b * 0.3;
      edgeColors[i * 6 + 3] = col.r * 0.3;
      edgeColors[i * 6 + 4] = col.g * 0.3;
      edgeColors[i * 6 + 5] = col.b * 0.3;
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    this.scene.add(this.edgeLines);

    // 3. Build Translucent Membranes for Penrose Triangles
    for (const tri of triangles) {
      const membraneGeo = new THREE.BufferGeometry();
      const pos = new Float32Array([
        tri.corners[0].x, tri.corners[0].y, tri.corners[0].z,
        tri.corners[1].x, tri.corners[1].y, tri.corners[1].z,
        tri.corners[2].x, tri.corners[2].y, tri.corners[2].z,
        // Double-sided backface
        tri.corners[0].x, tri.corners[0].y, tri.corners[0].z,
        tri.corners[2].x, tri.corners[2].y, tri.corners[2].z,
        tri.corners[1].x, tri.corners[1].y, tri.corners[1].z,
      ]);
      membraneGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      membraneGeo.computeVertexNormals();

      const membraneMat = new THREE.MeshBasicMaterial({
        color: 0x00ffee,
        transparent: true,
        opacity: 0.05,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
      membraneMesh.userData = { triangleId: tri.id };
      this.triangleMembranes.push(membraneMesh);
      this.scene.add(membraneMesh);
    }

    this.updateVisualStyles();
  }

  /**
   * Updates visual brightness, glow, and opacity depending on selection and hover
   */
  public updateVisualStyles(): void {
    if (!this.currentState || !this.nodeMesh || !this.edgeLines) return;

    const { nodes, edges, selectedTriangleId, selectedNodeId, selectedEdgeId, hoveredTriangleId, hoveredNodeId } = this.currentState;
    const activeTri = selectedTriangleId !== null ? selectedTriangleId : hoveredTriangleId;

    // Update Nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isSelectedNode = selectedNodeId === node.id || hoveredNodeId === node.id;
      const isInActiveTriangle = activeTri !== null && node.triangleId === activeTri;

      let scale = node.isCorner ? 1.6 : (node.triangleId >= 0 ? 1.1 : 0.85);
      if (isSelectedNode) {
        scale *= 2.0;
        this.dummyColor.copy(this.COLOR_NODE_SELECTED);
      } else if (isInActiveTriangle) {
        scale *= 1.5;
        this.dummyColor.copy(this.COLOR_NODE_TRIANGLE);
      } else if (activeTri !== null) {
        // Dim unselected nodes
        scale *= 0.75;
        this.dummyColor.copy(this.COLOR_NODE_DEFAULT).multiplyScalar(0.08);
      } else {
        this.dummyColor.copy(this.COLOR_NODE_DEFAULT).multiplyScalar(0.35);
      }

      this.dummyMatrix.makeScale(scale, scale, scale);
      this.dummyMatrix.setPosition(node.x, node.y, node.z);
      this.nodeMesh.setMatrixAt(i, this.dummyMatrix);
      this.nodeMesh.setColorAt(i, this.dummyColor);
    }

    this.nodeMesh.instanceMatrix.needsUpdate = true;
    if (this.nodeMesh.instanceColor) this.nodeMesh.instanceColor.needsUpdate = true;

    // Update Edges
    const colorAttr = this.edgeLines.geometry.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const isInActiveTriangle = activeTri !== null && edge.triangleId === activeTri;
      const isSelectedEdge = selectedEdgeId === edge.id;

      let col = this.COLOR_EDGE_DEFAULT;
      let intensity = 0.3;

      if (isSelectedEdge) {
        col = this.COLOR_EDGE_SELECTED;
        intensity = 2.0;
      } else if (isInActiveTriangle) {
        col = this.COLOR_EDGE_TRIANGLE;
        intensity = 1.5;
      } else if (activeTri !== null) {
        // Deeply dim unselected edges
        intensity = 0.05;
      }

      colorAttr.setXYZ(i * 2 + 0, col.r * intensity, col.g * intensity, col.b * intensity);
      colorAttr.setXYZ(i * 2 + 1, col.r * intensity, col.g * intensity, col.b * intensity);
    }
    colorAttr.needsUpdate = true;

    // Update Triangle Membranes
    for (const membrane of this.triangleMembranes) {
      const triId = membrane.userData.triangleId;
      const mat = membrane.material as THREE.MeshBasicMaterial;
      if (triId === activeTri) {
        mat.opacity = 0.35;
        mat.color.set(0x00ffcc);
      } else if (activeTri !== null) {
        mat.opacity = 0.01;
      } else {
        mat.opacity = 0.04;
        mat.color.set(0x00ffee);
      }
    }
  }

  /**
   * Snaps camera view to canonical impossible triangle alignment
   */
  public snapToTriangle(triId: number): void {
    if (!this.currentState) return;
    const tri = this.currentState.triangles.find(t => t.id === triId);
    if (!tri) return;

    this.currentState.selectedTriangleId = triId;
    this.updateVisualStyles();

    this.cameraController.animateTo({
      position: new THREE.Vector3(tri.canonicalCamera.position.x, tri.canonicalCamera.position.y, tri.canonicalCamera.position.z),
      target: new THREE.Vector3(tri.canonicalCamera.target.x, tri.canonicalCamera.target.y, tri.canonicalCamera.target.z)
    }, 1200);
  }

  private onWindowResize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public render(): void {
    this.cameraController.update();
    this.renderer.render(this.scene, this.camera);
  }
}
