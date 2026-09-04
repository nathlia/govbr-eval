// Gera o pacote de revisão cega da suíte de fluxo (11.9).
// Somente leitura sobre o repo; escreve um único .md.
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = "F:/Dev Nath/TCC/govbr-eval";
const OUT = join(ROOT, "docs", "pacote-revisao-fluxo.md");
const RUN_PONTUADA = "agent-2026-09-02T06-21-31-820Z.json";

const adj = JSON.parse(readFileSync(join(ROOT, "adjudications.json"), "utf8"));
const gt = JSON.parse(readFileSync(join(ROOT, "ground-truth-fluxo.json"), "utf8"));

// Unidades já casadas na execução pontuada (fluxo-1.1.0, 06:21) — lidas do relatório do scorer.
const CASADAS = new Set(["V-01", "V-05", "V-06", "V-07", "V-08"]);

// Índice: texto do achado -> proveniência técnica (seletor, regra), varrendo os dois diretórios.
const porTexto = new Map();
for (const dir of ["runs-fluxo", "runs-fluxo-ablacao"]) {
  let arquivos = [];
  try { arquivos = readdirSync(join(ROOT, "results", dir)).filter(f => f.endsWith(".json")); }
  catch { continue; }
  for (const f of arquivos) {
    const run = JSON.parse(readFileSync(join(ROOT, "results", dir, f), "utf8"));
    for (const ach of run.findings ?? []) {
      if (!porTexto.has(ach.description)) {
        porTexto.set(ach.description, {
          selector: ach.selector,
          related: ach.relatedSelectors ?? [],
          rule: ach.rule,
        });
      }
    }
  }
}

const tokens = s => (s ?? "").split(/[\s,>]+/).map(t => t.trim()).filter(t => t.startsWith(".") || t.startsWith("#") || /^[a-z]+$/i.test(t));

function candidatas(sel, related) {
  const meus = new Set([...tokens(sel), ...related.flatMap(tokens)]);
  return gt.violations.filter(v => tokens(v.anchor).some(t => meus.has(t)));
}

// Somente as alegações da execução efetivamente pontuada. As demais vêm de execuções que o
// scorer recusa por incompatibilidade de instrumento: julgá-las não move nenhum número.
const claims = adj.adjudications
  .filter(r => r.id.startsWith("E-") && !r.verdict)
  .filter(r => (r.seenIn ?? []).some(s => s.run === RUN_PONTUADA))
  .sort((a, b) => a.id.split(":")[1].localeCompare(b.id.split(":")[1]));

const L = [];
L.push("# Pacote de revisão — suíte de fluxo (11.9 / D-21)");
L.push("");
L.push("> Gerado por script. Escopo: **as alegações sem unidade da única execução pontuada sob**");
L.push("> **`fluxo-1.1.0`** (claude-opus-5, effort high, perfil `combined`, 2026-09-02 06:21). As");
L.push("> demais alegações de fluxo em `adjudications.json` vêm de execuções que o scorer recusa por");
L.push("> incompatibilidade de instrumento (11.6): julgá-las não move número nenhum, e ficam fora.");
L.push("");
L.push("**Sobre cegueira.** `--blind` esconde o braço. Esta medida tem **um único braço**, então não");
L.push("há braço a esconder e o procedimento cego é vazio aqui — dizê-lo é mais honesto que");
L.push("encená-lo. A ordem abaixo é o hash do achado, o que ao menos evita ordenar por conveniência.");
L.push("Quando houver o par `com`/`sem` (11.10), o procedimento cego volta a valer e é obrigatório.");
L.push("");
L.push("## Como usar");
L.push("");
L.push("1. Suba o corpus (`:3000`) e abra `fluxo.html` ao lado. Para os itens marcados");
L.push("   **estado condicional**, submeta o formulário vazio antes de olhar.");
L.push("2. Julgue **na ordem em que aparecem aqui**, um por vez, sem pular adiante.");
L.push("3. A pergunta de cada achado é **\"isto é verdade na página?\"** — nunca \"isto seria");
L.push("   conveniente para a medida?\". Um achado plausível, bem escrito e falso é falso positivo,");
L.push("   e é o tipo de erro mais informativo num agente que produz prosa convincente por construção.");
L.push("4. Escreva `verdict` **e** `rationale` em `adjudications.json`. Veredito sem razão não é");
L.push("   aplicado: o scorer o ignora e segue cobrando o FP.");
L.push("");
L.push("## Vereditos");
L.push("");
L.push("| veredito | quando | efeito |");
L.push("|---|---|---|");
L.push("| `falso-positivo` | não é verdade na página | cobrado da precisão |");
L.push("| `lacuna-gabarito` | é verdade, e o gabarito nunca catalogou | sai do FP, entra na dívida |");
L.push("| `vocabulario` | é a unidade abaixo, com nome que o scorer não conhece | casamento adjudicado (**exige `unit`**) |");
L.push("| `deteccao-correta` | conteúdo certo, citação ou âncora inválida | credita detecção, não `ruleVerifiedTP` (**exige `unit`**) |");
L.push("| `duplicado` | reformulação de outro achado já casado no mesmo elemento | sai do FP |");
L.push("| `indeterminado` | revisado e indecidível | **segue cobrado como FP** |");
L.push("| `composto` | a alegação afirma **mais de um defeito** | decidido por parte em `components` |");
L.push("");
L.push("`indeterminado` é assimétrico de propósito: a indecisão nunca melhora o número.");
L.push("");
L.push("**O teste do defeito composto:** *consertar um defeito consertaria o outro?* Se não, são");
L.push("duas unidades e o veredito é `composto`, com um componente por defeito — cada um com seu");
L.push("`verdict`, sua `rationale` e sua `unit` quando for `vocabulario`/`deteccao-correta`. A");
L.push("alegação é cobrada uma única vez se qualquer parte resolver em cobrança. Ver");
L.push("`docs/adjudicacao.md`.");
L.push("");
L.push("## Carimbo de identidade — obrigatório");
L.push("");
L.push("Quem adjudica é a autora do trabalho, mas **não** a autora da tela nem do gabarito: os dois");
L.push("foram gerados por assistente em sessões anteriores e commitados sob a sua identidade");
L.push("(`Co-Authored-By: Claude` nos commits de `LoginPage.tsx`, `fluxo.css` e");
L.push("`ground-truth-fluxo.json`). Ela portanto não sabe de cor quais violações foram injetadas —");
L.push("é uma posição de revisão melhor que a do assistente, não pior.");
L.push("");
L.push("O que permanece registrado como limite: o mesmo assistente gerou o corpus, o gabarito e as");
L.push("68 propostas de veredito da suíte TC-*. Essas propostas seguem carimbadas");
L.push("`aguarda revisão de NF` e não devem ser lidas como adjudicação independente enquanto não");
L.push("forem revisadas. Em cada registro julgado aqui:");
L.push("");
L.push("```json");
L.push('"adjudicatedBy": "NF — autora do trabalho; não autora da tela nem do gabarito",');
L.push('"adjudicatedAt": "2026-09-04"');
L.push("```");
L.push("");
L.push("E a leitura permanece: **piso é a métrica principal**, adjudicado entra ao lado como teto,");
L.push("nunca no lugar (D-21).");
L.push("");
L.push("## Referência — as 10 specs do gabarito");
L.push("");
L.push("Use para separar `vocabulario` (a unidade existe, o nome está errado) de `lacuna-gabarito`");
L.push("(a unidade não existe). Uma unidade **já casada** não aceita segundo casamento: se o achado");
L.push("descreve uma dessas, o veredito é `duplicado`, não `vocabulario`.");
L.push("");
L.push("| spec | âncora | regras aceitas | estado | casada em 06:21 |");
L.push("|---|---|---|---|---|");
for (const v of gt.violations) {
  const est = (v.state ?? "sempre") + (v.conditional ? " (cond.)" : "");
  const n = v.expectedCount != null ? ` ×${v.expectedCount}` : "";
  L.push(`| **${v.id}** | \`${v.anchor}\`${n} | ${v.rules.map(r => `\`${r}\``).join(" · ")} | ${est} | ${CASADAS.has(v.id) ? "sim" : "**não**"} |`);
}
L.push("");
L.push("---");
L.push("");
L.push(`## As ${claims.length} alegações`);
L.push("");

claims.forEach((c, i) => {
  const p = porTexto.get(c.finding) ?? {};
  const cand = candidatas(p.selector, p.related ?? []);
  L.push(`### ${i + 1}. \`${c.id}\``);
  L.push("");
  L.push(`- **elemento:** \`${p.selector ?? "—"}\``);
  if (p.related?.length) L.push(`- **participantes relacionais:** ${p.related.map(r => `\`${r}\``).join(", ")}`);
  L.push(`- **regra citada:** \`${p.rule ?? "—"}\``);
  L.push("");
  L.push("> " + c.finding.replace(/\n+/g, " "));
  L.push("");
  if (cand.length) {
    L.push("**Specs ancoradas neste elemento** — candidatas a `unit`:");
    L.push("");
    for (const v of cand) {
      L.push(`- **${v.id}** \`${v.anchor}\` · ${v.rules.map(r => `\`${r}\``).join(" · ")} · ${CASADAS.has(v.id) ? "**já casada em 06:21** → se for esta, `duplicado`" : "não casada → `vocabulario` ou `deteccao-correta` cabem"}`);
      L.push(`  - ${(v.description ?? "").slice(0, 220)}`);
    }
  } else {
    L.push("**Nenhuma spec do gabarito ancora neste elemento.** Se a alegação for verdadeira na");
    L.push("página, é `lacuna-gabarito`; se não for, `falso-positivo`.");
  }
  L.push("");
  L.push("```json");
  L.push(`{ "id": "${c.id}", "verdict": "", "rationale": "" }`);
  L.push("```");
  L.push("");
  L.push("<sub>Se a alegação afirmar dois defeitos que não se resolvem com a mesma correção, use");
  L.push('`"verdict": "composto"` com um `components[]` por defeito.</sub>');
  L.push("");
  L.push("---");
  L.push("");
});

L.push("## Depois de julgar");
L.push("");
L.push("```");
L.push("npm run adjudicate      # julgados, pendentes, registros defeituosos, equilíbrio de descoberta");
L.push("npm run score:fluxo     # imprime piso e adjudicado lado a lado");
L.push("```");
L.push("");
L.push("Cada `lacuna-gabarito` vira dívida: escrevê-la em `ground-truth-fluxo.json` exige rodar de");
L.push("novo `npm run baselines:fluxo` para preencher a detecção medida das linhas de base (D-06),");
L.push("nunca por intuição. E toda unidade acrescentada assim vira FN para execuções que nunca");
L.push("tiveram chance de encontrá-la — o viés de pooling se relata, não se corrige.");
L.push("");

writeFileSync(OUT, L.join("\n"), "utf8");
console.log("escrito:", OUT, "·", claims.length, "alegações");
