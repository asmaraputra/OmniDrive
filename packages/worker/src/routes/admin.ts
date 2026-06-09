import { Hono } from 'hono';
import type { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';
import { AppError } from '../middleware/error-handler';
import { generateId } from '../lib/id';

export const adminRouter = new Hono<AppContext>({ strict: false });

adminRouter.use('*', authGuard);

// Middleware to protect admin routes
adminRouter.use('*', async (c, next) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT is_super_admin FROM users WHERE id = ?').bind(userId).first<{ is_super_admin: number }>();
  if (!user || user.is_super_admin !== 1) {
    throw new AppError(403, 'Forbidden: Super Admin access required');
  }
  await next();
});

adminRouter.get('/invitations', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM invitation_codes ORDER BY created_at DESC').all();
  return c.json({ invitations: results });
});

adminRouter.post('/invitations', async (c) => {
  const { code, max_uses } = await c.req.json();
  if (!code) throw new AppError(400, 'Code is required');
  
  const id = generateId();
  const userId = c.get('userId');
  
  await c.env.DB.prepare(
    'INSERT INTO invitation_codes (id, code, created_by, max_uses) VALUES (?, ?, ?, ?)'
  ).bind(id, code, userId, max_uses || 1).run();
  
  return c.json({ success: true, invitation: { id, code, created_by: userId, max_uses: max_uses || 1, used_count: 0 } });
});

adminRouter.delete('/invitations/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM invitation_codes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

adminRouter.get('/audit-logs', async (c) => {
  const db = c.env.DB;
  const { results } = await db.prepare(
    'SELECT a.*, u.email as actor_email, w.name as workspace_name FROM audit_logs a JOIN users u ON a.actor_id = u.id LEFT JOIN workspaces w ON a.workspace_id = w.id ORDER BY a.created_at DESC LIMIT 100'
  ).all();

  return c.json({ logs: results });
});
