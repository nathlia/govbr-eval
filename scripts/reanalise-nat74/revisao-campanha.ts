/**
 * Revisão §8, passos 2–3, para campanha v2 NOVA (protocolo NAT-78; plano de revisão 19/10, entrega 3). Lê os cartões da
 * própria primeira passada (`e14-campanha.ts` + `e14-ingerir.ts --fila`) e o pacote da análise de onde vieram — nunca o
 * inventário E1 retrospectivo. O caminho retrospectivo (e14-consistencia / e14-desempate, fila T3 da NAT-74) não muda.
 * Nenhum passo aqui julga nada nem chama modelo: prepara cartões, confere respostas, calcula e grava.
 *
 *   npm run revisao:consistencia -- --passada PASSADA --saida REVISAO
 *       → REVISAO/consistencia/{relatorio.json(+.sha256), relatorio.md, regras.md(+.sha256)}   (triagem; grupos ≠ equivalência)
 *
 *   npm run revisao:confiabilidade -- amostra --passada PASSADA --saida REVISAO [--n 40] [--semente S]
 *       → REVISAO/confiabilidade/{lotes/amostra-NN.json, lotes/LEIAME-juiz.md (o da passada), lotes/LEIAME-amostra.md,
 *         lotes/esquema-respostas-amostra.schema.json, manifesto.json, chave/amostra-chave.json, cegueira.json}
 *         2 juízes novos e cegos por cartão (j1, j2): respostas em REVISAO/confiabilidade/respostas/amostra-NN-jK.json
 *   npm run revisao:confiabilidade -- medir --passada PASSADA --amostra REVISAO/confiabilidade [--juiz-passada OUTRA_PASSADA]
 *       → relatorio-confiabilidade.{json,md}, julgamentos-confiabilidade.json, desacordos.json (+ .sha256)
 *         `--juiz-passada`: SÓ ENSAIO — uma passada cega independente e congelada sobre os mesmos cartões entra como juiz
 *         substituto (casada por chave + sha256 do cartão original; campos sem par entre esquemas são excluídos e contados).
 *
 *   npm run revisao:adjudicacao -- preparar --passada PASSADA --confiabilidade REVISAO/confiabilidade --saida REVISAO
 *         [--aceitar-mascara-anterior]
 *       → REVISAO/adjudicacao/{lotes/lote-dNN.json (etapa A), lotes/LEIAME-adjudicacao.md, lotes/LEIAME-juiz.md,
 *         lotes/esquema-adjudicacao-{a,b}.schema.json, manifesto.json, chave/adjudicacao-chave.json, cegueira.json, regras.md}
 *   npm run revisao:adjudicacao -- revelar --passada PASSADA --adjudicacao REVISAO/adjudicacao --lote lote-dNN
 *       → exige respostas/lote-dNN-a.json válido; grava lotes/lote-dNN-b.json (etapa A congelada pelo sha256; leituras
 *         anteriores anônimas, "leitura 1/2…") e chave/revelacao-lote-dNN.json (quem é cada leitura; não vai ao adjudicador)
 *   npm run revisao:adjudicacao -- aplicar --passada PASSADA --adjudicacao REVISAO/adjudicacao --saida PASTA_NOVA
 *       → PASTA_NOVA/: lotes/ e chave/ copiados, respostas/ com a resposta B no lugar da dos membros, julgamentos.json
 *         (+ .sha256, pela própria ingestão), julgamentos-1a-passada.json (+ .sha256, a 1ª passada preservada),
 *         adjudicacao/sobrescritas.{json,md}, contestados.json (+ .sha256; insumo do S4'). Nunca escreve na passada.
 *
 * Gatilhos mecânicos de unidade de adjudicação (fixados antes dos resultados; REGRAS_CAMPANHA §2): (a) grupo de cartões
 * idênticos (mesma alegação / mesma leitura da norma) com decisões divergentes; (b) cartão da amostra de confiabilidade em
 * que algum juiz da amostra discorda da 1ª passada em classe, crédito, fato, aplicabilidade ou vínculo; (c) cartão que a 1ª
 * passada decidiu `estadoAlcancado: nao-alcancado` (tira crédito por razão do instrumento).
 *
 * Todas as pastas são argumentos explícitos e obrigatórios (nunca a fila histórica). Nenhum arquivo é sobrescrito com
 * conteúdo diferente: versão nova = pasta nova. Determinístico: sem carimbo de tempo, sem rede, sem modelo.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { SemanticPackage } from "../semantic-flow";
import { distingueComDeFerramentas, mascararTextoCego } from "../painel/mascara";
import { POLITICA_PRINCIPAL, gravar, jsonTexto, lerJson, ordenar, sha, unicos } from "./comum";
import { janelas, residuoDeBraco, verificarCegueira, type Falha } from "./e14-cegueira";
import {
  ESQUEMA_RESPOSTAS_CAMPANHA, ESQUEMA_RESPOSTAS_CAMPANHA_1_1, FORMATO_LOTE, FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1,
  FORMATO_RESPOSTAS_CAMPANHA, FORMATO_RESPOSTAS_CAMPANHA_1_1, NAO_PERGUNTADO, NORMA_PUBLICA, VAL, derivarClasse, validarResposta,
  type CartaoCego, type Derivado, type ItemChave, type Resposta,
} from "./e14-comum";
import {
  CAMPOS, CLASSIFICACOES, analisar, cohen, creditoDe, estadoDe, fleiss, regraCanonica, relatorioMd, sujeitoDe, tipoDeSujeito,
  type Analise, type Julgado, type Membro, type Referencias,
} from "./e14-consistencia";
import { contextoDe, ingerir } from "./e14-ingerir";

type Card = SemanticPackage["cards"][number];
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const lerTexto = (p: string) => readFileSync(p, "utf8").replace(/^﻿/, "");

export const REVISAO_VERSAO = "nat78-revisao-campanha-1.0.0";
export const SEMENTE_REVISAO = "nat78-revisao-campanha-v1|";
export const TAMANHO_AMOSTRA = 40;
export const POR_ARQUIVO_AMOSTRA = 20;
export const JUIZES_AMOSTRA = ["j1", "j2"] as const;
/** Campos do κ de Fleiss pedidos pelo protocolo §8.3 (classe, crédito, fato, aplicabilidade, vínculo) = gatilho (b). */
export const CAMPOS_KAPPA = ["classe", "credito", "fato", "norma.aplicabilidade", "vinculo"] as const;
export const FORMATO_ADJ_LOTE_A = "nat78-adjudicacao-lote-a-1.0.0";
export const FORMATO_ADJ_LOTE_B = "nat78-adjudicacao-lote-b-1.0.0";
export const FORMATO_ADJ_RESP_A = "nat78-adjudicacao-respostas-a-1.0.0";
export const FORMATO_ADJ_RESP_B = "nat78-adjudicacao-respostas-b-1.0.0";
export const nomeAmostra = (i: number): string => `amostra-${String(i + 1).padStart(2, "0")}`;
export const nomeLoteD = (i: number): string => `lote-d${String(i + 1).padStart(2, "0")}`;
export const idDaAmostra = (chave: string): string => `T3-${sha(SEMENTE_REVISAO + "amostra|" + chave).slice(0, 10)}`;
export const idDaAdjudicacao = (chave: string): string => `T3-${sha(SEMENTE_REVISAO + "adjudicacao|" + chave).slice(0, 10)}`;

// ───────────────────────────────────────────────────────────────── regras (fixadas antes dos resultados)

export const REGRAS_CAMPANHA = `# Revisão §8 de campanha nova — consistência, adjudicação e confiabilidade (regras fixas)

**Quando foram escritas:** 19/10/2026, entrega 3 do plano de revisão de campanha nova, ANTES de qualquer coleta medida
da D (só o trio de ensaio fora da amostra existia). Valem igual para toda campanha v2 nova; o sha256 deste arquivo vai
para o manifesto da amostra, da adjudicação e da passada adjudicada. Nenhuma regra de crédito nova: só procedimento.

## 1. Grupos (triagem)

- Mesmos grupos da reanálise retrospectiva (e14-consistencia, REGRAS §1), calculados dos cartões da própria passada e do
  pacote da análise de onde vieram (regra citada canônica, chaves de elemento dos sujeitos, cena), nunca das respostas:
  **mesma alegação (MA)** = mesma tela × perguntas × sujeito × regra × estado; **mesma leitura da norma (LN)** = mesma
  regra × tipo de sujeito. Grupos são triagem, nunca equivalência: não propagam veredito nem exigem unanimidade.

## 2. Unidades de adjudicação — gatilhos mecânicos

Um cartão vai à adjudicação quando ocorre qualquer um dos três; unidades que compartilham cartões se juntam:
- **(a)** está num grupo com ≥ 2 cartões em que divergem: MA — classe, crédito, fundamentação ou norma.id; LN — norma.id,
  força, aplicabilidade ou violada (mesma seleção da retrospectiva, REGRAS §2);
- **(b)** está na amostra de confiabilidade e algum juiz da amostra discorda da 1ª passada em classe, crédito, fato,
  aplicabilidade ou vínculo;
- **(c)** a 1ª passada respondeu \`estadoAlcancado: "nao-alcancado"\` (evidência indisponível porque a receita não chegou
  ao estado): sempre adjudicado, porque tira crédito por razão do instrumento.

## 3. Adjudicação informada

- **Um adjudicador novo por unidade**, cego para braço, modelo, campanha, run e respostas anteriores; cartões idênticos
  aos da 1ª passada, com id novo; as instruções de julgamento são as da 1ª passada (\`LEIAME-juiz.md\`, sem mudança).
- **Etapa A**: leitura individual (\`leituraDaNorma\` + resposta a cada cartão), sem ver resposta anterior. Congelada:
  o sha256 dela vai no lote B.
- **Etapa B**: vê as respostas anteriores de cada cartão (1ª passada e juízes da amostra), anônimas ("leitura 1",
  "leitura 2"…, ordem por hash), responde de novo e classifica a divergência. A resposta B é a que vale.
- Leitura incompatível que continua plausível → listada em \`leiturasAlternativasPlausiveis\` e os cartões com pergunta
  de norma ficam \`incerta\`/\`incerto\` (classe evidência indisponível/pendente); a alternativa vai como sensibilidade.
- Uma rodada por unidade; nunca se repete até haver acordo.
- A 1ª passada é preservada (\`julgamentos-1a-passada.json\`); a adjudicada vai para uma pasta nova.

## 4. Confiabilidade (antes da adjudicação)

- Amostra de até 40 cartões idênticos aos da 1ª passada (só o id muda), estratificada por braço mascarado × classe da
  1ª passada: 1 por estrato + o resto proporcional (maiores restos); dentro do estrato, ordem por sha256(semente + chave).
  Semente: a da campanha (\`design.seed\`); sem ela, a declarada e gravada no manifesto.
- 2 juízes novos e cegos por cartão, com as instruções da 1ª passada, medidos ANTES da adjudicação.
- κ de Fleiss para classe, crédito, fato, aplicabilidade e vínculo (avaliadores: 1ª passada + juízes da amostra; e só os
  juízes, com ≥ 2), mais a concordância descritiva por campo e por par, sempre com os denominadores.

## 5. Contestados (insumo do S4')

\`contestados.json\` lista cada cartão em que a 1ª passada ≠ adjudicação (resposta, crédito ou fundamentação) ou em que um
juiz da amostra discordou da 1ª passada num campo do §4; \`creditoEnvolvido\` marca os que creditam em alguma das duas.
`;

// ───────────────────────────────────────────────────────────────── leitura da passada

interface ManifestoPassada {
  formato: string; versao: string; total: number; chaveSha256: string;
  analises: { dir: string; packageSha256: string }[];
  lotes: { lote: string; n: number; sha256: string; ids: string[] }[];
}
interface LotePassada { lote: string; referencias: Referencias & Record<string, { defeitos: { id: string }[] }>; cartoes: CartaoCego[] }
export interface Campanha { campaignId: string; arms: string[]; seed: string | number | null }
export interface Passada {
  dir: string; nome: string; versao: string; v12: boolean; mascara13: boolean;
  manifestoTxt: string; chaveTxt: string; julgTxt: string; julgSha: string; leiameJuiz: string;
  itens: ItemChave[]; item: Map<string, ItemChave>; cartao: Map<string, CartaoCego>; loteDe: Map<string, string>;
  referencias: LotePassada["referencias"]; card: Map<string, Card>; julgados: Map<string, Julgado>;
  membros: Membro[]; campanha: Campanha; fontes: Record<string, string>;
}

const numVersao = (v: string): number[] => (/(\d+)\.(\d+)\.(\d+)$/.exec(v) ?? [0, 0, 0, 0]).slice(1).map(Number);
const versaoAoMenos = (v: string, m: number[]): boolean => { const a = numVersao(v); for (let i = 0; i < 3; i++) if (a[i] !== m[i]) return a[i] > m[i]; return true; };

/**
 * Pasta de uma análise da passada, sem `--analise`: irmã da passada ou de uma das duas pastas acima (a passada adjudicada
 * mora em `revisao-*`/). A primeira que tem `revisao/package.json`; quem chama confere o `packageSha256`.
 */
export function pastaDaAnalise(dirPassada: string, nome: string): string {
  const acima = [1, 2, 3].map(k => join(Array.from({ length: k }).reduce<string>(d => dirname(d), dirPassada), nome));
  return acima.find(x => existsSync(join(x, "revisao", "package.json"))) ?? acima[0];
}

/**
 * Lê uma primeira passada CONGELADA de campanha nova: manifesto de campanha (1.1.0/1.2.0), chave e lotes conferidos pelo
 * sha256, `julgamentos.json` completo e conferido pelo `.sha256`, e reproduzido byte a byte pela ingestão (`ingerir`). Os
 * cartões originais vêm do pacote de cada análise listada no manifesto (`pastaDaAnalise`, ou `analises` dadas),
 * conferido pelo `packageSha256`; cada cartão confere com o `cardSha256` da chave.
 */
export function lerPassada(dirArg: string, o: { analises?: string[] } = {}): Passada {
  const dir = resolve(dirArg);
  const mAbs = join(dir, "lotes", "manifesto.json");
  if (!existsSync(mAbs)) throw new Error(`${dir}: sem lotes/manifesto.json (não é uma passada preparada)`);
  const manifestoTxt = lerTexto(mAbs);
  const man = JSON.parse(manifestoTxt) as ManifestoPassada;
  if (![FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1].includes(man.formato))
    throw new Error(`${dir}: manifesto ${man.formato ?? "(sem formato)"} não é de primeira passada de campanha nova (o caminho histórico é e14-consistencia/e14-desempate)`);
  const v12 = man.formato === FORMATO_MANIFESTO_CAMPANHA;
  const chaveTxt = lerTexto(join(dir, "chave", "fila-t3-chave.json"));
  if (sha(chaveTxt) !== man.chaveSha256) throw new Error(`${dir}: chave difere do manifesto`);
  const jAbs = join(dir, "julgamentos.json");
  if (!existsSync(jAbs)) throw new Error(`${dir}: sem julgamentos.json (a passada não foi ingerida: e14-ingerir --fila)`);
  const julgTxt = lerTexto(jAbs), julgSha = sha(julgTxt);
  const sAbs = join(dir, "julgamentos.json.sha256");
  if (!existsSync(sAbs) || lerTexto(sAbs).trim().split(/\s+/)[0] !== julgSha) throw new Error(`${dir}: julgamentos.json não confere com julgamentos.json.sha256`);
  const jdoc = JSON.parse(julgTxt) as { completo: boolean; julgados: number; total: number; julgamentos: (Julgado & { chave: string; juiz: string })[] };
  if (!jdoc.completo || jdoc.julgados !== man.total) throw new Error(`${dir}: julgamentos incompletos (${jdoc.julgados}/${man.total}): a revisão só lê passada congelada completa`);
  const ing = ingerir(dir);
  if (ing.erros.length || ing.texto !== julgTxt) throw new Error(`${dir}: a ingestão não reproduz julgamentos.json byte a byte (${ing.erros.slice(0, 3).join("; ") || "conteúdo difere"})`);
  const itens = (JSON.parse(chaveTxt) as { itens: ItemChave[] }).itens;
  const item = new Map(itens.map(i => [i.id, i]));
  const cartao = new Map<string, CartaoCego>(), loteDe = new Map<string, string>();
  const fontes: Record<string, string> = { "lotes/manifesto.json": sha(manifestoTxt), "chave/fila-t3-chave.json": sha(chaveTxt), "julgamentos.json": julgSha };
  let referencias: LotePassada["referencias"] = {};
  for (const ml of man.lotes) {
    const t = lerTexto(join(dir, "lotes", `${ml.lote}.json`));
    if (sha(t) !== ml.sha256) throw new Error(`${dir}: lotes/${ml.lote}.json difere do manifesto`);
    const l = JSON.parse(t) as LotePassada;
    referencias = { ...referencias, ...l.referencias };
    for (const c of l.cartoes) { cartao.set(c.id, c); loteDe.set(c.id, ml.lote); }
  }
  // Análises (cartões originais e campanha).
  const card = new Map<string, Card>();
  let campanha: Campanha | null = null;
  for (const a of man.analises) {
    const dada = (o.analises ?? []).map(x => resolve(x)).find(x => basename(x) === a.dir);
    const abs = dada ?? pastaDaAnalise(dir, a.dir);
    const pAbs = join(abs, "revisao", "package.json");
    if (!existsSync(pAbs)) throw new Error(`análise ${a.dir} não achada em ${abs} (passe --analise DIR)`);
    const pTxt = readFileSync(pAbs);
    if (sha(pTxt) !== a.packageSha256) throw new Error(`análise ${a.dir}: revisao/package.json difere do packageSha256 do manifesto da passada`);
    fontes[`${a.dir}/revisao/package.json`] = a.packageSha256;
    const pkg = JSON.parse(pTxt.toString("utf8")) as SemanticPackage;
    for (const c of pkg.cards) card.set(`${a.dir}|${c.id}`, c);
    const camp = lerJson<{ campaignId: string; design: { arms?: string[]; seed?: string | number | null } }>(join(abs, "entradas", "campanha.json"));
    const c = { campaignId: camp.campaignId, arms: camp.design.arms ?? ["sem", "com"], seed: camp.design.seed ?? null };
    if (campanha && JSON.stringify(campanha) !== JSON.stringify(c)) throw new Error("análises da passada com campanhas diferentes");
    campanha = c;
  }
  if (!campanha) throw new Error(`${dir}: manifesto sem análises`);
  const julgados = new Map<string, Julgado>(jdoc.julgamentos.map(j => [j.id, { id: j.id, lote: j.lote, resposta: j.resposta, derivado: j.derivado }]));
  const membros: Membro[] = [];
  for (const it of itens) {
    const c = card.get(`${it.par}|${it.cardIdOriginal}`), cego = cartao.get(it.id);
    if (!c || !cego) throw new Error(`${it.id}: cartão original ou cego não achado`);
    if (sha(JSON.stringify(c)) !== it.cardSha256) throw new Error(`${it.id}: cardSha256 da chave não confere com o pacote`);
    const sujeitos = c.subjects.map(s => s.key ?? s.id);
    membros.push({ id: it.id, chave: it.chave, tela: it.tela, tipo: it.tipo, lote: loteDe.get(it.id)!, campanha: it.campanha, braco: it.braco,
      regra: regraCanonica(c.rule), sujeito: sujeitoDe({ sujeitos }), estado: estadoDe({ sujeitos, cena: c.scene ?? "" }), tipoDeSujeito: tipoDeSujeito(cego),
      perguntaNorma: cego.perguntas.includes("norma"), cartao: cego });
  }
  if (membros.length !== man.total) throw new Error(`${dir}: ${membros.length} cartões ≠ ${man.total}`);
  return { dir, nome: basename(dir), versao: (man as { versao: string }).versao, v12, mascara13: versaoAoMenos(man.versao, [1, 3, 0]),
    manifestoTxt, chaveTxt, julgTxt, julgSha, leiameJuiz: lerTexto(join(dir, "lotes", "LEIAME-juiz.md")),
    itens, item, cartao, loteDe, referencias, card, julgados, membros: ordenar(membros, m => m.id), campanha, fontes };
}

const specsDe = (p: Passada, c: CartaoCego) => p.referencias[c.tela].defeitos.map(d => d.id);
const opcoesValidacao = (p: Passada) => (p.v12 ? { normaNeutra: true, v12: true } : { normaNeutra: true });

// ───────────────────────────────────────────────────────────────── consistência (triagem)

export function consistencia(p: Passada): Analise {
  const a = analisar({ membros: p.membros, itens: p.itens, referencias: p.referencias }, p.julgados, p.fontes);
  Object.assign(a.relatorio, { formato: "nat78-revisao-consistencia-1.0.0", versao: REVISAO_VERSAO, passada: p.nome, regrasSha256: sha(REGRAS_CAMPANHA),
    aviso: "Relatório interno (não vai aos juízes nem aos adjudicadores): mostra a regra citada sem máscara e as respostas da 1ª passada. Grupos = triagem, não equivalência." });
  return a;
}
export const consistenciaMd = (a: Analise): string => relatorioMd(a).replace(/^# .*\n/, "# Revisão de campanha nova — consistência da 1ª passada (triagem)\n")
  .replace(/regras: `regras\.md`, sha256 `[0-9a-f]+`/, `regras: \`regras.md\`, sha256 \`${sha(REGRAS_CAMPANHA)}\``);

// ───────────────────────────────────────────────────────────────── cegueira dos arquivos de juiz/adjudicador

/**
 * Porta da NAT-73 com os braços do desenho (`verificarCegueira`) sobre os arquivos entregues, cartões pelo id novo; mais:
 * nenhum id da 1ª passada nem da amostra; nenhum trecho de justificativa anterior fora do material público (só sem
 * `informado`); nenhum campo de resposta em lote (só sem `informado`); padrão com × ferramentas fora "Rawline" (1.3.0).
 */
export function cegueiraArquivos(o: { p: Passada; arquivos: { rel: string; texto: string }[]; novos: Map<string, CartaoCego>; proibidos: string[];
  justificativas: Map<string, string[]>; informado?: boolean }): { resultado: "OK" | "FALHOU"; falhas: Falha[]; residuoPorBraco: Record<string, Record<string, number>>; porCartao: unknown[] } {
  const entradas = [...o.novos].map(([idOriginal, cartao]) => ({ cartao, card: o.p.card.get(`${o.p.item.get(idOriginal)!.par}|${o.p.item.get(idOriginal)!.cardIdOriginal}`)! as never,
    item: o.p.item.get(idOriginal)!, justificativas: o.informado ? [] : o.justificativas.get(idOriginal) ?? [] }));
  const ceg = verificarCegueira({ arquivos: o.arquivos, cartoes: entradas, bracos: o.p.campanha.arms });
  const falhas: Falha[] = [...ceg.falhas];
  for (const f of o.arquivos) for (const id of o.proibidos) if (f.texto.includes(id)) falhas.push({ arquivo: f.rel, cartao: null, regra: "id da 1ª passada ou da amostra", trecho: id });
  if (!o.informado) {
    const lido = (t: string) => t.replace(/\\"/g, '"').replace(/\s+/g, " ").toLowerCase();
    const publico = lido([...o.p.cartao.values()].map(c => JSON.stringify(c)).join("\n") + o.p.leiameJuiz + JSON.stringify(o.p.referencias));
    const ws = unicos([...o.justificativas.values()].flat().flatMap(j => janelas(j))).filter(w => !publico.includes(w));
    for (const f of o.arquivos) { const n = lido(f.texto); const w = ws.find(x => n.includes(x)); if (w) falhas.push({ arquivo: f.rel, cartao: null, regra: "trecho de justificativa anterior", trecho: w }); }
    for (const f of o.arquivos.filter(x => x.rel.endsWith(".json") && !/schema/.test(x.rel)))
      if (/"(?:forcaDoVeredito|justificativa|respostas|leituraDaNorma|leiturasAnteriores|estadoAlcancado)"\s*:/.test(f.texto)) falhas.push({ arquivo: f.rel, cartao: null, regra: "campo de resposta no lote", trecho: "forcaDoVeredito/justificativa/respostas/…" });
  }
  for (const [, c] of o.novos) if (distingueComDeFerramentas(JSON.stringify(c).replace(/\bRawline\b/gi, ""))) falhas.push({ arquivo: "(cartão)", cartao: c.id, regra: "texto ainda separa com de ferramentas", trecho: c.id });
  const residuoPorBraco: Record<string, Record<string, number>> = {};
  for (const [idO, c] of o.novos) { const b = o.p.item.get(idO)!.braco; const r = residuoDeBraco(c, b); const x = (residuoPorBraco[b] ??= { cartoes: 0, comResiduo: 0 }); x.cartoes++; if (r.categorias.length) x.comResiduo++; for (const k of r.categorias) x[k] = (x[k] ?? 0) + 1; }
  return { resultado: falhas.length ? "FALHOU" : "OK", falhas, residuoPorBraco, porCartao: ceg.porCartao };
}

// ───────────────────────────────────────────────────────────────── amostra de confiabilidade

export interface Semente { semente: string; origem: string }
export function sementeDaCampanha(c: Campanha, declarada: string | null): Semente {
  if (c.seed !== null && c.seed !== undefined) {
    if (declarada !== null && declarada !== String(c.seed)) throw new Error(`--semente ${declarada} difere da semente da campanha (${c.seed})`);
    return { semente: String(c.seed), origem: "campanha.design.seed" };
  }
  if (declarada !== null) return { semente: declarada, origem: "--semente (declarada; a campanha não tem design.seed)" };
  return { semente: `${SEMENTE_REVISAO}confiabilidade|${c.campaignId}`, origem: "padrão declarado (a campanha não tem design.seed): SEMENTE_REVISAO + 'confiabilidade|' + campaignId" };
}

export const estratoDe = (p: Passada, id: string): string => `${p.item.get(id)!.braco} · ${p.julgados.get(id)!.derivado.classe}`;

/** Sorteio estratificado por braço mascarado × classe da 1ª passada (REGRAS_CAMPANHA §4). n ≥ total → todos. */
export function sortearAmostra(p: Passada, n: number, semente: string): { estratos: Record<string, { tamanho: number; sorteados: number }>; ids: string[] } {
  const h = (id: string) => sha(semente + "|" + p.item.get(id)!.chave);
  const por = new Map<string, string[]>();
  for (const m of p.membros) { const e = estratoDe(p, m.id); por.set(e, [...(por.get(e) ?? []), m.id]); }
  const nomes = [...por.keys()].sort();
  const total = p.membros.length, alvo = Math.min(n, total);
  if (nomes.length > alvo) throw new Error(`amostra: ${nomes.length} estratos > ${alvo} cartões; aumente --n`);
  const aloc = new Map(nomes.map(e => [e, 1]));
  const resto = alvo - nomes.length;
  const quotas = nomes.map(e => ({ e, q: (resto * por.get(e)!.length) / total }));
  for (const x of quotas) aloc.set(x.e, Math.min(por.get(x.e)!.length, aloc.get(x.e)! + Math.floor(x.q)));
  let falta = alvo - [...aloc.values()].reduce((s, x) => s + x, 0);
  const ordemResto = [...quotas].sort((x, y) => (y.q - Math.floor(y.q)) - (x.q - Math.floor(x.q)) || (x.e < y.e ? -1 : 1));
  while (falta > 0) {
    let mudou = false;
    for (const x of ordemResto) { if (falta <= 0) break; if (aloc.get(x.e)! < por.get(x.e)!.length) { aloc.set(x.e, aloc.get(x.e)! + 1); falta--; mudou = true; } }
    if (!mudou) break;
  }
  const ids: string[] = [], estratos: Record<string, { tamanho: number; sorteados: number }> = {};
  for (const e of nomes) {
    const esc = [...por.get(e)!].sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, aloc.get(e)!);
    ids.push(...esc);
    estratos[e] = { tamanho: por.get(e)!.length, sorteados: esc.length };
  }
  return { estratos, ids: ids.sort((a, b) => (h(a) < h(b) ? -1 : 1)) };
}

function esquemaComLote(p: Passada, padrao: string, titulo: string): object {
  const e = JSON.parse(JSON.stringify(p.v12 ? ESQUEMA_RESPOSTAS_CAMPANHA : ESQUEMA_RESPOSTAS_CAMPANHA_1_1)) as { title: string; properties: { lote: { pattern: string } } };
  e.title = titulo; e.properties.lote.pattern = padrao;
  return e;
}
export const esquemaAmostra = (p: Passada): object => esquemaComLote(p, "^amostra-\\d{2}$", `${p.v12 ? FORMATO_RESPOSTAS_CAMPANHA : FORMATO_RESPOSTAS_CAMPANHA_1_1} (amostra de confiabilidade)`);

export function leiameAmostra(arquivos: string[], formato: string): string {
  return `# Amostra de confiabilidade — como responder

As instruções de julgamento são as do \`LEIAME-juiz.md\` (o da primeira passada, sem mudança): página congelada, medida,
perguntas fechadas, tabela de classes. Só muda o nome dos arquivos:

- o lote que você recebeu chama-se \`amostra-NN.json\` (${arquivos.join(", ")}); responda **todos** os cartões dele;
- grave a resposta em \`respostas/amostra-NN-<juiz>.json\` **na pasta da amostra** (ao lado de \`lotes/\`, nunca dentro dela);
  \`<juiz>\` é \`j1\` ou \`j2\`, dado por quem lhe passou o lote;
- no arquivo de resposta, \`"formato": "${formato}"\`, \`lote\` é \`"amostra-NN"\` e \`loteSha256\` é o sha256 do
  \`amostra-NN.json\` recebido;
- o esquema é \`esquema-respostas-amostra.schema.json\` (o da primeira passada, salvo o nome do lote).
- Não abra \`manifesto.json\`, \`chave/\` nem nenhum outro arquivo: só este LEIAME, o \`LEIAME-juiz.md\`, o seu lote e o esquema.
`;
}

export interface PreparoAmostra { arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; cegueira: ReturnType<typeof cegueiraArquivos>; sorteio: ReturnType<typeof sortearAmostra> }

export function prepararAmostra(p: Passada, o: { n?: number; semente?: string | null } = {}): PreparoAmostra {
  const n = o.n ?? TAMANHO_AMOSTRA;
  const sem = sementeDaCampanha(p.campanha, o.semente ?? null);
  const sorteio = sortearAmostra(p, n, sem.semente);
  const novo = new Map(sorteio.ids.map(id => [id, idDaAmostra(p.item.get(id)!.chave)]));
  if (new Set(novo.values()).size !== novo.size) throw new Error("amostra: colisão de id novo");
  for (const v of novo.values()) if (p.item.has(v)) throw new Error(`amostra: id novo coincide com id da 1ª passada: ${v}`);
  const formato = p.v12 ? FORMATO_RESPOSTAS_CAMPANHA : FORMATO_RESPOSTAS_CAMPANHA_1_1;
  const esquema = jsonTexto(esquemaAmostra(p));
  const nomes = Array.from({ length: Math.ceil(sorteio.ids.length / POR_ARQUIVO_AMOSTRA) }, (_, i) => nomeAmostra(i));
  const leiameA = leiameAmostra(nomes.map(x => `${x}.json`), formato);
  const juiz = new Map<string, string>([["lotes/LEIAME-juiz.md", p.leiameJuiz], ["lotes/LEIAME-amostra.md", leiameA], ["lotes/esquema-respostas-amostra.schema.json", esquema]]);
  const novos = new Map<string, CartaoCego>();
  const lista: { amostra: string; ids: string[]; idsOriginais: string[] }[] = [];
  nomes.forEach((nome, i) => {
    const idsO = sorteio.ids.slice(i * POR_ARQUIVO_AMOSTRA, (i + 1) * POR_ARQUIVO_AMOSTRA);
    const cs = idsO.map(id => { const c = { ...p.cartao.get(id)!, id: novo.get(id)! }; novos.set(id, c); return c; });
    juiz.set(`lotes/${nome}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: nome, politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(p.leiameJuiz) }, instrucoesDaAmostra: { arquivo: "LEIAME-amostra.md", sha256: sha(leiameA) },
      esquema: { arquivo: "esquema-respostas-amostra.schema.json", sha256: sha(esquema) },
      respostaEm: `../respostas/${nome}-<juiz>.json`, n: cs.length,
      referencias: Object.fromEntries(unicos(cs.map(c => c.tela)).map(t => [t, p.referencias[t]])), cartoes: cs }));
    lista.push({ amostra: nome, ids: cs.map(c => c.id), idsOriginais: idsO });
  });
  const just = new Map([...p.julgados].map(([id, j]) => [id, [j.resposta.justificativa]]));
  const cegueira = cegueiraArquivos({ p, arquivos: [...juiz].filter(([rel]) => !/schema/.test(rel)).map(([rel, texto]) => ({ rel, texto })), novos,
    proibidos: [...p.item.keys()], justificativas: just });
  const comp = (f: (id: string) => string) => { const r: Record<string, number> = {}; for (const id of sorteio.ids) r[f(id)] = (r[f(id)] ?? 0) + 1; return Object.fromEntries(Object.entries(r).sort()); };
  const chaveTxt = jsonTexto({ formato: "nat78-revisao-amostra-chave-1.0.0", aviso: "NÃO entregar aos juízes: liga o id da amostra ao cartão da 1ª passada e ao braço",
    semente: sem, itens: lista.flatMap(l => l.ids.map((id, k) => { const o1 = l.idsOriginais[k]; return { id, idOriginal: o1, amostra: l.amostra, chave: p.item.get(o1)!.chave,
      braco: p.item.get(o1)!.braco, classe1a: p.julgados.get(o1)!.derivado.classe }; })) });
  const internos = new Map<string, string>([["chave/amostra-chave.json", chaveTxt]]);
  internos.set("cegueira.json", jsonTexto({ formato: "nat78-revisao-amostra-cegueira-1.0.0", ...cegueira }));
  internos.set("manifesto.json", jsonTexto({ formato: "nat78-revisao-amostra-manifesto-1.0.0", versao: REVISAO_VERSAO, politica: POLITICA_PRINCIPAL,
    regrasSha256: sha(REGRAS_CAMPANHA), passada: { nome: p.nome, versao: p.versao, manifestoSha256: sha(p.manifestoTxt), julgamentosSha256: p.julgSha },
    campanha: p.campanha.campaignId, semente: sem, tamanhoPedido: n, tamanho: sorteio.ids.length, total: p.membros.length,
    regraDoSorteio: "estrato = braço mascarado × classe da 1ª passada; 1 por estrato + resto proporcional (maiores restos, empate pelo nome); dentro do estrato, ordem por sha256(semente + '|' + chave); n ≥ total → todos",
    juizesPorCartao: JUIZES_AMOSTRA.length, juizes: JUIZES_AMOSTRA, formatoRespostas: formato,
    composicao: { porEstrato: sorteio.estratos, porBraco: comp(id => p.item.get(id)!.braco), porClasse: comp(id => p.julgados.get(id)!.derivado.classe) },
    arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
    amostras: lista.map(l => ({ amostra: l.amostra, n: l.ids.length, sha256: sha(juiz.get(`lotes/${l.amostra}.json`)!), ids: l.ids,
      respostas: JUIZES_AMOSTRA.map(j => `respostas/${l.amostra}-${j}.json`) })),
    chaveSha256: sha(chaveTxt) }));
  return { arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, sorteio };
}

// ───────────────────────────────────────────────────────────────── medir confiabilidade

interface ManifestoAmostra { passada: { nome: string; julgamentosSha256: string }; regrasSha256: string; chaveSha256: string; formatoRespostas: string;
  amostras: { amostra: string; n: number; sha256: string; ids: string[] }[]; juizes: string[] }
interface ItemAmostra { id: string; idOriginal: string; amostra: string; chave: string; braco: string; classe1a: string }
export interface JulgamentoConf { juiz: string; idOriginal: string; idAmostra: string | null; resposta: Resposta; derivado: Derivado }
export interface Medida {
  erros: string[]; relatorio: Record<string, unknown> | null; julgamentos: JulgamentoConf[]; desacordos: Record<string, unknown>[];
}

function lerAmostra(p: Passada, am: string): { man: ManifestoAmostra; itens: ItemAmostra[]; manTxt: string } {
  const manTxt = lerTexto(join(am, "manifesto.json"));
  const man = JSON.parse(manTxt) as ManifestoAmostra;
  const cTxt = lerTexto(join(am, "chave", "amostra-chave.json"));
  if (sha(cTxt) !== man.chaveSha256) throw new Error("chave da amostra difere do manifesto");
  if (man.passada.julgamentosSha256 !== p.julgSha) throw new Error(`a amostra foi sorteada de outra 1ª passada (${man.passada.nome}, julgamentos ${man.passada.julgamentosSha256.slice(0, 12)})`);
  if (man.regrasSha256 !== sha(REGRAS_CAMPANHA)) throw new Error("as regras da revisão mudaram depois do sorteio da amostra");
  return { man, itens: (JSON.parse(cTxt) as { itens: ItemAmostra[] }).itens, manTxt };
}

/**
 * Juiz substituto de ENSAIO: outra passada cega congelada sobre os mesmos cartões (casada pela chave e pelo sha256 do cartão
 * original). Conta quantos casam por id, por chave, pelo cartão original e pelo cartão cego (JSON igual, salvo o id).
 */
export function juizDePassada(p: Passada, dir: string, ids: string[]): { nome: string; julg: Map<string, JulgamentoConf>; casamento: Record<string, unknown> } {
  const abs = resolve(dir);
  const mTxt = lerTexto(join(abs, "lotes", "manifesto.json"));
  const man = JSON.parse(mTxt) as ManifestoPassada;
  if (![FORMATO_MANIFESTO_CAMPANHA, FORMATO_MANIFESTO_CAMPANHA_1_1].includes(man.formato)) throw new Error(`--juiz-passada ${abs}: não é passada de campanha nova`);
  if (resolve(abs) === p.dir) throw new Error("--juiz-passada é a própria 1ª passada");
  const jTxt = lerTexto(join(abs, "julgamentos.json"));
  const sAbs = join(abs, "julgamentos.json.sha256");
  if (!existsSync(sAbs) || lerTexto(sAbs).trim().split(/\s+/)[0] !== sha(jTxt)) throw new Error(`--juiz-passada ${abs}: julgamentos.json não confere com o .sha256`);
  const jd = JSON.parse(jTxt) as { completo: boolean; julgamentos: (Julgado & { chave: string })[] };
  if (!jd.completo) throw new Error(`--juiz-passada ${abs}: julgamentos incompletos`);
  const itens = (JSON.parse(lerTexto(join(abs, "chave", "fila-t3-chave.json"))) as { itens: ItemChave[] }).itens;
  const porChave = new Map(itens.map(i => [i.chave, i]));
  const cartoes = new Map<string, CartaoCego>();
  for (const ml of man.lotes) for (const c of (JSON.parse(lerTexto(join(abs, "lotes", `${ml.lote}.json`))) as LotePassada).cartoes) cartoes.set(c.id, c);
  const js = new Map(jd.julgamentos.map(j => [j.id, j]));
  const julg = new Map<string, JulgamentoConf>();
  const nome = `passada:${basename(abs)}`;
  let mesmoId = 0, mesmaChave = 0, mesmoOriginal = 0, mesmoCego = 0;
  const semPar: string[] = [];
  for (const id of ids) {
    const it = p.item.get(id)!, o2 = porChave.get(it.chave);
    if (itens.some(i => i.id === id)) mesmoId++;
    if (!o2) { semPar.push(id); continue; }
    mesmaChave++;
    if (o2.cardSha256 !== it.cardSha256) { semPar.push(id); continue; }
    mesmoOriginal++;
    const sem = (c: CartaoCego | undefined) => JSON.stringify({ ...c, id: "" });
    if (sem(cartoes.get(o2.id)) === sem(p.cartao.get(id))) mesmoCego++;
    const j = js.get(o2.id)!;
    julg.set(id, { juiz: nome, idOriginal: id, idAmostra: null, resposta: j.resposta, derivado: j.derivado });
  }
  const v12 = man.formato === FORMATO_MANIFESTO_CAMPANHA;
  return { nome, julg, casamento: { pasta: basename(abs), formato: man.formato, versao: (man as { versao: string }).versao, julgamentosSha256: sha(jTxt),
    substitutoDeEnsaio: true, cartoesDaAmostra: ids.length, mesmoId, mesmaChave, mesmoCartaoOriginal: mesmoOriginal, mesmoCartaoCego: mesmoCego,
    cartoesCegosDiferentes: mesmoOriginal - mesmoCego, semPar: semPar.length, excluidos: semPar,
    camposNaoComparaveis: v12 === p.v12 ? [] : [{ campo: "estadoAlcancado", motivo: `existe só no esquema ${p.v12 ? "1.2.0 (1ª passada)" : "1.2.0 (juiz substituto)"}`, cartoes: mesmoOriginal }],
    nota: v12 === p.v12 ? "mesmo esquema de resposta" : "esquemas de lote diferentes: o juiz substituto não viu forcaNoVocabulario nem respondeu estadoAlcancado; os campos do κ (classe, crédito, fato, aplicabilidade, vínculo) existem nos dois e entram; estadoAlcancado fica fora" } };
}

/** Valores de um campo de CAMPOS (null = não respondido). */
const valor = (nome: string, j: { resposta: Resposta; derivado: Derivado } | undefined): string | null => (j ? CAMPOS.find(c => c.nome === nome)!.valor(j) : null);

export function medirConfiabilidade(p: Passada, am: string, o: { juizesPassada?: string[] } = {}): Medida {
  const erros: string[] = [];
  const { man, itens, manTxt } = lerAmostra(p, am);
  const ids = itens.map(i => i.idOriginal).sort();
  const porIdAmostra = new Map(itens.map(i => [i.id, i]));
  const v = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(esquemaAmostra(p));
  const juizes = new Map<string, Map<string, JulgamentoConf>>();
  const arquivosResp: Record<string, string> = {};
  for (const j of man.juizes) {
    const rels = man.amostras.map(a => `respostas/${a.amostra}-${j}.json`);
    const existentes = rels.filter(r => existsSync(join(am, r)));
    if (!existentes.length) continue;
    if (existentes.length !== rels.length) { erros.push(`juiz ${j}: faltam ${rels.filter(r => !existentes.includes(r)).join(", ")}`); continue; }
    const mapa = new Map<string, JulgamentoConf>();
    for (const a of man.amostras) {
      const lTxt = lerTexto(join(am, "lotes", `${a.amostra}.json`));
      if (sha(lTxt) !== a.sha256) { erros.push(`lotes/${a.amostra}.json difere do manifesto`); continue; }
      const lote = JSON.parse(lTxt) as LotePassada;
      const cart = new Map(lote.cartoes.map(c => [c.id, c]));
      const rel = `respostas/${a.amostra}-${j}.json`, bruto = lerTexto(join(am, rel));
      arquivosResp[rel] = sha(bruto);
      let doc: { formato: string; lote: string; loteSha256: string; respostas: Resposta[] };
      try { doc = JSON.parse(bruto); } catch (e) { erros.push(`${rel}: JSON inválido (${(e as Error).message})`); continue; }
      if (!v(doc)) { for (const x of v.errors ?? []) erros.push(`${rel}: esquema ${x.instancePath || "/"} ${x.message}`); continue; }
      if (doc.formato !== man.formatoRespostas || doc.lote !== a.amostra || doc.loteSha256 !== a.sha256) erros.push(`${rel}: formato/lote/loteSha256 não conferem`);
      const rids = doc.respostas.map(r => r.id);
      for (const id of a.ids) if (!rids.includes(id)) erros.push(`${rel}: incompleto — falta ${id}`);
      for (const id of rids) if (!a.ids.includes(id) || rids.indexOf(id) !== rids.lastIndexOf(id)) erros.push(`${rel}: id fora da amostra ou repetido ${id}`);
      for (const r of doc.respostas) {
        const c = cart.get(r.id), ia = porIdAmostra.get(r.id);
        if (!c || !ia) continue;
        const ctx = contextoDe(c, p.item.get(ia.idOriginal)!, specsDe(p, c));
        const e = validarResposta(r, ctx, opcoesValidacao(p));
        if (e.length) { for (const x of e) erros.push(`${rel}: ${r.id}: ${x}`); continue; }
        mapa.set(ia.idOriginal, { juiz: j, idOriginal: ia.idOriginal, idAmostra: r.id, resposta: r, derivado: derivarClasse(r, ctx) });
      }
    }
    juizes.set(j, mapa);
  }
  const casamentos: Record<string, unknown>[] = [];
  for (const d of o.juizesPassada ?? []) {
    try { const x = juizDePassada(p, d, ids); if (juizes.has(x.nome)) throw new Error(`juiz repetido: ${x.nome}`); juizes.set(x.nome, x.julg); casamentos.push(x.casamento); }
    catch (e) { erros.push((e as Error).message); }
  }
  if (!erros.length && !juizes.size) erros.push("nenhum juiz da amostra: faltam respostas/amostra-NN-j1.json e -j2.json (ou, só em ensaio, --juiz-passada)");
  if (erros.length) return { erros, relatorio: null, julgamentos: [], desacordos: [] };

  const avaliadores = ["1a", ...[...juizes.keys()].sort()];
  const de = (r: string, id: string) => (r === "1a" ? p.julgados.get(id) : juizes.get(r)!.get(id));
  const campos: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    const linhas = ids.map(id => avaliadores.map(r => valor(c.nome, de(r, id))));
    const pares: Record<string, unknown> = {};
    for (let i = 0; i < avaliadores.length; i++) for (let k = i + 1; k < avaliadores.length; k++) {
      const x = linhas.filter(l => l[i] !== null && l[k] !== null), a1 = x.map(l => l[i]!), b1 = x.map(l => l[k]!);
      const conc = a1.filter((y, n) => y === b1[n]).length;
      pares[`${avaliadores[i]}×${avaliadores[k]}`] = { n: x.length, concordantes: conc, pct: x.length ? r4(conc / x.length) : null, kappaCohen: cohen(a1, b1) };
    }
    const fl = (idx: number[]) => { const comp = linhas.map(l => idx.map(i => l[i])).filter(l => l.every(x => x !== null)) as string[][];
      return { avaliadores: idx.map(i => avaliadores[i]), n: comp.length, unanimes: comp.filter(l => l.every(x => x === l[0])).length, kappaFleiss: comp.length && idx.length >= 2 ? fleiss(comp) : null }; };
    const soJuizes = avaliadores.map((_, i) => i).filter(i => i > 0);
    campos[c.nome] = { principal: (CAMPOS_KAPPA as readonly string[]).includes(c.nome), cartoes: ids.length, pares,
      fleissTodos: fl(avaliadores.map((_, i) => i)), fleissSoJuizes: soJuizes.length >= 2 ? fl(soJuizes) : null };
  }
  const julgamentos: JulgamentoConf[] = [...juizes.values()].flatMap(m => [...m.values()]).sort((a, b) => (a.juiz + a.idOriginal < b.juiz + b.idOriginal ? -1 : 1));
  const desacordos = ids.flatMap(id => {
    const um = p.julgados.get(id)!;
    const ds = [...juizes].flatMap(([nome, m]) => { const j = m.get(id); if (!j) return [];
      const cs = CAMPOS_KAPPA.filter(c => { const a = valor(c, um), b = valor(c, j); return !(a === null && b === null) && a !== b; });
      return cs.length ? [{ juiz: nome, campos: cs, primeira: Object.fromEntries(cs.map(c => [c, valor(c, um)])), juizValor: Object.fromEntries(cs.map(c => [c, valor(c, j)])) }] : []; });
    return ds.length ? [{ id, chave: p.item.get(id)!.chave, braco: p.item.get(id)!.braco, desacordos: ds }] : [];
  });
  const nJuizesAmostra = [...juizes.keys()].filter(k => !k.startsWith("passada:")).length;
  const relatorio = { formato: "nat78-revisao-confiabilidade-1.0.0", versao: REVISAO_VERSAO, regrasSha256: man.regrasSha256,
    passada: { nome: p.nome, julgamentosSha256: p.julgSha }, amostra: { manifestoSha256: sha(manTxt), cartoes: ids.length },
    avaliadores, juizesDaAmostra: nJuizesAmostra, juizesSubstitutos: casamentos,
    atendeProtocolo: nJuizesAmostra >= 2 && !casamentos.length,
    aviso: casamentos.length ? "ENSAIO: há juiz substituto (outra passada cega congelada); os números provam o caminho e NÃO são resultado" : null,
    metodo: "Mesmos cartões da 1ª passada (só o id muda) julgados por juízes novos e cegos com as instruções da 1ª passada, antes da adjudicação. Por campo: concordância e κ de Cohen por par de avaliadores, nos cartões em que os dois responderam (n = denominador); κ de Fleiss com todos os avaliadores (1ª passada + juízes) e só com os juízes (≥ 2), nos cartões em que todos responderam. κ null quando a concordância esperada é 1 (uma categoria só). Campos principais (protocolo §8.3): classe, crédito, fato, aplicabilidade, vínculo.",
    respostas: arquivosResp, campos,
    desacordos: { cartoes: desacordos.length, porCampo: Object.fromEntries(CAMPOS_KAPPA.map(c => [c, desacordos.filter(d => d.desacordos.some(x => x.campos.includes(c))).length])) } };
  return { erros: [], relatorio, julgamentos, desacordos };
}

export function confiabilidadeMd(r: Record<string, unknown>): string {
  const k = (x: number | null | undefined) => (x === null || x === undefined ? "n/d" : x.toFixed(3));
  const pc = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
  const campos = r.campos as Record<string, { principal: boolean; pares: Record<string, { n: number; concordantes: number; pct: number | null; kappaCohen: number | null }>;
    fleissTodos: { avaliadores: string[]; n: number; unanimes: number; kappaFleiss: number | null }; fleissSoJuizes: { n: number; kappaFleiss: number | null } | null }>;
  const pares = Object.keys(Object.values(campos)[0].pares);
  const L = ["# Revisão de campanha nova — amostra de confiabilidade", "", r.aviso ? `**${r.aviso}**\n` : "", `${(r.amostra as { cartoes: number }).cartoes} cartões; avaliadores: ${(r.avaliadores as string[]).join(", ")}. ${r.metodo}`, "",
    `| campo | ${pares.map(x => `% ${x} (n)`).join(" | ")} | ${pares.map(x => `κ Cohen ${x}`).join(" | ")} | n (todos) | unânimes | κ Fleiss (todos) | κ Fleiss (só juízes) |`,
    `|---|${pares.map(() => "---:").join("|")}|${pares.map(() => "---:").join("|")}|---:|---:|---:|---:|`];
  for (const [c, x] of Object.entries(campos)) L.push(`| ${x.principal ? `**${c}**` : c} | ${pares.map(q => `${pc(x.pares[q].pct)} (${x.pares[q].concordantes}/${x.pares[q].n})`).join(" | ")} | ${pares.map(q => k(x.pares[q].kappaCohen)).join(" | ")} | ${x.fleissTodos.n} | ${x.fleissTodos.unanimes} | ${k(x.fleissTodos.kappaFleiss)} | ${x.fleissSoJuizes ? k(x.fleissSoJuizes.kappaFleiss) : "—"} |`);
  const d = r.desacordos as { cartoes: number; porCampo: Record<string, number> };
  L.push("", `Cartões com desacordo de algum juiz com a 1ª passada nos campos principais (gatilho b): ${d.cartoes} — ${Object.entries(d.porCampo).map(([c, n]) => `${c} ${n}`).join(", ")}.`);
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── adjudicação: unidades

export interface Origem { id: string; gatilho: "a" | "b" | "c"; detalhe: Record<string, unknown>; membros: string[] }
export interface UnidadeCampanha { id: string; gatilhos: ("a" | "b" | "c")[]; origens: Origem[]; membros: string[]; leitura: boolean; normaUnica: boolean; tipoDeSujeito: string[] }

/** Gatilhos (a), (b), (c) → unidades (união das origens que compartilham cartões). Ordem pelo id. */
export function unidadesDaCampanha(p: Passada, a: Analise, desacordos: { id: string; desacordos: { juiz: string; campos: string[] }[] }[]): UnidadeCampanha[] {
  const origens: Origem[] = [
    ...[...a.mesmaAlegacao, ...a.mesmaLeitura].filter(g => g.desempate).map(g => ({ id: g.id, gatilho: "a" as const, detalhe: { nivel: g.nivel, divergencias: g.divergencias }, membros: g.membros })),
    ...desacordos.map(d => ({ id: `B-${sha(SEMENTE_REVISAO + "b|" + p.item.get(d.id)!.chave).slice(0, 8)}`, gatilho: "b" as const,
      detalhe: { campos: unicos(d.desacordos.flatMap(x => x.campos)), juizes: d.desacordos.map(x => x.juiz) }, membros: [d.id] })),
    ...[...p.julgados.values()].filter(j => j.resposta.estadoAlcancado === "nao-alcancado")
      .map(j => ({ id: `C-${sha(SEMENTE_REVISAO + "c|" + p.item.get(j.id)!.chave).slice(0, 8)}`, gatilho: "c" as const, detalhe: { estadoAlcancado: "nao-alcancado", classe1a: j.derivado.classe }, membros: [j.id] })),
  ];
  const pai = origens.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const dono = new Map<string, number>();
  origens.forEach((g, i) => { for (const m of g.membros) { const j = dono.get(m); if (j === undefined) dono.set(m, i); else pai[raiz(i)] = raiz(j); } });
  const blocos = new Map<number, Origem[]>();
  origens.forEach((g, i) => blocos.set(raiz(i), [...(blocos.get(raiz(i)) ?? []), g]));
  const porId = new Map(p.membros.map(m => [m.id, m]));
  return ordenar([...blocos.values()].map(os => {
    const membros = unicos(os.flatMap(o => o.membros));
    const normas = unicos(membros.map(id => JSON.stringify([porId.get(id)!.cartao.alegacao.regra !== null, porId.get(id)!.cartao.normaCitada])));
    return { id: `D-${sha(SEMENTE_REVISAO + "unidade|" + membros.map(id => porId.get(id)!.chave).sort().join("|")).slice(0, 10)}`,
      gatilhos: [...new Set(os.map(o => o.gatilho))].sort() as UnidadeCampanha["gatilhos"], origens: ordenar(os, o => o.id), membros,
      leitura: membros.some(id => porId.get(id)!.perguntaNorma), normaUnica: normas.length === 1, tipoDeSujeito: unicos(membros.map(id => porId.get(id)!.tipoDeSujeito)) };
  }), u => u.id);
}

// ───────────────────────────────────────────────────────────────── adjudicação: esquemas e LEIAME

const TEXTO = { type: "string", minLength: 10 } as const;
const LEITURA = { oneOf: [{ const: NAO_PERGUNTADO }, { type: "object", additionalProperties: false,
  required: ["norma", "fonteEVersao", "forca", "antecedente", "excecoes", "evidenciaNecessaria", "permiteConcluir"],
  properties: { norma: { type: "string", pattern: "^(citada|nenhuma|wcag:\\d+\\.\\d+\\.\\d+|emag:\\d+\\.\\d+)$" }, fonteEVersao: TEXTO, forca: { enum: [...VAL.forca] },
    antecedente: TEXTO, excecoes: TEXTO, evidenciaNecessaria: TEXTO, permiteConcluir: TEXTO } }] } as const;

export function esquemasAdjudicacao(v12: boolean): { a: object; b: object } {
  const item = (v12 ? ESQUEMA_RESPOSTAS_CAMPANHA : ESQUEMA_RESPOSTAS_CAMPANHA_1_1).properties.respostas.items;
  const base = (formato: string, lote: string, etapa: "a" | "b") => ({
    formato: { const: formato }, lote: { type: "string", pattern: lote }, loteSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
    juiz: { type: "string", minLength: 3 }, etapa: { const: etapa }, grupo: { type: "string", pattern: "^D-[0-9a-f]{10}$" },
    leituraDaNorma: LEITURA, respostas: { type: "array", minItems: 1, items: item } });
  const a = { $schema: "https://json-schema.org/draft/2020-12/schema", title: FORMATO_ADJ_RESP_A, type: "object", additionalProperties: false,
    required: ["formato", "lote", "loteSha256", "juiz", "etapa", "grupo", "leituraDaNorma", "respostas"], properties: base(FORMATO_ADJ_RESP_A, "^lote-d\\d{2}$", "a") };
  const b = { $schema: "https://json-schema.org/draft/2020-12/schema", title: FORMATO_ADJ_RESP_B, type: "object", additionalProperties: false,
    required: ["formato", "lote", "loteSha256", "juiz", "etapa", "grupo", "leituraDaNorma", "leiturasAlternativasPlausiveis", "classificacaoDaDivergencia", "respostas"],
    properties: { ...base(FORMATO_ADJ_RESP_B, "^lote-d\\d{2}-b$", "b"),
      leiturasAlternativasPlausiveis: { type: "array", items: { type: "string", minLength: 30 } },
      classificacaoDaDivergencia: { type: "object", additionalProperties: false, required: ["tipos", "evidencias", "justificativa"],
        properties: { tipos: { type: "array", minItems: 1, uniqueItems: true, items: { enum: [...CLASSIFICACOES] } },
          evidencias: { type: "array", minItems: 1, items: { type: "string", pattern: "^T3-[0-9a-f]{10}(:[A-Za-z0-9-]+)?$" } }, justificativa: { type: "string", minLength: 30 } } } } };
  return { a, b };
}

export function leiameAdjudicacao(): string {
  return `# Adjudicação de uma unidade — instruções (política normativa 1.2.0)

Você recebe **uma unidade** (\`grupo\`, \`cartoes\`): um ou mais cartões que uma regra mecânica, fixada antes de qualquer
resultado, mandou a uma segunda leitura. Reunir cartões numa unidade é só triagem: **não** quer dizer que sejam a mesma
situação nem que devam ter a mesma resposta. Cada cartão tem a sua resposta. **Você não escreve a classe final**: ela sai
das suas respostas por regra fixa (a tabela do \`LEIAME-juiz.md\`).

**Como julgar cada cartão:** exatamente como manda o \`LEIAME-juiz.md\` (o mesmo da primeira passada, sem mudança): meça a
página congelada, refaça a receita do \`estado\` e responda as perguntas fechadas. Só os nomes dos arquivos mudam (abaixo).
Abra só este LEIAME, o \`LEIAME-juiz.md\`, o seu \`lote-dNN.json\` (e, na etapa B, o \`lote-dNN-b.json\`) e os esquemas. Não abra
\`manifesto.json\`, \`chave/\` nem outro arquivo, e não tente descobrir de onde um cartão veio nem quem o escreveu.

São **duas etapas**, nesta ordem:

## Etapa A — leitura individual (\`lotes/lote-dNN.json\` → \`respostas/lote-dNN-a.json\`)

1. Quando \`grupo.pedeLeituraDaNorma\` é \`true\`, leia a norma uma vez e escreva em \`leituraDaNorma\` a **regra de
   interpretação** que vai aplicar (senão \`"${NAO_PERGUNTADO}"\`): \`norma\` (\`"citada"\` se os cartões citam regra; senão a
   norma pública que a alegação implica, \`wcag:x.y.z\`/\`emag:x.y\`, ou \`"nenhuma"\`), \`fonteEVersao\`, \`forca\`,
   \`antecedente\` (quando se aplica), \`excecoes\`, \`evidenciaNecessaria\` e \`permiteConcluir\`.
2. Responda **cada cartão**. Com \`grupo.normaUnica\` = \`true\`, \`norma.id\` e \`norma.forca\` de cada cartão são os da sua
   leitura; aplicabilidade e violação são de cada cartão.

## Etapa B — reconciliação (\`lotes/lote-dNN-b.json\` → \`respostas/lote-dNN-b.json\`)

Depois que a etapa A estiver gravada, você recebe \`lote-dNN-b.json\`: os mesmos cartões e, em \`leiturasAnteriores\`, as
respostas que cada cartão já recebeu de outros leitores ("leitura 1", "leitura 2"…, sem dizer de quem nem em que ordem
foram dadas). A sua etapa A fica congelada (o sha256 dela vai no lote B).

1. Compare as leituras anteriores com a sua. Mantenha ou mude **só com evidência** (cartão ou medida da página); nunca
   para chegar a acordo.
2. Classifique a divergência em \`classificacaoDaDivergencia\`: \`tipos\` (um ou mais de
   \`diferenca-legitima-de-contexto\` · \`falta-de-evidencia\` · \`interpretacao-normativa\` · \`erro-do-juiz\`),
   \`evidencias\` (ids \`T3-…\` do cartão, ou \`T3-…:OBS\`, \`T3-…:S1\`… para o item do cartão) e \`justificativa\`.
3. Se leituras incompatíveis continuam plausíveis (as duas defensáveis pelo cartão e pela medida), liste-as em \`leiturasAlternativasPlausiveis\` (uma frase cada) e deixe os cartões com
   pergunta de norma \`incerta\`/\`incerto\` (ou fato não verdadeiro): o caso fica sem crédito e a alternativa vai como
   sensibilidade. Se não há, \`[]\`.
4. Responda de novo **cada cartão**: a resposta B é a que vale.

## Os arquivos de resposta

Etapa A (\`esquema-adjudicacao-a.schema.json\`): \`{"formato": "${FORMATO_ADJ_RESP_A}", "lote": "lote-d01", "loteSha256": "<sha256 do
lote-d01.json>", "juiz": "<quem julgou>", "etapa": "a", "grupo": "D-…", "leituraDaNorma": {…} | "${NAO_PERGUNTADO}", "respostas": [ … ]}\`
— cada resposta tem exatamente os campos do \`LEIAME-juiz.md\`, com o \`id\` do cartão deste lote.

Etapa B (\`esquema-adjudicacao-b.schema.json\`): os mesmos campos, com \`"formato": "${FORMATO_ADJ_RESP_B}"\`, \`"lote": "lote-d01-b"\`,
\`"etapa": "b"\`, \`loteSha256\` do \`lote-d01-b.json\`, mais \`leiturasAlternativasPlausiveis\` e \`classificacaoDaDivergencia\`.

Grave as respostas em \`respostas/\` **na pasta da adjudicação** (ao lado de \`lotes/\`). A ingestão recusa o arquivo se faltar
um cartão, se um id se repetir ou for de fora da unidade, se um valor estiver fora das listas, se a justificativa não citar
um id do próprio cartão, se norma ou força diferirem da leitura (com \`normaUnica\`), se houver leitura alternativa e um
cartão com pergunta de norma sair com classe final, ou se \`loteSha256\` não conferir.
`;
}

// ───────────────────────────────────────────────────────────────── adjudicação: preparar (etapa A)

interface LoteAdj { formato: string; lote: string; grupo: { id: string; pedeLeituraDaNorma: boolean; normaUnica: boolean; membros: string[] }; referencias: LotePassada["referencias"]; cartoes: (CartaoCego & { grupo: string })[] }
export interface MembroChave { id: string; idOriginal: string; chave: string; braco: string }
export interface UnidadeChave { id: string; lote: string; gatilhos: string[]; origens: Origem[]; leitura: boolean; normaUnica: boolean; membros: MembroChave[] }
interface ManifestoAdj {
  formato: string; passada: { nome: string; julgamentosSha256: string; manifestoSha256: string; versao: string };
  confiabilidade: { dir: string; relatorioSha256: string; julgamentosSha256: string; desacordosSha256: string };
  lotes: { lote: string; grupo: string; n: number; sha256: string; ids: string[] }[]; chaveSha256: string; arquivos: Record<string, string>;
}
export interface PreparoAdj { unidades: UnidadeCampanha[]; arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; cegueira: ReturnType<typeof cegueiraArquivos>; avisos: string[] }

interface Conf { dir: string; relTxt: string; julgTxt: string; desTxt: string; julgamentos: JulgamentoConf[]; desacordos: { id: string; desacordos: { juiz: string; campos: string[] }[] }[]; relatorio: Record<string, unknown> }
function lerConfiabilidade(p: Passada, dir: string): Conf {
  const abs = resolve(dir);
  const ler = (f: string) => { const a = join(abs, f); if (!existsSync(a)) throw new Error(`${a} ausente: meça a confiabilidade antes (revisao:confiabilidade -- medir)`); return lerTexto(a); };
  const relTxt = ler("relatorio-confiabilidade.json"), julgTxt = ler("julgamentos-confiabilidade.json"), desTxt = ler("desacordos.json");
  const rel = JSON.parse(relTxt) as { passada: { julgamentosSha256: string }; arquivos?: Record<string, string>; regrasSha256: string };
  if (rel.passada.julgamentosSha256 !== p.julgSha) throw new Error("a confiabilidade foi medida sobre outra 1ª passada");
  if (rel.regrasSha256 !== sha(REGRAS_CAMPANHA)) throw new Error("as regras da revisão mudaram depois da confiabilidade");
  const ref = (JSON.parse(relTxt) as { congelados: Record<string, string> }).congelados;
  if (ref["julgamentos-confiabilidade.json"] !== sha(julgTxt) || ref["desacordos.json"] !== sha(desTxt)) throw new Error("julgamentos/desacordos da confiabilidade diferem do relatório (sha256)");
  return { dir: abs, relTxt, julgTxt, desTxt, julgamentos: (JSON.parse(julgTxt) as { julgamentos: JulgamentoConf[] }).julgamentos,
    desacordos: (JSON.parse(desTxt) as { cartoes: Conf["desacordos"] }).cartoes, relatorio: JSON.parse(relTxt) };
}

export function prepararAdjudicacao(p: Passada, o: { confiabilidade: string; aceitarMascaraAnterior?: boolean }): PreparoAdj {
  const avisos: string[] = [];
  if (!p.mascara13) {
    if (!o.aceitarMascaraAnterior) throw new Error(`a passada ${p.nome} é ${p.versao}, anterior à máscara da entrega 2 (1.3.0): os cartões da adjudicação são os da passada; refaça a passada com e14-campanha 1.3.0 ou, SÓ EM ENSAIO, passe --aceitar-mascara-anterior`);
    avisos.push(`máscara da passada ${p.versao} (anterior à 1.3.0), aceita por --aceitar-mascara-anterior (só ensaio)`);
  }
  const conf = lerConfiabilidade(p, o.confiabilidade);
  if (!(conf.relatorio as { atendeProtocolo: boolean }).atendeProtocolo) avisos.push("a confiabilidade não atende o protocolo (2 juízes da amostra; sem substituto): só ensaio");
  const a = consistencia(p);
  const unidades = unidadesDaCampanha(p, a, conf.desacordos);
  const porId = new Map(p.membros.map(m => [m.id, m]));
  const novo = new Map(p.membros.map(m => [m.id, idDaAdjudicacao(m.chave)]));
  const idsAmostra = conf.julgamentos.map(j => j.idAmostra).filter((x): x is string => !!x);
  for (const v of novo.values()) if (p.item.has(v) || idsAmostra.includes(v)) throw new Error(`adjudicação: id novo coincide com id anterior: ${v}`);
  const leiame = leiameAdjudicacao();
  const esq = esquemasAdjudicacao(p.v12);
  const esqA = jsonTexto(esq.a), esqB = jsonTexto(esq.b);
  const juiz = new Map<string, string>([["lotes/LEIAME-adjudicacao.md", leiame], ["lotes/LEIAME-juiz.md", p.leiameJuiz],
    ["lotes/esquema-adjudicacao-a.schema.json", esqA], ["lotes/esquema-adjudicacao-b.schema.json", esqB]]);
  const novos = new Map<string, CartaoCego>();
  const unidadesChave: UnidadeChave[] = [];
  const lotes: ManifestoAdj["lotes"] = [];
  unidades.forEach((u, k) => {
    const lote = nomeLoteD(k);
    const membros = u.membros.map(id => ({ id: novo.get(id)!, idOriginal: id, chave: porId.get(id)!.chave, braco: porId.get(id)!.braco })).sort((x, y) => (x.id < y.id ? -1 : 1));
    unidadesChave.push({ id: u.id, lote, gatilhos: u.gatilhos, origens: u.origens, leitura: u.leitura, normaUnica: u.normaUnica, membros });
    const cs = membros.map(m => { const c = { ...p.cartao.get(m.idOriginal)!, id: m.id, grupo: u.id }; novos.set(m.idOriginal, c); return c; });
    const grupo = { id: u.id, pedeLeituraDaNorma: u.leitura, normaUnica: u.normaUnica,
      descricao: cs.length === 1 ? "Um cartão, mandado à adjudicação por uma regra mecânica fixada antes dos resultados."
        : `${cs.length} cartões reunidos por uma regra mecânica fixada antes dos resultados (mesmo elemento no mesmo estado, mesma norma sobre o mesmo tipo de elemento, ou ambos; tipo: ${u.tipoDeSujeito.join(", ")}). Reunidos só por isso; cada cartão tem a sua resposta.`,
      norma: u.normaUnica ? cs[0].normaCitada : null, membros: cs.map(c => c.id) };
    juiz.set(`lotes/${lote}.json`, jsonTexto({ formato: FORMATO_ADJ_LOTE_A, lote, etapa: "a", politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-adjudicacao.md", sha256: sha(leiame) }, instrucoesDoJuiz: { arquivo: "LEIAME-juiz.md", sha256: sha(p.leiameJuiz) },
      esquema: { arquivo: "esquema-adjudicacao-a.schema.json", sha256: sha(esqA) }, respostaEm: `../respostas/${lote}-a.json`, n: cs.length, grupo,
      referencias: Object.fromEntries(unicos(cs.map(c => c.tela)).map(t => [t, p.referencias[t]])), cartoes: cs }));
    lotes.push({ lote, grupo: u.id, n: cs.length, sha256: sha(juiz.get(`lotes/${lote}.json`)!), ids: cs.map(c => c.id) });
  });
  const just = new Map<string, string[]>();
  for (const [id, j] of p.julgados) just.set(id, [j.resposta.justificativa]);
  for (const j of conf.julgamentos) just.set(j.idOriginal, [...(just.get(j.idOriginal) ?? []), j.resposta.justificativa]);
  const cegueira = cegueiraArquivos({ p, arquivos: [...juiz].filter(([rel]) => !/schema/.test(rel)).map(([rel, texto]) => ({ rel, texto })), novos,
    proibidos: [...p.item.keys(), ...idsAmostra], justificativas: just });
  const chaveTxt = jsonTexto({ formato: "nat78-revisao-adjudicacao-chave-1.0.0", aviso: "NÃO entregar aos adjudicadores: liga o id da adjudicação ao cartão da 1ª passada e ao braço",
    versao: REVISAO_VERSAO, semente: SEMENTE_REVISAO, regrasSha256: sha(REGRAS_CAMPANHA), consistenciaSha256: sha(jsonTexto(a.relatorio)), unidades: unidadesChave });
  const conta = (g: string) => unidades.filter(u => u.gatilhos.includes(g as "a")).length;
  const internos = new Map<string, string>([["chave/adjudicacao-chave.json", chaveTxt], ["regras.md", REGRAS_CAMPANHA], ["regras.md.sha256", `${sha(REGRAS_CAMPANHA)}  regras.md\n`]]);
  internos.set("cegueira.json", jsonTexto({ formato: "nat78-revisao-adjudicacao-cegueira-1.0.0", ...cegueira }));
  const arquivos = Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)]));
  internos.set("manifesto.json", jsonTexto({ formato: "nat78-revisao-adjudicacao-manifesto-1.0.0", versao: REVISAO_VERSAO, politica: POLITICA_PRINCIPAL, regrasSha256: sha(REGRAS_CAMPANHA),
    passada: { nome: p.nome, versao: p.versao, julgamentosSha256: p.julgSha, manifestoSha256: sha(p.manifestoTxt) }, avisos,
    confiabilidade: { dir: relative(join(p.dir, ".."), conf.dir).split(sep).join("/"), relatorioSha256: sha(conf.relTxt), julgamentosSha256: sha(conf.julgTxt), desacordosSha256: sha(conf.desTxt) },
    unidades: unidades.length, cartoes: novos.size, umAdjudicadorPorUnidade: true,
    porGatilho: { a: conta("a"), b: conta("b"), c: conta("c"), cartoes: { a: unicos(unidades.flatMap(u => u.origens.filter(o => o.gatilho === "a").flatMap(o => o.membros))).length,
      b: unicos(unidades.flatMap(u => u.origens.filter(o => o.gatilho === "b").flatMap(o => o.membros))).length,
      c: unicos(unidades.flatMap(u => u.origens.filter(o => o.gatilho === "c").flatMap(o => o.membros))).length } },
    arquivos, lotes, chaveSha256: sha(chaveTxt) }));
  return { unidades, arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, avisos };
}

// ───────────────────────────────────────────────────────────────── adjudicação: validar etapa, revelar, aplicar

interface CtxAdj { p: Passada; dd: string; man: ManifestoAdj; unidades: Map<string, UnidadeChave>; conf: Conf }
function contextoAdj(p: Passada, dd: string): CtxAdj {
  const man = JSON.parse(lerTexto(join(dd, "manifesto.json"))) as ManifestoAdj;
  const cTxt = lerTexto(join(dd, "chave", "adjudicacao-chave.json"));
  if (sha(cTxt) !== man.chaveSha256) throw new Error("adjudicacao/chave difere do manifesto");
  if (man.passada.julgamentosSha256 !== p.julgSha || man.passada.manifestoSha256 !== sha(p.manifestoTxt)) throw new Error(`a adjudicação foi preparada sobre outra 1ª passada (${man.passada.nome})`);
  const conf = lerConfiabilidade(p, resolve(p.dir, "..", man.confiabilidade.dir));
  if (sha(conf.relTxt) !== man.confiabilidade.relatorioSha256 || sha(conf.julgTxt) !== man.confiabilidade.julgamentosSha256) throw new Error("a confiabilidade mudou depois do preparo da adjudicação");
  return { p, dd, man, conf, unidades: new Map((JSON.parse(cTxt) as { unidades: UnidadeChave[] }).unidades.map(u => [u.lote, u])) };
}

type Leitura = { norma: string; forca: string } | typeof NAO_PERGUNTADO;
interface DocEtapa { formato: string; lote: string; loteSha256: string; juiz: string; etapa: string; grupo: string; leituraDaNorma: Leitura; respostas: Resposta[];
  leiturasAlternativasPlausiveis?: string[]; classificacaoDaDivergencia?: { tipos: string[]; evidencias: string[]; justificativa: string } }
const ajvAdj = new Map<string, (x: unknown) => boolean>();

export function validarEtapa(cx: CtxAdj, lote: string, etapa: "a" | "b", loteTexto: string, docTexto: string): { erros: string[]; doc: DocEtapa | null; derivadas: Map<string, { resposta: Resposta; derivado: Derivado }> } {
  const erros: string[] = [], derivadas = new Map<string, { resposta: Resposta; derivado: Derivado }>();
  const pre = `respostas/${lote}-${etapa}.json`;
  let doc: DocEtapa;
  try { doc = JSON.parse(docTexto); } catch (e) { return { erros: [`${pre}: JSON inválido (${(e as Error).message})`], doc: null, derivadas }; }
  const k = `${cx.p.v12}|${etapa}`;
  if (!ajvAdj.has(k)) { const e = esquemasAdjudicacao(cx.p.v12); ajvAdj.set(k, new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(etapa === "a" ? e.a : e.b)); }
  const v = ajvAdj.get(k)! as ((x: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
  if (!v(doc)) return { erros: (v.errors ?? []).map(x => `${pre}: esquema ${x.instancePath || "/"} ${x.message}`), doc: null, derivadas };
  const l = JSON.parse(loteTexto) as LoteAdj;
  const u = cx.unidades.get(lote)!;
  if (doc.lote !== (etapa === "a" ? lote : `${lote}-b`)) erros.push(`${pre}: lote "${doc.lote}" não confere`);
  if (doc.loteSha256 !== sha(loteTexto)) erros.push(`${pre}: loteSha256 não é o do lote recebido`);
  if (doc.grupo !== u.id) erros.push(`${pre}: grupo ${doc.grupo} ≠ ${u.id}`);
  const leitura = doc.leituraDaNorma;
  if (l.grupo.pedeLeituraDaNorma && leitura === NAO_PERGUNTADO) erros.push(`${pre}: leituraDaNorma é pedida nesta unidade`);
  const citam = l.cartoes.some(c => c.alegacao.regra !== null), todosCitam = l.cartoes.every(c => c.alegacao.regra !== null);
  if (leitura !== NAO_PERGUNTADO && l.grupo.normaUnica) {
    if (todosCitam && leitura.norma !== "citada") erros.push(`${pre}: os cartões citam regra: leituraDaNorma.norma = "citada"`);
    if (!citam && !(leitura.norma === "nenhuma" || NORMA_PUBLICA.test(leitura.norma))) erros.push(`${pre}: cartões sem regra: leituraDaNorma.norma = id público ou "nenhuma"`);
  }
  const ids = doc.respostas.map(r => r.id);
  for (const x of unicos(ids.filter((x, i) => ids.indexOf(x) !== i))) erros.push(`${pre}: id repetido ${x}`);
  for (const x of ids) if (!l.grupo.membros.includes(x)) erros.push(`${pre}: id fora da unidade ${x}`);
  for (const x of l.grupo.membros) if (!ids.includes(x)) erros.push(`${pre}: incompleto — falta ${x}`);
  const cartoes = new Map(l.cartoes.map(c => [c.id, c]));
  const alternativas = doc.leiturasAlternativasPlausiveis ?? [];
  for (const r of doc.respostas) {
    const c = cartoes.get(r.id), m = u.membros.find(x => x.id === r.id);
    if (!c || !m) continue;
    const ctx = contextoDe(c, cx.p.item.get(m.idOriginal)!, specsDe(cx.p, c));
    const e = validarResposta(r, ctx, opcoesValidacao(cx.p));
    if (e.length) { for (const x of e) erros.push(`${pre}: ${r.id}: ${x}`); continue; }
    if (l.grupo.normaUnica && leitura !== NAO_PERGUNTADO && r.norma !== NAO_PERGUNTADO) {
      if (r.norma.id !== leitura.norma) erros.push(`${pre}: ${r.id}: norma.id ${r.norma.id} ≠ leitura (${leitura.norma})`);
      if (r.norma.forca !== leitura.forca) erros.push(`${pre}: ${r.id}: norma.forca ${r.norma.forca} ≠ leitura (${leitura.forca}): a força é da norma`);
    }
    const d = derivarClasse(r, ctx);
    if (alternativas.length && r.norma !== NAO_PERGUNTADO && !["pendente", "evidencia-indisponivel", "erro-factual"].includes(d.classe))
      erros.push(`${pre}: ${r.id}: há leitura alternativa plausível: o cartão fica incerta/incerto (classe ${d.classe})`);
    derivadas.set(m.idOriginal, { resposta: r, derivado: d });
  }
  if (etapa === "b") for (const ev of doc.classificacaoDaDivergencia!.evidencias) {
    const [id, it] = ev.split(":");
    const c = cartoes.get(id);
    if (!c) erros.push(`${pre}: classificacaoDaDivergencia.evidencias: cartão fora da unidade ${id}`);
    else if (it && !c.citaveis.includes(it)) erros.push(`${pre}: classificacaoDaDivergencia.evidencias: ${it} não é citável em ${id}`);
  }
  return { erros, doc: erros.length ? null : doc, derivadas };
}

/** Leituras anteriores de um cartão: 1ª passada + juízes da amostra, anônimas, em ordem por hash (nada diz qual é qual). */
export function leiturasAnteriores(cx: CtxAdj, m: MembroChave): { anon: { leitura: string; resposta: Resposta }[]; revelacao: { leitura: string; fonte: string }[] } {
  const fontes: { fonte: string; resposta: Resposta }[] = [{ fonte: "1a-passada", resposta: cx.p.julgados.get(m.idOriginal)!.resposta },
    ...cx.conf.julgamentos.filter(j => j.idOriginal === m.idOriginal).map(j => ({ fonte: `confiabilidade:${j.juiz}`, resposta: j.resposta }))];
  const ord = [...fontes].sort((a, b) => (sha(SEMENTE_REVISAO + "leitura|" + m.chave + "|" + a.fonte) < sha(SEMENTE_REVISAO + "leitura|" + m.chave + "|" + b.fonte) ? -1 : 1));
  const antigos = [m.idOriginal, ...cx.conf.julgamentos.filter(j => j.idOriginal === m.idOriginal && j.idAmostra).map(j => j.idAmostra!)];
  const troca = (t: string) => antigos.reduce((s, id) => s.split(id).join(m.id), t);
  return { anon: ord.map((f, i) => ({ leitura: `leitura ${i + 1}`, resposta: { ...f.resposta, id: m.id, justificativa: mascararTextoCego(troca(f.resposta.justificativa)) } })),
    revelacao: ord.map((f, i) => ({ leitura: `leitura ${i + 1}`, fonte: f.fonte })) };
}

export function loteB(p: Passada, dd: string, lote: string): { erros: string[]; texto: string | null; revelacao: string | null; cegueira: ReturnType<typeof cegueiraArquivos> | null } {
  const nada = (e: string[]) => ({ erros: e, texto: null, revelacao: null, cegueira: null });
  let cx: CtxAdj;
  try { cx = contextoAdj(p, dd); } catch (e) { return nada([(e as Error).message]); }
  const ml = cx.man.lotes.find(x => x.lote === lote);
  if (!ml) return nada([`lote desconhecido: ${lote}`]);
  const lTxt = lerTexto(join(dd, "lotes", `${lote}.json`));
  if (sha(lTxt) !== ml.sha256) return nada([`lotes/${lote}.json difere do manifesto`]);
  const aAbs = join(dd, "respostas", `${lote}-a.json`);
  if (!existsSync(aAbs)) return nada([`respostas/${lote}-a.json ausente: a etapa A vem antes`]);
  const aTxt = lerTexto(aAbs);
  const va = validarEtapa(cx, lote, "a", lTxt, aTxt);
  if (va.erros.length) return nada(va.erros);
  const la = JSON.parse(lTxt) as LoteAdj & Record<string, unknown>;
  const u = cx.unidades.get(lote)!;
  const ls = u.membros.map(m => ({ m, l: leiturasAnteriores(cx, m) }));
  const esqB = jsonTexto(esquemasAdjudicacao(p.v12).b);
  const texto = jsonTexto({ formato: FORMATO_ADJ_LOTE_B, lote: `${lote}-b`, etapa: "b", politica: POLITICA_PRINCIPAL,
    instrucoes: la.instrucoes, instrucoesDoJuiz: la.instrucoesDoJuiz, esquema: { arquivo: "esquema-adjudicacao-b.schema.json", sha256: sha(esqB) },
    respostaEm: `../respostas/${lote}-b.json`, etapaA: { lote: { arquivo: `${lote}.json`, sha256: ml.sha256 }, respostas: { arquivo: `respostas/${lote}-a.json`, sha256: sha(aTxt), congelada: true } },
    n: la.cartoes.length, grupo: la.grupo, referencias: la.referencias, cartoes: la.cartoes,
    leiturasAnteriores: ls.map(x => ({ cartao: x.m.id, leituras: x.l.anon })) });
  const revelacao = jsonTexto({ formato: "nat78-revisao-revelacao-1.0.0", aviso: "NÃO entregar ao adjudicador: diz de quem é cada leitura", lote: `${lote}-b`, loteSha256: sha(texto),
    cartoes: ls.map(x => ({ cartao: x.m.id, idOriginal: x.m.idOriginal, leituras: x.l.revelacao })) });
  const novos = new Map(u.membros.map(m => [m.idOriginal, la.cartoes.find(c => c.id === m.id)! as CartaoCego]));
  const idsAmostra = cx.conf.julgamentos.map(j => j.idAmostra).filter((x): x is string => !!x);
  const cegueira = cegueiraArquivos({ p, arquivos: [{ rel: `lotes/${lote}-b.json`, texto }], novos, proibidos: [...p.item.keys(), ...idsAmostra], justificativas: new Map(), informado: true });
  if (cegueira.falhas.length) return { erros: cegueira.falhas.map(f => `cegueira: ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`), texto: null, revelacao: null, cegueira };
  return { erros: [], texto, revelacao, cegueira };
}

export interface Aplicacao { erros: string[]; arquivos: Map<string, string>; resumo: Record<string, unknown> | null }

export function aplicarAdjudicacao(p: Passada, dd: string): Aplicacao {
  const vazio = (e: string[]): Aplicacao => ({ erros: e, arquivos: new Map(), resumo: null });
  let cx: CtxAdj;
  try { cx = contextoAdj(p, dd); } catch (e) { return vazio([(e as Error).message]); }
  const erros: string[] = [];
  const novas = new Map<string, Resposta>();
  const sobrescritas: Record<string, unknown>[] = [], unidadesOut: Record<string, unknown>[] = [];
  const finais = new Map<string, { unidade: string; gatilhos: string[]; antes: Derivado; depois: Derivado; mudouResposta: boolean }>();
  for (const ml of cx.man.lotes) {
    const lTxt = lerTexto(join(dd, "lotes", `${ml.lote}.json`));
    if (sha(lTxt) !== ml.sha256) { erros.push(`lotes/${ml.lote}.json difere do manifesto (sha256)`); continue; }
    const aAbs = join(dd, "respostas", `${ml.lote}-a.json`), bAbs = join(dd, "respostas", `${ml.lote}-b.json`), lbAbs = join(dd, "lotes", `${ml.lote}-b.json`);
    if (!existsSync(aAbs)) { erros.push(`respostas/${ml.lote}-a.json ausente (etapa A)`); continue; }
    if (!existsSync(lbAbs)) { erros.push(`lotes/${ml.lote}-b.json ausente (rode revelar)`); continue; }
    if (!existsSync(bAbs)) { erros.push(`respostas/${ml.lote}-b.json ausente (etapa B)`); continue; }
    const va = validarEtapa(cx, ml.lote, "a", lTxt, lerTexto(aAbs));
    if (va.erros.length) { erros.push(...va.erros); continue; }
    const rb = loteB(p, dd, ml.lote), lbTxt = lerTexto(lbAbs);
    if (rb.erros.length || rb.texto !== lbTxt) { erros.push(...rb.erros, ...(rb.texto !== null && rb.texto !== lbTxt ? [`lotes/${ml.lote}-b.json não confere com a etapa A gravada (A mudou depois de revelada?)`] : [])); continue; }
    const vb = validarEtapa(cx, ml.lote, "b", lbTxt, lerTexto(bAbs));
    if (vb.erros.length) { erros.push(...vb.erros); continue; }
    const u = cx.unidades.get(ml.lote)!, docB = vb.doc!;
    unidadesOut.push({ unidade: u.id, lote: ml.lote, gatilhos: u.gatilhos, origens: u.origens.map(o => ({ id: o.id, gatilho: o.gatilho })), juiz: docB.juiz,
      leituraA: va.doc!.leituraDaNorma, leituraB: docB.leituraDaNorma, sensibilidade: { leiturasAlternativasPlausiveis: docB.leiturasAlternativasPlausiveis },
      classificacaoDaDivergencia: docB.classificacaoDaDivergencia, respostas: { a: sha(lerTexto(aAbs)), b: sha(lerTexto(bAbs)) } });
    for (const m of u.membros) {
      const j1 = p.julgados.get(m.idOriginal)!, A = va.derivadas.get(m.idOriginal)!, B = vb.derivadas.get(m.idOriginal)!;
      const depois: Resposta = { ...B.resposta, id: m.idOriginal };
      const mudouResposta = JSON.stringify(j1.resposta) !== JSON.stringify(depois);
      sobrescritas.push({ id: m.idOriginal, idAdjudicacao: m.id, unidade: u.id, gatilhos: u.gatilhos, lote: ml.lote, juiz: docB.juiz,
        antes: { resposta: j1.resposta, classe: j1.derivado.classe, credito: creditoDe(j1.derivado), fundamentacao: j1.derivado.fundamentacao },
        etapaA: { classe: A.derivado.classe, credito: creditoDe(A.derivado) },
        depois: { resposta: depois, classe: B.derivado.classe, credito: creditoDe(B.derivado), fundamentacao: B.derivado.fundamentacao },
        mudouResposta, mudouClasse: j1.derivado.classe !== B.derivado.classe,
        mudouCredito: creditoDe(j1.derivado) !== creditoDe(B.derivado) || j1.derivado.fundamentacao !== B.derivado.fundamentacao,
        mudouEntreAeB: A.derivado.classe !== B.derivado.classe || creditoDe(A.derivado) !== creditoDe(B.derivado) });
      novas.set(m.idOriginal, depois);
      finais.set(m.idOriginal, { unidade: u.id, gatilhos: u.gatilhos, antes: j1.derivado, depois: B.derivado, mudouResposta });
    }
  }
  const preparados = new Set([...cx.unidades.values()].flatMap(u => u.membros.map(m => m.idOriginal)));
  if (!erros.length) for (const id of preparados) if (!novas.has(id)) erros.push(`cartão preparado sem resposta B: ${id}`);
  if (erros.length) return vazio(erros);
  const arquivos = new Map<string, string>();
  for (const f of readdirSync(join(p.dir, "lotes")).sort()) if (f.endsWith(".json") || f.endsWith(".md")) arquivos.set(`lotes/${f}`, readFileSync(join(p.dir, "lotes", f), "utf8"));
  arquivos.set("chave/fila-t3-chave.json", readFileSync(join(p.dir, "chave", "fila-t3-chave.json"), "utf8"));
  for (const f of ["cegueira.json", "residuo-de-braco.json"]) if (existsSync(join(p.dir, f))) arquivos.set(f, readFileSync(join(p.dir, f), "utf8"));
  const rdir = join(p.dir, "respostas");
  for (const f of readdirSync(rdir).filter(f => f.endsWith(".json")).sort()) {
    const doc = JSON.parse(lerTexto(join(rdir, f))) as { juiz: string; respostas: Resposta[] } & Record<string, unknown>;
    const k = doc.respostas.filter(r => novas.has(r.id)).length;
    arquivos.set(`respostas/${f}`, k ? jsonTexto({ ...doc, juiz: `${doc.juiz} · adjudicação informada (${k} resposta(s) substituída(s); ver adjudicacao/sobrescritas.json)`,
      respostas: doc.respostas.map(r => novas.get(r.id) ?? r) }) : readFileSync(join(rdir, f), "utf8"));
  }
  arquivos.set("julgamentos-1a-passada.json", p.julgTxt);
  arquivos.set("julgamentos-1a-passada.json.sha256", `${p.julgSha}  julgamentos-1a-passada.json\n`);
  // Contestados (S4'): 1ª passada ≠ adjudicação, ou desacordo na amostra.
  const desac = new Map(cx.conf.desacordos.map(d => [d.id, d]));
  const contestados = p.membros.flatMap(m => {
    const f = finais.get(m.id), d = desac.get(m.id), j1 = p.julgados.get(m.id)!.derivado, fim = f?.depois ?? j1;
    const motivos: string[] = [];
    if (f && (f.mudouResposta || creditoDe(f.antes) !== creditoDe(f.depois) || f.antes.fundamentacao !== f.depois.fundamentacao)) motivos.push("primeira-passada≠adjudicacao");
    if (d) motivos.push("desacordo-na-confiabilidade");
    if (!motivos.length) return [];
    return [{ id: m.id, chave: m.chave, braco: m.braco, unidade: f?.unidade ?? null, gatilhos: f?.gatilhos ?? [], motivos,
      camposEmDesacordo: d ? unicos(d.desacordos.flatMap(x => x.campos)) : [], credito1a: creditoDe(j1), creditoFinal: creditoDe(fim),
      fundamentacao1a: j1.fundamentacao, fundamentacaoFinal: fim.fundamentacao, creditoEnvolvido: j1.fundamentacao !== null || fim.fundamentacao !== null }];
  });
  const porBraco: Record<string, { contestados: number; creditoEnvolvido: number }> = {};
  for (const c of contestados) { const x = (porBraco[c.braco] ??= { contestados: 0, creditoEnvolvido: 0 }); x.contestados++; if (c.creditoEnvolvido) x.creditoEnvolvido++; }
  const contTxt = jsonTexto({ formato: "nat78-revisao-contestados-1.0.0", versao: REVISAO_VERSAO, aviso: "NÃO entregar a juízes: liga o cartão ao braço. Insumo do S4' (protocolo §8.5).",
    regrasSha256: sha(REGRAS_CAMPANHA), passada: { nome: p.nome, julgamentosSha256: p.julgSha }, confiabilidade: cx.man.confiabilidade,
    regra: "contestado = 1ª passada ≠ adjudicação (resposta, crédito ou fundamentação) ou desacordo de algum juiz da amostra com a 1ª passada em classe/crédito/fato/aplicabilidade/vínculo; creditoEnvolvido = credita na 1ª passada ou no final",
    total: contestados.length, porBraco: Object.fromEntries(Object.entries(porBraco).sort()), cartoes: contestados });
  arquivos.set("contestados.json", contTxt);
  arquivos.set("contestados.json.sha256", `${sha(contTxt)}  contestados.json\n`);
  const ord = ordenar(sobrescritas, s => s.id as string);
  const t = (k: string) => ord.filter(s => s[k]).length;
  const resumo = { formato: "nat78-revisao-sobrescritas-1.0.0", versao: REVISAO_VERSAO, rotulo: "adjudicação informada (etapa A individual congelada; etapa B vê as leituras anteriores, anônimas)",
    regrasSha256: sha(REGRAS_CAMPANHA), adjudicacao: { manifestoSha256: sha(lerTexto(join(dd, "manifesto.json"))) }, primeiraPassada: { arquivo: "julgamentos-1a-passada.json", sha256: p.julgSha },
    totais: { unidades: cx.unidades.size, sobrescritos: ord.length, mudouResposta: t("mudouResposta"), mudouClasse: t("mudouClasse"), mudouCredito: t("mudouCredito"), mudouEntreAeB: t("mudouEntreAeB"),
      comLeituraAlternativa: unidadesOut.filter(u => ((u.sensibilidade as { leiturasAlternativasPlausiveis: string[] }).leiturasAlternativasPlausiveis ?? []).length).length },
    unidades: unidadesOut, sobrescritas: ord };
  const resTxt = jsonTexto(resumo);
  arquivos.set("adjudicacao/sobrescritas.json", resTxt);
  arquivos.set("adjudicacao/sobrescritas.json.sha256", `${sha(resTxt)}  sobrescritas.json\n`);
  arquivos.set("adjudicacao/sobrescritas.md", sobrescritasMd(resumo));
  return { erros: [], arquivos, resumo };
}

function sobrescritasMd(r: { totais: Record<string, number>; unidades: Record<string, unknown>[]; sobrescritas: Record<string, unknown>[] }): string {
  const t = r.totais;
  const L = ["# Revisão de campanha nova — adjudicação informada aplicada", "",
    `Cartões sobrescritos: ${t.sobrescritos} em ${t.unidades} unidades; resposta mudou em ${t.mudouResposta}, classe em ${t.mudouClasse}, crédito em ${t.mudouCredito}; classe/crédito mudou entre a etapa A e a B em ${t.mudouEntreAeB}; unidades com leitura alternativa (sensibilidade): ${t.comLeituraAlternativa}.`, "",
    "## Unidades", ""];
  for (const u of r.unidades) L.push(`- ${u.unidade} (${u.lote}; gatilhos ${(u.gatilhos as string[]).join("+")}): ${JSON.stringify((u.classificacaoDaDivergencia as { tipos: string[] }).tipos)}; alternativas plausíveis: ${((u.sensibilidade as { leiturasAlternativasPlausiveis: string[] }).leiturasAlternativasPlausiveis).length}`);
  L.push("", "## Sobrescritas que mudaram a classe ou o crédito", "", "| cartão | unidade | antes | etapa A | depois (B) | crédito antes → depois |", "|---|---|---|---|---|---|");
  for (const s of r.sobrescritas.filter(s => s.mudouClasse || s.mudouCredito)) {
    const a = s.antes as { classe: string; credito: string }, e = s.etapaA as { classe: string }, d = s.depois as { classe: string; credito: string };
    L.push(`| ${s.id} | ${s.unidade} | ${a.classe} | ${e.classe} | ${d.classe} | ${a.credito} → ${d.credito} |`);
  }
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── gravação imutável e CLI

/** Grava sem nunca trocar conteúdo: arquivo que já existe com outro texto → para (versão nova = pasta nova). */
export function gravarImutavel(raiz: string, arquivos: [string, string][]): void {
  for (const [rel, t] of arquivos) { const abs = join(raiz, rel); if (existsSync(abs) && readFileSync(abs, "utf8") !== t) throw new Error(`PARADO: ${abs} já existe com outro conteúdo (versão nova = pasta nova); nada gravado`); }
  for (const [rel, t] of arquivos) gravar(raiz, rel, t);
}

export interface Args { modo: string[]; opts: Map<string, string[]>; flags: Set<string> }
export function lerArgs(argv: string[], comValor: string[], flags: string[]): Args | { erro: string } {
  const out: Args = { modo: [], opts: new Map(), flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (comValor.includes(x)) { const v = argv[i + 1]; if (!v || v.startsWith("--")) return { erro: `${x} exige um valor` }; out.opts.set(x, [...(out.opts.get(x) ?? []), v]); i++; }
    else if (flags.includes(x)) out.flags.add(x);
    else if (x.startsWith("--")) return { erro: `opção desconhecida: ${x}` };
    else out.modo.push(x);
  }
  return out;
}
const um = (a: Args, k: string): string => { const v = a.opts.get(k); if (!v?.length) throw new Error(`falta ${k} (obrigatório; nunca há pasta padrão)`); if (v.length > 1) throw new Error(`${k} mais de uma vez`); return resolve(v[0]); };
const talvez = (a: Args, k: string): string | null => (a.opts.has(k) ? um(a, k) : null);
const dentro = (filho: string, pai: string) => { const r = relative(pai, filho); return r === "" || (!r.startsWith("..") && !isAbsolute(r)); };
function naoNaPassada(saida: string, p: Passada) { if (dentro(saida, p.dir) || dentro(p.dir, saida)) throw new Error(`--saida ${saida} não pode conter nem estar dentro da passada (a 1ª passada não se reescreve)`); }

const USO = `uso:
  revisao-campanha.ts consistencia --passada PASSADA --saida REVISAO [--analise DIR ...]
  revisao-campanha.ts confiabilidade amostra --passada PASSADA --saida REVISAO [--n 40] [--semente S] [--analise DIR ...]
  revisao-campanha.ts confiabilidade medir --passada PASSADA --amostra REVISAO/confiabilidade [--juiz-passada OUTRA (só ensaio) ...]
  revisao-campanha.ts adjudicacao preparar --passada PASSADA --confiabilidade REVISAO/confiabilidade --saida REVISAO [--aceitar-mascara-anterior]
  revisao-campanha.ts adjudicacao revelar --passada PASSADA --adjudicacao REVISAO/adjudicacao --lote lote-dNN
  revisao-campanha.ts adjudicacao aplicar --passada PASSADA --adjudicacao REVISAO/adjudicacao --saida PASTA_NOVA`;

export function executar(argv: string[]): number {
  const a = lerArgs(argv, ["--passada", "--saida", "--analise", "--n", "--semente", "--amostra", "--juiz-passada", "--confiabilidade", "--adjudicacao", "--lote"], ["--aceitar-mascara-anterior"]);
  if ("erro" in a) { console.error(`RECUSADO: ${a.erro}\n${USO}`); return 1; }
  try {
    const [m1, m2] = a.modo;
    const passada = () => lerPassada(um(a, "--passada"), { analises: (a.opts.get("--analise") ?? []).map(x => resolve(x)) });
    if (m1 === "consistencia" && !m2) {
      const p = passada(), saida = um(a, "--saida"); naoNaPassada(saida, p);
      const an = consistencia(p), json = jsonTexto(an.relatorio);
      gravarImutavel(join(saida, "consistencia"), [["relatorio.json", json], ["relatorio.json.sha256", `${sha(json)}  relatorio.json\n`], ["relatorio.md", consistenciaMd(an)],
        ["regras.md", REGRAS_CAMPANHA], ["regras.md.sha256", `${sha(REGRAS_CAMPANHA)}  regras.md\n`]]);
      const r = an.relatorio as { resumo: Record<string, { gruposComDoisOuMais: number; divergentes: number; vaoAAdjudicacao: number; atomosAAdjudicacao: number }> };
      for (const [k, x] of Object.entries(r.resumo)) console.log(`${k}: ${x.gruposComDoisOuMais} grupos ≥2; ${x.divergentes} divergentes; ${x.vaoAAdjudicacao} à adjudicação (${x.atomosAAdjudicacao} cartões)`);
      console.log(`gravado em ${join(saida, "consistencia")}`);
    } else if (m1 === "confiabilidade" && m2 === "amostra") {
      const p = passada(), saida = um(a, "--saida"); naoNaPassada(saida, p);
      const n = a.opts.has("--n") ? Number(a.opts.get("--n")![0]) : TAMANHO_AMOSTRA;
      if (!Number.isInteger(n) || n < 1) throw new Error("--n inteiro ≥ 1");
      const pr = prepararAmostra(p, { n, semente: a.opts.get("--semente")?.[0] ?? null });
      if (pr.cegueira.resultado !== "OK") { gravarImutavel(join(saida, "confiabilidade"), [["cegueira.json", pr.arquivosInternos.get("cegueira.json")!]]);
        console.error(`CEGUEIRA FALHOU (${pr.cegueira.falhas.length}); nada mais gravado.`); for (const f of pr.cegueira.falhas.slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`); return 3; }
      gravarImutavel(join(saida, "confiabilidade"), [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      const man = JSON.parse(pr.arquivosInternos.get("manifesto.json")!) as { semente: Semente; amostras: { amostra: string; n: number }[] };
      console.log(`amostra ok: ${pr.sorteio.ids.length} cartões em ${man.amostras.length} lote(s); semente ${man.semente.origem}; cegueira OK`);
      console.log(`  estratos: ${JSON.stringify(pr.sorteio.estratos)}`);
      console.log(`  dê a cada juiz (j1, j2; contexto novo) só lotes/amostra-NN.json + LEIAME-amostra.md + LEIAME-juiz.md + o esquema`);
    } else if (m1 === "confiabilidade" && m2 === "medir") {
      const p = passada(), am = um(a, "--amostra");
      const r = medirConfiabilidade(p, am, { juizesPassada: (a.opts.get("--juiz-passada") ?? []).map(x => resolve(x)) });
      if (r.erros.length) { console.error(`RECUSADO (${r.erros.length}); nada gravado.`); for (const e of r.erros.slice(0, 60)) console.error(`  ${e}`); return 1; }
      const jTxt = jsonTexto({ formato: "nat78-revisao-julgamentos-confiabilidade-1.0.0", aviso: "julgamentos congelados dos juízes da amostra (antes da adjudicação)", julgamentos: r.julgamentos });
      const dTxt = jsonTexto({ formato: "nat78-revisao-desacordos-1.0.0", aviso: "NÃO entregar a juízes (traz braço)", campos: CAMPOS_KAPPA, cartoes: r.desacordos });
      const rel: Record<string, unknown> = { ...r.relatorio!, congelados: { "julgamentos-confiabilidade.json": sha(jTxt), "desacordos.json": sha(dTxt) } };
      const rTxt = jsonTexto(rel);
      gravarImutavel(am, [["julgamentos-confiabilidade.json", jTxt], ["julgamentos-confiabilidade.json.sha256", `${sha(jTxt)}  julgamentos-confiabilidade.json\n`],
        ["desacordos.json", dTxt], ["desacordos.json.sha256", `${sha(dTxt)}  desacordos.json\n`],
        ["relatorio-confiabilidade.json", rTxt], ["relatorio-confiabilidade.json.sha256", `${sha(rTxt)}  relatorio-confiabilidade.json\n`], ["relatorio-confiabilidade.md", confiabilidadeMd(rel)]]);
      const cs = rel.campos as Record<string, { fleissTodos: { n: number; kappaFleiss: number | null } }>;
      console.log(`confiabilidade ok (avaliadores ${(rel.avaliadores as string[]).join(", ")}${rel.aviso ? "; ENSAIO, não é resultado" : ""}):`);
      for (const c of CAMPOS_KAPPA) console.log(`  ${c}: κ Fleiss ${cs[c].fleissTodos.kappaFleiss ?? "n/d"} (n=${cs[c].fleissTodos.n})`);
      console.log(`  desacordos (gatilho b): ${r.desacordos.length} cartões; gravado em ${am}`);
    } else if (m1 === "adjudicacao" && m2 === "preparar") {
      const p = passada(), saida = um(a, "--saida"); naoNaPassada(saida, p);
      const pr = prepararAdjudicacao(p, { confiabilidade: um(a, "--confiabilidade"), aceitarMascaraAnterior: a.flags.has("--aceitar-mascara-anterior") });
      const dd = join(saida, "adjudicacao");
      if (pr.cegueira.resultado !== "OK") { gravarImutavel(dd, [["cegueira.json", pr.arquivosInternos.get("cegueira.json")!]]);
        console.error(`CEGUEIRA FALHOU (${pr.cegueira.falhas.length}); nada mais gravado.`); for (const f of pr.cegueira.falhas.slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`); return 3; }
      gravarImutavel(dd, [...pr.arquivosDoJuiz, ...pr.arquivosInternos]);
      const man = JSON.parse(pr.arquivosInternos.get("manifesto.json")!) as { porGatilho: Record<string, unknown>; lotes: { lote: string; grupo: string; n: number }[] };
      console.log(`adjudicação preparada: ${pr.unidades.length} unidade(s) (1 adjudicador novo cada); por gatilho ${JSON.stringify(man.porGatilho)}`);
      for (const u of pr.unidades) console.log(`  ${man.lotes.find(l => l.grupo === u.id)!.lote}: ${u.id} gatilhos ${u.gatilhos.join("+")}, ${u.membros.length} cartão(ões): ${u.membros.join(", ")}`);
      for (const x of pr.avisos) console.log(`  AVISO: ${x}`);
      console.log(`  dê ao adjudicador só lotes/lote-dNN.json + LEIAME-adjudicacao.md + LEIAME-juiz.md + esquemas (chave/, manifesto.json NÃO)`);
    } else if (m1 === "adjudicacao" && m2 === "revelar") {
      const p = passada(), dd = um(a, "--adjudicacao"), lote = a.opts.get("--lote")?.[0];
      if (!lote || !/^lote-d\d{2}$/.test(lote)) throw new Error("--lote lote-dNN obrigatório");
      const r = loteB(p, dd, lote);
      if (r.erros.length || !r.texto) { console.error(`REVELAÇÃO RECUSADA (${r.erros.length}):`); for (const e of r.erros.slice(0, 60)) console.error(`  ${e}`); return 1; }
      gravarImutavel(dd, [[`lotes/${lote}-b.json`, r.texto], [`chave/revelacao-${lote}.json`, r.revelacao!]]);
      console.log(`revelar ok: ${join(dd, "lotes", `${lote}-b.json`)} (etapa A congelada: sha256 no lote B)`);
    } else if (m1 === "adjudicacao" && m2 === "aplicar") {
      const p = passada(), dd = um(a, "--adjudicacao"), saida = um(a, "--saida"); naoNaPassada(saida, p);
      if (existsSync(saida)) throw new Error(`--saida ${saida} já existe (a passada adjudicada vai para uma pasta NOVA)`);
      const r = aplicarAdjudicacao(p, dd);
      if (r.erros.length) { console.error(`ADJUDICAÇÃO RECUSADA (${r.erros.length}); nada gravado.`); for (const e of r.erros.slice(0, 80)) console.error(`  ${e}`); return 1; }
      gravarImutavel(saida, [...r.arquivos]);
      const ing = ingerir(saida);
      if (ing.erros.length || !ing.texto) { console.error("A ingestão recusou a passada adjudicada:"); for (const e of ing.erros.slice(0, 40)) console.error(`  ${e}`); return 1; }
      gravarImutavel(saida, [["julgamentos.json", ing.texto], ["julgamentos.json.sha256", `${sha(ing.texto)}  julgamentos.json\n`]]);
      const t = (r.resumo as { totais: Record<string, number> }).totais;
      console.log(`aplicar ok: ${t.sobrescritos} cartões sobrescritos em ${t.unidades} unidades; classe mudou ${t.mudouClasse}, crédito ${t.mudouCredito}`);
      console.log(`  julgamentos.json sha256 ${sha(ing.texto)}; 1ª passada preservada em julgamentos-1a-passada.json; contestados.json gravado`);
    } else { console.error(USO); return 1; }
    return 0;
  } catch (e) { console.error(e instanceof Error ? e.message : e); return 1; }
}

if (process.argv[1] && /(?:^|[\\/])revisao-campanha\.ts$/.test(process.argv[1])) process.exit(executar(process.argv.slice(2)));
