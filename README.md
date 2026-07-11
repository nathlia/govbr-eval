# govbr-eval

Evaluation harness of the thesis *"Um Framework de Validação de Interfaces Baseado em Agentes de
IA e Protocolo MCP"* (UFSM). **The answer key lives here** — deliberately outside both the system
under test (`govbr-corpus`) and the artifact being evaluated (`govbr-ds-validator`), so no tool or
agent can read the expected results from the code it is shown.

## Contents

```
govbr-eval/
├── ground-truth.json        the gabarito: expected detection per case × tool, with categories
├── scripts/
│   ├── run-axe.js           axe-core baseline against the corpus → results/axe-results.json
│   └── score-results.js     precision / recall / F1 per tool vs. ground truth
├── dashboard/               Matriz de Detecção web UI (Vite + React, port 4000)
├── skills/evaluate-all/     the agent measurement protocol (per-case verdicts)
├── results/                 axe-results.json + agent-results.json (generated)
├── reports/                 validation reports saved by the oracle's save_report tool
└── docs/                    evaluation design notes
```

## Workflow

```bash
npm install                          # once (also installs Playwright Chromium)
npm --prefix dashboard install       # once

# 1. start the corpus:      cd ../govbr-corpus && npm run dev   → :3000
# 2. start the dashboard:   npm run dashboard                   → :4000
# 3. axe baseline:          npm run axe        (or ▶ button in the dashboard)
# 4. agent run:             /evaluate-all in Claude Code (writes results/agent-results.json)
# 5. score:                 npm run score      (npm run score:verbose for per-case)
```

The dashboard reads `ground-truth.json` plus both result files and renders the detection matrix,
per-tool metrics, and the agent-only violation callout. Case IDs link back to the corpus
(`CORPUS_URL` env var overrides `http://localhost:3000`).

## Validity rules

- Agents being measured must never read `ground-truth.json` or the corpus source — they see only
  the running app at `http://localhost:3000`.
- `results/` and `reports/` are generated artifacts; commit them only when snapshotting an
  experiment for the thesis.

## Related repositories

- `govbr-ds-validator` — the MCP oracle server (the thesis artifact)
- `govbr-corpus` — the React app under test
