import { useState } from 'react';
import { formatBytes } from '../lib/format';

type Group = { sizeBytes: number; hash: string; files: string[]; wastedBytes: number };

export default function Duplicates() {
  const [dir, setDir] = useState('C:\\Users');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setSelected(new Set());
    try {
      const res = await fetch(
        `/api/disk/duplicates?dir=${encodeURIComponent(dir)}&minSize=${1024 * 1024}`
      ).then((r) => r.json());
      if (res.error) setError(res.error);
      else setGroups(res.groups ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (p: string) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  };

  const totalWasted = groups.reduce((acc, g) => acc + g.wastedBytes, 0);
  const selectedSize = Array.from(selected).reduce((acc, p) => {
    for (const g of groups) if (g.files.includes(p)) return acc + g.sizeBytes;
    return acc;
  }, 0);

  const del = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Enviar ${selected.size} arquivo(s) para a Lixeira?\nEspaço: ${formatBytes(selectedSize)}`)) return;
    const res = await fetch('/api/cleanup/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paths: Array.from(selected) }),
    }).then((r) => r.json());
    const ok = res.results.filter((r: any) => r.ok).length;
    setMessage(`${ok}/${res.results.length} enviado(s) para a Lixeira.`);
    await scan();
  };

  return (
    <div className="card">
      <h2>Arquivos duplicados (≥ 1 MB)</h2>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input type="text" value={dir} onChange={(e) => setDir(e.target.value)} style={{ flex: 1 }} />
        <button onClick={scan} disabled={loading}>
          {loading ? 'Analisando (pode demorar)...' : 'Escanear duplicados'}
        </button>
      </div>
      {error && <div className="hint" style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}

      {groups.length > 0 && (
        <div className="hint" style={{ marginTop: 12 }}>
          {groups.length} grupo(s) · espaço recuperável: <strong>{formatBytes(totalWasted)}</strong>
          {selected.size > 0 && <> · selecionado: <strong>{formatBytes(selectedSize)}</strong></>}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.hash} style={{ marginTop: 16, padding: 12, background: '#0f172a', borderRadius: 6 }}>
          <div className="hint">
            {g.files.length} cópias · {formatBytes(g.sizeBytes)} cada · desperdício {formatBytes(g.wastedBytes)}
          </div>
          {g.files.map((f, i) => (
            <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 12, fontFamily: 'monospace' }}>
              <input
                type="checkbox"
                disabled={i === 0}
                checked={selected.has(f)}
                onChange={() => toggle(f)}
              />
              <span style={{ color: i === 0 ? '#22d3ee' : '#cbd5e1' }}>
                {i === 0 ? '[manter] ' : ''}{f}
              </span>
            </div>
          ))}
        </div>
      ))}

      {groups.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="danger" disabled={!selected.size} onClick={del}>
            Enviar para a Lixeira ({selected.size})
          </button>
          {message && <span className="hint">{message}</span>}
        </div>
      )}
    </div>
  );
}
