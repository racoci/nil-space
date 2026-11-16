import * as THREE from 'three';
import type { NilSceneRenderer } from './scene';
import type { HypergraphState } from '../hypergraph/types';

export class NilPicker {
  private renderer: NilSceneRenderer;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private state: HypergraphState | null = null;
  public onSelectionChange: ((state: HypergraphState) => void) | null = null;

  constructor(renderer: NilSceneRenderer) {
    this.renderer = renderer;
    this.raycaster.params.Points = { threshold: 0.5 };
    this.raycaster.params.Line = { threshold: 0.3 };

    this.setupListeners();
  }

  public setState(state: HypergraphState): void {
    this.state = state;
  }

  private setupListeners(): void {
    const dom = this.renderer.renderer.domElement;

    dom.addEventListener('pointermove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.handleHover();
    });

    dom.addEventListener('click', (e) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.handleClick();
    });
  }

  private handleHover(): void {
    if (!this.state) return;
    this.raycaster.setFromCamera(this.pointer, this.renderer.camera);

    // Raycast against triangles and nodes
    let hoveredTriId: number | null = null;
    let hoveredNodeId: number | null = null;

    // Check intersection with triangle membranes
    const intersects = this.raycaster.intersectObjects(this.renderer.scene.children, false);
    for (const hit of intersects) {
      if (hit.object.userData && typeof hit.object.userData.triangleId === 'number') {
        hoveredTriId = hit.object.userData.triangleId;
        break;
      }
    }

    // Check closest node proximity
    const ray = this.raycaster.ray;
    let minDistance = 0.6;
    for (const node of this.state.nodes) {
      const nodePos = new THREE.Vector3(node.x, node.y, node.z);
      const dist = ray.distanceToPoint(nodePos);
      if (dist < minDistance) {
        minDistance = dist;
        hoveredNodeId = node.id;
        if (node.triangleId >= 0 && hoveredTriId === null) {
          hoveredTriId = node.triangleId;
        }
      }
    }

    if (this.state.hoveredTriangleId !== hoveredTriId || this.state.hoveredNodeId !== hoveredNodeId) {
      this.state.hoveredTriangleId = hoveredTriId;
      this.state.hoveredNodeId = hoveredNodeId;
      this.renderer.updateVisualStyles();
    }
  }

  private handleClick(): void {
    if (!this.state) return;
    this.raycaster.setFromCamera(this.pointer, this.renderer.camera);

    let clickedTriId: number | null = null;
    let clickedNodeId: number | null = null;

    // 1. Check membranes
    const intersects = this.raycaster.intersectObjects(this.renderer.scene.children, false);
    for (const hit of intersects) {
      if (hit.object.userData && typeof hit.object.userData.triangleId === 'number') {
        clickedTriId = hit.object.userData.triangleId;
        break;
      }
    }

    // 2. Check closest node
    const ray = this.raycaster.ray;
    let minDistance = 0.7;
    for (const node of this.state.nodes) {
      const nodePos = new THREE.Vector3(node.x, node.y, node.z);
      const dist = ray.distanceToPoint(nodePos);
      if (dist < minDistance) {
        minDistance = dist;
        clickedNodeId = node.id;
        if (node.triangleId >= 0) {
          clickedTriId = node.triangleId;
        }
      }
    }

    if (clickedTriId !== null) {
      // Toggle or select triangle
      if (this.state.selectedTriangleId === clickedTriId) {
        this.state.selectedTriangleId = null;
        this.state.selectedNodeId = null;
        this.renderer.updateVisualStyles();
      } else {
        this.renderer.snapToTriangle(clickedTriId);
      }
    } else if (clickedNodeId !== null) {
      this.state.selectedNodeId = clickedNodeId;
      this.state.selectedTriangleId = null;
      this.renderer.updateVisualStyles();
    } else {
      // Deselect all
      this.state.selectedTriangleId = null;
      this.state.selectedNodeId = null;
      this.renderer.updateVisualStyles();
    }

    if (this.onSelectionChange) {
      this.onSelectionChange(this.state);
    }
  }
}
