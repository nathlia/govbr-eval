# Screen A — component list and draw procedure

**Status:** FROZEN 2026-09-18 — the commit that carries this line is the seed. Eligibility enumerated (§ 2); nothing drawn, built or measured.
**Decision:** D-49 · **Plan:** `thesis-workspace/deliverables/fatia8-telas-intocadas-plano.md`.
**Why this file lives here:** the commit that freezes it supplies the seed (§ 4), and everything the
draw reads (this text, the instance inventory, the eligibility list, the draw script) must be in
that same commit. It is answer-key material, so it never goes to `govbr-corpus`.

§ 1 was settled by the author on 2026-09-18. The counts of § 3 are accepted as defaults and are
confirmed once § 2 is frozen.

---

## 1. Component list (plan step 1)

### How it was fixed

From the service-request form pattern named in D-49, checked against two facts only: the 36
component names of the KB (`normalized/components/`) and the `br-*` components each corpus page
already uses. **No rule content was opened, no per-component rule count was taken, and
`checker-aliases.json` was not read** — the list cannot lean toward what the oracle checks.

What the flow screen (`LoginPage.tsx`) uses: `br-input`, `br-button`, `br-item`, `br-list`,
`br-tag`, `br-divider`.

### Drawable components — the defect population comes only from these

| # | Component (KB name) | Instances on the screen | Instance ids |
|---|---|---|---|
| 1 | `select` | 2 — "Tipo de serviço", "Unidade de atendimento" | `sel-servico`, `sel-unidade` |
| 2 | `radio` | 1 group, 3 options — "Forma de atendimento" | `rad-forma` (`-1..-3`) |
| 3 | `checkbox` | 1 group of 2 — "Recursos de acessibilidade"; 1 single — declaration of truthfulness | `chk-recursos` (`-1`, `-2`), `chk-declaracao` |
| 4 | `datetimepicker` | 1, date only — "Data preferencial" | `dat-preferencial` |
| 5 | `textarea` | 1 — "Descrição da solicitação" | `txa-descricao` |
| 6 | `upload` | 1 — "Documentos comprobatórios" | `upl-documentos` |
| 7 | `table` | 1 — "Solicitações anteriores", 5 rows × 4 columns, no row selection | `tab-anteriores` |
| 8 | `pagination` | 1, under the table | `pag-anteriores` |
| 9 | `message` | 1, feedback after an empty submit (state S1) | `msg-retorno` |
| 10 | `modal` (+ `scrim`) | 1, confirmation on "Cancelar" (state S2) | `mod-descartar` |

None of the ten appears on the flow screen (requirement 3 of the plan).

### Scaffold — on the screen, conforming, **outside the draw**

`input` × 2 ("Nome completo", "CPF") and `button` × 3 ("Enviar", "Cancelar", modal actions). A form
without a text field and a submit button is not coherent, but both are the flow screen's
components and the instrument was developed on them. They are built to the canonical markup, carry
no injected defect, and serve as decoy hosts (§ 4).

`skiplink` × 1 ("Ir para o conteúdo") and `breadcrumb` × 1 joined the scaffold on 2026-09-18, after
the enumeration showed that e-MAG requires both at page level (§ 2): without them the screen would
carry two standing violations nobody injected, and both arms would keep reporting them. They were
added knowing the rules, which is why they are scaffold and not drawable — the defect population
did not change (23 eligible before and after).

Rules whose `component` is a scaffold component are rejected at eligibility with reason `scaffold`.

Not on the screen: header, footer, menu — the flow screen has none either, and they would add
units unrelated to the form.

### States

- **S0** initial load.
- **S1** "Enviar" with the form empty → `msg-retorno` plus field-level invalid states.
- **S2** "Cancelar" → `mod-descartar` open over the scrim.

Settled by the author on 2026-09-18: **two conditional states** (S1 and S2); `textarea` stays;
name "Solicitar serviço", entry `solicitacao.html`, reference `ground-truth-solicitacao.json`
(neither names a defect — D-24). Row 10 covers two KB component names, `modal` and `scrim`, on the
same instance; the drawable names are therefore eleven.

---

## 2. Eligibility (plan step 2) — criteria written before any rule is read

**Population.** `normalized/rules.jsonl` of KB 3.7.0 — 186 rules (95 gov.br DS, 45 e-MAG, 46 with
no `standard`). Its sha256 is recorded in the eligibility file. No other rule source.

**Pass 1 — mechanical, by script, fields only:**

| Code | Criterion | Rejection reason recorded |
|---|---|---|
| E1 | `force ∈ {required, prohibited}` (D-12) | `force` |
| E2 | `status = stable` (all 186 are today; kept so a KB update cannot slip a legacy rule in) | `status` |
| E3 | `component` ∈ the eleven drawable names of `tela-a/inventario.json`, **or** `component = null` | `component` / `scaffold` |
| E4 | `validationStrategy ∈ {dom, computed-style, accessibility-tree, keyboard-interaction, semantic}` — `source-code` cannot be seen on a built page; `visual`, `manual`, `responsive-viewport` have no small measurement | `strategy` |

`automatable` and `automationConfidence` are **deliberately not used** (this departs from D-12).
They are judgements made while the KB was built for the oracle, so filtering on them would select
for what the oracle was expected to automate. Feasibility is judged here instead, under E6.

**Pass 2 — judged, one line of justification per rule, accepted or rejected:**

| Code | Criterion | Rejection reason |
|---|---|---|
| E5 | The rule can **manifest** on this screen: it applies to an instance of § 1 in S0, S1 or S2, and can be violated by one local change that does not force a second violation | `nao-manifesta` / `acoplada` |
| E6 | The violation can be **verified on the built page** by a measurement of at most ~15 lines of Playwright — DOM query, `getComputedStyle`, accessibility snapshot, or a key sequence plus `document.activeElement` — importing nothing from `govbr-ds-validator` | `sem-medicao` |
| E7 | Not a duplicate of an already-accepted rule (same element, same observable) — the lower `id` stays | `duplicada:<id>` |

**Blindness rule.** During both passes the following are not opened: `checker-aliases.json`, the
validator's `src/`, any file under `results/` or `reports/`. Whether the oracle has a checker for a
rule is annotated **after** the eligibility file is frozen, as `hasChecker`, and is used only to
split the report — never to accept, reject, stratify or redraw.

**Output.** `tela-a/elegibilidade.json`: every one of the 186 rules with
`{id, pass1, pass2, reason, justificativa, instancias, variantes, stratum}`. The rejected rules stay
in the file. Pass 1 is `npm run tela-a:elegibilidade`; the pass-2 verdicts are hand-written in
`tela-a/elegibilidade-passo2.json` and merged by the same script.

**Result (2026-09-18, pass 2 judged by the assistant — D-48).**

| | Rules |
|---|---|
| Population | 186 |
| Rejected in pass 1 | 123 — `force` 74 · `strategy` 23 · `component` 21 · `scaffold` 5 |
| Reached pass 2 | 63 — K 10 · T 6 · E 29 · C 8 · S 10 |
| Rejected in pass 2 | 40 — `nao-manifesta` 29 · `sem-medicao` 6 · `duplicada` 5 |
| **Eligible** | **23 — K 5 · T 4 · E 10 · C 0 · S 4** |

Three things the enumeration showed, none of which was known when § 1 was fixed:

- **The composition stratum is empty.** All 8 composition rules that reached pass 2 are about
  things this screen does not have (home page, onboarding, empty state, collapse, help section) or
  have no observable (follow the standard, start from the base template).
- **Most of the population is e-MAG and component-agnostic.** The KB holds only 6 `required` rules
  naming one of the eleven drawable components; 4 of them are eligible.
- **Page-level rules have no host** (document title, `html lang`, heading outline, regions, skip
  link, breadcrumb). They are out of the draw, but the built screen must still **satisfy** them, or
  it would carry standing violations nobody injected. See § 5.

A rejected duplicate is not lost: when the rule that stayed is drawn, its duplicates are listed as
aliases in the spec's `rules`, as the flow reference already does.

---

## 3. Strata and counts (plan step 3)

Each eligible rule falls in exactly one stratum, by fields, first match wins:

| Order | Stratum | Test |
|---|---|---|
| 1 | **K** keyboard / state behaviour | `validationStrategy = keyboard-interaction` |
| 2 | **T** DS tokens | `validationStrategy = computed-style` (the 7 rules with `relatedTokens` are all inside it) |
| 3 | **E** e-MAG forms | `standard = eMAG` |
| 4 | **C** composition | `category ∈ {pattern, page, template, foundation}` |
| 5 | **S** DS structure / anatomy | everything else |

**Counts** (accepted as defaults 2026-09-18): **12 defect specs** (the flow screen has 12) — K 2 · T 2 · E 3 · C 2 ·
S 3. Of the 12, **2 are shared** (applied to every instance of their component). **8 decoys.**

Shortfall rule, written before the enumeration: if a stratum has fewer eligible rules than its
quota, it gives all it has and the missing slots go to S until S has no eligible rule left, then to
E, then T, then K, then C. The shortfall is reported. Quotas and orders live in
`tela-a/parametros.json`.

**Effective quotas after § 2:** C has 0 eligible, so its 2 slots go down the order — S takes 1 (it
has 4 eligible) and E takes 1: **K 2 · T 2 · E 4 · C 0 · S 4**. S therefore contributes all four of
its eligible rules; the draw there decides only hosts and variants. Confirmed by the author on
2026-09-18, before `hasChecker` was annotated.

---

## 4. The draw (plan steps 4–5)

**Seed.** The full 40-hex hash of the `govbr-eval` commit that contains, together: this file with
its status line no longer saying draft, `tela-a/inventario.json`, `tela-a/elegibilidade-passo2.json`,
`tela-a/elegibilidade.json`, `tela-a/parametros.json`, `scripts/tela-a-elegibilidade.ts` and
`scripts/draw-tela-a.ts`. Nobody can tune a commit hash after seeing a draw.

**Mechanism — order by hash, no random-number generator.** For a label `L` and an id `x`:

    key(L, x) = sha256( seed + "|" + L + "|" + x )   as lowercase hex

Sort ascending by `key`; take from the top. There is no generator state, no modulo bias, no
dependence on the order of the input list, and anyone can recheck a pick with one `sha256sum`.

1. **Rules.** For each stratum, sort its eligible rules by `key("regra", rule.id)`; the first
   *quota* are drawn. The **whole order is written out** — it is also the replacement queue.
2. **Instance.** For each drawn rule, sort its candidate instances (recorded in the eligibility
   file under E5) by `key("instancia:" + rule.id, instanceId)`; the first that fits is the host. An
   instance carries **at most two defects and never two of the same stratum** — same-stratum pairs
   are the ones that fight over one observable (two tabindex changes, two text colours). Strata are
   served in the order K, T, E, C, S; a rule with no instance left is discarded.
3. **Shared.** Sort the drawn specs by `key("compartilhada", rule.id)`. A spec becomes shared when
   its host's component has other instances among the rule's candidates and all of them still fit;
   it is then applied to every one. The first 2 that qualify are taken. Only `select` and
   `checkbox` have two instances, so a draw may yield fewer than 2 — reported, not repaired.
4. **Decoys.** Among instances that host no defect (scaffold included), sort by
   `key("chamariz", instanceId)`; the first 8 receive the same place-named classes the defect hosts
   carry, with inert or conforming declarations (corpus rule, D-06/D-24).
5. **Variant.** Every eligible rule lists the manifestations it admits in
   `elegibilidade-passo2.json` (`variantes`), written before the seed exists; the first by
   `key("variante:" + rule.id, variantId)` is taken. Where the target inside the instance could
   still be chosen, the variant text fixes it mechanically ("the first icon-only button in document
   order").

**One draw.** No redraw for any reason — including a draw that lands entirely on rules the oracle
checks, or entirely on rules it does not.

**Discards.** A drawn rule is discarded only if it cannot be injected (no instance left, or the
build shows the deviation forces a second violation). The record is `{id, reason}` and the **next
rule in that stratum's written order** takes its place — no choice involved. If the stratum runs
out, the slot goes down the shortfall order of § 3. Every discard is reported.

**Rehearsal.** `npm run tela-a:sorteio -- --ensaio <text>` runs the same code with a throwaway seed,
prints counts only and writes nothing. 40 rehearsals all placed 12 specs (0–6 discards, 0–2 shared,
7–8 decoys). The real run is `-- --seed <commit>`: it refuses a seed that is not a 40-hex commit of
this repo, refuses if any frozen file differs from that commit, and refuses to overwrite
`sorteio.json`.

**Output.** `tela-a/sorteio.json`: seed, sha256 of `rules.jsonl`, of the eligibility file and of the
script, the full order per stratum, the drawn specs with host and variant, shared picks, decoys,
discards. Committed **before** the screen is built.

---

## 5. What stays declared as a limit

- The assistant still writes the manifestation of each drawn rule and builds the screen, so it
  knows the reference (D-48 applies). The draw removes the choice of *which rule*, *where* and *in
  which direction* — not the authorship.
- Pass 2 of eligibility is judgement. It is exposed (every rejection with its reason, in the file)
  rather than eliminated.
- `input` and `button` rules are outside the population, so screen A says nothing about them.
- Page-level `required` rules are outside the population too. The build satisfies them — `title`,
  `html lang`, one `h1`, a `main` region, and the scaffold's skip link and breadcrumb — so screen A
  says nothing about them either.
- A constructed screen remains a constructed screen; screen B answers the other question.
