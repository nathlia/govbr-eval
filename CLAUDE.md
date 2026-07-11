# govbr-eval

Evaluation harness: ground truth + baselines + scoring + results dashboard. Node 18+ (`nvm use 25`).

- `ground-truth.json` — the gabarito (case × tool expected detection). It lives HERE on purpose:
  never copy it into `govbr-corpus` or `govbr-ds-validator`.
- `npm run axe` — axe-core baseline against the corpus at :3000
- `npm run score` / `score:verbose` — P/R/F1 per tool
- `npm run dashboard` — Matriz de Detecção at :4000 (axe ▶ button + result views)
- `skills/evaluate-all/SKILL.md` — protocol for measuring the agent's per-case verdicts.
  When running it, do NOT read `ground-truth.json` first; verdicts come from the live app only.

When a new case is added to the corpus, add its entry to `ground-truth.json` in the same change
(id, page, description, violations, categories, expected detection per tool).
