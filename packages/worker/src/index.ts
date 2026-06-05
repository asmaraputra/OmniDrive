import { Hono } from 'hono';
import type { AppContext } from './types/env';

const app = new Hono<AppContext>();

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Sync handler — implemented in Task 17
    console.log('Cron triggered:', event.cron);
  },
} satisfies ExportedHandler<Env>;

// Re-export for Hono's type inference
import type { Env } from './types/env';
