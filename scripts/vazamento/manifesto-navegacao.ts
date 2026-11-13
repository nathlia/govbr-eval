/**
 * Manifesto de navegação de uma tela (NAT-118): o PRIMEIRO dos dois passos do inventário do DOM.
 *
 * O gerador do inventário (`inventario-dom.ts`) só precisa saber chegar às paradas da tela: a entrada (`url` +
 * `waitFor`), a janela, os passos de `setup` e as paradas (`states`: `id`, `afterStep`, `path`). Até o 1.1.0 ele abria a
 * referência inteira para ler isso. Este extrator lê a referência UMA vez, num processo separado, e grava só esses
 * metadados operacionais; specs, descrições, regras, contagens e vereditos nunca saem dele. O gerador passa a ler só o
 * manifesto (e o site congelado), e quem gera o inventário de uma tela selada nunca vê a referência.
 *
 * Lista fechada: cada campo de `_meta` é OPERACIONAL (copiado) ou DOCUMENTAL (conhecido e deixado de fora). Campo que não
 * está em nenhuma das duas listas faz a extração PARAR (o nome é relatado, o valor nunca): pode ser um passo de navegação
 * novo que o gerador ignoraria em silêncio, e ampliar a lista é decisão, não default. O mesmo vale dentro de cada passo
 * do `setup` (só os campos de `FlowSetupStep`), de cada parada (`id`, `afterStep`, `path`; `note` é documental) e da
 * janela (`width`, `height`).
 *
 * O manifesto leva o sha256 da referência de origem (bytes do arquivo) e o do próprio conteúdo (`sha256`: JSON canônico,
 * chaves ordenadas, de tudo menos esse campo). Quem o lê confere os dois lados (`validarManifesto`).
 *
 *   npx tsx scripts/vazamento/manifesto-navegacao.ts --tela <nome> --saida <manifesto.json> [--referencia <arquivo>]
 *
 * Sem `--referencia`, o arquivo vem de `telas.json` (`<tela>.reference`, relativo à raiz do govbr-eval). Imprime só
 * contagens e hashes.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FlowSetupStep, FlowViewport } from "../../types";
import { problemasDoPasso } from "../anchors";

export const MANIFESTO_VERSAO = "manifesto-navegacao-1.0.0";
const ROOT_EVAL = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
export const VIEWPORT_PADRAO: FlowViewport = { width: 1280, height: 900 };
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const HEX = /^[0-9a-f]{64}$/;

/** Campos de `_meta` copiados para o manifesto: o que o gerador do inventário usa para chegar às paradas. */
export const CAMPOS_OPERACIONAIS = ["url", "waitFor", "viewport", "setup", "states"] as const;
/**
 * Campos de `_meta` conhecidos e DEIXADOS DE FORA (versão, histórico, notas, auditoria, sorteio, escopo, contagens…):
 * os das referências das telas de desenvolvimento A, A2 e B, mais `classes`, `evidencia` e `metodo` da tela D
 * (13/11/2026: classe por spec, arquivo e sha256 da evidência por spec, proveniência da auditoria; classificados pela
 * forma dos campos, sem ler o conteúdo). Nenhum deles muda como se chega às paradas.
 */
export const CAMPOS_DOCUMENTAIS = [
  "version", "version_note", "historico", "status", "page", "suite", "ds", "unit_of_evaluation", "setup_rationale",
  "nunca_agregar_com", "baselines", "camada_pagina", "chamarizes", "fundo", "conformes", "fora_de_escopo", "escaladas",
  "auditoria", "protocoloTempo", "sorteio", "rules_nota", "coincideComCore", "exposto", "piso", "porSpec", "construcao",
  "reconciliacao", "remedida", "candidata", "classes", "evidencia", "metodo",
] as const;
/** Campos de um passo do `setup` (FlowSetupStep): todos operacionais. */
export const CAMPOS_DO_PASSO = ["action", "selector", "value", "ms", "path", "waitFor"] as const;
/** Campos de uma parada copiados; `note` é documental. */
export const CAMPOS_DA_PARADA = ["id", "afterStep", "path"] as const;
const DOCUMENTAIS_DA_PARADA = ["note"] as const;

export interface ParadaDeNavegacao { id: string; afterStep: number; path?: string }
export interface ManifestoNavegacao {
  contrato: typeof MANIFESTO_VERSAO;
  tela: string;
  referencia: { arquivo: string; sha256: string };
  entrada: { url: string; waitFor?: string };
  viewport: FlowViewport;
  setup: FlowSetupStep[];
  paradas: ParadaDeNavegacao[];
  /** sha256 do JSON canônico de todos os outros campos. */
  sha256: string;
}

/** JSON canônico: chaves ordenadas em todo nível, sem espaços. */
export function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export function sha256DoConteudo(m: Omit<ManifestoNavegacao, "sha256"> | ManifestoNavegacao): string {
  const { sha256: _s, ...corpo } = m as ManifestoNavegacao;
  return sha256(canonico(corpo));
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const desconhecidos = (o: Record<string, unknown>, conhecidos: readonly string[]) => Object.keys(o).filter((k) => !conhecidos.includes(k));

function viewportValida(v: unknown): v is FlowViewport {
  return ehObjeto(v) && desconhecidos(v, ["width", "height"]).length === 0
    && Number.isInteger(v.width) && (v.width as number) > 0 && Number.isInteger(v.height) && (v.height as number) > 0;
}

/** Problemas de forma do conteúdo operacional (o mesmo teste no extrator e em quem lê o manifesto). Nunca cita valores. */
function problemasDaNavegacao(n: { entrada: unknown; viewport: unknown; setup: unknown; paradas: unknown }): string[] {
  const p: string[] = [];
  const e = n.entrada;
  if (!ehObjeto(e) || typeof e.url !== "string" || !e.url.trim()) p.push("entrada.url ausente ou vazia");
  else {
    if (desconhecidos(e, ["url", "waitFor"]).length) p.push(`entrada: campo fora da lista: ${desconhecidos(e, ["url", "waitFor"]).join(", ")}`);
    if (e.waitFor !== undefined && (typeof e.waitFor !== "string" || !e.waitFor.trim())) p.push("entrada.waitFor não é texto");
  }
  if (!viewportValida(n.viewport)) p.push("viewport: só width e height, inteiros positivos");
  if (!Array.isArray(n.setup)) p.push("setup não é lista");
  const setup = Array.isArray(n.setup) ? n.setup : [];
  setup.forEach((s, i) => {
    if (!ehObjeto(s)) { p.push(`setup[${i}] não é objeto`); return; }
    const fora = desconhecidos(s, CAMPOS_DO_PASSO);
    if (fora.length) p.push(`setup[${i}]: campo fora da lista: ${fora.join(", ")}`);
    else if (problemasDoPasso(s as unknown as FlowSetupStep).length) p.push(`setup[${i}]: passo inválido (${problemasDoPasso(s as unknown as FlowSetupStep).length} problema(s))`);
  });
  if (!Array.isArray(n.paradas) || n.paradas.length === 0) p.push("paradas: lista vazia ou ausente");
  const paradas = Array.isArray(n.paradas) ? n.paradas : [];
  const ids = new Set<string>();
  paradas.forEach((s, i) => {
    if (!ehObjeto(s)) { p.push(`paradas[${i}] não é objeto`); return; }
    const fora = desconhecidos(s, CAMPOS_DA_PARADA);
    if (fora.length) p.push(`paradas[${i}]: campo fora da lista: ${fora.join(", ")}`);
    if (typeof s.id !== "string" || !s.id) p.push(`paradas[${i}]: id ausente`);
    else if (ids.has(s.id)) p.push(`paradas[${i}]: id repetido`);
    else ids.add(s.id);
    if (!Number.isInteger(s.afterStep) || (s.afterStep as number) < 0 || (s.afterStep as number) > setup.length) p.push(`paradas[${i}]: afterStep fora de 0..${setup.length}`);
    if (s.path !== undefined && !(typeof s.path === "string" && s.path.startsWith("/"))) p.push(`paradas[${i}]: path não é caminho absoluto`);
  });
  if (setup.some((s) => ehObjeto(s) && s.action === "navigate") && paradas.some((s) => ehObjeto(s) && s.path === undefined)) {
    p.push("setup navega e alguma parada não declara path");
  }
  return p;
}

/**
 * Extrai o manifesto do texto da referência. Para (lança) com campo fora da lista, em `_meta` ou dentro de passo,
 * parada ou janela; a mensagem diz só o NOME do campo e onde, nunca o valor.
 */
export function extrairManifesto(refTexto: Buffer, origem: { tela: string; arquivo: string }): ManifestoNavegacao {
  const ref = JSON.parse(refTexto.toString("utf8")) as { _meta?: unknown };
  if (!ehObjeto(ref._meta)) throw new Error(`${origem.arquivo}: sem _meta`);
  const meta = ref._meta;
  const fora = desconhecidos(meta, [...CAMPOS_OPERACIONAIS, ...CAMPOS_DOCUMENTAIS]);
  if (fora.length) throw new Error(`${origem.arquivo}: _meta tem campo(s) fora da lista fechada: ${fora.join(", ")} — a extração para; classificar cada um (operacional ou documental) é decisão registrada`);
  const states = meta.states === undefined ? [{ id: "inicial", afterStep: 0 }] : meta.states;
  if (!Array.isArray(states)) throw new Error(`${origem.arquivo}: _meta.states não é lista`);
  const paradas = states.map((s, i) => {
    if (!ehObjeto(s)) throw new Error(`${origem.arquivo}: _meta.states[${i}] não é objeto`);
    const f = desconhecidos(s, [...CAMPOS_DA_PARADA, ...DOCUMENTAIS_DA_PARADA]);
    if (f.length) throw new Error(`${origem.arquivo}: _meta.states[${i}] tem campo(s) fora da lista fechada: ${f.join(", ")}`);
    return { id: s.id, afterStep: s.afterStep, ...(s.path !== undefined ? { path: s.path } : {}) } as ParadaDeNavegacao;
  });
  const corpo: Omit<ManifestoNavegacao, "sha256"> = {
    contrato: MANIFESTO_VERSAO,
    tela: origem.tela,
    referencia: { arquivo: origem.arquivo, sha256: sha256(refTexto) },
    entrada: { url: meta.url as string, ...(meta.waitFor !== undefined ? { waitFor: meta.waitFor as string } : {}) },
    viewport: (meta.viewport ?? VIEWPORT_PADRAO) as FlowViewport,
    setup: (meta.setup ?? []) as FlowSetupStep[],
    paradas,
  };
  const p = problemasDaNavegacao(corpo);
  if (p.length) throw new Error(`${origem.arquivo}: navegação inválida: ${p.join("; ")}`);
  return { ...corpo, sha256: sha256DoConteudo(corpo) };
}

const CAMPOS_DO_MANIFESTO = ["contrato", "tela", "referencia", "entrada", "viewport", "setup", "paradas", "sha256"];

/** Lê e confere um manifesto: esquema fechado, forma da navegação e o sha256 do conteúdo. Lança com a lista de problemas. */
export function validarManifesto(v: unknown, arquivo = "manifesto"): ManifestoNavegacao {
  const p: string[] = [];
  if (!ehObjeto(v)) throw new Error(`${arquivo}: não é objeto`);
  const fora = desconhecidos(v, CAMPOS_DO_MANIFESTO);
  if (fora.length) p.push(`campo fora do esquema: ${fora.join(", ")}`);
  const faltam = CAMPOS_DO_MANIFESTO.filter((k) => v[k] === undefined);
  if (faltam.length) p.push(`faltam: ${faltam.join(", ")}`);
  if (v.contrato !== MANIFESTO_VERSAO) p.push(`contrato ≠ ${MANIFESTO_VERSAO}`);
  if (typeof v.tela !== "string" || !/^[a-z0-9-]+$/.test(v.tela)) p.push("tela fora do formato");
  const r = v.referencia;
  if (!ehObjeto(r) || desconhecidos(r, ["arquivo", "sha256"]).length || typeof r.arquivo !== "string" || !HEX.test(String(r.sha256))) p.push("referencia: { arquivo, sha256 } fora do formato");
  if (!faltam.length) p.push(...problemasDaNavegacao(v as never));
  if (!HEX.test(String(v.sha256))) p.push("sha256 fora do formato");
  else if (!p.length && sha256DoConteudo(v as unknown as ManifestoNavegacao) !== v.sha256) p.push("sha256 do conteúdo não confere (manifesto alterado depois da extração)");
  if (p.length) throw new Error(`${arquivo}: manifesto inválido: ${p.join("; ")}`);
  return v as unknown as ManifestoNavegacao;
}

export function lerManifesto(arquivo: string): ManifestoNavegacao {
  return validarManifesto(JSON.parse(readFileSync(arquivo, "utf8")), arquivo);
}

function main(): void {
  const argv = process.argv.slice(2);
  const valor = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const tela = valor("tela");
  const saida = valor("saida");
  if (!tela || !saida) throw new Error("uso: manifesto-navegacao.ts --tela <nome> --saida <manifesto.json> [--referencia <arquivo>]");
  let arquivo = valor("referencia");
  if (!arquivo) {
    const telas = JSON.parse(readFileSync(join(ROOT_EVAL, "telas.json"), "utf8")) as Record<string, { reference?: string | null }>;
    const ref = telas[tela]?.reference;
    if (!ref) throw new Error(`telas.json: ${tela} sem referência`);
    arquivo = join(ROOT_EVAL, ref);
  }
  const caminho = resolve(arquivo);
  const texto = readFileSync(caminho);
  const m = extrairManifesto(texto, { tela, arquivo: basename(caminho) });
  mkdirSync(dirname(resolve(saida)), { recursive: true });
  writeFileSync(resolve(saida), JSON.stringify(m, null, 1) + "\n");
  console.log(`${tela}: manifesto ${m.sha256} (referência ${m.referencia.sha256}); ${m.setup.length} passos, ${m.paradas.length} paradas → ${resolve(saida)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (e) { console.error((e as Error).message); process.exit(1); }
}
