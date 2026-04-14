import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { registerMetricsRoutes } from './routes/metrics.js';
import { registerDiskRoutes } from './routes/disk.js';
import { registerCleanupRoutes } from './routes/cleanup.js';
import { registerReportsRoutes } from './routes/reports.js';
import { registerAlertsRoutes } from './routes/alerts.js';
import { startHistoryLoop } from './lib/history.js';
import { startAlertLoop } from './lib/alerts.js';

async function main() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(registerMetricsRoutes, { prefix: '/api/metrics' });
  await app.register(registerDiskRoutes, { prefix: '/api/disk' });
  await app.register(registerCleanupRoutes, { prefix: '/api/cleanup' });
  await app.register(registerReportsRoutes, { prefix: '/api/reports' });
  await app.register(registerAlertsRoutes, { prefix: '/api/alerts' });

  app.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

  const isProd = process.env.NODE_ENV === 'production' || !!(process as any).pkg;

  if (isProd) {
    const root = resolveStaticRoot();
    await app.register(fastifyStatic, { root, prefix: '/' });
  }

  const port = Number(process.env.PORT ?? 3333);
  await app.listen({ port, host: '127.0.0.1' });
  startHistoryLoop();
  startAlertLoop();
  if (!isProd) {
    console.log(`UpSystem rodando em http://localhost:${port}`);
  }
  if (isProd && process.env.UPSYSTEM_NO_OPEN !== '1') {
    try { spawn('cmd', ['/c', 'start', '', `http://localhost:${port}`], { detached: true, stdio: 'ignore' }).unref(); } catch {}
  }
}

function resolveStaticRoot(): string {
  if ((process as any).pkg) {
    return path.join(path.dirname(process.execPath), 'public');
  }
  return path.resolve(process.cwd(), 'frontend', 'dist');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
