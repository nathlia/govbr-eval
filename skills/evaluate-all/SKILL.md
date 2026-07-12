# Skill: evaluate-all

Formal evaluation run — systematically tests every case served by the govbr-corpus app and produces a machine-readable JSON verdict for scoring against ground-truth.

## When to use
When you need to record the agent's actual detection results for thesis scoring. Run this after any change to the test app or DS rules.

## Trigger
"evaluate all" or "/evaluate-all"

## Output contract

Every case gets a verdict object:
```json
{
  "TC-B-01": { "detected": false, "violations_found": [], "notes": "..." },
  "TC-B-02": { "detected": true,  "violations_found": [
    { "rule": "wcag:4.1.2", "description": "Botão icon-only sem nome acessível: ..." }
  ], "notes": "..." }
}
```
- `detected: true`  → at least one violation found in this section
- `detected: false` → no violations found (correct implementation or false negative)
- `violations_found` → list of finding objects, one per distinct violated rule (empty for clean cases)
- `notes` → brief reasoning (what you observed and why you decided)

Each finding's `rule` MUST use the rule id vocabulary (scoring matches on element × rule):
- `govbr-<dsVersion>-…` — **KB deterministic id, PREFERRED** when the violated rule came from the
  oracle's `get_ds_rules` tool (e.g. `govbr-3.7.0-accessibility-button-efd2d9e7c3c6`). The scorer
  matches KB ids by exact equality and translates them to/from the aliases below automatically.
- `emag:<seção>` — e-MAG 3.1 recommendation, e.g. `emag:6.5`
- `wcag:<sc>` — WCAG success criterion, e.g. `wcag:3.3.2`
- `ds:<regra>` — DS-specific: `ds:token-color`, `ds:token-font`, `ds:token-radius`,
  `ds:token-focus`, `ds:token-spacing`, `ds:button-order`, `ds:component-structure`, `ds:form-label`,
  `ds:item-content`, `ds:empty-state`, `ds:truncation`, `ds:touch-target`

Pick the single most specific rule per finding; still cite related norms inside `description`.
One finding per violated rule — do not bundle two independent violations into one entry.

## Steps

### 1. Record the start time, then load all references in parallel

First note the current ISO timestamp — it becomes `cost.startedAt`. From here on, count every
tool call you make (references, snapshots, style inspections, evaluations).
- `get_ds_rules` — the KB rule store; load the relevant slices (e.g. `component: "button"`,
  `category: "accessibility"`) and note each rule's deterministic id for citation in findings
- `get_design_tokens` — token reference (colors, typography, radii)
- `get_emag_rules` — full e-MAG v3.1 (all sections — the corpus now spans marcação, comportamento, conteúdo, apresentação e formulários)
- `get_component_spec` with `component: "button"` — canonical DS button HTML (its `warnings`
  field lists known defects in the official examples — do not treat those fragments as norms)

### 2. Inspect buttons page
- `browser_navigate` to `http://localhost:3000`
- `browser_snapshot` — full accessibility tree (element names, roles, ARIA attributes, label associations)
- `inspect_computed_styles` — computed CSS for all interactive elements (background-color, font-family, border-radius, etc.)

### 3. Inspect forms page
- `browser_click` on the "Formulário" tab in the nav
- `browser_snapshot` — accessibility tree for forms
- `inspect_computed_styles` with `selector: "input, select, textarea, button, label"` — form element styles (note: this tool loads the page fresh and sees the buttons tab; use it for button token checks only)
- `browser_evaluate` to extract computed styles for form inputs directly from the live tab state:

```js
Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
  testId: el.closest('[data-testid]')?.dataset.testid,
  tagName: el.tagName,
  borderColor: getComputedStyle(el).borderColor,
  backgroundColor: getComputedStyle(el).backgroundColor,
  outline: getComputedStyle(el).outline
}))
```

Convert each `rgb(r,g,b)` border-color and background-color to hex and check against `hexLookup`. A value not in `hexLookup` on a DS-styled form element (`br-input`, `br-select`, etc.) is a token violation.

### 3.1. Inspect the remaining SPA tabs

For each of the tabs **Navegação**, **Tabelas**, **Listas**, **Interativos** (nav bar buttons):
- `browser_click` on the tab button, then `browser_snapshot`
- On **Listas**: also `browser_evaluate` to read computed padding of every `.br-item`
  (`getComputedStyle(el).padding`) and the computed `max-width`/`text-overflow` of any
  `.br-button` — spacing consistency and truncation are computed-style checks
- On **Interativos**: this tab requires *interaction*, not just snapshots (see 4.6)

### 3.2. Inspect the static routes (D-15)

Three standalone pages exist outside the SPA — navigate directly and inspect the **delivered
HTML source** (`browser_evaluate` with `document.documentElement.outerHTML` or equivalent),
not only the rendered snapshot, because their case family is source-code-level:
- `http://localhost:3000/static/atualizacao.html` (TC-S-01)
- `http://localhost:3000/static/confirmacao.html` (TC-S-02)
- `http://localhost:3000/static/protocolo.html` (TC-S-03)

Check at minimum: `<meta http-equiv>` directives in `<head>`, inline event handlers
(`onclick=`), inline `style` attributes vs. stylesheet rules, deprecated presentational
elements, and `lang`/`<title>` correctness.

### 4. Evaluate each case

Work through each `data-testid` section. For each case apply the relevant checks:

#### Structural checks (from snapshot)
| What to check | Violation signal |
|---------------|-----------------|
| Element type | `<div class="br-button">` instead of `<button>` |
| Accessible name on icon buttons | No `aria-label`, no visible text, icon has `aria-hidden` |
| aria-label vs visible text | `aria-label` ≠ `textContent` on the same button |
| label[for] ↔ input[id] | `for` attribute value not found as any input's `id` |
| Input accessible name | `textbox` with no name in snapshot = broken label |
| Checkbox/radio group without fieldset+legend | Multiple checkboxes or radios under the same section with no `group` role ancestor and no `<fieldset>`/`<legend>` — the group has no accessible name (e-MAG 6.2, WCAG 1.3.1) |

#### Token checks (from computed styles + token reference)
| What to check | Data source | Violation signal |
|---------------|-------------|-----------------|
| background-color | `computed.backgroundColor` | Value not in `hexLookup` and not `rgb(...)` of a valid token |
| font-family | `computed.fontFamily` | Does not start with "Rawline" or include "Raleway" as first real font |
| border-radius | `computed.borderRadius` | Value not in {0px, 4px, 8px, 16px, 500px+, 50%} |
| focus outline | `focusedComputed.outline` + `focusedComputed.boxShadow` | Both are "none" or "0px" while the element has `br-button` class — focus indicator suppressed |
| form input border-color | `browser_evaluate` computed borderColor | Value not in `hexLookup` on a DS-styled form element |

#### e-MAG checks (from snapshot + e-MAG rules)
| What to check | Violation signal |
|---------------|-----------------|
| Placeholder-only label | Input accessible name comes from placeholder, not a `<label>` |
| Broken aria-labelledby | Input has `aria-labelledby` attribute but the referenced ID does not exist in the DOM — accessible name silently absent |
| Required field programmatic | Label text has `*` but input has no `aria-required` and no `required` |
| Format hint for complex fields | CPF/date/phone input with no hint element before it in DOM |
| Error message linkage | `aria-invalid=true` + visible error `<p>` in DOM but no `aria-describedby` |
| Visible label for selects | `<select>` has `aria-label` but no `<label>` element visible in snapshot |

#### DS pattern checks (from snapshot, compositional)
| What to check | Violation signal |
|---------------|-----------------|
| Button order | In any form/section, primary button appears BEFORE secondary button |
| Duplicate accessible names | Two or more buttons on the page share the same accessible name but appear in different sections/contexts — users of AT cannot distinguish them (WCAG 2.4.6) |

#### Navigation checks (Navegação tab, from snapshot + DOM)
| What to check | Violation signal |
|---------------|-----------------|
| Skip link position | The skip link ('Ir para o conteúdo') is not the FIRST focusable element of its header block |
| Breadcrumb current page | The last crumb (current page) is rendered as `<a>` instead of text with `aria-current="page"` |
| Breadcrumb keyboard reachability | Any crumb link carries `tabindex="-1"` — verify by Tab traversal or attribute inspection |
| Foreign-language passages | Block of text in another language without a `lang` attribute on its element (compare twins carefully — one may be correctly marked) |

#### Table checks (Tabelas tab, from snapshot + DOM)
| What to check | Violation signal |
|---------------|-----------------|
| Header cells | Data table whose header row uses `<td><strong>` instead of `<th scope>` |
| Layout tables | `<table>` whose cells contain prose/layout content, not tabular data |

#### List/Item checks (Listas tab, from snapshot + computed styles)
| What to check | Violation signal |
|---------------|-----------------|
| Item content area | `br-button primary` (or navigation controls) inside a `br-item` content area — prohibited by the Item spec |
| Spacing consistency | Sibling `br-item`s of the same list with different computed padding |
| Spacing scale | `br-item` padding value outside the DS spacing scale (multiples of 4/8px) |
| Empty regions | A titled results/content region rendering empty with no Empty State message |
| Truncation | Button label clipped by `text-overflow: ellipsis` — PROHIBITED for buttons/labels/errors; note that truncating *secondary descriptions* is permitted (do not flag those) |
| Divider focusability | `br-divider` with `tabindex="0"` (decorative separator in the focus order) |

### 4.5. Cross-element scan (run after all per-case checks)

These checks require looking across multiple cases simultaneously:

1. **Duplicate button names:** Collect every button accessible name visible in the snapshot. If the same name appears more than once in different `data-testid` sections, check whether the buttons serve different functions. If so, flag every affected case.

2. **Broken aria-labelledby:** For any `textbox` that has an accessible name but no visible `text:` sibling in the snapshot, use `browser_evaluate` to confirm whether the name source is a broken reference:
```js
const el = document.querySelector('[data-testid="TC-F-XX"] input');
const id = el.getAttribute('aria-labelledby');
return { id, targetExists: id ? !!document.getElementById(id) : null };
```
If `targetExists` is `false`, the violation is a broken `aria-labelledby`, not a placeholder-only label — update the violation description accordingly.

### 4.6. Interaction protocol (Interativos tab — keyboard wing)

These cases CANNOT be judged from a static snapshot; drive them:
1. **Accordion-like widgets**: click to expand, re-snapshot, and compare `aria-expanded`
   before/after — a static `aria-expanded` that never reflects the real state is a violation;
   also check the header is a focusable, keyboard-actionable element (button vs div).
2. **Modal**: activate the trigger button, then attempt keyboard-only operation —
   `browser_press_key` Tab (does focus enter/stay in the dialog?), Escape (does it close?),
   and check the close control is focusable. Close it with a click before moving on.
3. **Tabs widget**: `browser_press_key` Tab to reach the tablist, arrow keys / Enter to switch —
   if switching only works with the mouse, the widget fails keyboard operability. Check
   `role="tab"` elements have `tabindex`.

### 5. Build and save the verdict

After evaluating all cases, construct the final JSON:

```json
{
  "timestamp": "<current ISO timestamp>",
  "model": "<exact model id running this evaluation>",
  "appUrl": "http://localhost:3000",
  "cost": {
    "startedAt": "<ISO timestamp recorded in step 1, BEFORE the first tool call>",
    "finishedAt": "<ISO timestamp at save time>",
    "wallClockSeconds": 0,
    "toolCalls": 0,
    "notes": "toolCalls = total MCP/browser tool invocations this run (count them; approximate is acceptable)"
  },
  "verdicts": {
    "TC-B-01": { "detected": false, "violations_found": [], "notes": "..." },
    ...
  }
}
```

The `cost` block is required (F4): record the start time before loading references in step 1,
compute `wallClockSeconds` at save time, and report how many tool calls the run used.

POST the JSON to `http://localhost:4000/api/save-agent-results` if the dashboard dev server is
running — it saves the latest results AND archives the run under `results/runs/` (required for
F3 multi-run statistics). If the dashboard is not running, write all three files yourself
(paths relative to `govbr-eval/`):
- `results/agent-results.json`
- `dashboard/public/agent-results.json`
- `results/runs/agent-<timestamp with ':' and '.' replaced by '-'>.json`

### 6. Print a summary

After saving, print a one-line summary per case:
```
TC-B-01  ✓ clean     (reference)
TC-B-02  ✗ detected  Button has no accessible name
TC-B-03  ✗ detected  <div> used instead of <button>
...
```

## Notes for thesis validity

- **Do not read `ground-truth.json` (govbr-eval root) or open the govbr-corpus source before evaluating** — verdicts must come from what you actually observe in the app, not from prior knowledge of expected results.
- The token check for background-color: convert the computed `rgb(r, g, b)` to hex and look it up in the token reference's `hexLookup`. A value not in `hexLookup` is a violation only if it is applied to an element that is supposed to follow DS tokens (i.e., has a `br-button` class or a DS form component class).
- For font-family: DS requires `Rawline` as the primary font. The computed value will include fallbacks — flag only if `Rawline` is completely absent from the computed font stack AND the element uses `br-button` classes.
- For the aria-label vs visible text check: normalize both strings (trim, lowercase) before comparing.
- For inputs with an accessible name but no visible `text:` sibling in the snapshot: always disambiguate between (a) broken `aria-labelledby` pointing to a missing ID and (b) placeholder-only label. Use `browser_evaluate` to inspect the attribute directly — the violation description must be accurate.
- `inspect_computed_styles` always loads the page fresh at the given URL and sees the default tab (Buttons). Use `browser_evaluate` on the live page after clicking the Formulário tab to get computed styles for form inputs.
