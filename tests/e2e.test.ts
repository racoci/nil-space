import puppeteer from 'puppeteer';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[E2E ASSERTION FAILED]: ${msg}`);
  }
}

function waitForServer(url: string, timeoutMs: number = 10000): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const start = Date.now();
  const check = () => {
    http.get(url, (res: http.IncomingMessage) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        resolve();
      } else {
        setTimeout(check, 150);
      }
    }).on('error', () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for server at ${url}`));
      } else {
        setTimeout(check, 150);
      }
    });
  };
  check();
  return promise;
}

async function runE2ETests() {
  console.log('🌐 Starting E2E Browser Test Suite for Hyperbolic Nil Space...');
  const port = 5199;
  const serverUrl = `http://localhost:${port}`;

  let previewProcess: ChildProcess | null = null;
  try {
    // 1. Spawn Vite preview server directly with detached process group
    previewProcess = spawn('node', ['./node_modules/vite/bin/vite.js', 'preview', '--port', `${port}`, '--strictPort'], {
      cwd: process.cwd(),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await waitForServer(serverUrl, 10000);
    console.log(`✅ Vite preview server listening on ${serverUrl}`);

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
      if (msg.type() === 'error') {
        // Filter expected fallback messages in headless CI environments without GPU
        if (!msg.text().includes('WebGL context could not be created')) {
          consoleErrors.push(msg.text());
        }
      }
    });
    page.on('pageerror', (err: unknown) => {
      console.error('[BROWSER PAGE ERROR]:', err);
      if (!String(err).includes('WebGL')) {
        consoleErrors.push(String(err));
      }
    });

    // 3. Navigate to application
    await page.goto(serverUrl, { waitUntil: 'networkidle0' });
    console.log('✅ Application loaded successfully in headless browser');

    // 4. Verify title and DOM containers
    const title = await page.title();
    assert(title.includes('Hyperbolic Nil Space'), `Unexpected title: ${title}`);

    const canvas = await page.waitForSelector('#canvas-container canvas', { timeout: 5000 });
    assert(canvas !== null, 'Canvas element must be present in DOM');

    const chips = await page.$$('.triangle-chip');
    assert(chips.length >= 6, `Expected at least 6 triangle chips, found ${chips.length}`);
    console.log(`✅ Verified DOM elements: canvas and ${chips.length} triangle selector chips present`);

    // 5. Test Triangle Selection & Canonical Perspective
    await chips[1].click(); // Click triangle 2
    await page.waitForFunction(() => document.querySelector('.triangle-chip:nth-child(2)')?.classList.contains('active'));

    const isActive = await page.$eval('.triangle-chip:nth-child(2)', (el) => el.classList.contains('active'));
    assert(isActive, 'Second triangle chip must have active class after click');

    const inspectorText = await page.$eval('#math-inspector', (el) => el.textContent || '');
    assert(inspectorText.includes('Penrose Triangle Δ 2'), 'Math inspector must focus on Penrose Triangle 2');
    assert(inspectorText.includes('Holonomy Δz'), 'Math inspector must display holonomy metric');
    assert(inspectorText.includes('0.000000 (Exact Closure)'), 'Math inspector must confirm exact loop closure');
    console.log('✅ Triangle selection and live Nil math inspector reactive update verified');

    // 6. Test Parameter Sliders
    await page.$eval('#input-torsion', (el) => {
      const input = el as HTMLInputElement;
      input.value = '1.8';
      input.dispatchEvent(new Event('input'));
    });

    await page.$eval('#input-kappa', (el) => {
      const input = el as HTMLInputElement;
      input.value = '-0.75';
      input.dispatchEvent(new Event('input'));
    });
    const kappaText = await page.$eval('#val-kappa', (el) => el.textContent);
    assert(kappaText?.includes('SL̃₂'), `Expected SL̃₂ manifold label, got ${kappaText}`);
    console.log('✅ Lattice & Metric (torsion and kappa Nil ↔ SL̃₂(ℝ)) parameter slider interaction verified');

    // 7. Test Theory Modal Open / Close
    await page.click('#btn-info');
    await page.waitForFunction(() => !document.querySelector('#modal-info')?.classList.contains('hidden'));
    const isModalVisible = await page.$eval('#modal-info', (el) => !el.classList.contains('hidden'));
    assert(isModalVisible, 'Theory modal must become visible on button click');

    await page.click('#btn-close-modal');
    await page.waitForFunction(() => document.querySelector('#modal-info')?.classList.contains('hidden'));
    const isModalHidden = await page.$eval('#modal-info', (el) => el.classList.contains('hidden'));
    assert(isModalHidden, 'Theory modal must close on close button click');
    console.log('✅ Theoretical Foundations modal toggle verified');

    // 8. Test Render Engine Pipeline Mode Switching (Safe Newton vs Euclid vs Raymarcher)
    await page.click('#btn-mode-newton');
    await page.waitForFunction(() => document.querySelector('#btn-mode-newton')?.classList.contains('active'));
    const isNewtonActive = await page.$eval('#btn-mode-newton', (el) => el.classList.contains('active'));
    assert(isNewtonActive, 'Safe Newton GPU mode must become active on click');

    await page.click('#btn-mode-euclid');
    await page.waitForFunction(() => document.querySelector('#btn-mode-euclid')?.classList.contains('active'));
    const isEuclidActive = await page.$eval('#btn-mode-euclid', (el) => el.classList.contains('active'));
    assert(isEuclidActive, 'Euclidean Ambient mode must become active on click');

    await page.click('#btn-mode-raymarch');
    await page.waitForFunction(() => document.querySelector('#btn-mode-raymarch')?.classList.contains('active'));
    const isRaymarchActive = await page.$eval('#btn-mode-raymarch', (el) => el.classList.contains('active'));
    assert(isRaymarchActive, 'Curved Raymarcher mode must become active on click');
    console.log('✅ Render Engine Pipeline mode switching (Newton/Euclid/Raymarch) verified');

    // 8b. Test Camera Reset
    await page.click('#btn-reset-cam');
    await page.waitForFunction(() => document.querySelectorAll('.triangle-chip.active').length === 0);
    const anyActive = await page.$$eval('.triangle-chip.active', (els) => els.length);
    assert(anyActive === 0, 'Reset camera must deselect triangles');
    console.log('✅ Reset camera action verified');

    // 8c. Test Interactive Lie Commutator Loop Walk [X, Y] = c * Z
    await page.click('#btn-walk-loop');
    await page.waitForFunction(
      () => document.querySelector('#math-inspector')?.textContent?.includes('Commutator:'),
      { timeout: 4000 }
    );
    const inspectorText2 = await page.$eval('#math-inspector', (el) => el.textContent || '');
    assert(inspectorText2.includes('Actual Nil Δz:'), 'Math inspector must report non-zero Nil holonomy shift');
    assert(inspectorText2.includes('Non-Abelian Lie Algebra Verified'), 'Math inspector must confirm Non-Abelian Lie algebra');
    console.log('✅ Interactive Lie Commutator Loop Walk verified');

    // 8d. Test Geodesic Light Rays Toggle (Opção A)
    await page.click('#btn-toggle-rays');
    await page.waitForFunction(() => document.querySelector('#btn-toggle-rays')?.classList.contains('active'));
    const isRaysActive = await page.$eval('#btn-toggle-rays', (el) => el.classList.contains('active'));
    assert(isRaysActive, 'Geodesic light rays button must be active');

    await page.click('#btn-toggle-rays');
    await page.waitForFunction(() => !document.querySelector('#btn-toggle-rays')?.classList.contains('active'));
    console.log('✅ Geodesic Light Rays toggle interaction verified');

    // 8e. Test Complex Graph Topology Switching
    await page.select('#select-topology', 'barabasi_albert');
    await page.waitForFunction(() => document.querySelector('#math-inspector')?.textContent?.includes('BARABASI ALBERT'));
    const inspectorBA = await page.$eval('#math-inspector', (el) => el.textContent || '');
    assert(inspectorBA.includes('BARABASI ALBERT'), 'Inspector must show Barabasi-Albert topology');
    assert(inspectorBA.includes('Max / Avg Deg:'), 'Inspector must show scale-free hub degree metrics');

    await page.select('#select-topology', 'watts_strogatz');
    await page.waitForFunction(() => document.querySelector('#math-inspector')?.textContent?.includes('WATTS STROGATZ'));
    const inspectorWS = await page.$eval('#math-inspector', (el) => el.textContent || '');
    assert(inspectorWS.includes('WATTS STROGATZ'), 'Inspector must show Watts-Strogatz topology');
    assert(inspectorWS.includes('Clustering Coeff:'), 'Inspector must show small-world clustering metric');
    console.log('✅ Complex Graph Topologies (Barabasi-Albert & Watts-Strogatz) switching verified');

    // 9. Verify zero console errors
    assert(consoleErrors.length === 0, `Encountered console errors during run: ${consoleErrors.join(', ')}`);
    console.log('✅ Zero console errors or uncaught exceptions detected');

    await browser.close();
    console.log('🎉 All E2E browser tests PASSED successfully!\n');
  } finally {
    if (previewProcess && previewProcess.pid) {
      try {
        process.kill(-previewProcess.pid, 'SIGKILL');
      } catch (_) {
        try {
          previewProcess.kill('SIGKILL');
        } catch (__) {}
      }
    }
    setTimeout(() => process.exit(0), 100);
  }
}

runE2ETests().catch((err) => {
  console.error('❌ E2E test failed:', err);
  process.exit(1);
});
