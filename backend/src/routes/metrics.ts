import type { FastifyInstance } from 'fastify';
import si from 'systeminformation';
import { readHistory } from '../lib/history.js';

export async function registerMetricsRoutes(app: FastifyInstance) {
  app.get('/live', async () => {
    const [cpu, mem, load] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.currentLoad(),
    ]);

    return {
      cpu: {
        usagePercent: Number(cpu.currentLoad.toFixed(1)),
        cores: load.cpus.map((c) => Number(c.load.toFixed(1))),
      },
      memory: {
        totalGB: +(mem.total / 1024 ** 3).toFixed(2),
        usedGB: +(mem.active / 1024 ** 3).toFixed(2),
        freeGB: +(mem.available / 1024 ** 3).toFixed(2),
        usagePercent: +((mem.active / mem.total) * 100).toFixed(1),
      },
      ts: Date.now(),
    };
  });

  app.get('/processes/top', async (req) => {
    const { limit = 10 } = req.query as { limit?: number };
    const procs = await si.processes();
    const top = procs.list
      .sort((a, b) => b.cpu + b.mem - (a.cpu + a.mem))
      .slice(0, Number(limit))
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: Number(p.cpu.toFixed(1)),
        memPercent: Number(p.mem.toFixed(1)),
      }));
    return { top, ts: Date.now() };
  });

  app.get('/history', async (req) => {
    const { days = 30 } = req.query as { days?: number };
    const since = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    const snaps = await readHistory(since);
    return { snapshots: snaps, ts: Date.now() };
  });
}
