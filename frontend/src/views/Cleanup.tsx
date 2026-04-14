import { useEffect, useState } from 'react';
import { formatBytes } from '../lib/format';

type Category = {
  name: string;
  path: string;
  sizeBytes: number;
  fileCount: number;
  exists: boolean;
};

export default function Cleanup() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cleanup/temp').then((r) => r.json());
      setCategories(res.categories ?? []);
      setTotalBytes(res.totalBytes ?? 0);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scan();
  }, []);

  const toggle = (path: string) => {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };

  const selectedSize = categories
    .filter((c) => selected.has(c.path))
    .reduce((acc, c) => acc + c.sizeBytes, 0);

  const handleDelete = async () => {
    if (!selected.size) return;
    const confirm = window.confirm(
      `Enviar ${selected.size} pasta(s) para a Lixeira?\n\nEspaço estimado: ${formatBytes(selectedSize)}\n\nVocê poderá restaurar pela Lixeira do Windows.`
    );
    if (!confirm) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cleanup/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selected) }),
      }).then((r) => r.json());
      const okCount = res.results.filter((r: any) => r.ok).length;
      setMessage(`${okCount}/${res.results.length} enviado(s) para a Lixeira.`);
      await scan();
    } catch (err) {
      setMessage(`Erro: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Arquivos temporários e caches</h2>
        <button onClick={scan} disabled={loading}>
          {loading ? 'Analisando...' : 'Reescanear'}
        </button>
      </div>

      <div className="hint" style={{ marginTop: 8 }}>
        Total detectado: <strong>{formatBytes(totalBytes)}</strong>
        {selected.size > 0 && (
          <>
            {' '}· Selecionado: <strong>{formatBytes(selectedSize)}</strong>
          </>
        )}
      </div>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th></th>
            <th>Categoria</th>
            <th>Caminho</th>
            <th style={{ textAlign: 'right' }}>Arquivos</th>
            <th style={{ textAlign: 'right' }}>Tamanho</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.path} style={{ opacity: c.exists && c.sizeBytes > 0 ? 1 : 0.4 }}>
              <td>
                <input
                  type="checkbox"
                  disabled={!c.exists || c.sizeBytes === 0}
                  checked={selected.has(c.path)}
                  onChange={() => toggle(c.path)}
                />
              </td>
              <td>{c.name}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.path}</td>
              <td style={{ textAlign: 'right' }}>{c.fileCount.toLocaleString('pt-BR')}</td>
              <td style={{ textAlign: 'right' }}>{formatBytes(c.sizeBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          className="danger"
          disabled={!selected.size || deleting}
          onClick={handleDelete}
        >
          {deleting ? 'Enviando...' : `Enviar para a Lixeira (${selected.size})`}
        </button>
        {message && <span className="hint">{message}</span>}
      </div>

      <div className="hint" style={{ marginTop: 12, fontSize: 12 }}>
        ℹ️ Arquivos vão para a <strong>Lixeira</strong> do Windows — nada é apagado permanentemente.
        Você pode restaurar de lá a qualquer momento.
      </div>
    </div>
  );
}
