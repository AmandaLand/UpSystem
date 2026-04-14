import type { FastifyInstance } from 'fastify';
import si from 'systeminformation';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export async function registerDiskRoutes(app: FastifyInstance) {
  app.get('/usage', async () => {
    const drives = await si.fsSize();
    return {
      drives: drives.map((d) => ({
        mount: d.mount,
        fs: d.fs,
        type: d.type,
        totalGB: +(d.size / 1024 ** 3).toFixed(2),
        usedGB: +(d.used / 1024 ** 3).toFixed(2),
        freeGB: +((d.size - d.used) / 1024 ** 3).toFixed(2),
        usagePercent: +d.use.toFixed(1),
      })),
      ts: Date.now(),
    };
  });

  app.get('/largest', async (req) => {
    const { dir, limit = 10 } = req.query as { dir?: string; limit?: number };
    if (!dir) return { error: 'query param "dir" required' };

    const results = await scanLargest(dir, Number(limit));
    return { dir, largest: results, ts: Date.now() };
  });

  app.get('/stale', async (req) => {
    const { dir, days = 90, limit = 50 } = req.query as {
      dir?: string;
      days?: number;
      limit?: number;
    };
    if (!dir) return { error: 'query param "dir" required' };

    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
    const results = await scanStale(dir, cutoff, Number(limit));
    return { dir, days: Number(days), stale: results, ts: Date.now() };
  });

  app.get('/duplicates', async (req) => {
    const { dir, minSize = 1024 * 1024 } = req.query as { dir?: string; minSize?: number };
    if (!dir) return { error: 'query param "dir" required' };

    const groups = await findDuplicates(dir, Number(minSize));
    return { dir, groups, ts: Date.now() };
  });
}

type Entry = { path: string; sizeBytes: number; isDir: boolean };

async function scanLargest(root: string, limit: number): Promise<Entry[]> {
  const all: Entry[] = [];
  await walk(root, all, 0, 3);
  return all
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, limit)
    .map((e) => ({ ...e, sizeBytes: e.sizeBytes }));
}

async function walk(dir: string, out: Entry[], depth: number, maxDepth: number) {
  if (depth > maxDepth) return;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        const size = await dirSize(full);
        out.push({ path: full, sizeBytes: size, isDir: true });
        await walk(full, out, depth + 1, maxDepth);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        out.push({ path: full, sizeBytes: stat.size, isDir: false });
      }
    } catch {
      // ignorar arquivos sem permissão
    }
  }
}

type FileInfo = { path: string; sizeBytes: number; accessedAt: number; modifiedAt: number };

async function scanStale(root: string, cutoff: number, limit: number): Promise<FileInfo[]> {
  const out: FileInfo[] = [];
  await walkFiles(root, 0, 5, (info) => {
    if (info.accessedAt < cutoff) out.push(info);
  });
  return out.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, limit);
}

async function walkFiles(
  dir: string,
  depth: number,
  maxDepth: number,
  onFile: (info: FileInfo) => void
) {
  if (depth > maxDepth) return;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        await walkFiles(full, depth + 1, maxDepth, onFile);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        onFile({
          path: full,
          sizeBytes: stat.size,
          accessedAt: stat.atimeMs,
          modifiedAt: stat.mtimeMs,
        });
      }
    } catch {}
  }
}

async function findDuplicates(root: string, minSize: number) {
  const bySize = new Map<number, string[]>();
  await walkFiles(root, 0, 5, (info) => {
    if (info.sizeBytes < minSize) return;
    const list = bySize.get(info.sizeBytes) ?? [];
    list.push(info.path);
    bySize.set(info.sizeBytes, list);
  });

  const groups: { sizeBytes: number; hash: string; files: string[]; wastedBytes: number }[] = [];
  for (const [size, paths] of bySize) {
    if (paths.length < 2) continue;
    const byHash = new Map<string, string[]>();
    for (const p of paths) {
      try {
        const hash = await hashFile(p);
        const list = byHash.get(hash) ?? [];
        list.push(p);
        byHash.set(hash, list);
      } catch {}
    }
    for (const [hash, files] of byHash) {
      if (files.length < 2) continue;
      groups.push({
        sizeBytes: size,
        hash,
        files,
        wastedBytes: size * (files.length - 1),
      });
    }
  }
  groups.sort((a, b) => b.wastedBytes - a.wastedBytes);
  return groups.slice(0, 50);
}

async function hashFile(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(buf).digest('hex');
}

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else if (entry.isFile()) {
        const stat = await fs.stat(full);
        total += stat.size;
      }
    } catch {
      // ignorar
    }
  }
  return total;
}
