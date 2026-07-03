#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const FRONTEND = 'https://omnidrive-ajm.pages.dev';
const API = 'https://omnidrive-api.asmara-putra.workers.dev';
const STATE_FILE = 'scripts/.prod-auth-state.json';
const TEST_DIR = 'scripts/.prod-test-files';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = { steps: [], errors: [] };
const log = (step, status, detail = {}) => {
  results.steps.push({ step, status, at: new Date().toISOString(), ...detail });
  console.log(`[${status}] ${step}${detail.message ? ': ' + detail.message : ''}`);
};

async function apiCall(page, path, method = 'GET', body) {
  const res = await page.evaluate(async ({ api, path, method, body }) => {
    const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${api}${path}`, opts);
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('json') ? await r.json().catch(() => null) : await r.text().catch(() => null);
    return { status: r.status, data };
  }, { api: API, path, method, body });
  await sleep(1500);
  return res;
}

async function uploadViaApi(page, fileName, content, mimeType) {
  return page.evaluate(async ({ api, fileName, content, mimeType }) => {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    const initRes = await fetch(`${api}/api/files/upload/init`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, mimeType, size: file.size }),
    });
    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      return { step: 'init', ok: false, status: initRes.status, error: err.error || initRes.statusText };
    }
    const { uploadUrl, driveAccountId } = await initRes.json();

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: file,
    });
    if (!putRes.ok) {
      return { step: 'google-put', ok: false, status: putRes.status, error: putRes.statusText };
    }
    const gFile = await putRes.json();

    const finRes = await fetch(`${api}/api/files/upload/finalize`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleFileId: gFile.id, driveAccountId }),
    });
    if (!finRes.ok) {
      const err = await finRes.json().catch(() => ({}));
      return { step: 'finalize', ok: false, status: finRes.status, error: err.error || finRes.statusText };
    }
    const finData = await finRes.json();
    return { step: 'done', ok: true, file: finData.file };
  }, { api: API, fileName, content, mimeType });
}

async function main() {
  if (!existsSync(STATE_FILE)) {
    console.error('Auth state missing. Run prod-browser-test-extended.mjs and login first.');
    process.exit(1);
  }

  mkdirSync(TEST_DIR, { recursive: true });
  const testFile = join(TEST_DIR, `omnidrive-test-${Date.now()}.txt`);
  const testContent = `OmniDrive production upload test ${new Date().toISOString()}`;
  writeFileSync(testFile, testContent, 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STATE_FILE });
  const page = await context.newPage();

  try {
    await page.goto(`${FRONTEND}/files`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const me = await apiCall(page, '/api/auth/me');
    if (me.status !== 200) throw new Error(`Session expired (${me.status}) — login ulang via extended test`);
    log('session', 'pass', { message: me.data.user.username });

    const drives = await apiCall(page, '/api/drives/');
    if (!drives.data?.drives?.length) throw new Error('No connected drives');
    log('drives', 'pass', { message: `${drives.data.drives.length} drive(s)` });

    const fileName = testFile.split(/[/\\]/).pop();
    const upload = await uploadViaApi(page, fileName, testContent, 'text/plain');
    if (!upload.ok) {
      log('upload-flow', 'fail', { message: `${upload.step}: ${upload.status} ${upload.error}` });
      results.errors.push(upload.error || upload.step);
    } else {
      log('upload-init', 'pass', { message: 'Resumable session OK' });
      log('upload-google', 'pass', { message: 'PUT to Google Drive OK' });
      log('upload-finalize', 'pass', { message: upload.file?.name || fileName, fileId: upload.file?.id });
    }

    await sleep(2000);
    const recent = await apiCall(page, '/api/files/recent');
    const found = recent.data?.files?.some((f) => f.name === fileName);
    log('verify-recent', found ? 'pass' : 'fail', {
      message: found ? 'File appears in recent' : 'File not in recent list',
      recentCount: recent.data?.files?.length ?? 0,
    });
    if (!found) results.errors.push('Uploaded file not found in /api/files/recent');

    // UI upload via modal (optional second path)
    await page.goto(`${FRONTEND}/files`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const uploadBtn = page.getByRole('button', { name: /^Upload$/i });
    if (await uploadBtn.isVisible().catch(() => false)) {
      await uploadBtn.click();
      await sleep(1000);
      const input = page.locator('#modal-file-upload');
      const uiFile = join(TEST_DIR, `omnidrive-ui-${Date.now()}.txt`);
      writeFileSync(uiFile, `UI upload test ${new Date().toISOString()}`, 'utf8');
      await input.setInputFiles(uiFile);
      await sleep(1000);
      const startBtn = page.getByRole('button', { name: /Upload \d|Start Upload|Upload Files/i });
      if (await startBtn.first().isVisible().catch(() => false)) {
        await startBtn.first().click();
        await sleep(8000);
        const done = await page.locator('text=done').or(page.locator('.text-green-500')).first().isVisible().catch(() => false);
        log('upload-ui', done ? 'pass' : 'warn', { message: done ? 'UI upload completed' : 'UI upload status unclear' });
      } else {
        log('upload-ui', 'warn', { message: 'Upload start button not found' });
      }
    } else {
      log('upload-ui', 'warn', { message: 'Upload button not visible' });
    }

    results.summary = {
      passed: results.steps.filter((s) => s.status === 'pass').length,
      failed: results.steps.filter((s) => s.status === 'fail').length,
      errors: results.errors,
    };
    writeFileSync('scripts/prod-upload-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n' + JSON.stringify(results.summary, null, 2));
    if (results.errors.length) process.exitCode = 1;
  } catch (e) {
    log('fatal', 'fail', { message: String(e) });
    writeFileSync('scripts/prod-upload-test-results.json', JSON.stringify(results, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();