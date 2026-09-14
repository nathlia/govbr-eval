# govbr-eval

Evaluation harness of the thesis *"Um Framework de Validação de Interfaces Baseado em Agentes de
IA e Protocolo MCP"* (UFSM). **The answer key lives here** — deliberately outside both the system
under test (`govbr-corpus`) and the artifact being evaluated (`govbr-ds-validator`), so no tool or
agent can read the expected results from the code it is shown.

## Contents

```
govbr-eval/
├── ground-truth.json          gabarito of the injected TC-* suite (52 cases × tool)
├── ground-truth-fluxo.json    gabarito of the flow suite — unit is (element × rule)
├── organic-ground-truth.json  gabarito of the organic wing (official-package anomalies)
├── instrument.json            the INSTRUMENT version — single source, read by scorer and runner
├── adjudications.json         human verdicts on findings that matched no unit (D-21/D-30)
├── kb-aliases.json            generated: KB rule id → wcag:/emag:/ds: aliases
├── types.ts                   shared data model
├── scripts/
│   ├── run-axe.ts             axe-core baseline → results/axe-results.json
│   ├── run-eslint.ts          eslint-plugin-jsx-a11y baseline → results/eslint-results.json
│   ├── run-baselines-flow.ts  axe + eslint + validator baselines for the flow screen
│   ├── snapshot-real.ts       freeze real app routes as static pages (sha256 + manifest)
│   ├── anchors.ts             resolves a spec's selector against the live page (shadow DOM aware)
│   ├── units.ts               element × rule matching — TC-* suite
│   ├── units-flow.ts          element × rule matching — flow suite
│   ├── adjudication.ts        run inventory, finding identity, VERDICT SEMANTICS (shared)
│   ├── adjudicate.ts · adjudicate-all.ts · adjudicate-flow.ts   the adjudication workbench
│   ├── instrument.ts          reads instrument.json; gates incompatible runs
│   ├── score-results.ts       P/R/F1 for the TC-* + organic suites
│   ├── score-flow.ts          P/R/F1 for the flow suite, micro and per family
│   ├── gerar-pacote-revisao.ts  builds the review package handed to the human adjudicator
│   ├── lint-protocol.ts       fails if a SKILL.md carries domain knowledge (A6)
│   └── case-matrix.ts · generate-kb-aliases.ts · test-flow-units.ts
├── pipeline/run-battery.ps1   headless battery: one fresh agent session per run (D-16)
├── dashboard/                 Matriz de Detecção web UI (Vite + React, port 4000)
├── skills/                    the agent measurement protocols (procedure only — see below)
├── results/                   baselines + runs/ runs-ablacao/ runs-fluxo/ runs-fluxo-ablacao/
├── reports/                   validation reports saved by the oracle's save_report tool
└── docs/                      evaluation design notes, diagnostics, review packages
```

## Workflow

```bash
npm install                          # once (also installs Playwright Chromium)
npm --prefix dashboard install       # once

# 1. start the corpus:      cd ../govbr-corpus && npm run dev   → :3000
# 2. start the dashboard:   npm run dashboard                   → :4000

# baselines — measured, never assumed (D-06)
npm run axe                # axe-core over the TC-* suite (or the ▶ button in the dashboard)
npm run eslint             # jsx-a11y over the corpus source
npm run baselines:fluxo    # axe + eslint + validator over the flow screen

# agent runs
pwsh pipeline/run-battery.ps1            # the battery; -Scope smoke checks plumbing without paying
/evaluate-all      in Claude Code        # TC-* suite, per-case verdicts
/evaluate-screen   in Claude Code        # a single screen (the flow suite, a real capture)

# scoring
npm run score            # TC-* + organic: floor AND adjudicated, per tool and per category
npm run score:fluxo      # flow suite: micro (element × rule) and per family
npm run ancoras          # what each flow spec's selector resolves to on the live page

# adjudication
npm run adjudicate -- --blind    # judge findings that matched no unit
npm run pacote:revisao           # regenerate docs/pacote-revisao-fluxo.md from current leftovers

# guards
npm run lint:protocol · npm run lint:skills · npm run test:flow · npm run typecheck
```

## The four suites, and why they never mix

| Suite | Unit | Gabarito | Scored by |
|---|---|---|---|
| `TC-*` injected | case, and (element × rule) | `ground-truth.json` (52 cases) | `npm run score` |
| Organic | case | `organic-ground-truth.json` (6) | `npm run score` (separate block) |
| Flow | **(element × rule)**, anchored live | `ground-truth-fluxo.json` 1.4.0 (9 specs → 22 units) | `npm run score:fluxo` |
| Real | — | none: adjudication is the instrument | — |

Different instruments over different pages. Their numbers are **never summed or averaged** with
each other (D-13). The scorer additionally groups by arm × model × coverage × protocol hash ×
validator version — runs collected under different oracle builds are never averaged together.

`docs/ancoragem.md` explains how a spec's selector is resolved into units, including shadow-DOM
traversal and `scope: "todos"` (which forces *enumerating* every instance of a shared violation
rather than pointing at one).

## Instrument version ≠ gabarito version (D-31)

Two axes that used to be one field, which orphaned a perfectly comparable run:

- **Instrument** (`instrument.json`) — the *contract*: matching semantics, anchoring, verdict
  vocabulary, tool profile, client permissions. It is the compatibility gate. Bump it when an
  archived run stops being comparable.
- **Gabarito** (`_meta.version` in each ground-truth file) — the *reference data*: which units
  exist on the page. Bump it when a unit enters, leaves, or changes scope. It **invalidates
  nothing** — it changes the number a run produces, which is why it is printed and stamped
  alongside the instrument on every read.

Numbers measured under different gabarito versions do not compare directly, even under the same
instrument.

## Adjudication

A finding that matches no expected unit is charged as a false positive until a human judges it, so
precision is a **floor** while verdicts are pending. `npm run score` always prints the floor next
to the adjudicated figure — never one in place of the other.

Verdicts: `falso-positivo` · `lacuna-gabarito` · `vocabulario` · `deteccao-correta` · `duplicado` ·
`indeterminado` · `composto`. A verdict without a `rationale` is not applied. `composto` (D-30) is
for a claim that asserts **more than one defect** — the test is *would fixing one fix the other?* —
and is decided per component, though the claim is charged once. The semantics live in
`scripts/adjudication.ts` and are imported by both scorers: there is exactly one verdict `switch`
in the repository, on purpose.

Procedure: `docs/adjudicacao.md`. The package a human adjudicator receives:
`docs/pacote-revisao-fluxo.md`.

## Validity rules

- Agents being measured must never read any gabarito or the corpus source — they see only the
  running app at `http://localhost:3000`.
- Baselines are **measured in-session**, never inherited or assumed (D-06). A unit entering a
  gabarito means re-running the baselines for that suite.
- `results/` and `reports/` are generated artifacts; commit them only when snapshotting an
  experiment for the thesis.
- **Whoever authored a screen or gabarito does not write the verdicts on it** (11.9). Naming the
  party matters, because the rule was being read backwards: `/fluxo.html` and
  `ground-truth-fluxo.json` were **drafted by the assistant**, under the author's direction. The
  author never enumerated the injected defects and holds no list of them, so she is not the party
  the rule disqualifies. What she has is **per-spec exposure**, from the decisions she argued:
  V-06 (D-31), V-07 and the two 16px `<h2>` (D-32), V-04 (D-33). Where exposure exists, her
  verdict is stamped with it or goes to someone else; where it does not, she reviews as
  independently as any outside reader. See `docs/adjudicacao.md § Quem pode julgar`.
- A protocol carries **procedure only**. Domain knowledge — DS rules, token values, component
  specs — lives in the oracle and never inside a `SKILL.md`. This is requirement A6, it is
  validity and not tidiness, and `npm run lint:protocol` enforces it in the battery preflight.

## Related repositories

- `govbr-ds-validator` — the MCP oracle server (the thesis artifact)
- `govbr-corpus` — the React app under test (no answer key)
- `thesis-workspace/entregas.md` — what was delivered and when
- `thesis-workspace/tcc2-decisions-log.md` — why any of this is shaped the way it is
