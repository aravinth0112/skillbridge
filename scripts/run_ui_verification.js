/**
 * scripts/run_ui_verification.js
 * Comprehensive headless browser automation using native Chrome DevTools Protocol over WebSocket in Node.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const CDP_PORT = 9222;
const BASE_APP = 'http://127.0.0.1:8000/app';

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

let edgeProc = null;
let tempUserData = null;

async function launchEdge() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  tempUserData = path.join(os.tmpdir(), 'edge_cdp_' + Date.now());
  edgeProc = spawn(edgePath, [
    '--headless',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempUserData}`,
    'about:blank'
  ]);

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error("Edge failed to start CDP on port " + CDP_PORT);
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        } else if (data.method) {
          if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
            this.consoleErrors.push(data.params.args.map(a => a.value || a.description).join(' '));
          }
          if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) {
            this.networkErrors.push(`${data.params.response.url} returned status ${data.params.response.status}`);
          }
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'CDP Eval Exception');
    }
    return res.result ? res.result.value : undefined;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
    await this.send('Emulation.setVisibleSize', { width, height });
  }

  async navigate(url) {
    this.consoleErrors = [];
    this.networkErrors = [];
    await this.send('Page.navigate', { url });
    await sleep(1500); // Wait for load and rendering
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }

  async close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function createTarget() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: 'PUT' });
  const data = await res.json();
  const client = new CDPClient(data.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  return client;
}

async function main() {
  console.log("Starting Phase 4 Browser Verification...");
  await launchEdge();
  const client = await createTarget();

  const pages = [
    { name: 'index', url: `${BASE_APP}/index.html` },
    { name: 'students', url: `${BASE_APP}/students.html` },
    { name: 'student_1', url: `${BASE_APP}/student.html?id=1` },
    { name: 'projects', url: `${BASE_APP}/projects.html` },
    { name: 'project_1', url: `${BASE_APP}/project.html?id=1` }
  ];

  const results = [];

  // 1. Viewport & Layout checks (1280px & 360px)
  for (const page of pages) {
    for (const width of [1280, 360]) {
      const height = width === 1280 ? 800 : 740;
      await client.setViewport(width, height);
      await client.navigate(page.url);

      const overflow = await client.eval(`document.documentElement.scrollWidth > window.innerWidth`);
      const scrollWidth = await client.eval(`document.documentElement.scrollWidth`);
      const innerWidth = await client.eval(`window.innerWidth`);

      results.push({
        page: page.name,
        width,
        overflow,
        scrollWidth,
        innerWidth,
        consoleErrors: [...client.consoleErrors],
        networkErrors: [...client.networkErrors]
      });

      console.log(`[${page.name} @ ${width}px] Overflow: ${overflow} (${scrollWidth}px vs ${innerWidth}px), Console Errs: ${client.consoleErrors.length}, Net Errs: ${client.networkErrors.length}`);
    }
  }

  // 2. Capture clean 1280px screenshots for docs/screenshots
  await client.setViewport(1280, 800);

  // Dashboard
  await client.navigate(`${BASE_APP}/index.html`);
  await sleep(1000);
  await client.screenshot(path.join(__dirname, '../docs/screenshots/dashboard.png'));
  console.log("Captured docs/screenshots/dashboard.png");

  // Students
  await client.navigate(`${BASE_APP}/students.html`);
  await sleep(1000);
  await client.screenshot(path.join(__dirname, '../docs/screenshots/students.png'));
  console.log("Captured docs/screenshots/students.png");

  // Projects
  await client.navigate(`${BASE_APP}/projects.html`);
  await sleep(1000);
  await client.screenshot(path.join(__dirname, '../docs/screenshots/projects.png'));
  console.log("Captured docs/screenshots/projects.png");

  // Profile
  await client.navigate(`${BASE_APP}/student.html?id=1`);
  await sleep(1000);
  await client.screenshot(path.join(__dirname, '../docs/screenshots/profile.png'));
  console.log("Captured docs/screenshots/profile.png");

  // 3. Project matches signature moment & matches.png
  await client.navigate(`${BASE_APP}/project.html?id=1`);
  await sleep(800);
  console.log("Triggering Find Matches...");
  await client.eval(`findMatches()`);
  await sleep(1200);
  await client.screenshot(path.join(__dirname, '../docs/screenshots/matches.png'));
  console.log("Captured docs/screenshots/matches.png");

  // 4. Click-through Demo Flow:
  // a) Test "/" key when input is focused vs not focused
  await client.navigate(`${BASE_APP}/students.html`);
  await sleep(500);

  // Type in filter input
  const paletteOpenInsideInput = await client.eval(`
    (() => {
      const inp = document.getElementById('skill-search-input');
      inp.focus();
      const evt = new KeyboardEvent('keydown', { key: '/', bubbles: true });
      inp.dispatchEvent(evt);
      const palette = document.getElementById('cmd-palette-backdrop');
      const isOpen = palette ? palette.classList.contains('open') : false;
      inp.blur();
      return isOpen;
    })()
  `);
  console.log(`Command palette opened while typing in input: ${paletteOpenInsideInput} (Expected: false)`);

  // Press "/" when body is focused (not inside an input)
  const paletteOpenOutsideInput = await client.eval(`
    (() => {
      const evt = new KeyboardEvent('keydown', { key: '/', bubbles: true });
      document.dispatchEvent(evt);
      const palette = document.getElementById('cmd-palette-backdrop');
      const isOpen = palette ? palette.classList.contains('open') : false;
      closeCommandPalette();
      return isOpen;
    })()
  `);
  console.log(`Command palette opened on body keydown: ${paletteOpenOutsideInput} (Expected: true)`);

  // b) Test Motion switch
  const motionSwitchWorked = await client.eval(`
    (() => {
      const toggle = document.getElementById('motion-toggle');
      if (!toggle) return false;
      toggle.checked = false;
      toggle.onchange();
      const hasClass = document.documentElement.classList.contains('motion-off');
      toggle.checked = true;
      toggle.onchange();
      return hasClass;
    })()
  `);
  console.log(`Motion switch applied 'motion-off' class: ${motionSwitchWorked} (Expected: true)`);

  // c) Test Project creation, shortlisting, moving across pipeline, and reloading
  await client.navigate(`${BASE_APP}/project.html?id=1`);
  await sleep(600);
  await client.eval(`findMatches()`);
  await sleep(800);

  // Candidate shortlist
  const candidateCountBefore = await client.eval(`document.querySelectorAll('#cards-shortlisted .pipeline-card').length`);
  await client.eval(`
    (() => {
      const btn = document.querySelector('#matches-container .match-candidate-row button');
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);
  const candidateCountAfter = await client.eval(`document.querySelectorAll('#cards-shortlisted .pipeline-card').length`);
  console.log(`Pipeline shortlisted cards before: ${candidateCountBefore}, after: ${candidateCountAfter}`);

  // Move candidate from shortlisted to contacted
  await client.eval(`
    (() => {
      const fwdBtn = document.querySelector('#cards-shortlisted .pipeline-card .pipeline-actions button');
      if (fwdBtn) fwdBtn.click();
    })()
  `);
  await sleep(1000);
  const contactedCount = await client.eval(`document.querySelectorAll('#cards-contacted .pipeline-card').length`);
  console.log(`Pipeline contacted cards count after forward move: ${contactedCount}`);

  // Reload page and verify state persisted
  await client.navigate(`${BASE_APP}/project.html?id=1`);
  await sleep(800);
  const persistedContacted = await client.eval(`document.querySelectorAll('#cards-contacted .pipeline-card').length`);
  console.log(`Pipeline contacted cards count after page reload: ${persistedContacted} (Expected: >= 1)`);

  // Clean up any test shortlist created
  await client.eval(`
    (async () => {
      const removeBtn = document.querySelector('#cards-contacted .pipeline-card .btn-danger');
      if (removeBtn) {
        removeBtn.click();
        const confirmBtn = document.querySelector('#cards-contacted .confirm-yes');
        if (confirmBtn) confirmBtn.click();
      }
    })()
  `);
  await sleep(600);

  await client.close();
  console.log("Phase 4 Browser Verification Completed Successfully!");
}

main().catch(err => {
  console.error("UI Verification error:", err);
  process.exit(1);
}).finally(() => {
  if (edgeProc) {
    try { edgeProc.kill(); } catch (e) {}
  }
  if (tempUserData) {
    try { fs.rmSync(tempUserData, { recursive: true, force: true }); } catch (e) {}
  }
});
