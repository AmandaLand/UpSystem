import type { FastifyInstance } from 'fastify';
import si from 'systeminformation';
import { readHistory } from '../lib/history.js';

export async function registerReportsRoutes(app: FastifyInstance) {
  app.get('/daily', async (_req, reply) => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const snaps = await readHistory(since);
    const [drives, procs] = await Promise.all([si.fsSize(), si.processes()]);

    const cpuAvg = avg(snaps.map((s) => s.cpuPercent));
    const cpuPeak = max(snaps.map((s) => s.cpuPercent));
    const memAvg = avg(snaps.map((s) => s.memPercent));
    const memPeak = max(snaps.map((s) => s.memPercent));

    const top = procs.list
      .sort((a, b) => b.cpu + b.mem - (a.cpu + a.mem))
      .slice(0, 10);

    const html = renderHtml({ cpuAvg, cpuPeak, memAvg, memPeak, drives, top, snapCount: snaps.length });
    reply.header('content-type', 'text/html; charset=utf-8');
    return html;
  });
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}
function max(arr: number[]) {
  if (!arr.length) return 0;
  return +Math.max(...arr).toFixed(1);
}

function renderHtml(d: {
  cpuAvg: number; cpuPeak: number; memAvg: number; memPeak: number;
  drives: si.Systeminformation.FsSizeData[];
  top: si.Systeminformation.ProcessesProcessData[];
  snapCount: number;
}): string {
  const now = new Date().toLocaleString('pt-BR');
  const driveRows = d.drives
    .map((x) => `<tr><td>${x.mount}</td><td>${(x.size / 1024 ** 3).toFixed(1)} GB</td><td>${(x.used / 1024 ** 3).toFixed(1)} GB</td><td>${x.use.toFixed(1)}%</td></tr>`)
    .join('');
  const procRows = d.top
    .map((p) => `<tr><td>${p.name}</td><td>${p.cpu.toFixed(1)}</td><td>${p.mem.toFixed(1)}</td></tr>`)
    .join('');
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório UpSystem — ${now}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 24px; color: #1e293b; }
h1 { margin-bottom: 4px; }
.sub { color: #64748b; margin-bottom: 32px; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.stat { background: #f1f5f9; padding: 16px; border-radius: 8px; }
.stat .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
.stat .value { font-size: 24px; font-weight: 600; margin-top: 4px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; }
th { background: #f8fafc; }
</style></head><body>
<h1>Relatório Diário — UpSystem</h1>
<div class="sub">Gerado em ${now} · ${d.snapCount} amostras nas últimas 24h</div>

<div class="grid">
  <div class="stat"><div class="label">CPU média</div><div class="value">${d.cpuAvg}%</div></div>
  <div class="stat"><div class="label">CPU pico</div><div class="value">${d.cpuPeak}%</div></div>
  <div class="stat"><div class="label">RAM média</div><div class="value">${d.memAvg}%</div></div>
  <div class="stat"><div class="label">RAM pico</div><div class="value">${d.memPeak}%</div></div>
</div>

<h2>Discos</h2>
<table><thead><tr><th>Unidade</th><th>Total</th><th>Usado</th><th>Uso</th></tr></thead><tbody>${driveRows}</tbody></table>

<h2>Top 10 processos (agora)</h2>
<table><thead><tr><th>Processo</th><th>CPU %</th><th>RAM %</th></tr></thead><tbody>${procRows}</tbody></table>
</body></html>`;
}
