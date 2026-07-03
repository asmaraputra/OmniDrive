#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'fs';

const FRONTEND = 'https://omnidrive-ajm.pages.dev';
const API = 'https://omnidrive-api.asmara-putra.workers.dev';
const STATE_FILE = 'scripts/.prod-auth-state.json';
const LOGIN_WAIT_MS = 5 * 60 * 1000;
const API_DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = { steps: [], errors: [], consoleErrors: [] };
const log = (step, status, detail = {}) => {
  results.steps.push({ step, status, at: new Date().toISOString(), ...detail });
  console.log(`[${status}] ${step}${detail.message ? ': ' + detail.message : ''}`);
};

async function apiCall(page, path, method = 'GET', body) {
  const res = await page.evaluate(async ({ api, path, method, body }) => {
    const opts = { method, credentials: 'include', headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(`${api}${path}`, opts);
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('json') ? await r.json().catch(() => null) : await r.text().catch(() => null);
    return { status: r.status, data, retryAfter: r.headers.get('retry-after') };
  }, { api: API, path, method, body });

  if (res.status === 429) {
    const waitSec = Number(res.retryAfter) || 60;
    log('rate-limit', 'warn', { message: `429 on ${path}, waiting ${waitSec}s` });
    await sleep(waitSec * 1000);
    return apiCall(page, path, method, body);
  }
  await sleep(API_DELAY_MS);
  return res;
}

async function waitForLogin(page) {
  log('wait-login', 'info', { message: 'Silakan login di browser (max 5 menit)...' });
  await page.waitForURL((url) => !url.pathname.includes('/login') && !url.pathname.includes('/setup'), {
    timeout: LOGIN_WAIT_MS,
  });
  await sleep(2000);
  const me = await apiCall(page, '/api/auth/me');
  if (me.status === 200 && me.data?.user) {
    log('login', 'pass', { message: me.data.user.username, role: me.data.user.role });
    return me.data.user;
  }
  throw new Error(`Login detected but /api/auth/me returned ${me.status}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext(
    existsSync(STATE_FILE) ? { storageState: STATE_FILE } : {}
  );
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push(m.text()); });

  try {
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    let user = (await apiCall(page, '/api/auth/me')).data?.user;
    if (!user) user = await waitForLogin(page);
    await context.storageState({ path: STATE_FILE });

    // API tests with session
    const endpoints = [
      ['/api/auth/me', 'auth-me'],
      ['/api/drives/', 'drives'],
      ['/api/folders/', 'folders-root'],
      ['/api/files/recent', 'files-recent'],
      ['/api/workspaces/', 'workspaces'],
      ['/api/shared', 'shared-links'],
    ];
    let drivesData = null;
    for (const [path, name] of endpoints) {
      const res = await apiCall(page, path);
      if (name === 'drives') drivesData = res.data;
      const ok = res.status === 200;
      log(name, ok ? 'pass' : 'fail', { status: res.status, preview: JSON.stringify(res.data).slice(0, 200) });
      if (!ok) results.errors.push(`${name}: HTTP ${res.status}`);
    }

    // OAuth URL endpoints (should return JSON with Google URL)
    for (const [path, name] of [['/api/auth/google', 'oauth-google'], ['/api/drives/connect', 'oauth-connect']]) {
      const res = await apiCall(page, path);
      const url = res.data?.url;
      const ok = res.status === 200 && typeof url === 'string' && url.includes('accounts.google.com');
      log(name, ok ? 'pass' : 'fail', { status: res.status, urlPreview: url?.slice(0, 90) });
      if (!ok) results.errors.push(`${name}: expected JSON url, got ${res.status}`);
    }

    // UI pages with hydration wait
    for (const [route, name, selector] of [
      ['/files', 'ui-files', 'text=/My Files|Files|Connect Google|No Google/i'],
      ['/settings', 'ui-settings', 'text=/Google Drive|Add Drive|Settings|S3/i'],
      ['/workspaces', 'ui-workspaces', 'text=/Workspace|Create|New/i'],
      ['/dashboard', 'ui-dashboard', 'text=/Dashboard|Storage|Recent/i'],
    ]) {
      await page.goto(`${FRONTEND}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const visible = await page.locator(selector).first().isVisible().catch(() => false);
      log(name, visible ? 'pass' : 'warn', { message: visible ? 'Content visible' : 'Selector not found', route });
    }

    if (drivesData?.aggregate?.totalQuota === 0 && drivesData?.drives?.length > 0) {
      log('quota-zero', 'warn', { message: 'Drive connected but aggregate quota is 0 — sync may be pending or token issue' });
    }

    results.summary = {
      user: user.username,
      passed: results.steps.filter((s) => s.status === 'pass').length,
      failed: results.steps.filter((s) => s.status === 'fail').length,
      warnings: results.steps.filter((s) => s.status === 'warn').length,
      errors: results.errors,
    };
    writeFileSync('scripts/prod-browser-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n' + JSON.stringify(results.summary, null, 2));
    if (results.errors.length) process.exitCode = 1;
  } catch (e) {
    log('fatal', 'fail', { message: String(e) });
    writeFileSync('scripts/prod-browser-test-results.json', JSON.stringify(results, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();