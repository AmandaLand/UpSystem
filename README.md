# UpSystem

Analisador de armazenamento e performance para Windows.
Mapeia o que ocupa espaço no disco, identifica arquivos desnecessários e
gera relatórios de CPU/RAM/Disco do dia a dia.

Consulte o [Product Backlog](BACKLOG.md) para a visão completa.

## Features

- 📊 **Dashboard ao vivo** — CPU, RAM, disco e top 10 processos
- 🧹 **Limpeza** — detecta temp, cache do Chrome/Edge, npm, Prefetch; envia pra Lixeira
- 🔍 **Explorar disco** — maiores arquivos/pastas e arquivos não acessados há 90+ dias
- 🧬 **Duplicados** — detecção por hash SHA1
- 📈 **Histórico** — gráfico de 30 dias (amostras a cada 5 min)
- 📄 **Relatório diário** — HTML pronto pra imprimir/salvar PDF

## Stack

- **Backend:** Node.js + Fastify + TypeScript + systeminformation + trash
- **Frontend:** Vite + React + TypeScript + Recharts
- **Bundler:** esbuild + `@yao-pkg/pkg` (gera `upsystem.exe`)

## Para testadores (rodar o .exe)

1. Baixe `upsystem.exe` + pasta `public/` (devem ficar lado a lado)
2. Clique duplo em `upsystem.exe`
3. O navegador abre automaticamente em http://localhost:3333

Nenhum Node.js necessário. Nada é apagado permanentemente — tudo vai para a Lixeira do Windows.

## Para desenvolvedores

### Rodar em desenvolvimento

```bash
npm install
npm run dev
```

- Backend: http://localhost:3333
- Frontend: http://localhost:5273

### Gerar o executável

```bash
npm run release
```

Gera `release/upsystem.exe` (~44 MB) + `release/public/` com os assets do frontend.

## Estrutura

```
upsystem/
├── backend/      Fastify + scanner + métricas
├── frontend/     UI React
├── scripts/      Build helpers
├── release/      upsystem.exe + public/ (gerados pelo build)
├── BACKLOG.md    Product backlog
└── README.md
```
