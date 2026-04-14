import { promises as fs } from 'node:fs';
import path from 'node:path';
import si from 'systeminformation';

const DATA_DIR = path.resolve(process.cwd(), '..', 'data');
const FILE = path.join(DATA_DIR, 'history.jsonl');

export type Snapshot = {
  ts: number;
  cpuPercent: number;
  memPercent: number;
  memUsedGB: number;
  drives: { mount: string; usagePercent: number; freeGB: number }[];
};

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

export async function captureSnapshot(): Promise<Snapshot> {
  const [cpu, mem, drives] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);
  const snap: Snapshot = {
    ts: Date.now(),
    cpuPercent: +cpu.currentLoad.toFixed(1),
    memPercent: +((mem.active / mem.total) * 100).toFixed(1),
    memUsedGB: +(mem.active / 1024 ** 3).toFixed(2),
    drives: drives.map((d) => ({
      mount: d.mount,
      usagePercent: +d.use.toFixed(1),
      freeGB: +((d.size - d.used) / 1024 ** 3).toFixed(2),
    })),
  };
  await ensureDir();
  await fs.appendFile(FILE, JSON.stringify(snap) + '\n', 'utf8');
  return snap;
}

export async function readHistory(sinceMs: number): Promise<Snapshot[]> {
  try {
    const content = await fs.readFile(FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const snaps: Snapshot[] = [];
    for (const line of lines) {
      try {
        const s = JSON.parse(line) as Snapshot;
        if (s.ts >= sinceMs) snaps.push(s);
      } catch {}
    }
    return snaps;
  } catch {
    return [];
  }
}

export function startHistoryLoop(intervalMs = 5 * 60 * 1000) {
  captureSnapshot().catch(() => {});
  setInterval(() => {
    captureSnapshot().catch(() => {});
  }, intervalMs);
}
