/**
 * Sinais técnicos LACRADOS de uma análise (D-138 §2): o que se pode ler de um trio durante a coleta medida, sem ver
 * recall, D nem achados. Lê só a pasta que `npm run analisar` gravou e imprime/grava SÓ:
 *   estado da análise · por execução: braço, técnico, submissão, isolamento, uso do oráculo, cartões gerados, janelas
 *   declaradas nos cartões, pontuação preparada · cenas do pacote · unidades sem nenhum cartão NA CENA DELAS (0 por
 *   construção, o defeito de 02/10: agente em 1440 e unidades em 1280).
 * Nunca imprime texto de achado, unidades confirmadas, recall, precisão nem comparações. Código 2 = defeito técnico.
 *
 *   npx tsx scripts/sinais-tecnicos.ts PASTA_DA_ANALISE [--json SAIDA.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ler = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) as T;
const JANELA = "1280x900";

interface Exec { braco: string; tecnico: { status: string; submissao: string }; mcpIsolamento: { isolamento: string; usoOraculo: string }; pontuacao: { estado: string } }
interface Pkg { scenes: { id: string }[]; units: { id: string; scene: string }[]; runs: { kind: string; config: { oracleProfile?: string } | null; cardIds: string[] }[];
  cards: { id: string; origin: string; scene: string; state?: { viewport?: { width: number; height: number } | null } | null }[] }
export interface Sinais { analise: string; execucoes: Record<string, unknown>[]; cenas: string[]; unidadesZeroPorConstrucao: number; defeitos: string[] }

const PERFIL: Record<string, string> = { none: "sem", "knowledge-free": "ferramentas", evaluation: "com" };

export function sinaisTecnicos(dir: string): Sinais {
  const s = ler<{ analise: { estado: string }; execucoes: Exec[] }>(join(dir, "summary.json"));
  const defeitos: string[] = [];
  if (s.analise.estado !== "pronta") defeitos.push(`análise ${s.analise.estado}`);
  let pkg: Pkg | null = null;
  try { pkg = ler<Pkg>(join(dir, "revisao", "package.json")); } catch { defeitos.push("sem pacote de revisão (nada pontuável)"); }
  const execucoes = s.execucoes.map(e => {
    const run = pkg?.runs.find(r => r.kind === "agente" && PERFIL[r.config?.oracleProfile ?? ""] === e.braco);
    const cards = run ? pkg!.cards.filter(c => run.cardIds.includes(c.id)) : [];
    const janelas: Record<string, number> = {};
    for (const c of cards) { const v = c.state?.viewport; const k = v ? `${v.width}x${v.height}` : "não declarada"; janelas[k] = (janelas[k] ?? 0) + 1; }
    if (e.tecnico.status !== "passed") defeitos.push(`${e.braco}: técnico ${e.tecnico.status}`);
    if (e.mcpIsolamento.isolamento !== "passed") defeitos.push(`${e.braco}: isolamento ${e.mcpIsolamento.isolamento}`);
    if (e.tecnico.submissao === "accepted" && !run) defeitos.push(`${e.braco}: submissão aceita sem run no pacote`);
    if (e.pontuacao.estado === "not-prepared") defeitos.push(`${e.braco}: pontuação não preparada`);
    for (const k of Object.keys(janelas)) if (k !== JANELA) defeitos.push(`${e.braco}: ${janelas[k]} cartão(ões) em janela ${k} (esperada ${JANELA})`);
    return { braco: e.braco, tecnico: e.tecnico.status, submissao: e.tecnico.submissao, isolamento: e.mcpIsolamento.isolamento, usoOraculo: e.mcpIsolamento.usoOraculo,
      cartoes: cards.length, janelasDosCartoes: janelas, pontuacaoPreparada: e.pontuacao.estado !== "not-prepared" };
  });
  const cenas = pkg?.scenes.map(c => c.id) ?? [];
  for (const c of cenas) if (!c.startsWith(JANELA)) defeitos.push(`cena ${c} fora da janela ${JANELA}`);
  const cenasComCartao = new Set(pkg?.cards.filter(c => c.origin === "agente").map(c => c.scene) ?? []);
  const zero = pkg ? pkg.units.filter(u => !cenasComCartao.has(u.scene)).length : 0;
  if (pkg && zero) defeitos.push(`${zero} unidade(s) sem nenhum cartão de agente na cena delas (0 por construção)`);
  return { analise: s.analise.estado, execucoes, cenas, unidadesZeroPorConstrucao: zero, defeitos };
}

/** As linhas que o terminal mostra (as mesmas no CLI daqui e no `coleta:trio`); nada além dos sinais. */
export function linhasDosSinais(r: Sinais): string[] {
  return [`análise ${r.analise} · cenas ${r.cenas.join(", ") || "—"} · unidades 0 por construção: ${r.unidadesZeroPorConstrucao}`,
    ...r.execucoes.map(e => `  ${JSON.stringify(e)}`),
    r.defeitos.length ? `DEFEITO TÉCNICO (${r.defeitos.length}):\n  ${r.defeitos.join("\n  ")}` : "sinais técnicos ok"];
}

if (process.argv[1] && /(?:^|[\\/])sinais-tecnicos\.ts$/.test(process.argv[1])) {
  const [dir] = process.argv.slice(2), i = process.argv.indexOf("--json");
  if (!dir) { console.error("Uso: npx tsx scripts/sinais-tecnicos.ts PASTA_DA_ANALISE [--json SAIDA.json]"); process.exit(1); }
  const r = sinaisTecnicos(dir);
  if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify(r, null, 2) + "\n");
  for (const l of linhasDosSinais(r)) console.log(l);
  if (r.defeitos.length) process.exitCode = 2;
}
