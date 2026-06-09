import { Hono } from 'hono';
import type { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';

export const adminRouter = new Hono<AppContext>({ strict: false });

adminRouter.use('*', authGuard);

adminRouter.get('/audit-logs', async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  const user = await db.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>();
  if (!user || !user.email.endsWith('@omnidrive.app')) { 
    return c.json({ error: 'Forbidden. Super Admin only.' }, 403);
  }

  const { results } = await db.prepare(
    'SELECT a.*, u.email as actor_email, w.name as workspace_name FROM audit_logs a JOIN users u ON a.actor_id = u.id LEFT JOIN workspaces w ON a.workspace_id = w.id ORDER BY a.created_at DESC LIMIT 100'
  ).all();

  return c.json({ logs: results });
});
