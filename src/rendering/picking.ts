import type { HypergraphState } from '../hypergraph/types';
import type { NilRenderPipeline } from './pipeline';
import { Ray3 } from './math';

/**
 * Zero-dependency Screen-Space Raycaster & Nil Interaction Picker
 */
export class NilPicker {
  private pipeline: NilRenderPipeline;
  private state: HypergraphState | null = null;
  private ray = new Ray3();
  private pointerNdc = { x: 0, y: 0 };
  public onSelectionChange: ((state: HypergraphState) => void) | null = null;

  constructor(pipeline: NilRenderPipeline) {
    this.pipeline = pipeline;
    this.setupListeners();
  }

  public setState(state: HypergraphState): void {
    this.state = state;
  }

  private setupListeners(): void {
    const dom = this.pipeline.canvas;

    dom.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.pointerNdc.x = (x / rect.width) * 2.0 - 1.0;
      this.pointerNdc.y = -((y / rect.height) * 2.0 - 1.0);

      this.handleHover();
    });

    dom.addEventListener('click', () => {
      this.handleClick();
    });
  }

  private updateRay(): void {
    this.ray.setFromCamera(
      this.pointerNdc.x,
      this.pointerNdc.y,
      this.pipeline.cameraController.invViewProjMatrix
    );
  }

  private handleHover(): void {
    if (!this.state) return;
    this.updateRay();

    let hoveredTriId: number | null = null;
    let hoveredNodeId: number | null = null;

    // 1. Raycast against triangle membranes
    let closestTriDist = Infinity;
    for (const tri of this.state.triangles) {
      const hitDist = this.ray.intersectTriangle(tri.corners[0], tri.corners[1], tri.corners[2]);
      if (hitDist !== null && hitDist < closestTriDist) {
        closestTriDist = hitDist;
        hoveredTriId = tri.id;
      }
    }

    // 2. Proximity against nodes
    let minNodeDist = 0.65;
    for (const node of this.state.nodes) {
      const dist = this.ray.distanceToPoint(node);
      if (dist < minNodeDist) {
        minNodeDist = dist;
        hoveredNodeId = node.id;
        if (node.triangleId >= 0 && hoveredTriId === null) {
          hoveredTriId = node.triangleId;
        }
      }
    }

    if (
      this.state.hoveredTriangleId !== hoveredTriId ||
      this.state.hoveredNodeId !== hoveredNodeId
    ) {
      this.state.hoveredTriangleId = hoveredTriId;
      this.state.hoveredNodeId = hoveredNodeId;
      this.pipeline.updateVisualStyles();

      if (this.onSelectionChange) {
        this.onSelectionChange(this.state);
      }
    }
  }

  private handleClick(): void {
    if (!this.state) return;
    this.updateRay();

    let clickedTriId: number | null = null;
    let clickedNodeId: number | null = null;

    // 1. Intersect triangle membranes
    let closestTriDist = Infinity;
    for (const tri of this.state.triangles) {
      const hitDist = this.ray.intersectTriangle(tri.corners[0], tri.corners[1], tri.corners[2]);
      if (hitDist !== null && hitDist < closestTriDist) {
        closestTriDist = hitDist;
        clickedTriId = tri.id;
      }
    }

    // 2. Check closest node
    let minDistance = 0.75;
    for (const node of this.state.nodes) {
      const dist = this.ray.distanceToPoint(node);
      if (dist < minDistance) {
        minDistance = dist;
        clickedNodeId = node.id;
        if (node.triangleId >= 0 && clickedTriId === null) {
          clickedTriId = node.triangleId;
        }
      }
    }

    if (clickedTriId !== null) {
      if (this.state.selectedTriangleId === clickedTriId) {
        this.state.selectedTriangleId = null;
        this.state.selectedNodeId = null;
        this.pipeline.updateVisualStyles();
      } else {
        this.pipeline.snapToTriangle(clickedTriId);
      }
    } else if (clickedNodeId !== null) {
      this.state.selectedNodeId = clickedNodeId;
      this.state.selectedTriangleId = null;
      this.pipeline.updateVisualStyles();
    } else {
      this.state.selectedTriangleId = null;
      this.state.selectedNodeId = null;
      this.pipeline.updateVisualStyles();
    }

    if (this.onSelectionChange) {
      this.onSelectionChange(this.state);
    }
  }
}
