import type { HypergraphState } from '../hypergraph/types';
import { SmoothCameraController } from './cameraController';
import {
  RAYMARCH_VERTEX_SHADER,
  RAYMARCH_FRAGMENT_SHADER,
  INSTANCED_NODE_VERT,
  INSTANCED_NODE_FRAG,
  EDGE_VERT,
  EDGE_FRAG,
  createShaderProgram
} from './shaders';

export type RenderMode = 'raymarch' | 'raster';

export class NilRenderPipeline {
  public container: HTMLElement;
  public canvas: HTMLCanvasElement;
  public gl: WebGL2RenderingContext | null = null;
  public cameraController: SmoothCameraController;

  public renderMode: RenderMode = 'raymarch';
  public onPerformanceUpdate: ((fps: number, frameTimeMs: number) => void) | null = null;

  // Cached state
  private currentState: HypergraphState | null = null;
  private startTime = performance.now();
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fpsAccumTime = 0;

  // Shader Programs
  private raymarchProgram: WebGLProgram | null = null;
  private nodeProgram: WebGLProgram | null = null;
  private edgeProgram: WebGLProgram | null = null;

  // Uniform Locations - Raymarch
  private uRaymarchRes: WebGLUniformLocation | null = null;
  private uRaymarchTime: WebGLUniformLocation | null = null;
  private uRaymarchCamPos: WebGLUniformLocation | null = null;
  private uRaymarchInvViewProj: WebGLUniformLocation | null = null;
  private uRaymarchTorsion: WebGLUniformLocation | null = null;
  private uRaymarchNumTriangles: WebGLUniformLocation | null = null;
  private uRaymarchSelTri: WebGLUniformLocation | null = null;
  private uRaymarchHovTri: WebGLUniformLocation | null = null;
  private uRaymarchSelNode: WebGLUniformLocation | null = null;
  private uRaymarchTriangles: WebGLUniformLocation | null = null;
  private uRaymarchNumNodes: WebGLUniformLocation | null = null;
  private uRaymarchNodes: WebGLUniformLocation | null = null;

  // Uniform Locations - Raster
  private uNodeViewProj: WebGLUniformLocation | null = null;
  private uNodeSelNode: WebGLUniformLocation | null = null;
  private uNodeActiveTri: WebGLUniformLocation | null = null;
  private uEdgeViewProj: WebGLUniformLocation | null = null;
  private uEdgeActiveTri: WebGLUniformLocation | null = null;

  // Buffers & VAOs
  private quadVAO: WebGLVertexArrayObject | null = null;
  private nodeVAO: WebGLVertexArrayObject | null = null;
  private nodeSphereVBO: WebGLBuffer | null = null;
  private nodeInstancePosVBO: WebGLBuffer | null = null;
  private nodeInstancePropsVBO: WebGLBuffer | null = null;
  private nodeIndexBuffer: WebGLBuffer | null = null;
  private nodeIndexCount = 0;

  private edgeVAO: WebGLVertexArrayObject | null = null;
  private edgePosVBO: WebGLBuffer | null = null;
  private edgeInfoVBO: WebGLBuffer | null = null;
  private edgeVertexCount = 0;

  // Pre-allocated flat uniform arrays to avoid GC
  private packedTriangles = new Float32Array(80 * 4);
  private packedNodes = new Float32Array(96 * 4);

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    // Camera
    this.cameraController = new SmoothCameraController(this.canvas);

    // WebGL2 Context initialization with graceful headless fallback
    try {
      this.gl = this.canvas.getContext('webgl2', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      if (this.gl) {
        this.initGL();
      } else {
        console.warn('WebGL2 not supported, falling back to experimental-webgl2 or stub');
      }
    } catch (e) {
      console.warn('WebGL2 initialization error:', e);
    }

    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  private initGL(): void {
    const gl = this.gl;
    if (!gl) return;

    gl.clearColor(0.024, 0.035, 0.075, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    try {
      // 1. Raymarching Program
      this.raymarchProgram = createShaderProgram(gl, RAYMARCH_VERTEX_SHADER, RAYMARCH_FRAGMENT_SHADER);
      this.uRaymarchRes = gl.getUniformLocation(this.raymarchProgram, 'u_resolution');
      this.uRaymarchTime = gl.getUniformLocation(this.raymarchProgram, 'u_time');
      this.uRaymarchCamPos = gl.getUniformLocation(this.raymarchProgram, 'u_cameraPos');
      this.uRaymarchInvViewProj = gl.getUniformLocation(this.raymarchProgram, 'u_invViewProj');
      this.uRaymarchTorsion = gl.getUniformLocation(this.raymarchProgram, 'u_torsion');
      this.uRaymarchNumTriangles = gl.getUniformLocation(this.raymarchProgram, 'u_numTriangles');
      this.uRaymarchSelTri = gl.getUniformLocation(this.raymarchProgram, 'u_selectedTriangleId');
      this.uRaymarchHovTri = gl.getUniformLocation(this.raymarchProgram, 'u_hoveredTriangleId');
      this.uRaymarchSelNode = gl.getUniformLocation(this.raymarchProgram, 'u_selectedNodeId');
      this.uRaymarchTriangles = gl.getUniformLocation(this.raymarchProgram, 'u_triangles[0]');
      this.uRaymarchNumNodes = gl.getUniformLocation(this.raymarchProgram, 'u_numNodes');
      this.uRaymarchNodes = gl.getUniformLocation(this.raymarchProgram, 'u_nodes[0]');

      // 2. Instanced Node Program
      this.nodeProgram = createShaderProgram(gl, INSTANCED_NODE_VERT, INSTANCED_NODE_FRAG);
      this.uNodeViewProj = gl.getUniformLocation(this.nodeProgram, 'u_viewProj');
      this.uNodeSelNode = gl.getUniformLocation(this.nodeProgram, 'u_selectedNodeId');
      this.uNodeActiveTri = gl.getUniformLocation(this.nodeProgram, 'u_activeTriangleId');

      // 3. Edge Program
      this.edgeProgram = createShaderProgram(gl, EDGE_VERT, EDGE_FRAG);
      this.uEdgeViewProj = gl.getUniformLocation(this.edgeProgram, 'u_viewProj');
      this.uEdgeActiveTri = gl.getUniformLocation(this.edgeProgram, 'u_activeTriangleId');

      // Setup Geometry Buffers
      this.setupQuadBuffer();
      this.setupNodeBuffers();
      this.setupEdgeBuffers();
    } catch (e) {
      console.error('Failed to compile shaders:', e);
    }
  }

  private setupQuadBuffer(): void {
    const gl = this.gl;
    if (!gl) return;

    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    const quadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private setupNodeBuffers(): void {
    const gl = this.gl;
    if (!gl) return;

    this.nodeVAO = gl.createVertexArray();
    gl.bindVertexArray(this.nodeVAO);

    // Generate UV Sphere Geometry
    const latBands = 12;
    const lonBands = 16;
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        vertices.push(
          sinTheta * Math.cos(phi),
          sinTheta * Math.sin(phi),
          cosTheta
        );
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    this.nodeIndexCount = indices.length;

    // Unit Sphere VBO (Location 0)
    this.nodeSphereVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeSphereVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Instance Positions VBO (Location 1)
    this.nodeInstancePosVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstancePosVBO);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1); // 1 per instance

    // Instance Props VBO (Location 2)
    this.nodeInstancePropsVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstancePropsVBO);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1); // 1 per instance

    // Index Buffer
    this.nodeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.nodeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }

  private setupEdgeBuffers(): void {
    const gl = this.gl;
    if (!gl) return;

    this.edgeVAO = gl.createVertexArray();
    gl.bindVertexArray(this.edgeVAO);

    this.edgePosVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgePosVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    this.edgeInfoVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeInfoVBO);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
  }

  public setHypergraph(state: HypergraphState): void {
    this.currentState = state;
    this.uploadBuffers();
  }

  public snapToTriangle(triId: number): void {
    if (!this.currentState) return;
    const tri = this.currentState.triangles.find((t) => t.id === triId);
    if (!tri) return;

    this.currentState.selectedTriangleId = triId;
    this.cameraController.animateTo(tri.canonicalCamera, 1100);
  }

  public updateVisualStyles(): void {
    // Shaders consume selected IDs dynamically in real-time
  }

  private uploadBuffers(): void {
    const gl = this.gl;
    if (!gl || !this.currentState) return;

    const { nodes, edges, triangles } = this.currentState;

    // 1. Pack Triangles for Raymarch Shader
    this.packedTriangles.fill(0);
    const numTris = Math.min(triangles.length, 16);
    for (let t = 0; t < numTris; t++) {
      const tri = triangles[t];
      const base = t * 20;
      // [0]: cx, cy, cz, loopArea
      this.packedTriangles[base + 0] = tri.center.x;
      this.packedTriangles[base + 1] = tri.center.y;
      this.packedTriangles[base + 2] = tri.center.z;
      this.packedTriangles[base + 3] = tri.loopArea;

      // [1]: holonomy, sideLength, 0, 0
      this.packedTriangles[base + 4] = tri.holonomyShift;
      this.packedTriangles[base + 5] = tri.sideLength;
      this.packedTriangles[base + 6] = 0;
      this.packedTriangles[base + 7] = 0;

      // [2]: Corner A
      this.packedTriangles[base + 8] = tri.corners[0].x;
      this.packedTriangles[base + 9] = tri.corners[0].y;
      this.packedTriangles[base + 10] = tri.corners[0].z;
      this.packedTriangles[base + 11] = 0;

      // [3]: Corner B
      this.packedTriangles[base + 12] = tri.corners[1].x;
      this.packedTriangles[base + 13] = tri.corners[1].y;
      this.packedTriangles[base + 14] = tri.corners[1].z;
      this.packedTriangles[base + 15] = 0;

      // [4]: Corner C
      this.packedTriangles[base + 16] = tri.corners[2].x;
      this.packedTriangles[base + 17] = tri.corners[2].y;
      this.packedTriangles[base + 18] = tri.corners[2].z;
      this.packedTriangles[base + 19] = 0;
    }

    const instPos = new Float32Array(nodes.length * 4);
    const instProps = new Float32Array(nodes.length * 4);

    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      instPos[n * 4 + 0] = node.x;
      instPos[n * 4 + 1] = node.y;
      instPos[n * 4 + 2] = node.z;
      instPos[n * 4 + 3] = node.triangleId;

      instProps[n * 4 + 0] = node.id;
      instProps[n * 4 + 1] = node.isCorner ? 1.0 : 0.0;
      instProps[n * 4 + 2] = 0.0;
      instProps[n * 4 + 3] = node.isCorner ? 0.32 : (node.triangleId >= 0 ? 0.22 : 0.16);

      if (n < 96) {
        this.packedNodes[n * 4 + 0] = node.x;
        this.packedNodes[n * 4 + 1] = node.y;
        this.packedNodes[n * 4 + 2] = node.z;
        this.packedNodes[n * 4 + 3] = node.triangleId;
      }
    }

    if (this.nodeInstancePosVBO && this.nodeInstancePropsVBO) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstancePosVBO);
      gl.bufferData(gl.ARRAY_BUFFER, instPos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeInstancePropsVBO);
      gl.bufferData(gl.ARRAY_BUFFER, instProps, gl.DYNAMIC_DRAW);
    }

    // 3. Pack Edges for Raster
    const edgePositions = new Float32Array(edges.length * 6);
    const edgeInfo = new Float32Array(edges.length * 8);

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

      const typeCode = edge.type === 'penrose_beam' ? 0 : (edge.type === 'interleave_bridge' ? 1 : 2);
      edgeInfo[i * 8 + 0] = edge.triangleId;
      edgeInfo[i * 8 + 1] = typeCode;
      edgeInfo[i * 8 + 2] = 0;
      edgeInfo[i * 8 + 3] = 0;

      edgeInfo[i * 8 + 4] = edge.triangleId;
      edgeInfo[i * 8 + 5] = typeCode;
      edgeInfo[i * 8 + 6] = 0;
      edgeInfo[i * 8 + 7] = 0;
    }

    this.edgeVertexCount = edges.length * 2;
    if (this.edgePosVBO && this.edgeInfoVBO) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edgePosVBO);
      gl.bufferData(gl.ARRAY_BUFFER, edgePositions, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeInfoVBO);
      gl.bufferData(gl.ARRAY_BUFFER, edgeInfo, gl.DYNAMIC_DRAW);
    }
  }

  public resize(): void {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    this.cameraController.setAspect(w / h);
  }

  public render(): void {
    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Performance tracking
    this.frameCount++;
    this.fpsAccumTime += frameDelta;
    if (this.fpsAccumTime >= 500) {
      const fps = Math.round((this.frameCount * 1000) / this.fpsAccumTime);
      if (this.onPerformanceUpdate) {
        this.onPerformanceUpdate(fps, frameDelta);
      }
      this.frameCount = 0;
      this.fpsAccumTime = 0;
    }

    this.cameraController.update();

    const gl = this.gl;
    if (!gl) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (this.renderMode === 'raymarch' && this.raymarchProgram && this.quadVAO) {
      this.renderRaymarch(now);
    } else if (this.nodeProgram && this.edgeProgram) {
      this.renderRaster();
    }
  }

  private renderRaymarch(timeMs: number): void {
    const gl = this.gl!;
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.raymarchProgram);

    // Uniforms
    gl.uniform2f(this.uRaymarchRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uRaymarchTime, (timeMs - this.startTime) * 0.001);
    gl.uniform3f(this.uRaymarchCamPos, this.cameraController.position.x, this.cameraController.position.y, this.cameraController.position.z);
    gl.uniformMatrix4fv(this.uRaymarchInvViewProj, false, this.cameraController.invViewProjMatrix.elements);

    // Torsion & counts
    const torsion = this.currentState ? 1.0 : 1.0; // dynamic from config
    gl.uniform1f(this.uRaymarchTorsion, torsion);

    const numTriangles = this.currentState ? Math.min(this.currentState.triangles.length, 16) : 0;
    gl.uniform1i(this.uRaymarchNumTriangles, numTriangles);

    const selTri = this.currentState?.selectedTriangleId ?? -1;
    const hovTri = this.currentState?.hoveredTriangleId ?? -1;
    const selNode = this.currentState?.selectedNodeId ?? -1;

    gl.uniform1i(this.uRaymarchSelTri, selTri);
    gl.uniform1i(this.uRaymarchHovTri, hovTri);
    gl.uniform1i(this.uRaymarchSelNode, selNode);

    if (this.uRaymarchTriangles) {
      gl.uniform4fv(this.uRaymarchTriangles, this.packedTriangles);
    }

    const numNodes = this.currentState ? Math.min(this.currentState.nodes.length, 96) : 0;
    gl.uniform1i(this.uRaymarchNumNodes, numNodes);
    if (this.uRaymarchNodes) {
      gl.uniform4fv(this.uRaymarchNodes, this.packedNodes);
    }

    // Draw Quad
    gl.bindVertexArray(this.quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  private renderRaster(): void {
    const gl = this.gl!;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive cyber glow

    const vp = this.cameraController.viewProjMatrix.elements;
    const activeTri = this.currentState?.selectedTriangleId ?? (this.currentState?.hoveredTriangleId ?? -1);
    const selNode = this.currentState?.selectedNodeId ?? -1;

    // 1. Draw Edges
    if (this.edgeProgram && this.edgeVAO && this.edgeVertexCount > 0) {
      gl.useProgram(this.edgeProgram);
      gl.uniformMatrix4fv(this.uEdgeViewProj, false, vp);
      gl.uniform1i(this.uEdgeActiveTri, activeTri);

      gl.bindVertexArray(this.edgeVAO);
      gl.drawArrays(gl.LINES, 0, this.edgeVertexCount);
      gl.bindVertexArray(null);
    }

    // 2. Draw Instanced Nodes
    if (this.nodeProgram && this.nodeVAO && this.currentState && this.currentState.nodes.length > 0) {
      gl.useProgram(this.nodeProgram);
      gl.uniformMatrix4fv(this.uNodeViewProj, false, vp);
      gl.uniform1i(this.uNodeSelNode, selNode);
      gl.uniform1i(this.uNodeActiveTri, activeTri);

      gl.bindVertexArray(this.nodeVAO);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        this.nodeIndexCount,
        gl.UNSIGNED_SHORT,
        0,
        this.currentState.nodes.length
      );
      gl.bindVertexArray(null);
    }

    gl.disable(gl.BLEND);
  }
}
