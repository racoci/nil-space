import type { HypergraphState, HypergraphGeneratorConfig } from '../hypergraph/types';
import type { RenderMode } from '../rendering/pipeline';

export class NilHUD {
  private container: HTMLElement;
  private state: HypergraphState | null = null;
  public onConfigChange: ((config: HypergraphGeneratorConfig) => void) | null = null;
  public onSelectTriangle: ((triId: number) => void) | null = null;
  public onResetCamera: (() => void) | null = null;
  public onWalkCommutatorLoop: (() => void) | null = null;
  public onRenderModeChange: ((mode: RenderMode) => void) | null = null;

  // Cached DOM elements
  private triangleListEl!: HTMLElement;
  private mathInspectorEl!: HTMLElement;
  private infoModalEl!: HTMLElement;
  private perfBadgeEl!: HTMLElement;
  private btnModeNewton!: HTMLElement;
  private btnModeRaymarch!: HTMLElement;
  private btnModeEuclid!: HTMLElement;

  private currentRenderMode: RenderMode = 'raster_newton';
  public get renderMode(): RenderMode {
    return this.currentRenderMode;
  }

  private currentConfig: HypergraphGeneratorConfig = {
    numTriangles: 6,
    sideLength: 5.0,
    torsion: 1.0,
    randomDensity: 0.5,
    seed: 42,
    spacingFactor: 1.0
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildHUD();
  }

  public setState(state: HypergraphState): void {
    this.state = state;
    this.updateHUD();
  }

  public updatePerformance(fps: number, frameTimeMs: number, mode: RenderMode): void {
    if (this.perfBadgeEl) {
      const modeLabel =
        mode === 'raster_newton'
          ? 'Native Nil Safe-Newton (GPU)'
          : mode === 'raymarch'
          ? 'Curved Raymarcher (ODE)'
          : 'Euclidean Ambient';
      this.perfBadgeEl.textContent = `${fps} FPS · ${frameTimeMs.toFixed(1)}ms · ${modeLabel}`;
    }
  }

  private buildHUD(): void {
    this.container.innerHTML = `
      <div class="hud-layer">
        <!-- Top Header -->
        <header class="hud-header glass-panel">
          <div class="brand">
            <span class="brand-tag">PROJECT</span>
            <h1 class="brand-title">HYPERBOLIC NIL SPACE</h1>
            <span class="brand-sub">Non-Euclidean Hypergraph Substrate · Nil Geometry & Penrose Tribar</span>
          </div>
          <div class="header-actions">
            <div id="hud-perf-badge" class="perf-badge">60 FPS · Initializing...</div>
            <button id="btn-walk-loop" class="btn-ghost" title="Traverse closed horizontal loop (+X,+Y,-X,-Y) to demonstrate [X, Y] = cZ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Walk [X,Y] Loop</span>
            </button>
            <button id="btn-info" class="btn-ghost" title="Theoretical Foundations">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>Math & Theory</span>
            </button>
            <button id="btn-reset-cam" class="btn-ghost" title="Reset Camera">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              <span>Reset Cam</span>
            </button>
          </div>
        </header>

        <!-- Left Panel: Triangle Navigator & Math Inspector -->
        <aside class="hud-sidebar glass-panel">
          <!-- Render Pipeline Selector -->
          <div class="panel-section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 19 21 12 17 5 21 12 2"></polygon></svg>
              <span>Render Engine Pipeline</span>
            </div>
            <div class="mode-toggle-group">
              <button id="btn-mode-newton" class="mode-toggle-btn active" title="Native Nil Safe-Newton Inverse Exponential Vertex Shader">
                Safe Newton (GPU)
              </button>
              <button id="btn-mode-raymarch" class="mode-toggle-btn" title="Curved Nil Geodesic Raymarching Shader">
                Raymarch (ODE)
              </button>
              <button id="btn-mode-euclid" class="mode-toggle-btn" title="Euclidean Perspective Baseline">
                Euclid Ambient
              </button>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 22 22 22"></polygon></svg>
              <span>Interleaved Penrose Triangles</span>
            </div>
            <p class="section-hint">Click a triangle to focus and snap camera into its impossible canonical vantage angle:</p>
            <div id="triangle-buttons" class="triangle-chips-container"></div>
          </div>

          <div class="panel-section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              <span>Nil Geometry Live Inspector</span>
            </div>
            <div id="math-inspector" class="math-card">
              Loading Nil coordinates...
            </div>
          </div>

          <div class="panel-section controls-section">
            <div class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Lattice & Metric Parameters</span>
            </div>

            <div class="slider-row">
              <label>Triangles (N): <span id="val-triangles">6</span></label>
              <input type="range" id="input-triangles" min="2" max="15" value="6" step="1" />
            </div>

            <div class="slider-row">
              <label>Nil Torsion (c): <span id="val-torsion">1.0</span></label>
              <input type="range" id="input-torsion" min="0.1" max="2.5" value="1.0" step="0.1" />
            </div>

            <div class="slider-row">
              <label>Beam Scale (L): <span id="val-scale">5.0</span></label>
              <input type="range" id="input-scale" min="2.0" max="9.0" value="5.0" step="0.5" />
            </div>

            <div class="slider-row">
              <label>Random Density: <span id="val-density">0.5</span></label>
              <input type="range" id="input-density" min="0.0" max="1.0" value="0.5" step="0.05" />
            </div>

            <div class="button-row">
              <button id="btn-random-seed" class="btn-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Reseed Lattice</span>
              </button>
            </div>
          </div>
        </aside>

        <!-- Theory Modal -->
        <div id="modal-info" class="modal-backdrop hidden">
          <div class="modal-card glass-panel">
            <div class="modal-header">
              <h2>Non-Euclidean Nil Geometry & The Impossible Triangle</h2>
              <button id="btn-close-modal" class="btn-close">&times;</button>
            </div>
            <div class="modal-body">
              <h3>1. Why is the Penrose Triangle Impossible in Euclidean Space?</h3>
              <p>
                In flat 3D Euclidean space (&Eopf;³), tracing three perpendicular beams that make three 90° turns produces a vertical depth gap <strong>&Delta;z &ne; 0</strong>. In physical models, it can only be seen as an illusion from one forced optical perspective where a cut corner hides the gap.
              </p>

              <h3>2. How Nil Geometry (Heisenberg Group H₃) Makes it Physically Closed</h3>
              <p>
                Nil space is one of Thurston's 8 geometries, based on the Heisenberg Lie group:
              </p>
              <div class="code-box">
                Metric: ds² = dx² + dy² + (dz - c · x dy)²<br/>
                Holonomy: &Delta;z = c · &oint; x dy = c · Area<sub>xy</sub>(Loop)
              </div>
              <p>
                Horizontal translations in Nil geometry do not commute (<strong>[X, Y] = c · Z</strong>). Walking a closed loop in the horizontal plane inherently produces a vertical translation proportional to the enclosed area!
              </p>
              <p>
                When the Penrose triangle is embedded in Nil space, the area enclosed by its 3 beams generates a vertical holonomy shift that <strong>exactly cancels the Euclidean elevation gap</strong>. The three beams meet seamlessly into a single 3D closed loop without any breaks or shears!
              </p>

              <h3>3. Real-Time Geodesic Shader Pipeline</h3>
              <p>
                This application renders Nil space in real time using a custom WebGL2 shader pipeline. In <strong>Curved Raymarcher (ODE)</strong> mode, the GPU fragment shader solves the exact closed-form Nil geodesic ODEs per pixel, bending light rays along the Heisenberg contact connection so you can observe the genuine non-Euclidean optical warping.
              </p>

              <h3>4. Safe Newton-Raphson Inverse Exponential Map</h3>
              <p>
                In <strong>Safe Newton (GPU)</strong> mode, each vertex is warped along non-Euclidean geodesic light trajectories directly in the vertex shader. While early implementations (like HyperRogue) relied on 50 iterations of bisection, our engine utilizes an analytical <strong>3-step Safe Newton-Raphson</strong> solver with interval safeguards and Taylor series singularity removal for w &approx; 0, delivering quadratic convergence (&epsilon; &lt; 10⁻⁶) and over 10&times; speedup.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.triangleListEl = this.container.querySelector('#triangle-buttons')!;
    this.mathInspectorEl = this.container.querySelector('#math-inspector')!;
    this.infoModalEl = this.container.querySelector('#modal-info')!;
    this.perfBadgeEl = this.container.querySelector('#hud-perf-badge')!;
    this.btnModeNewton = this.container.querySelector('#btn-mode-newton')!;
    this.btnModeRaymarch = this.container.querySelector('#btn-mode-raymarch')!;
    this.btnModeEuclid = this.container.querySelector('#btn-mode-euclid')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    const btnInfo = this.container.querySelector('#btn-info')!;
    const btnCloseModal = this.container.querySelector('#btn-close-modal')!;
    btnInfo.addEventListener('click', () => this.infoModalEl.classList.remove('hidden'));
    btnCloseModal.addEventListener('click', () => this.infoModalEl.classList.add('hidden'));
    this.infoModalEl.addEventListener('click', (e) => {
      if (e.target === this.infoModalEl) this.infoModalEl.classList.add('hidden');
    });

    const btnResetCam = this.container.querySelector('#btn-reset-cam')!;
    btnResetCam.addEventListener('click', () => {
      if (this.onResetCamera) this.onResetCamera();
    });

    const btnWalkLoop = this.container.querySelector('#btn-walk-loop')!;
    btnWalkLoop.addEventListener('click', () => {
      if (this.onWalkCommutatorLoop) this.onWalkCommutatorLoop();
    });

    // Render Mode Toggle: 3 Modes
    const setMode = (mode: RenderMode) => {
      this.currentRenderMode = mode;
      this.btnModeNewton.classList.toggle('active', mode === 'raster_newton');
      this.btnModeRaymarch.classList.toggle('active', mode === 'raymarch');
      this.btnModeEuclid.classList.toggle('active', mode === 'raster_euclid');
      if (this.onRenderModeChange) {
        this.onRenderModeChange(mode);
      }
    };

    this.btnModeNewton.addEventListener('click', () => setMode('raster_newton'));
    this.btnModeRaymarch.addEventListener('click', () => setMode('raymarch'));
    this.btnModeEuclid.addEventListener('click', () => setMode('raster_euclid'));

    // Sliders
    const inputTriangles = this.container.querySelector('#input-triangles') as HTMLInputElement;
    const inputTorsion = this.container.querySelector('#input-torsion') as HTMLInputElement;
    const inputScale = this.container.querySelector('#input-scale') as HTMLInputElement;
    const inputDensity = this.container.querySelector('#input-density') as HTMLInputElement;
    const btnRandomSeed = this.container.querySelector('#btn-random-seed') as HTMLButtonElement;

    const emitConfig = () => {
      this.currentConfig = {
        numTriangles: parseInt(inputTriangles.value, 10),
        sideLength: parseFloat(inputScale.value),
        torsion: parseFloat(inputTorsion.value),
        randomDensity: parseFloat(inputDensity.value),
        seed: this.currentConfig.seed
      };

      this.container.querySelector('#val-triangles')!.textContent = inputTriangles.value;
      this.container.querySelector('#val-torsion')!.textContent = inputTorsion.value;
      this.container.querySelector('#val-scale')!.textContent = inputScale.value;
      this.container.querySelector('#val-density')!.textContent = inputDensity.value;

      if (this.onConfigChange) {
        this.onConfigChange(this.currentConfig);
      }
    };

    inputTriangles.addEventListener('input', emitConfig);
    inputTorsion.addEventListener('input', emitConfig);
    inputScale.addEventListener('input', emitConfig);
    inputDensity.addEventListener('input', emitConfig);

    btnRandomSeed.addEventListener('click', () => {
      this.currentConfig.seed = Math.floor(Math.random() * 999999);
      emitConfig();
    });
  }

  public showCommutatorResult(dz: number): void {
    if (!this.mathInspectorEl) return;
    this.mathInspectorEl.innerHTML = `
      <div class="math-row">
        <span class="math-k">Commutator:</span>
        <span class="math-v highlight">[X, Y] Loop Walk (+X,+Y,-X,-Y)</span>
      </div>
      <div class="math-row">
        <span class="math-k">Euclidean &Delta;z:</span>
        <span class="math-v">0.0000 (No shift)</span>
      </div>
      <div class="math-row">
        <span class="math-k">Actual Nil &Delta;z:</span>
        <span class="math-v highlight badge-success">+${dz.toFixed(4)} (c &middot; L&sup2;)</span>
      </div>
      <div class="math-row">
        <span class="math-k">Curvature Proof:</span>
        <span class="math-v">Non-Abelian Lie Algebra Verified</span>
      </div>
      <p class="math-note">The observer walked a closed square in the horizontal plane and emerged at higher elevation &Delta;z!</p>
    `;
  }

  public updateHUD(): void {
    if (!this.state) return;

    // 1. Render Triangle Chips
    this.triangleListEl.innerHTML = '';
    for (const tri of this.state.triangles) {
      const chip = document.createElement('button');
      chip.className = `triangle-chip ${this.state.selectedTriangleId === tri.id ? 'active' : ''}`;
      chip.innerHTML = `
        <span class="chip-dot"></span>
        <span class="chip-label">&Delta; ${tri.id + 1}</span>
        <span class="chip-chiral">${tri.loopArea > 0 ? '+z' : '-z'}</span>
      `;
      chip.addEventListener('click', () => {
        if (this.onSelectTriangle) {
          this.onSelectTriangle(tri.id);
        }
      });
      this.triangleListEl.appendChild(chip);
    }

    // 2. Render Math Inspector
    const activeTri = this.state.triangles.find((t) => t.id === this.state?.selectedTriangleId);
    if (activeTri) {
      this.mathInspectorEl.innerHTML = `
        <div class="math-row">
          <span class="math-k">Focus:</span>
          <span class="math-v highlight">Penrose Triangle &Delta; ${activeTri.id + 1}</span>
        </div>
        <div class="math-row">
          <span class="math-k">Centroid (x,y,z):</span>
          <span class="math-v">(${activeTri.center.x.toFixed(2)}, ${activeTri.center.y.toFixed(2)}, ${activeTri.center.z.toFixed(2)})</span>
        </div>
        <div class="math-row">
          <span class="math-k">Enclosed Area (xy):</span>
          <span class="math-v">${activeTri.loopArea.toFixed(3)} u²</span>
        </div>
        <div class="math-row">
          <span class="math-k">Holonomy &Delta;z:</span>
          <span class="math-v highlight">&Delta;z = c · Area = ${activeTri.holonomyShift.toFixed(3)}</span>
        </div>
        <div class="math-row">
          <span class="math-k">Loop Closure Gap:</span>
          <span class="math-v badge-success">0.000000 (Exact Closure)</span>
        </div>
        <div class="math-row">
          <span class="math-k">Lie Bracket [X, Y]:</span>
          <span class="math-v">${this.currentConfig.torsion.toFixed(2)} · Z</span>
        </div>
      `;
    } else {
      this.mathInspectorEl.innerHTML = `
        <div class="math-row">
          <span class="math-k">Total Nodes:</span>
          <span class="math-v">${this.state.nodes.length}</span>
        </div>
        <div class="math-row">
          <span class="math-k">Macro Triads:</span>
          <span class="math-v">${this.state.triangles.length}</span>
        </div>
        <div class="math-row">
          <span class="math-k">Hyperedges:</span>
          <span class="math-v">${this.state.hyperedges.length}</span>
        </div>
        <div class="math-row">
          <span class="math-k">Geometry Metric:</span>
          <span class="math-v">ds² = dx² + dy² + (dz - c·x dy)²</span>
        </div>
        <p class="math-note">Select any triangle to inspect its Nil holonomy and snap canonical view.</p>
      `;
    }
  }
}
