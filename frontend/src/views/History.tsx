import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

type Snap = {
  ts: number;
  cpuPercent: number;
  memPercent: number;
  drives: { mount: string; usagePercent: number }[];
};

export default function History() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [days, setDays] = useState(30);

  const load = async (d: number) => {
    const res = await fetch(`/api/metrics/history?days=${d}`).then((r) => r.json());
    setSnaps(res.snapshots ?? []);
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const data = snaps.map((s) => ({
    time: new Date(s.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    CPU: s.cpuPercent,
    RAM: s.memPercent,
    DiscoC: s.drives.find((d) => d.mount === 'C:')?.usagePercent ?? null,
  }));

  return (
    <div className="card">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Histórico de performance</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 7, 30].map((d) => (
            <button key={d} className={d === days ? 'active' : ''} onClick={() => setDays(d)}>
              {d === 1 ? '24h' : `${d} dias`}
            </button>
          ))}
          <a href="/api/reports/daily" target="_blank" rel="noreferrer">
            <button>Abrir relatório diário</button>
          </a>
        </div>
      </div>

      <div className="hint" style={{ marginTop: 8 }}>
        {snaps.length} amostras · uma a cada 5 minutos
      </div>

      {snaps.length === 0 ? (
        <div className="hint" style={{ marginTop: 16 }}>
          Sem dados ainda. O histórico é gravado a cada 5 min — volte em alguns minutos.
        </div>
      ) : (
        <div style={{ width: '100%', height: 320, marginTop: 16 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Legend />
              <Line type="monotone" dataKey="CPU" stroke="#22d3ee" dot={false} />
              <Line type="monotone" dataKey="RAM" stroke="#a78bfa" dot={false} />
              <Line type="monotone" dataKey="DiscoC" stroke="#f472b6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
