#!/usr/bin/env node
/**
 * Production browser test — opens headed Chrome, waits for manual login, then runs checks.
 * Usage: node scripts/prod-browser-test.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const FRONTEND = 'https://omnidrive-ajm.pages.dev';
const API = 'https://omnidrive-api.asmara-putra.workers.dev';
const LOGIN_WAIT_MS = 5 * 60 * 1000;

const results = {
  startedAt: new Date().toISOString(),
  frontend: FRONTEND,
  api: API,
  steps: [],
  errors: [],
  networkFailures: [],
  consoleErrors: [],
};

function log(step, status, detail = {}) {
  const entry = { step, status, at: new Date().toISOString(), ...detail };
  results.steps.push(entry);
  console.log(`[${status}] ${step}${detail.message ? `: ${detail.message}` : ''}`);
}

async function waitForAuth(page) {
  log('wait-login', 'info', { message: 'Silakan login di jendela browser yang terbuka (max 5 menit)...' });
  const deadline = Date.now() + LOGIN_WAIT_MS;
  while (Date.now() < deadline) {
    const path = new URL(page.url()).pathname;
    if (path !== '/login' && path !== '/setup') {
      try {
        const me = await page.evaluate(async (api) => {
          const r = await fetch(`${api}/api/auth/me`, { credentials: 'include' });
          if (!r.ok) return null;
          return r.json();
        }, API);
        if (me?.user) {
          log('wait-login', 'pass', { message: `Logged in as ${me.user.username}`, user: me.user.username });
          return me.user;
        }
      } catch {
        /* retry */
      }
    }
    await page.waitForTimeout(8000);
  }
  throw new Error('Login timeout — tidak terdeteksi sesi aktif dalam 5 menit');
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });
  page.on('requestfailed', (req) => {
    results.networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  try {
    await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('load-login', 'pass', { message: page.url() });

    const user = await waitForAuth(page);

    // Dashboard / home
    await page.goto(`${FRONTEND}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const homeTitle = await page.title();
    log('load-home', 'pass', { message: homeTitle });

    // Files page
    await page.goto(`${FRONTEND}/files`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const hasConnectBtn = await page.getByRole('button', { name: /Connect Google Drive/i }).isVisible().catch(() => false);
    const hasFileList = await page.locator('table, [class*="grid"], [class*="file"]').first().isVisible().catch(() => false);
    log('files-page', hasConnectBtn || hasFileList ? 'pass' : 'warn', {
      message: hasConnectBtn ? 'No drive connected — Connect button visible' : hasFileList ? 'File browser visible' : 'Unknown files state',
      hasConnectBtn,
      hasFileList,
    });

    // OAuth initiation — intercept API, do not complete Google flow
    if (hasConnectBtn) {
      const oauthPromise = page.waitForResponse(
        (r) => r.url().includes('/api/auth/google') && r.request().method() === 'GET',
        { timeout: 15000 }
      );
      await page.getByRole('button', { name: /Connect Google Drive/i }).click();
      try {
        const oauthRes = await oauthPromise;
        const ct = oauthRes.headers()['content-type'] || '';
        let body = null;
        try {
          body = await oauthRes.json();
        } catch (e) {
          body = { parseError: String(e) };
        }
        const ok = oauthRes.status() === 200 && body?.url?.includes('accounts.google.com');
        log('oauth-google-api', ok ? 'pass' : 'fail', {
          status: oauthRes.status(),
          contentType: ct,
          hasUrl: !!body?.url,
          urlPreview: body?.url?.slice(0, 80),
        });
        if (!ok) results.errors.push('OAuth /api/auth/google did not return JSON url');
      } catch (e) {
        log('oauth-google-api', 'fail', { message: String(e) });
        results.errors.push(`OAuth click failed: ${e}`);
      }
      // Return from Google tab if opened
      if (page.url().includes('accounts.google.com')) {
        await page.goto(`${FRONTEND}/files`, { waitUntil: 'domcontentloaded' });
      }
    } else {
      const drivesRes = await page.evaluate(async (api) => {
        const r = await fetch(`${api}/api/drives/`, { credentials: 'include' });
        return { status: r.status, body: await r.json().catch(() => null) };
      }, API);
      const driveCount = drivesRes.body?.drives?.length ?? 0;
      log('drives-api', drivesRes.status === 200 ? 'pass' : 'fail', {
        status: drivesRes.status,
        driveCount,
        aggregate: drivesRes.body?.aggregate ?? null,
      });
      if (drivesRes.status !== 200) results.errors.push(`GET /api/drives/ returned ${drivesRes.status}`);
    }

    // Settings page
    await page.goto(`${FRONTEND}/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const settingsOk = await page.getByText(/Google Drive|Add Drive|S3/i).first().isVisible().catch(() => false);
    log('settings-page', settingsOk ? 'pass' : 'fail', { message: settingsOk ? 'Settings sections visible' : 'Settings content missing' });

    // Workspaces
    await page.goto(`${FRONTEND}/workspaces`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const wsOk = await page.locator('body').innerText().then((t) => !t.includes('Failed') && t.length > 50).catch(() => false);
    log('workspaces-page', wsOk ? 'pass' : 'warn', { message: 'Page loaded' });

    // Shared links
    await page.goto(`${FRONTEND}/shared`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('shared-page', 'pass', { message: 'Page loaded' });

    // Auth me final check
    const meFinal = await page.evaluate(async (api) => {
      const r = await fetch(`${api}/api/auth/me`, { credentials: 'include' });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, API);
    log('auth-me-final', meFinal.status === 200 ? 'pass' : 'fail', { status: meFinal.status, username: meFinal.body?.user?.username });

    results.finishedAt = new Date().toISOString();
    results.summary = {
      passed: results.steps.filter((s) => s.status === 'pass').length,
      failed: results.steps.filter((s) => s.status === 'fail').length,
      warnings: results.steps.filter((s) => s.status === 'warn').length,
      user: user.username,
    };

    const outPath = 'scripts/prod-browser-test-results.json';
    writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\nResults written to ${outPath}`);
    console.log(JSON.stringify(results.summary, null, 2));

    if (results.errors.length) {
      console.log('\nErrors:', results.errors);
      process.exitCode = 1;
    }
  } catch (e) {
    log('fatal', 'fail', { message: String(e) });
    results.errors.push(String(e));
    writeFileSync('scripts/prod-browser-test-results.json', JSON.stringify(results, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();