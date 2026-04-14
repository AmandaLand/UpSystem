import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import trash from 'trash';

type TempCategory = {
  name: string;
  path: string;
  sizeBytes: number;
  fileCount: number;
  exists: boolean;
};

export async function registerCleanupRoutes(app: FastifyInstance) {
  app.get('/temp', async () => {
    const candidates = buildTempCandidates();
    const results: TempCategory[] = [];
    for (const c of candidates) {
      try {
        const stat = await fs.stat(c.path);
        if (!stat.isDirectory()) {
          results.push({ ...c, sizeBytes: 0, fileCount: 0, exists: false });
          continue;
        }
        const { size, count } = await scanDir(c.path);
        results.push({ ...c, sizeBytes: size, fileCount: count, exists: true });
      } catch {
        results.push({ ...c, sizeBytes: 0, fileCount: 0, exists: false });
      }
    }
    const totalBytes = results.reduce((acc, r) => acc + r.sizeBytes, 0);
    return { categories: results, totalBytes, ts: Date.now() };
  });

  app.post('/delete', async (req, reply) => {
    const body = req.body as { paths?: string[] };
    if (!body?.paths?.length) {
      return reply.code(400).send({ error: 'body.paths required' });
    }
    const results: { path: string; ok: boolean; error?: string }[] = [];
    for (const p of body.paths) {
      try {
        await trash(p);
        results.push({ path: p, ok: true });
      } catch (err) {
        results.push({ path: p, ok: false, error: (err as Error).message });
      }
    }
    return { results, ts: Date.now() };
  });
}

function buildTempCandidates(): { name: string; path: string }[] {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
  const tempEnv = process.env.TEMP ?? path.join(localAppData, 'Temp');

  return [
    { name: 'Temp do Usuário (%TEMP%)', path: tempEnv },
    { name: 'Windows Temp', path: 'C:\\Windows\\Temp' },
    { name: 'Prefetch', path: 'C:\\Windows\\Prefetch' },
    { name: 'Chrome Cache', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache') },
    { name: 'Edge Cache', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache') },
    { name: 'npm cache', path: path.join(localAppData, 'npm-cache') },
    { name: 'Downloads', path: path.join(home, 'Downloads') },
  ];
}

async function scanDir(dir: string): Promise<{ size: number; count: number }> {
  let size = 0;
  let count = 0;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { size, count };
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        const sub = await scanDir(full);
        size += sub.size;
        count += sub.count;
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        size += stat.size;
        count += 1;
      }
    } catch {
      // ignorar permissões negadas
    }
  }
  return { size, count };
}
