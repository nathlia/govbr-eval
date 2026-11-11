/**
 * T2 — testes da skill única `skills/avaliar-tela/SKILL.md` e do renderizador do texto da tarefa
 * (`scripts/render-task-prompt.ts`). Sem modelo, sem navegador.
 *
 *   1. paridade: sem e com, com as mesmas entradas, produzem o MESMO texto byte a byte, mesmo com
 *      run id, credencial do coletor e perfil do oráculo diferentes (allowlist, canal lateral);
 *   2. qualquer diferença fora da allowlist falha; campo desconhecido nas entradas é recusado;
 *   3. o exemplo JSON da skill valida em `validateFlowReport` e, envelopado, em `findings.v2` (NAT-81:
 *      traz o registro de inspeção, que o envelope v1 recusa); `rule` é null; a variante parcial por
 *      orçamento com `findings: []` também valida;
 *   4. vocabulário: a skill e o texto renderizado não trazem contexto de pesquisa, gabarito, contagem,
 *      ids normativos, marca do DS, valores de token, oráculo ou ferramentas dele; cada padrão pega
 *      uma amostra plantada; seletores, caminhos e estados dos gabaritos não aparecem na skill;
 *   5. a skill não pede leitura de arquivo; `lint:protocol` e `lint:skills` passam.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateContract } from "../contracts/index";
import { ROOT } from "./adjudication";
import { validateFlowReport } from "./flow-contract";
import {
  ARM_DIFF_ALLOWLIST, EXAMPLE_INPUTS, FORBIDDEN_TASK_PATTERNS, ORACLE_TOOL_NAMES, PLACEHOLDERS, SKILL_PATH,
  compareArmRenders, normalizeNewlines, relogioTexto, renderRun, renderTaskPrompt, scanForbidden, sha256, stripFrontmatter,
  type RunInputs, type TaskInputs,
} from "./render-task-prompt";

let tests = 0;
function test(name: string, fn: () => void): void {
  fn();
  tests++;
  console.log(`ok ${name}`);
}

const template = readFileSync(SKILL_PATH, "utf8");
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const run = (arm: "sem" | "com" | "ferramentas", task: TaskInputs, over: Partial<RunInputs> = {}): RunInputs => ({
  task, arm, runId: `run-${arm}-01`, collectorToken: `token-${arm}`, oracleProfile: arm === "com" ? "combined" : arm === "ferramentas" ? "knowledge-free" : null, ...over,
});
const pair = (a: RunInputs, b: RunInputs) => compareArmRenders(
  { run: a, rendered: renderRun(template, a) }, { run: b, rendered: renderRun(template, b) });

const VISTORIAS_LIKE: TaskInputs = {
  url: "http://127.0.0.1:3300/pnip/portal-mpa/vistorias?mock-perfil=mpa",
  escopo: "a tela inteira, em todos os estados alcançáveis pela interface",
  larguras: [{ width: 1280, height: 900 }, { width: 390, height: 844 }],
  meioLarguras: "abra a URL da tela no endereço que o ambiente indicar para cada largura; não há outro meio.",
  envio: { origem: "http://127.0.0.1:4100/", caminho: "/api/submit" },
  limites: { tempoMinutos: 40, maxTurnos: 200 },
};

test("skill: frontmatter, marcadores declarados, nada de arquivo a ler", () => {
  assert.match(normalizeNewlines(template), /^---\nname: avaliar-tela\n/);
  const body = stripFrontmatter(template);
  for (const p of PLACEHOLDERS) assert.ok(body.includes(`{{${p}}}`), `marcador ${p} ausente`);
  for (const ref of [/\.\.\//, /\bskills\//, /\.md\b/, /\bleia\b.{0,40}\barquivo/i, /_shared/]) {
    assert.ok(!ref.test(body), `a skill não pode depender de arquivo do ambiente (${ref})`);
  }
});

test("paridade: sem × com com entradas idênticas → texto idêntico byte a byte", () => {
  for (const task of [EXAMPLE_INPUTS, VISTORIAS_LIKE]) {
    const sem = run("sem", clone(task));
    const com = run("com", clone(task), { runId: "outro-run-com-99", collectorToken: "outro-token" });
    assert.deepEqual(pair(sem, com), []);
    const a = renderRun(template, sem), b = renderRun(template, com);
    assert.ok(Buffer.from(a.prompt, "utf8").equals(Buffer.from(b.prompt, "utf8")));
    assert.equal(a.promptSha256, sha256(a.prompt));
    assert.equal(a.promptSha256, b.promptSha256);
    assert.equal(a.templateSha256, b.templateSha256);
    // NAT-81: o registro de inspeção é o mesmo texto nos dois braços (nenhuma linha específica de braço).
    for (const p of [a.prompt, b.prompt]) assert.ok(p.includes("## Registro de inspeção") && p.includes('"inspection"'));
    // O que difere viaja fora do texto.
    assert.notDeepEqual(a.channel, b.channel);
    // (o rótulo do braço, "sem"/"com", é palavra comum do português e não é procurado por substring)
    for (const v of [...Object.values(b.channel.env), String(b.channel.config.oracleProfile)]) {
      assert.ok(!a.prompt.includes(v) && !b.prompt.includes(v), `valor do canal lateral no texto: ${v}`);
    }
    console.log(`   ${task.url}: prompt ${a.promptSha256.slice(0, 16)}…, template ${a.templateSha256.slice(0, 16)}…, ${a.bytes} bytes`);
  }
  assert.deepEqual(Object.keys(ARM_DIFF_ALLOWLIST).sort(), ["arm", "collectorToken", "oracleProfile", "runId"]);
});

test("paridade do trio (NAT-61): sem × ferramentas × com → mesmo sha256 do texto; braço e perfil só no canal lateral", () => {
  for (const task of [EXAMPLE_INPUTS, VISTORIAS_LIKE]) {
    const rs = (["sem", "ferramentas", "com"] as const).map((arm) => renderRun(template, run(arm, clone(task))));
    assert.equal(new Set(rs.map((x) => x.promptSha256)).size, 1, "sha256 do texto difere entre os três braços");
    assert.ok(rs.every((x) => Buffer.from(x.prompt, "utf8").equals(Buffer.from(rs[0].prompt, "utf8"))), "bytes do texto diferem");
    assert.equal(new Set(rs.map((x) => x.templateSha256)).size, 1);
    assert.deepEqual(rs.map((x) => x.channel.config), [
      { arm: "sem", oracleProfile: null }, { arm: "ferramentas", oracleProfile: "knowledge-free" }, { arm: "com", oracleProfile: "combined" }]);
    // os perfis do servidor nunca aparecem no texto ("ferramentas", como "sem"/"com", é palavra comum da skill e não é procurada)
    for (const p of ["knowledge-free", "evaluation"]) assert.ok(!rs[0].prompt.includes(p), `perfil do oráculo no texto: ${p}`);
    assert.deepEqual(pair(run("ferramentas", clone(task)), run("com", clone(task))), []);
  }
});

test("relógio real (NAT-111 A): frase constante nos LIMITES; template intacto; sem relógio = texto de antes; trio idêntico; sem vocabulário proibido", () => {
  const URL_RELOGIO = "http://collector:8080/tempo";
  for (const task of [EXAMPLE_INPUTS, VISTORIAS_LIKE]) {
    const antes = renderTaskPrompt(template, clone(task));
    const nulo = renderTaskPrompt(template, { ...clone(task), limites: { ...task.limites, relogio: null } });
    assert.equal(nulo.prompt, antes.prompt, "relogio: null = texto de antes, byte a byte");
    const comRel = { ...clone(task), limites: { ...task.limites, relogio: URL_RELOGIO } };
    const rs = (["sem", "ferramentas", "com"] as const).map((arm) => renderRun(template, run(arm, clone(comRel))));
    assert.equal(new Set(rs.map((x) => x.promptSha256)).size, 1, "texto com relógio difere entre braços");
    assert.equal(rs[0].templateSha256, antes.templateSha256, "templateSha256 (protocolo congelado) não muda");
    assert.notEqual(rs[0].promptSha256, antes.promptSha256);
    assert.equal(rs[0].prompt.replace(` ${relogioTexto(URL_RELOGIO)}`, ""), antes.prompt, "a única diferença é a frase do relógio");
    assert.deepEqual(scanForbidden(rs[0].prompt).filter((h) => h.text.includes(URL_RELOGIO)), [], "frase do relógio com vocabulário proibido");
    assert.match(rs[0].prompt, /Limites da execução: até \d+ minutos[^\n]*O relógio da página pode não ser o real[^\n]*decorridoS[^\n]*restanteS[^\n]*Tempo máximo: \d+ segundos desde o início\./);
    // render 1.3.0 (série 3.7.8): ler o relógio sem sair da página; navegar até ele desfaz o estado
    assert.match(rs[0].prompt, /restanteS`\), em segundos\. Consulte-o sem sair da página em que está, com `fetch` executado dentro dela: navegar até esse endereço recarrega a tela e desfaz o estado em que ela estava\. Tempo máximo/);
    assert.deepEqual(pair(run("sem", clone(comRel)), run("com", clone(comRel))), []);
    // relógio num braço e não no outro é diferença fora da allowlist
    assert.ok(pair(run("sem", clone(task)), run("com", clone(comRel))).some((e) => e.includes("fora da allowlist")));
  }
  for (const ruim of ["ftp://collector/tempo", "", 3, "http://collector:8080/tempo com espaço"]) {
    assert.throws(() => renderTaskPrompt(template, { ...clone(EXAMPLE_INPUTS), limites: { ...EXAMPLE_INPUTS.limites, relogio: ruim as string } }), /relogio/, String(ruim));
  }
});

test("série 3.7.8: passo 9 (pendência aberta decidida ou declarada antes de encerrar), igual nos três braços e sem nome de ferramenta", () => {
  const linha = /^9\. Antes de encerrar, releia a última resposta de cada ferramenta em cada rota: toda pendência que ela ainda der como\n   aberta é decidida pelo caminho que a ferramenta indicar ou registrada em `limitations`, com o motivo\.$/m;
  assert.match(normalizeNewlines(template), linha);
  const rs = (["sem", "ferramentas", "com"] as const).map((arm) => renderRun(template, run(arm, clone(EXAMPLE_INPUTS))));
  assert.equal(new Set(rs.map((x) => x.promptSha256)).size, 1);
  assert.match(rs[0].prompt, linha);
  assert.deepEqual(scanForbidden(rs[0].prompt.match(linha)![0]), [], "a linha nova não traz vocabulário proibido");
});

test("paridade: diferença fora da allowlist falha", () => {
  const variants: [string, (t: TaskInputs) => void][] = [
    ["url", (t) => { t.url = "http://127.0.0.1:3100/outra.html"; }],
    ["escopo", (t) => { t.escopo = "somente o formulário"; }],
    ["larguras", (t) => { t.larguras = [{ width: 1440, height: 900 }]; }],
    ["envio", (t) => { t.envio.caminho = "/api/outro"; }],
    ["limites", (t) => { t.limites.tempoMinutos = 31; }],
  ];
  for (const [name, mutate] of variants) {
    const other = clone(EXAMPLE_INPUTS);
    mutate(other);
    const errors = pair(run("sem", clone(EXAMPLE_INPUTS)), run("com", other));
    assert.ok(errors.some((e) => e.includes("fora da allowlist") && e.includes("task")), `${name}: ${errors.join("; ")}`);
    assert.ok(errors.some((e) => e.startsWith("texto da tarefa difere")), `${name}: texto devia diferir`);
  }
  // Um campo novo no run (fora da allowlist) também é diferença.
  const extra = { ...run("com", clone(EXAMPLE_INPUTS)), dica: "x" } as RunInputs;
  assert.ok(pair(run("sem", clone(EXAMPLE_INPUTS)), extra).some((e) => e.includes("dica")));
});

test("entradas: campo desconhecido, largura sem meio e vocabulário proibido são recusados", () => {
  assert.throws(() => renderTaskPrompt(template, { ...clone(EXAMPLE_INPUTS), arm: "com" } as unknown as TaskInputs), /campo desconhecido/);
  assert.throws(() => renderTaskPrompt(template, { ...clone(EXAMPLE_INPUTS), larguras: [{ width: 1280, height: 900 }, { width: 390, height: 844 }] }), /meioLarguras/);
  for (const escopo of ["procure os 5 problemas do formulário", "avaliação com oráculo", "parte do TCC", "o campo #ff0000", "confira o critério 4.1.2"]) {
    assert.throws(() => renderTaskPrompt(template, { ...clone(EXAMPLE_INPUTS), escopo }), /vocabulário proibido/, escopo);
  }
  const multi = renderTaskPrompt(template, VISTORIAS_LIKE).prompt;
  assert.ok(multi.includes(VISTORIAS_LIKE.meioLarguras!));
  assert.ok(multi.includes("a janela inicial (1280×900) e 390×844."));
  const single = renderTaskPrompt(template, EXAMPLE_INPUTS).prompt;
  assert.ok(single.includes("somente a janela inicial (1280×900)."));
  assert.ok(single.includes("não há; o escopo cobre somente a janela inicial."));
});

test("texto renderizado: sem frontmatter nem marcador; hash do template independe de CRLF", () => {
  const r = renderTaskPrompt(template, EXAMPLE_INPUTS);
  assert.ok(!r.prompt.startsWith("---"));
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(r.prompt));
  assert.ok(!r.prompt.includes("\r"));
  const crlf = renderTaskPrompt(normalizeNewlines(template).replace(/\n/g, "\r\n"), EXAMPLE_INPUTS);
  assert.equal(crlf.templateSha256, r.templateSha256);
  assert.equal(crlf.promptSha256, r.promptSha256);
  assert.throws(() => renderTaskPrompt(template + "\n{{EXTRA}}\n", EXAMPLE_INPUTS), /desconhecidos/);
  assert.throws(() => renderTaskPrompt(template.replace("{{LIMITES}}", ""), EXAMPLE_INPUTS), /ausentes/);
});

test("B2: segundos vêm das entradas; template antigo conserva a renderização dos limites", () => {
  for (const minutes of [1, 30, 40]) {
    const inputs = { ...clone(EXAMPLE_INPUTS), limites: { tempoMinutos: minutes, maxTurnos: null } };
    const rendered = renderTaskPrompt(template, inputs);
    assert.ok(rendered.prompt.includes(`Tempo máximo: ${minutes * 60} segundos desde o início.`));
    assert.ok(rendered.prompt.includes(`até ${minutes} minutos.`));
    const prompts = (["sem", "ferramentas", "com"] as const).map((arm) => renderRun(template, run(arm, inputs)).prompt);
    assert.equal(new Set(prompts).size, 1);
  }
  // A nova substituição é opt-in: templates congelados sem o marcador continuam aceitos e sem bytes novos.
  const oldTemplate = PLACEHOLDERS.map((p) => `{{${p}}}`).join("\n");
  assert.equal(renderTaskPrompt(oldTemplate, EXAMPLE_INPUTS).prompt, [
    EXAMPLE_INPUTS.url, EXAMPLE_INPUTS.escopo, "somente a janela inicial (1280×900).",
    "não há; o escopo cobre somente a janela inicial.", EXAMPLE_INPUTS.envio.origem,
    "`/api/submit`", "até 30 minutos.",
  ].join("\n"));
  const withTurns = renderTaskPrompt(template, VISTORIAS_LIKE).prompt;
  assert.ok(withTurns.includes("até 40 minutos e 200 turnos."));
  assert.ok(withTurns.includes("Tempo máximo: 2400 segundos"));
});

test("B2: orçamento usa só capacidade disponível e cláusulas não recebem ids de candidatos", () => {
  const body = stripFrontmatter(template);
  assert.match(body, /se a ferramenta permitir escolher o limite de resposta/);
  assert.match(body, /20 000 caracteres; se o máximo permitido for menor, use esse máximo e a continuação/);
  assert.match(body, /identificador da cláusula, nunca de achado, pendência, grupo ou sessão/);
  assert.match(body, /Achados e pendências vão em `candidates` e `evidence`/);
  assert.deepEqual(scanForbidden(body), []);
});

const fenced = [...normalizeNewlines(template).matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);

test("exemplo JSON da skill: validateFlowReport e findings.v2 (com registro de inspeção), com rule null", () => {
  assert.equal(fenced.length, 1, "um único exemplo de relatório");
  const report = JSON.parse(fenced[0]) as { findings: { rule: unknown }[]; inspection?: Record<string, unknown> };
  assert.deepEqual(validateFlowReport(report), []);
  assert.ok(report.findings.length >= 1);
  for (const f of report.findings) assert.equal(f.rule, null);
  assert.ok(report.inspection, "o exemplo traz o registro de inspeção");
  const envelope = (r: unknown, contract: "findings.v1" | "findings.v2" = "findings.v2") => ({
    contract, fixture: true, campaignId: "fixture-avaliar-tela", runId: "fixture-run-01",
    receivedAt: "2026-01-01T00:00:00Z", receipt: "recibo-fixture", findingContract: "achado-2",
    ...(contract === "findings.v2" ? { inspectionContract: "inspection.v1",
      inspectionStatus: (r as { inspection?: unknown }).inspection === undefined ? "absent" : "valid" } : {}), report: r,
  });
  const res = validateContract(envelope(report));
  assert.ok(res.valid, JSON.stringify(res.errors));
  // O coletor armado em v1 recusaria o registro: por isso o harness tem de armar v2 para esta skill.
  assert.equal(validateContract(envelope(report, "findings.v1")).valid, false);
  // Orçamento esgotado: parcial, sem candidatos aceitos, findings vazio — válido.
  const partial = { ...report, findings: [], inspection: { ...report.inspection, completion: "partial", candidates: [],
    limitations: [{ kind: "budget", detail: "tempo esgotado" }] } };
  assert.deepEqual(validateFlowReport(partial), []);
  const rp = validateContract(envelope(partial));
  assert.ok(rp.valid, JSON.stringify(rp.errors));
  // O exemplo sem o registro continua aceito nos dois envelopes (registro ausente ≠ cobertura zero).
  const { inspection: _i, ...semRegistro } = report;
  assert.ok(validateContract(envelope(semRegistro)).valid);
  assert.ok(validateContract(envelope({ ...semRegistro, findings: [] }, "findings.v1")).valid);
  // Lista única 3.7.2, B2: o exemplo traz `clauses` (revisão clauses-1, só marcadores) e valida; o registro sem o campo
  // (braço sem ferramenta, ou ferramenta que não serviu cláusula) continua válido.
  const clauses = (report.inspection as { clauses?: { ref: string; state: string; status: string; measurement: string }[] }).clauses;
  assert.ok(Array.isArray(clauses) && clauses.length === 1, "o exemplo mostra um item de `clauses`");
  assert.deepEqual(Object.keys(clauses[0]).sort(), ["measurement", "ref", "state", "status"]);
  assert.ok(["medida", "violada", "nao-se-aplica"].includes(clauses[0].status));
  const { clauses: _c, ...semClausulas } = report.inspection as Record<string, unknown>;
  const rs = validateContract(envelope({ ...report, inspection: semClausulas }));
  assert.ok(rs.valid, JSON.stringify(rs.errors));
  // Cláusula violada sem achado vinculado: o envelope inteiro é inválido pelo contrato (o coletor guarda o registro à parte).
  const violada = { ...report, inspection: { ...report.inspection, clauses: [{ ...clauses[0], status: "violada" }] } };
  assert.equal(validateContract(envelope(violada)).valid, false);
});

test("vocabulário: skill e texto renderizado limpos; cada padrão pega a sua amostra", () => {
  assert.deepEqual(scanForbidden(template), []);
  for (const task of [EXAMPLE_INPUTS, VISTORIAS_LIKE]) assert.deepEqual(scanForbidden(renderTaskPrompt(template, task).prompt), []);
  const samples: Record<string, string> = {
    "contexto-de-pesquisa": "este benchmark", gabarito: "sem ver o gabarito",
    "contagem-de-problemas": "há 7 problemas", "id-normativo": '"rule":"wcag:4.1.2"', "anatomia-do-ds": "classe br-button",
    "valor-de-token": "margem de 16px", oraculo: "chame scan_page",
  };
  assert.deepEqual(Object.keys(samples).sort(), FORBIDDEN_TASK_PATTERNS.map((p) => p.id).sort());
  for (const [id, text] of Object.entries(samples)) assert.ok(scanForbidden(text).some((h) => h.id === id), `${id} não pegou "${text}"`);
  // Ids concretos de cada família são pegos; os nomes das normas-alvo e os formatos com marcador, não
  // (são escopo da tarefa, iguais nos dois braços).
  for (const text of ["emag:6.2", "wcag: 1.4.3", "ds:botao-primario", "e-MAG 6.2", "critério 2.4.7"]) {
    assert.ok(scanForbidden(text).some((h) => h.id === "id-normativo"), `id concreto não pego: ${text}`);
  }
  assert.deepEqual(scanForbidden("padrão digital do governo federal (gov.br Design System), e-MAG e WCAG 2.2; `emag:<seção>`, `wcag:<critério>` ou `ds:<regra>`"), []);
  const skillBody = normalizeNewlines(template);
  for (const scope of ["gov.br Design System", "e-MAG", "WCAG 2.2", "`emag:<seção>`", "`wcag:<critério>`", "`ds:<regra>`"]) {
    assert.ok(skillBody.includes(scope), `a skill tem de nomear o alvo/formato: ${scope}`);
  }
  // Nomes de ferramenta do oráculo: a lista cobre o que o servidor registra hoje.
  const server = join(ROOT, "..", "govbr-ds-validator", "src", "server.ts");
  if (existsSync(server)) {
    const registered = [...readFileSync(server, "utf8").matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
    for (const name of registered) assert.ok((ORACLE_TOOL_NAMES as readonly string[]).includes(name), `ferramenta nova do oráculo fora da lista: ${name}`);
    console.log(`   ${registered.length} ferramentas registradas no oráculo, todas na lista proibida`);
  }
  for (const name of ORACLE_TOOL_NAMES) assert.ok(!template.includes(name), name);
});

test("gabaritos: nenhum seletor, caminho, estado ou id de spec aparece na skill", () => {
  const body = normalizeNewlines(template);
  const needles = new Set<string>();
  const KEYS = new Set(["anchor", "selector", "selectors", "relatedSelectors", "waitFor", "path", "clicar", "esperar"]);
  const visit = (v: unknown, key: string): void => {
    if (Array.isArray(v)) v.forEach((x) => visit(x, key));
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string" && (o.id.includes("-") || /^[A-Z]/.test(o.id))) needles.add(o.id);
      for (const [k, x] of Object.entries(o)) visit(x, k);
    } else if (typeof v === "string" && KEYS.has(key) && v.trim().length >= 4) needles.add(v.trim());
  };
  const files = readdirSync(ROOT).filter((f) => /^ground-truth.*\.json$/.test(f) || f === "organic-ground-truth.json");
  for (const f of files) visit(JSON.parse(readFileSync(join(ROOT, f), "utf8")), "");
  const hits = [...needles].filter((n) => body.includes(n));
  assert.deepEqual(hits, [], `trechos de gabarito na skill: ${hits.join(", ")}`);
  // NAT-81: o texto renderizado dos DOIS braços (skill + entradas, com o registro de inspeção) também não leva nada da referência.
  for (const arm of ["sem", "com"] as const) {
    for (const task of [EXAMPLE_INPUTS, VISTORIAS_LIKE]) {
      const prompt = renderRun(template, run(arm, clone(task))).prompt;
      const leaked = [...needles].filter((n) => prompt.includes(n) && !task.url.includes(n));
      assert.deepEqual(leaked, [], `${arm}: trechos de gabarito no texto renderizado: ${leaked.join(", ")}`);
    }
  }
  console.log(`   ${needles.size} seletores/caminhos/estados/ids de ${files.length} gabaritos conferidos`);
});

test("lint:protocol e lint:skills passam com a skill nova no escopo", () => {
  const tsx = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const lp = execFileSync(process.execPath, [tsx, join(ROOT, "scripts", "lint-protocol.ts")], { cwd: ROOT, encoding: "utf8" });
  assert.match(lp, /ok — nenhum conhecimento de domínio/);
  const ls = execFileSync(process.execPath, [tsx, join(ROOT, "scripts", "lint-skill-contracts.ts")], { cwd: ROOT, encoding: "utf8" });
  assert.match(ls, /em avaliar-tela/);
  assert.match(readFileSync(join(ROOT, "scripts", "lint-protocol.ts"), "utf8"), /STRICT_SKILLS = new Set\(\["skills\/avaliar-tela\/SKILL\.md"\]\)/);
});

console.log(`\n${tests} testes ok`);
