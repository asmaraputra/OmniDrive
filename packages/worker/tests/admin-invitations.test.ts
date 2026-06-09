import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { app } from '../src/index';

describe('Admin Invitations', () => {
  it('GET /api/admin/invitations returns 401 without auth', async () => {
    const res = await app.request('/api/admin/invitations');
    expect(res.status).toBe(401);
  });
});
