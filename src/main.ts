import './style.css';
import { NilSceneRenderer } from './rendering/scene';
import { NilPicker } from './rendering/picking';
import { NilHUD } from './ui/hud';
import { generateNilHypergraph } from './hypergraph/generator';
import type { HypergraphGeneratorConfig, HypergraphState } from './hypergraph/types';
import * as THREE from 'three';

class HyperbolicNilApp {
  private canvasContainer: HTMLElement;
  private hudContainer: HTMLElement;
  private sceneRenderer: NilSceneRenderer;
  private picker: NilPicker;
  private hud: NilHUD;
  private currentState: HypergraphState;

  private config: HypergraphGeneratorConfig = {
    numTriangles: 6,
    sideLength: 5.0,
    torsion: 1.0,
    randomDensity: 0.5,
    seed: 42,
    spacingFactor: 1.0
  };

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.hudContainer = document.getElementById('hud-container')!;

    // 1. Initialize Scene & Renderer
    this.sceneRenderer = new NilSceneRenderer(this.canvasContainer);

    // 2. Initialize Picker
    this.picker = new NilPicker(this.sceneRenderer);

    // 3. Initialize HUD
    this.hud = new NilHUD(this.hudContainer);

    // 4. Generate initial state
    this.currentState = generateNilHypergraph(this.config);
    this.syncState();

    // 5. Connect event handlers
    this.bindEvents();

    // 6. Start animation loop
    this.animate();
  }

  private syncState(): void {
    this.sceneRenderer.setHypergraph(this.currentState);
    this.picker.setState(this.currentState);
    this.hud.setState(this.currentState);
  }

  private bindEvents(): void {
    // Config change from HUD sliders
    this.hud.onConfigChange = (newConfig) => {
      this.config = newConfig;
      this.currentState = generateNilHypergraph(this.config);
      this.syncState();
    };

    // Triangle selection from HUD chips
    this.hud.onSelectTriangle = (triId) => {
      this.sceneRenderer.snapToTriangle(triId);
      this.hud.setState(this.currentState);
    };

    // Camera reset
    this.hud.onResetCamera = () => {
      this.currentState.selectedTriangleId = null;
      this.currentState.selectedNodeId = null;
      this.sceneRenderer.updateVisualStyles();
      this.hud.setState(this.currentState);

      this.sceneRenderer.cameraController.animateTo({
        position: new THREE.Vector3(20, -22, 18),
        target: new THREE.Vector3(0, 0, 0)
      }, 1000);
    };

    // 3D Canvas picking selection
    this.picker.onSelectionChange = (updatedState) => {
      this.currentState = updatedState;
      this.hud.setState(this.currentState);
    };
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.sceneRenderer.render();
  };
}

// Bootstrap safely regardless of document readyState
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    new HyperbolicNilApp();
  });
} else {
  new HyperbolicNilApp();
}
