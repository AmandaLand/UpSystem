# UpSystem — Product Backlog

Sistema desktop (Windows) para análise de armazenamento e desempenho do PC.
Identifica arquivos/dados desnecessários e gera relatórios de performance diários.

---

## Visão do Produto

Sistema que monitora uso de disco, CPU, memória e processos, identificando
**arquivos/dados desnecessários** e gerando **relatórios de performance** para
que o usuário decida, com segurança, o que remover — melhorando o desempenho
do PC no dia a dia.

---

## Épicos

| #  | Épico                       | Objetivo |
|----|-----------------------------|----------|
| E1 | Análise de Armazenamento    | Mapear o que ocupa espaço no disco |
| E2 | Detecção de Lixo/Duplicados | Encontrar arquivos removíveis com segurança |
| E3 | Monitoramento de Desempenho | Medir CPU, RAM, disco, inicialização |
| E4 | Relatórios & Dashboard      | Visualizar tendências diárias/semanais |
| E5 | Limpeza Assistida           | Remover com confirmação e backup |
| E6 | Alertas & Automação         | Avisar quando algo piorar |

---

## Product Backlog (priorizado por MoSCoW)

### Must Have (MVP)

| ID   | User Story | Critério de Aceite |
|------|-----------|--------------------|
| US01 | Como usuário, quero ver os **10 maiores arquivos/pastas** do disco para saber o que mais pesa | Lista ordenada por tamanho, com caminho e data de último acesso |
| US02 | Como usuário, quero identificar **arquivos temporários** (%TEMP%, cache, logs) para limpar com segurança | Lista agrupada por categoria com tamanho recuperável |
| US03 | Como usuário, quero **detectar arquivos duplicados** (hash MD5/SHA1) para remover cópias | Mostra original + duplicatas e espaço economizado |
| US04 | Como usuário, quero ver **espaço livre vs usado** por unidade em tempo real | Gráfico de pizza + alerta se <10% livre |
| US05 | Como usuário, quero **remover arquivos com confirmação** enviando para a lixeira (sem deletar direto) | Dialog de confirmação + log da ação |
| US06 | Como usuário, quero ver **uso atual de CPU/RAM/Disco** | Atualização a cada 2 segundos |

### Should Have

| ID   | User Story | Critério de Aceite |
|------|-----------|--------------------|
| US07 | Como usuário, quero um **relatório diário** (PDF/HTML) de uso do PC | Gerado às 23h com pico de CPU, RAM média e apps mais pesados |
| US08 | Como usuário, quero ver **programas que iniciam com o Windows** e desabilitar os desnecessários | Lista com impacto estimado na inicialização |
| US09 | Como usuário, quero ver **arquivos não acessados há +90 dias** | Filtro por data de último acesso |
| US10 | Como usuário, quero ver **top 10 processos consumidores** de CPU/RAM do dia | Histórico com média e pico |
| US11 | Como usuário, quero **histórico de 30 dias** de performance | Gráfico de linha com tendências |

### Could Have

| ID   | User Story | Critério de Aceite |
|------|-----------|--------------------|
| US12 | Limpeza agendada (semanal automática de temp/cache) | Agendador interno + log de execução |
| US13 | Detecção de arquivos grandes em Downloads/Área de Trabalho | Sugestão de mover para armazenamento externo |
| US14 | Análise de tamanho de pastas `node_modules`, `.venv`, caches de dev | Categoria "Dev Junk" com sugestão de remoção |
| US15 | Alerta quando disco >85% ou RAM >90% por 5min | Notificação nativa do Windows |
| US16 | Backup/undo da lista de deleções | Histórico de 30 dias restaurável |

### Won't Have (por enquanto)

- Otimização automática de registro do Windows
- Desfragmentação de disco
- Suporte a macOS/Linux

---

## Stack Sugerida

- **UI:** Electron + React *(ou Tauri + React — mais leve)*
- **Scanner de disco:** Node.js / Rust
- **Banco local:** SQLite (histórico de métricas)
- **Gráficos:** Chart.js ou Recharts
- **Métricas do sistema:** PowerShell / WMI / `systeminformation` (npm)

---

## Relatórios Planejados

1. **Diário** — CPU/RAM/Disco (média e pico) + apps mais usados
2. **Semanal** — Tendência de espaço em disco + top consumidores
3. **Mensal** — Economia total de limpezas + crescimento de pastas
4. **Sob demanda** — "O que mudou desde ontem?"

---

## Roadmap Sugerido

| Sprint | Entregas |
|--------|----------|
| Sprint 1 | US01, US04, US06 (scanner básico + dashboard ao vivo) |
| Sprint 2 | US02, US05 (limpeza de temporários com confirmação) |
| Sprint 3 | US03, US09 (duplicados + arquivos antigos) |
| Sprint 4 | US07, US10, US11 (relatórios e histórico) |
| Sprint 5 | US08, US15 (startup + alertas) |
| Sprint 6 | US12, US13, US14, US16 (automação e undo) |

---

## Definição de Pronto (DoD)

- Código revisado
- Testado manualmente no Windows 11
- Ação destrutiva sempre com confirmação
- Log persistido em SQLite
- Documentação mínima no README
