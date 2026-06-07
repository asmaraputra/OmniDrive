import { Hono } from 'hono';

import type { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';
import { mapSharedLinkRow } from '../types';
import { generateId } from '../lib/id';

export const sharedRouter = new Hono<AppContext>({ strict: false });

// ─── Management Endpoints (Require Auth) ───

sharedRouter.post('/', authGuard, async (c) => {
  const userId = c.get('userId');
  
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { targetType, targetId, password, expiresAt } = body;
  if (!targetType || !targetId) {
    return c.json({ error: 'targetType and targetId are required' }, 400);
  }

  const db = c.env.DB;
  
  let passwordHash = null;
  
  if (password) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const saltArray = Array.from(salt);
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');
    passwordHash = `${saltHex}:${hashHex}`;
  }

  let id = '';
  let attempts = 0;
  const maxAttempts = 3;
  let success = false;

  while (attempts < maxAttempts && !success) {
    id = generateId().slice(0, 8); // Short slug
    try {
      await db.prepare(
        'INSERT INTO shared_links (id, user_id, target_type, target_id, password_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(id, userId, targetType, targetId, passwordHash, expiresAt || null)
      .run();
      success = true;
    } catch (e: any) {
      if (e.message && e.message.includes('UNIQUE constraint failed')) {
        attempts++;
      } else {
        return c.json({ error: 'Failed to create shared link' }, 500);
      }
    }
  }

  if (!success) {
    return c.json({ error: 'Could not generate unique ID for shared link' }, 500);
  }

  // Ensure no trailing slash in FRONTEND_URL if present, though typically it won't have one
  const baseUrl = c.env.FRONTEND_URL.replace(/\/$/, '');
  return c.json({ id, url: `${baseUrl}/shared/${id}` });
});

sharedRouter.get('/', authGuard, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const { results } = await db.prepare('SELECT * FROM shared_links WHERE user_id = ?').bind(userId).all();
  return c.json({ links: results.map(mapSharedLinkRow) });
});

sharedRouter.delete('/:id', authGuard, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  
  await c.env.DB.prepare('DELETE FROM shared_links WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});
