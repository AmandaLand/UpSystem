import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import si from 'systeminformation';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'alert-config.json');
const HISTORY_FILE = path.join(DATA_DIR, 'alerts.jsonl');

export type AlertConfig = {
  cpu: { enabled: boolean; threshold: number; sustainedChecks: number };
  memory: { enabled: boolean; threshold: number; sustainedChecks: number };
  disk: { enabled: boolean; freeGBMin: number };
  cooldownMinutes: number;
  checkIntervalSec: number;
};

export type AlertEvent = {
  ts: number;
  type: 'cpu' | 'memory' | 'disk';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
};

const DEFAULT_CONFIG: AlertConfig = {
  cpu: { enabled: true, threshold: 85, sustainedChecks: 3 },
  memory: { enabled: true, threshold: 90, sustainedChecks: 3 },
  disk: { enabled: true, freeGBMin: 10 },
  cooldownMinutes: 15,
  checkIntervalSec: 30,
};

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}

export async function getConfig(): Promise<AlertConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setConfig(config: AlertConfig): Promise<void> {
  await ensureDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export async function getHistory(limit = 100): Promise<AlertEvent[]> {
  try {
    const content = await fs.readFile(HISTORY_FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    const events: AlertEvent[] = [];
    for (const line of lines) {
      try { events.push(JSON.parse(line)); } catch {}
    }
    return events.reverse().slice(0, limit);
  } catch {
    return [];
  }
}

async function appendHistory(event: AlertEvent) {
  await ensureDir();
  await fs.appendFile(HISTORY_FILE, JSON.stringify(event) + '\n', 'utf8');
}

export function showToast(title: string, message: string) {
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");
  const ps = `
$ErrorActionPreference = 'SilentlyContinue'
[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $template.GetElementsByTagName('text')
$texts.Item(0).AppendChild($template.CreateTextNode('${escapedTitle}')) | Out-Null
$texts.Item(1).AppendChild($template.CreateTextNode('${escapedMessage}')) | Out-Null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('UpSystem').Show($toast)
`;
  try {
    const p = spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], {
      detached: true, stdio: 'ignore', windowsHide: true,
    });
    p.unref();
  } catch {}
}

type Streaks = { cpu: number; memory: number };
const lastAlertTs: Record<string, number> = {};

export function startAlertLoop() {
  const streaks: Streaks = { cpu: 0, memory: 0 };

  const tick = async () => {
    try {
      const config = await getConfig();
      const cooldownMs = config.cooldownMinutes * 60 * 1000;
      const [cpu, mem, drives] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize()]);

      const cpuVal = +cpu.currentLoad.toFixed(1);
      const memVal = +((mem.active / mem.total) * 100).toFixed(1);

      if (config.cpu.enabled) {
        if (cpuVal >= config.cpu.threshold) streaks.cpu++;
        else streaks.cpu = 0;
        if (streaks.cpu >= config.cpu.sustainedChecks && canFire('cpu', cooldownMs)) {
          await fire({ ts: Date.now(), type: 'cpu', severity: 'warning',
            message: `CPU em ${cpuVal}% por ${streaks.cpu} checagens seguidas`, value: cpuVal });
          streaks.cpu = 0;
        }
      }

      if (config.memory.enabled) {
        if (memVal >= config.memory.threshold) streaks.memory++;
        else streaks.memory = 0;
        if (streaks.memory >= config.memory.sustainedChecks && canFire('memory', cooldownMs)) {
          await fire({ ts: Date.now(), type: 'memory', severity: 'warning',
            message: `Memória em ${memVal}% (${(mem.active / 1024 ** 3).toFixed(1)} GB)`, value: memVal });
          streaks.memory = 0;
        }
      }

      if (config.disk.enabled) {
        for (const d of drives) {
          const freeGB = +((d.size - d.used) / 1024 ** 3).toFixed(2);
          if (freeGB < config.disk.freeGBMin && canFire(`disk-${d.mount}`, cooldownMs)) {
            await fire({ ts: Date.now(), type: 'disk', severity: 'critical',
              message: `Disco ${d.mount} com apenas ${freeGB} GB livres`, value: freeGB });
          }
        }
      }

      const interval = config.checkIntervalSec * 1000;
      setTimeout(tick, interval);
    } catch {
      setTimeout(tick, 60000);
    }
  };

  tick();
}

function canFire(key: string, cooldownMs: number): boolean {
  const last = lastAlertTs[key] ?? 0;
  if (Date.now() - last < cooldownMs) return false;
  lastAlertTs[key] = Date.now();
  return true;
}

async function fire(event: AlertEvent) {
  await appendHistory(event);
  const title = event.severity === 'critical' ? '🔴 UpSystem — Crítico' : '⚠️ UpSystem — Alerta';
  showToast(title, event.message);
}
