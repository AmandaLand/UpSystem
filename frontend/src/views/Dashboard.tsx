import { useEffect, useState } from 'react';

type Live = {
  cpu: { usagePercent: number };
  memory: { totalGB: number; usedGB: number; usagePercent: number };
};

type Drive = {
  mount: string;
  totalGB: number;
  usedGB: number;
  freeGB: number;
  usagePercent: number;
};

type Proc = { pid: number; name: string; cpu: number; memPercent: number };

export default function Dashboard() {
  const [live, setLive] = useState<Live | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [procs, setProcs] = useState<Proc[]>([]);

  useEffect(() => {
    const tick = async () => {
      try {
        const [l, d, p] = await Promise.all([
          fetch('/api/metrics/live').then((r) => r.json()),
          fetch('/api/disk/usage').then((r) => r.json()),
          fetch('/api/metrics/processes/top?limit=10').then((r) => r.json()),
        ]);
        setLive(l);
        setDrives(d.drives ?? []);
        setProcs(p.top ?? []);
      } catch (err) {
        console.error(err);
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="grid">
        <div className="card">
          <h2>CPU</h2>
          <div className="metric">{live?.cpu.usagePercent ?? '--'}%</div>
          <div className="bar"><div style={{ width: `${live?.cpu.usagePercent ?? 0}%` }} /></div>
        </div>

        <div className="card">
          <h2>Memória</h2>
          <div className="metric">{live?.memory.usagePercent ?? '--'}%</div>
          <div className="bar"><div style={{ width: `${live?.memory.usagePercent ?? 0}%` }} /></div>
          <div className="hint">
            {live ? `${live.memory.usedGB} GB / ${live.memory.totalGB} GB` : '--'}
          </div>
        </div>

        {drives.map((d) => (
          <div className="card" key={d.mount}>
            <h2>Disco {d.mount}</h2>
            <div className="metric">{d.usagePercent}%</div>
            <div className="bar"><div style={{ width: `${d.usagePercent}%` }} /></div>
            <div className="hint">
              {d.usedGB} GB usados · {d.freeGB} GB livres · {d.totalGB} GB total
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Top 10 processos (CPU + RAM)</h2>
        <table>
          <thead>
            <tr><th>PID</th><th>Processo</th><th>CPU %</th><th>RAM %</th></tr>
          </thead>
          <tbody>
            {procs.map((p) => (
              <tr key={p.pid}>
                <td>{p.pid}</td>
                <td>{p.name}</td>
                <td>{p.cpu}</td>
                <td>{p.memPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
