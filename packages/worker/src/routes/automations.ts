import { Hono } from 'hono';
import type { AppContext } from '../types/env';
import { generateId } from '../lib/id';
import { authGuard } from '../middleware/auth-guard';
import { AppError } from '../middleware/error-handler';

export const automationsRouter = new Hono<AppContext>({ strict: false });
automationsRouter.use('*', authGuard);

interface AutomationRuleRecord {
  id: string;
  user_id: string;
  name: string;
  trigger_type: string;
  trigger_config: string | null;
  conditions: string | null;
  actions: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface AutomationRuleBody {
  name: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  conditions?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
}

automationsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare('SELECT * FROM automation_rules WHERE user_id = ?').bind(userId).all<AutomationRuleRecord>();
  
  const safeParse = (str: string | null, fallback: any) => {
    try {
      return str ? JSON.parse(str) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  return c.json({
    rules: results.map((r) => ({
      ...r,
      trigger_config: safeParse(r.trigger_config, {}),
      conditions: safeParse(r.conditions, []),
      actions: safeParse(r.actions, []),
      is_active: Boolean(r.is_active)
    }))
  });
});

automationsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<AutomationRuleBody>();
  
  if (!body.name || !body.trigger_type) {
    throw new AppError(400, 'name and trigger_type are required');
  }
  
  const id = generateId();
  
  await c.env.DB.prepare(`
    INSERT INTO automation_rules (id, user_id, name, trigger_type, trigger_config, conditions, actions) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, body.name, body.trigger_type, 
    JSON.stringify(body.trigger_config || {}), 
    JSON.stringify(body.conditions || []), 
    JSON.stringify(body.actions || [])
  ).run();
  
  return c.json({ id, success: true }, 201);
});

automationsRouter.patch('/:id/toggle', async (c) => {
  const userId = c.get('userId');
  const ruleId = c.req.param('id');
  const body = await c.req.json<{ is_active: boolean }>();
  
  if (typeof body.is_active !== 'boolean') {
    throw new AppError(400, 'is_active must be a boolean');
  }
  
  const { meta } = await c.env.DB.prepare('UPDATE automation_rules SET is_active = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?')
    .bind(body.is_active ? 1 : 0, ruleId, userId).run();
    
  if (meta.changes === 0) {
    throw new AppError(404, 'Automation rule not found');
  }
    
  return c.json({ success: true });
});
