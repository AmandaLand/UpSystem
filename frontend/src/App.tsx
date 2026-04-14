import { useState } from 'react';
import Dashboard from './views/Dashboard';
import Cleanup from './views/Cleanup';
import Largest from './views/Largest';
import Duplicates from './views/Duplicates';
import History from './views/History';
import Alerts from './views/Alerts';

type Tab = 'dashboard' | 'cleanup' | 'largest' | 'duplicates' | 'history' | 'alerts';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'cleanup', label: 'Limpeza' },
    { id: 'largest', label: 'Explorar disco' },
    { id: 'duplicates', label: 'Duplicados' },
    { id: 'history', label: 'Histórico' },
    { id: 'alerts', label: 'Alertas' },
  ];

  return (
    <div className="app">
      <h1>UpSystem</h1>
      <div className="subtitle">Análise de armazenamento e performance</div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard />}
      {tab === 'cleanup' && <Cleanup />}
      {tab === 'largest' && <Largest />}
      {tab === 'duplicates' && <Duplicates />}
      {tab === 'history' && <History />}
      {tab === 'alerts' && <Alerts />}
    </div>
  );
}
