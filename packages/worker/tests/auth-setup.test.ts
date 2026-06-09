import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../src/index';

describe('Auth Setup & Register', () => {
  beforeEach(async () => {
    await env.DB.exec('DELETE FROM users');
    await env.DB.exec('DELETE FROM invitation_codes');
  });

  it('GET /api/auth/setup-status returns isSetup: false initially', async () => {
    const res = await app.request('/api/auth/setup-status');
    const json = await res.json() as any;
    expect(json.isSetup).toBe(false);
  });
});
