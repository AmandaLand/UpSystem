import type { FastifyInstance } from 'fastify';
import { getConfig, setConfig, getHistory, showToast, type AlertConfig } from '../lib/alerts.js';

export async function registerAlertsRoutes(app: FastifyInstance) {
  app.get('/config', async () => {
    return await getConfig();
  });

  app.post('/config', async (req, reply) => {
    const body = req.body as AlertConfig;
    if (!body || typeof body !== 'object') {
      return reply.code(400).send({ error: 'invalid config' });
    }
    await setConfig(body);
    return { ok: true };
  });

  app.get('/history', async (req) => {
    const { limit = 100 } = req.query as { limit?: number };
    const history = await getHistory(Number(limit));
    return { history, ts: Date.now() };
  });

  app.post('/test', async () => {
    showToast('🔔 UpSystem — Teste', 'Notificação de teste enviada com sucesso!');
    return { ok: true };
  });
}
