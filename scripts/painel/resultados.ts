/**
 * RESULTADOS.md (NAT-58) — os resultados de relance, gravados na raiz do clone do `govbr-resultados`.
 *
 *   npm run painel:resultados -- resumo --arquivo <clone>      (ou o botão "Atualizar RESULTADOS.md" no painel)
 *
 * Só números da revisão ATUAL de cada par (`analises/<campanha>/<par>/revisoes/rev-NNN/summary.json`, lidos por
 * `resultadoDaRevisao`) e ids (campanha, par, tela, modelo). Nunca texto da referência, descrição de unidade,
 * texto de cartão nem seletor. Saída determinística: a mesma entrada dá os mesmos bytes, menos a linha "Gerado em".
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { campanhasDoPlacar, dataLocal, placarDaCampanha, vistaExecucoes, type InfoCampanha, type LinhaPlacar, type Placar, type ResultadoBraco } from "./modelo";
import { ESTADO_SLOT_TXT, linhasDaAgenda, linhasDoDesfecho, linhasSecundarias, minTxt, sinal as sinalD } from "./agenda-painel";

export const LINHA_DATA = /^Gerado em: .*$/m;

const pct = (v: number | null): string => v === null ? "recall indisponível" : `recall ${(v * 100).toFixed(1).replace(".", ",")}%`;
const pp = (v: number): string => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1).replace(".", ",")} p.p.`;
const sinal = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0");
const md = (s: string): string => s.replace(/\|/g, "/").replace(/\r?\n/g, " ");

export function rotuloDaCampanha(c: InfoCampanha): string {
  if (c.natureza === "calibracao") return "calibração — não é resultado (D-67)";
  if (c.natureza === "ensaio") return "ensaio — não é dado científico";
  return c.rotulo;
}

function braco(b: ResultadoBraco | undefined): string {
  if (!b) return "—";
  const base = `${b.confirmadas ?? "?"}/${b.total ?? "?"}${b.maturidade === "final" ? "" : " até agora"} (${pct(b.recall)})`;
  if (!b.camadas) return base;
  // Camada de página (D-83): sorteadas × página, só prefixo e números.
  const c = (x: NonNullable<ResultadoBraco["camadas"]>["sorteadas"]) => `${x.prefixo}\\* ${x.confirmadas ?? "?"}/${x.total ?? "?"} (${pct(x.recall)})`;
  return `${base}<br>sorteadas × página: ${c(b.camadas.sorteadas)} × ${c(b.camadas.pagina)}`;
}
const par2 = (l: LinhaPlacar, f: (b: ResultadoBraco) => number | null): string => {
  const r = l.resultado;
  if (!r) return "—";
  const v = (b: ResultadoBraco | undefined) => (b ? f(b) ?? "?" : "—");
  return `${v(r.bracos.sem)} / ${v(r.bracos.com)}`;
};

function tabela(p: Placar): string[] {
  const L = [
    "| Par | Tela | Modelo | Sem oráculo: confirmadas/total | Com oráculo: confirmadas/total | Diferença com − sem | Defeitos novos corretos sem / com | Incorretas sem / com | Selo |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const l of p.linhas) {
    const r = l.resultado;
    const dif = !r || !r.disponivel || r.diferencaUnidades === null ? "indisponível"
      : `${sinal(r.diferencaUnidades)} unidade${Math.abs(r.diferencaUnidades) === 1 ? "" : "s"}${r.diferencaRecall === null ? "" : ` (${pp(r.diferencaRecall)})`}${r.estado === "final" ? "" : " até agora"}`;
    L.push(`| ${md(l.par)} | ${md(l.tela)} | ${md(l.modelo ?? "—")} | ${braco(r?.bracos.sem)} | ${braco(r?.bracos.com)} | ${dif} | ${par2(l, b => b.novas)} | ${par2(l, b => b.incorretas)} | **${md(l.seloTexto)}** |`);
  }
  return L;
}

function linhaDaCampanha(p: Placar): string {
  if (!p.total) return "Campanha de um braço só (pelo desenho): não há comparação com × sem.";
  const base = `Pares finais: **${p.finais} de ${p.total}**.`;
  if (!p.finais) return `${base} Nenhum par final ainda: não há soma.`;
  if (p.somaSem === null || p.somaCom === null) return `${base} Soma indisponível: algum par final não tem o número de um dos braços.`;
  return `${base} Unidades confirmadas somadas só nos pares finais (n = ${p.finais}): **sem ${p.somaSem} · com ${p.somaCom}**${p.somaTotal !== null ? ` (de ${p.somaTotal} unidades da referência)` : ""}. Soma descritiva, sem inferência.`;
}

/** NAT-65: desfecho principal, secundários e planejado × executado de uma campanha com agenda. */
function secaoAgenda(p: Placar): string[] {
  const { vista: va, agregado: g } = p.agenda!;
  const d = linhasDoDesfecho(g);
  const L = [`### Desfecho principal — **${md(d.titulo)}**`, "", ...d.itens.map(i => `- ${md(i)}`), "",
    "Secundários, por braço (nunca somados ao principal):", "", ...linhasSecundarias(g).map(i => `- ${md(i)}`), "",
    "### Planejado × executado (pela agenda)", "", ...linhasDaAgenda(va).map(i => `- ${md(i)}`), "",
    "| Par | Abre com | Slot sem | Slot com | Intervalo entre inícios | D (sorteadas) |", "|---|---|---|---|---|---|"];
  for (const x of va.situacao.pares) {
    const ag = g.pares.find(q => q.pairId === x.pairId), fora = g.foraDaAnalise.find(q => q.pairId === x.pairId);
    const slot = (a: "sem" | "com") => { const z = x.slots[a]; return `${z.slot.slotId}: ${ESTADO_SLOT_TXT[z.estado]}${z.tentativas.length > 1 ? ` (${z.tentativas.length} tentativas)` : ""}${z.motivo ? ` — ${z.motivo}` : ""}`; };
    L.push(`| ${md(x.pairId)} | ${x.firstArm} | ${md(slot("sem"))} | ${md(slot("com"))} | ${minTxt(x.intervaloMin)} | ${ag ? `**${sinalD(ag.d)}** (${ag.sem} → ${ag.com})` : md(fora?.motivo ?? "—")} |`);
  }
  L.push("");
  return L;
}

/** O conteúdo do RESULTADOS.md. `agora` só entra na linha "Gerado em". */
export function gerarResultados(arquivo: string, agora: Date = new Date()): string {
  const v = vistaExecucoes(arquivo);
  const { mostradas, ensaios } = campanhasDoPlacar(v);
  const L: string[] = [
    "# Resultados de relance",
    "",
    "> Gerado pelo painel de resultados (`npm run painel:resultados -- resumo --arquivo <clone>` ou o botão “Atualizar RESULTADOS.md”). Não edite à mão: gere de novo.",
    "",
    `Gerado em: ${dataLocal(agora.toISOString())}`,
    "",
  ];
  if (v.fixture) L.push("**FIXTURE SINTÉTICA** — dados inventados para testar o painel. Não são resultado científico.", "");
  L.push(
    "Os números vêm da revisão cega: cada alegação do agente virou um cartão, decidido sem saber o braço, e só então a análise contou as unidades da referência confirmadas. Cada linha usa a revisão atual do par, `analises/<campanha>/<par>/revisoes/rev-NNN/summary.json` (o arquivo exato está abaixo de cada tabela).",
    "",
    "- **FINAL**: todos os cartões decididos; o número só muda com uma revisão nova.",
    "- **PROVISÓRIO com N cartões pendentes**: a revisão está aberta; as confirmadas são “até agora” e o recall fica indisponível (nunca 0).",
    "- **sem análise**: o par ainda não foi preparado no painel (ou falta um braço).",
    "- **NÃO CONTA — par inelegível**: um braço teve falha técnica (mesmo depois de enviar o relatório), isolamento não comprovado ou identidade fora da campanha. A pontuação dele é só diagnóstico; o par nunca vira FINAL nem entra na soma.",
    "- A soma de uma campanha usa só os pares FINAIS e diz o n. Um par provisório nunca entra na soma.",
    "",
  );
  if (!mostradas.length) L.push("O arquivo ainda não tem execuções.", "");
  for (const c of mostradas) {
    const p = placarDaCampanha(c, v.pares, {}, v.agendas[c.id] ?? null);
    L.push(`## ${c.id} — ${rotuloDaCampanha(c)}`, "");
    if (c.titulo) L.push(md(c.titulo), "");
    if (p.agenda) L.push(...secaoAgenda(p));
    L.push(linhaDaCampanha(p), "");
    if (p.linhas.length) {
      L.push(...tabela(p), "");
      const fontes = p.linhas.filter(l => l.resultado).map(l => `- ${l.par}: \`${l.resultado!.fonte}\``);
      if (fontes.length) L.push("Fontes:", "", ...fontes, "");
    } else L.push("Nenhum par nesta campanha.", "");
  }
  if (ensaios.length) L.push(`Fora desta página: ${ensaios.length} campanha${ensaios.length === 1 ? "" : "s"} de ensaio (${ensaios.map(c => c.id).join(", ")}) — dublê, roteiro ou fixture, nunca dado científico.`, "");
  return L.join("\n");
}

/** Grava `<arquivo>/RESULTADOS.md` e devolve o caminho e quantas campanhas entraram. */
export function gravarResultados(arquivo: string, agora: Date = new Date()): { caminho: string; campanhas: number } {
  const texto = gerarResultados(arquivo, agora);
  const caminho = join(arquivo, "RESULTADOS.md");
  writeFileSync(caminho, texto);
  return { caminho, campanhas: (texto.match(/^## /gm) ?? []).length };
}
