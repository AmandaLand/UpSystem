import { useState } from 'react';
import { formatBytes } from '../lib/format';

type Entry = { path: string; sizeBytes: number; isDir?: boolean; accessedAt?: number };
type Mode = 'largest' | 'stale';

export default function Largest() {
  const [dir, setDir] = useState<string>('C:\\Users');
  const [mode, setMode] = useState<Mode>('largest');
  const [days, setDays] = useState(90);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        mode === 'largest'
          ? `/api/disk/largest?dir=${encodeURIComponent(dir)}&limit=20`
          : `/api/disk/stale?dir=${encodeURIComponent(dir)}&days=${days}&limit=50`;
      const res = await fetch(url).then((r) => r.json());
      if (res.error) {
        setError(res.error);
        setEntries([]);
      } else {
        setEntries(mode === 'largest' ? res.largest ?? [] : res.stale ?? []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Explorar disco</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={mode === 'largest' ? 'active' : ''} onClick={() => setMode('largest')}>
            Maiores
          </button>
          <button className={mode === 'stale' ? 'active' : ''} onClick={() => setMode('stale')}>
            Antigos (não acessados)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          type="text"
          value={dir}
          onChange={(e) => setDir(e.target.value)}
          placeholder="C:\Users\SeuUsuario"
          style={{ flex: 1 }}
        />
        {mode === 'stale' && (
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: 90 }}
            title="dias sem acesso"
          />
        )}
        <button onClick={scan} disabled={loading}>
          {loading ? 'Escaneando...' : 'Escanear'}
        </button>
      </div>
      {error && <div className="hint" style={{ color: '#f87171', marginTop: 8 }}>{error}</div>}
      {loading && <div className="hint" style={{ marginTop: 8 }}>Isso pode levar alguns segundos...</div>}

      {entries.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Caminho</th>
              {mode === 'stale' && <th>Último acesso</th>}
              <th style={{ textAlign: 'right' }}>Tamanho</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.path}>
                <td>{e.isDir ? '📁' : '📄'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.path}</td>
                {mode === 'stale' && (
                  <td style={{ fontSize: 12, color: '#94a3b8' }}>
                    {e.accessedAt ? new Date(e.accessedAt).toLocaleDateString('pt-BR') : '-'}
                  </td>
                )}
                <td style={{ textAlign: 'right' }}>{formatBytes(e.sizeBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
