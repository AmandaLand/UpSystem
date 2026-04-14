import { useEffect, useState } from 'react';

type Config = {
  cpu: { enabled: boolean; threshold: number; sustainedChecks: number };
  memory: { enabled: boolean; threshold: number; sustainedChecks: number };
  disk: { enabled: boolean; freeGBMin: number };
  cooldownMinutes: number;
  checkIntervalSec: number;
};

type Event = { ts: number; type: string; severity: string; message: string; value: number };

export default function Alerts() {
  const [config, setConfig] = useState<Config | null>(null);
  const [history, setHistory] = useState<Event[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [c, h] = await Promise.all([
      fetch('/api/alerts/config').then((r) => r.json()),
      fetch('/api/alerts/history?limit=50').then((r) => r.json()),
    ]);
    setConfig(c);
    setHistory(h.history ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      await fetch('/api/alerts/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config),
      });
      setMsg('Configuração salva.');
    } finally {
      setSaving(false);
    }
  };

  const testToast = async () => {
    await fetch('/api/alerts/test', { method: 'POST' });
    setMsg('Toast de teste disparado — olha a notificação do Windows!');
  };

  if (!config) return <div className="card">Carregando...</div>;

  const update = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig({ ...config, [key]: value });

  return (
    <>
      <div className="card">
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Configuração de alertas</h2>
          <button onClick={testToast}>🔔 Testar notificação</button>
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Alertas são disparados como toast nativo do Windows quando o sistema fica sobrecarregado.
        </div>

        <div className="alert-row">
          <label>
            <input
              type="checkbox"
              checked={config.cpu.enabled}
              onChange={(e) => update('cpu', { ...config.cpu, enabled: e.target.checked })}
            />
            <strong>CPU</strong> alta
          </label>
          <span className="hint">acima de</span>
          <input type="number" min={50} max={100} value={config.cpu.threshold}
            onChange={(e) => update('cpu', { ...config.cpu, threshold: Number(e.target.value) })}
            style={{ width: 70 }} />
          <span className="hint">% por</span>
          <input type="number" min={1} max={20} value={config.cpu.sustainedChecks}
            onChange={(e) => update('cpu', { ...config.cpu, sustainedChecks: Number(e.target.value) })}
            style={{ width: 60 }} />
          <span className="hint">checagens seguidas</span>
        </div>

        <div className="alert-row">
          <label>
            <input
              type="checkbox"
              checked={config.memory.enabled}
              onChange={(e) => update('memory', { ...config.memory, enabled: e.target.checked })}
            />
            <strong>Memória</strong> alta
          </label>
          <span className="hint">acima de</span>
          <input type="number" min={50} max={100} value={config.memory.threshold}
            onChange={(e) => update('memory', { ...config.memory, threshold: Number(e.target.value) })}
            style={{ width: 70 }} />
          <span className="hint">% por</span>
          <input type="number" min={1} max={20} value={config.memory.sustainedChecks}
            onChange={(e) => update('memory', { ...config.memory, sustainedChecks: Number(e.target.value) })}
            style={{ width: 60 }} />
          <span className="hint">checagens</span>
        </div>

        <div className="alert-row">
          <label>
            <input
              type="checkbox"
              checked={config.disk.enabled}
              onChange={(e) => update('disk', { ...config.disk, enabled: e.target.checked })}
            />
            <strong>Disco</strong> cheio
          </label>
          <span className="hint">menos de</span>
          <input type="number" min={1} max={100} value={config.disk.freeGBMin}
            onChange={(e) => update('disk', { ...config.disk, freeGBMin: Number(e.target.value) })}
            style={{ width: 70 }} />
          <span className="hint">GB livres</span>
        </div>

        <div className="alert-row">
          <span className="hint">Checar a cada</span>
          <input type="number" min={10} max={600} value={config.checkIntervalSec}
            onChange={(e) => setConfig({ ...config, checkIntervalSec: Number(e.target.value) })}
            style={{ width: 70 }} />
          <span className="hint">segundos · cooldown de</span>
          <input type="number" min={1} max={120} value={config.cooldownMinutes}
            onChange={(e) => setConfig({ ...config, cooldownMinutes: Number(e.target.value) })}
            style={{ width: 70 }} />
          <span className="hint">minutos entre alertas do mesmo tipo</span>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configuração'}</button>
          {msg && <span className="hint">{msg}</span>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row-between">
          <h2 style={{ margin: 0 }}>Histórico de alertas</h2>
          <button onClick={load}>Atualizar</button>
        </div>
        {history.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>Nenhum alerta disparado ainda. 🎉</div>
        ) : (
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Quando</th><th>Tipo</th><th>Severidade</th><th>Mensagem</th></tr>
            </thead>
            <tbody>
              {history.map((e, i) => (
                <tr key={i}>
                  <td>{new Date(e.ts).toLocaleString('pt-BR')}</td>
                  <td>{e.type}</td>
                  <td style={{ color: e.severity === 'critical' ? '#f87171' : '#fbbf24' }}>
                    {e.severity}
                  </td>
                  <td>{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
