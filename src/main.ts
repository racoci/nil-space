import './style.css';
import { NilRenderPipeline } from './rendering/pipeline';
import { NilPicker } from './rendering/picking';
import { NilHUD } from './ui/hud';
import { generateNilHypergraph } from './hypergraph/generator';
import type { HypergraphGeneratorConfig, HypergraphState } from './hypergraph/types';
import { initNilWasm } from './wasm/loader';

class HyperbolicNilApp {
  private canvasContainer: HTMLElement;
  private hudContainer: HTMLElement;
  private pipeline: NilRenderPipeline;
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

    // 1. Initialize High-Performance From-Scratch WebGL2 Render Pipeline
    this.pipeline = new NilRenderPipeline(this.canvasContainer);

    // 2. Initialize Screen-Space Raycaster Picker
    this.picker = new NilPicker(this.pipeline);

    // 3. Initialize HUD
    this.hud = new NilHUD(this.hudContainer);

    // 4. Generate initial state
    this.currentState = generateNilHypergraph(this.config);
    this.syncState();

    // 5. Connect event handlers
    this.bindEvents();

    // 6. Connect Realtime Performance Monitor
    this.pipeline.onPerformanceUpdate = (fps, frameTimeMs) => {
      this.hud.updatePerformance(fps, frameTimeMs, this.pipeline.renderMode);
    };

    // 7. Initialize WebAssembly module asynchronously
    initNilWasm().then((loaded) => {
      if (loaded) {
        console.log('⚡ Rust WebAssembly Nil engine activated');
      }
    });

    // 8. Start Real-Time Animation Loop
    this.animate();
  }

  private syncState(): void {
    this.pipeline.setHypergraph(this.currentState);
    this.picker.setState(this.currentState);
    this.hud.setState(this.currentState);
  }

  private bindEvents(): void {
    // Render pipeline mode change (Raymarching vs Instanced)
    this.hud.onRenderModeChange = (mode) => {
      this.pipeline.setRenderMode(mode);
    };

    // Config change from HUD sliders
    this.hud.onConfigChange = (newConfig) => {
      this.config = newConfig;
      this.currentState = generateNilHypergraph(this.config);
      this.syncState();
    };

    // Triangle selection from HUD chips
    this.hud.onSelectTriangle = (triId) => {
      this.pipeline.snapToTriangle(triId);
      this.hud.setState(this.currentState);
    };

    // Camera reset
    this.hud.onResetCamera = () => {
      this.currentState.selectedTriangleId = null;
      this.currentState.selectedNodeId = null;
      this.pipeline.updateVisualStyles();
      this.hud.setState(this.currentState);

      this.pipeline.cameraController.animateTo({
        position: { x: 20, y: -22, z: 18 },
        target: { x: 0, y: 0, z: 0 }
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
    this.pipeline.render();
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
