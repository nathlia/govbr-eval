/**
 * E14 · segunda leitura independente (regras.md §4) de uma unidade da adjudicação informada que ficou pendente com
 * leituras incompatíveis plausíveis — hoje só a lote-d05 (regra de anatomia do DS sobre o "Fechar" da Message,
 * implementado como <div>). Não julga nada.
 *
 *   npm run reanalise:nat74:e14-segunda-leitura -- preparar --desempate PASTA/desempate --lote lote-d05 [--fila …]
 *     Grava PASTA/desempate/segunda-leitura/: lote-d05-2.json (os mesmos cartões cegos, ids NOVOS, + os textos
 *     oficiais LITERAIS que tratam da anatomia do Button/Message e da tag do Button, e o texto completo da regra da
 *     base que os cartões citam), LEIAME-segunda-leitura.md e o esquema (vão ao leitor novo); chave/, manifesto.json e
 *     cegueira.json (não vão). O leitor não vê as respostas da 1ª passada nem as da 1ª adjudicação (conferido).
 *
 *   npm run reanalise:nat74:e14-segunda-leitura -- aplicar --desempate PASTA/desempate --saida SAIDA [--fila …]
 *     = `e14-desempate aplicar` + a segunda leitura: sem leitura alternativa plausível → as respostas dela substituem as
 *     da unidade; com alternativa → os membros ficam como estão (incerta / evidência indisponível) e grava-se a
 *     sensibilidade "anatomia se aplica" × "não se aplica" (classe e crédito de cada membro). Tudo vai para
 *     desempate/sobrescritas.{json,md}.
 *
 * Determinístico: sem carimbo de tempo, sem rede, sem modelo. Nenhum texto vem do oráculo nem das conferências do
 * validador: os trechos oficiais vêm do corpus literal coletado de gov.br/ds (DS 3.7.0) e a regra da base é o registro
 * dela (título, texto original, regra normalizada, força, evidência esperada) — não a glosa da conferência.
 */
import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { POLITICA_PRINCIPAL, TCC, gravar, jsonTexto, ordenar, sha, shaArquivo, unicos } from "./comum";
import { inventarioDeAtomos, type Inventario } from "./e1";
import { janelas } from "./e14-cegueira";
import { FILA, NAO_PERGUNTADO, derivarClasse, validarResposta, type CartaoCego, type Derivado, type ItemChave, type Resposta } from "./e14-comum";
import { analisarFila, argumento, conferirCegueira, creditoDe, lerTexto, type Referencias } from "./e14-consistencia";
import { ESQUEMA_B, aplicarDesempate, sobrescritasMd, type Aplicacao, type Sobrescrita } from "./e14-desempate";
import { contextoDe, ingerir } from "./e14-ingerir";
import { leiameJuiz } from "./e14-preparar";

export const FORMATO_LOTE_2 = "nat74-t3-segunda-leitura-lote-1.0.0";
export const FORMATO_RESP_2 = "nat74-t3-segunda-leitura-respostas-1.0.0";
export const SEMENTE_2 = "nat74-e14-segunda-leitura-v1|";
export const CORPUS = join(TCC, "ds-rules", "govbr-ds-3.7.0-corpus");
/** Registro da regra da base (só leitura; o caminho nunca vai ao leitor). */
export const BASE_DE_REGRAS = join(TCC, "govbr-ds-validator", "data", "knowledge", "versions", "3.7.0", "normalized", "rules.jsonl");

// ───────────────────────────────────────────────────────────────── evidência oficial (literal)

/** Trecho literal: da primeira linha que começa com `inicio` até a primeira, a partir dela, que começa com `fim`. */
interface Trecho { id: string; arquivo: string; inicio: string; fim: string; assunto: string; fimExato?: boolean }
interface Evidencia { trechos: Trecho[]; regraBase: { id: string; urlContem: string; origem: string }; nota: string }

export const EVIDENCIAS: Record<string, Evidencia> = {
  "lote-d05": {
    trechos: [
      { id: "OF1", arquivo: "componentes/button__designer.md", inicio: "## Anatomia", fim: "*Anatomia completa do componente button*", assunto: "Button, aba designer: a anatomia do componente" },
      { id: "OF2", arquivo: "componentes/button__desenvolvedor.md", inicio: "### Propriedades obrigatórias", fim: "| class    | string | **br-button** | Container do componente. |", assunto: "Button, aba desenvolvedor: propriedades obrigatórias" },
      { id: "OF3", arquivo: "componentes/button__desenvolvedor.md", inicio: "Você pode usar a grid", fim: "```", fimExato: true, assunto: "Button, aba desenvolvedor: o único exemplo de código da página" },
      { id: "OF4", arquivo: "componentes/button__acessibilidade.md", inicio: "## Recomendações para Código", fim: "- Recomenda-se utilizar a tag `<button>`", assunto: "Button, aba acessibilidade: a tag do componente" },
      { id: "OF5", arquivo: "componentes/message__designer.md", inicio: "## Anatomia", fim: "*Anatomia do Message*", assunto: "Message, aba designer: a anatomia do componente" },
      { id: "OF6", arquivo: "componentes/message__designer.md", inicio: "#### 5. Botão Fechar (Opcional)", fim: "Este elemento é o **Componente Botão", assunto: "Message, aba designer: o Botão Fechar" },
    ],
    regraBase: { id: "govbr-3.7.0-component-global-e30aab6e9a68", urlContem: "criterios-analise-qualitativa",
      origem: "wiki de gestão do DS gov.br › guias › critérios de análise e classificação › critérios de análise qualitativa (seção Layout)" },
    nota: "Busca no corpus coletado de gov.br/ds (DS 3.7.0; 126 páginas; termos: anatomia, tag, br-button, marcação semântica, elemento raiz): nenhum trecho diz explicitamente se o elemento HTML raiz (a tag) faz parte da \"anatomia\" de um componente. OF1–OF6 são os trechos que tratam da anatomia do Button e do Message e da tag do Button. O texto-fonte da regra da base (página de critérios da wiki do DS) não está no corpus coletado; REGRA-BASE traz o registro dela como está na base. As imagens citadas nos trechos não estão incluídas.",
  },
};

export interface TextoOficial { id: string; assunto: string; fonte: string; url: string | null; commit: string | null; caminhoFonte: string | null; acesso: string | null; arquivo: string; linhas: string; trecho: string }
export interface RegraBaseVista { id: "REGRA-BASE"; fonte: string; titulo: string; textoOriginal: string; modoDoTextoOriginal: string; regraNormalizada: string; forcaDeclarada: string;
  condicoes: unknown[]; excecoes: unknown[]; evidenciaEsperada: string[]; origem: string; observacao: string }

/** Extrai os trechos literais do corpus (falha se um marcador não existir) e o registro da regra da base. */
export function evidenciaOficial(lote: string): { textos: TextoOficial[]; regraBase: RegraBaseVista; nota: string; fontes: Record<string, string> } {
  const ev = EVIDENCIAS[lote];
  if (!ev) throw new Error(`segunda leitura: não há evidência oficial preparada para ${lote}`);
  const fontes: Record<string, string> = {};
  const textos = ev.trechos.map(t => {
    const abs = join(CORPUS, t.arquivo);
    const txt = lerTexto(abs);
    fontes[`ds-rules/govbr-ds-3.7.0-corpus/${t.arquivo}`] = shaArquivo(abs);
    const ls = txt.split(/\r?\n/);
    const i = ls.findIndex(l => l.startsWith(t.inicio));
    const f = i < 0 ? -1 : ls.findIndex((l, k) => k > i && (t.fimExato ? l.trim() === t.fim : l.startsWith(t.fim)));
    if (i < 0 || f < 0) throw new Error(`segunda leitura: marcador não achado em ${t.arquivo} (${i < 0 ? t.inicio : t.fim})`);
    const meta = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, "m").exec(txt)?.[1]?.trim() ?? null;
    return { id: t.id, assunto: t.assunto, fonte: "publicado em gov.br/ds (DS 3.7.0)", url: meta("URL"), commit: meta("Commit"), caminhoFonte: meta("Caminho-fonte"),
      acesso: meta("Data de acesso"), arquivo: t.arquivo, linhas: `${i + 1}–${f + 1}`, trecho: ls.slice(i, f + 1).join("\n") };
  });
  const kb = readFileSync(BASE_DE_REGRAS, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as Record<string, unknown>).find(k => k.id === ev.regraBase.id);
  if (!kb) throw new Error(`segunda leitura: regra da base ${ev.regraBase.id} não achada`);
  const src = kb.source as { url: string };
  if (!src.url.includes(ev.regraBase.urlContem)) throw new Error("segunda leitura: a origem da regra da base mudou");
  fontes["base de regras (registro da regra citada)"] = sha(JSON.stringify(kb));
  const FORCA: Record<string, string> = { required: "obrigatorio", recommended: "recomendado", optional: "opcional", example: "exemplo" };
  const regraBase: RegraBaseVista = { id: "REGRA-BASE", fonte: "base de regras do DS — a regra que os cartões citam ([regra citada])", titulo: kb.title as string,
    textoOriginal: kb.originalText as string, modoDoTextoOriginal: kb.originalTextMode === "verbatim-excerpt" ? "trecho literal da fonte" : String(kb.originalTextMode),
    regraNormalizada: kb.normalizedRule as string, forcaDeclarada: FORCA[kb.force as string] ?? String(kb.force),
    condicoes: kb.conditions as unknown[], excecoes: kb.exceptions as unknown[], evidenciaEsperada: kb.expectedEvidence as string[], origem: ev.regraBase.origem,
    observacao: "Registro completo da regra na base." };
  return { textos, regraBase, nota: ev.nota, fontes };
}

// ───────────────────────────────────────────────────────────────── esquema e LEIAME

export const ESQUEMA_2 = { ...ESQUEMA_B, title: FORMATO_RESP_2, properties: { ...ESQUEMA_B.properties,
  formato: { const: FORMATO_RESP_2 }, lote: { type: "string", pattern: "^lote-d\\d{2}-2$" }, etapa: { const: "segunda-leitura" } } } as const;

function secoesDoLeiame(): string {
  const t = leiameJuiz(0, 0);
  const i = t.indexOf("## As perguntas"), f = t.indexOf("## O arquivo de resposta");
  if (i < 0 || f < 0) throw new Error("segunda leitura: o LEIAME do juiz mudou de forma");
  return t.slice(i, f).trimEnd();
}

export function leiameSegunda(lote: string): string {
  return `# Fila T3 · leitura de um grupo com os textos oficiais (política normativa 1.2.0)

Você recebe **um grupo** de cartões (\`${lote}-2.json\`) que citam a mesma regra sobre o mesmo tipo de elemento, e os
**textos oficiais literais** ligados a essa regra (\`textosOficiais\`: trechos publicados em gov.br/ds, DS 3.7.0, e o
registro completo da regra citada). Reunir os cartões é só triagem: cada cartão tem a sua resposta. **Você não escreve
a classe final**: ela sai das suas respostas por regra fixa.

**Use só este arquivo.** Não abra outros arquivos nem páginas. Não tente descobrir de onde os cartões vieram. Os textos
oficiais são o que se sabe da regra; \`textosOficiais.nota\` diz o que a busca no corpus achou e o que não achou. Se os
textos não decidem a questão, não decida por precaução: diga isso.

1. Leia \`textosOficiais\` (OF1…, REGRA-BASE) e a norma citada (\`grupo.norma\`). Escreva em \`leituraDaNorma\` a regra de
   interpretação: \`norma\` ("citada"), \`fonteEVersao\`, \`forca\`, \`antecedente\`, \`excecoes\`, \`evidenciaNecessaria\`,
   \`permiteConcluir\` — apoiada nos textos (cite OF1… / REGRA-BASE).
2. Responda **cada cartão**. Norma e força iguais à da leitura; aplicabilidade e violação são de cada cartão. Nas
   justificativas, cite os ids do cartão e os dos textos oficiais (\`OF1\`…\`OF6\`, \`REGRA-BASE\`) em que se apoia.
3. Se, com os textos, leituras incompatíveis da regra continuam plausíveis, liste-as em
   \`leiturasAlternativasPlausiveis\` (uma frase cada) e deixe os cartões com pergunta de norma como \`incerta\` /
   \`incerto\`. Se não há, \`[]\`.
4. \`classificacaoDaDivergencia\`: de que tipo é o que pode fazer leitores divergirem sobre estes cartões — \`tipos\` (um ou
   mais de \`diferenca-legitima-de-contexto\` · \`falta-de-evidencia\` · \`interpretacao-normativa\` · \`erro-do-juiz\`),
   \`evidencias\` (\`T3-…\` ou \`T3-…:OF1\`, \`T3-…:REGRA-BASE\`, \`T3-…:OBS\`…) e \`justificativa\`.

${secoesDoLeiame()}

## O arquivo de resposta

Grave \`respostas/${lote}-2.json\` (esquema \`esquema-segunda-leitura.schema.json\`):

\`\`\`json
{
  "formato": "${FORMATO_RESP_2}", "lote": "${lote}-2", "loteSha256": "<sha256 do ${lote}-2.json>",
  "juiz": "<quem leu>", "etapa": "segunda-leitura", "grupo": "D-…",
  "leituraDaNorma": { "norma": "citada", "fonteEVersao": "…", "forca": "…", "antecedente": "…", "excecoes": "…", "evidenciaNecessaria": "…", "permiteConcluir": "…" },
  "leiturasAlternativasPlausiveis": [],
  "classificacaoDaDivergencia": { "tipos": ["interpretacao-normativa"], "evidencias": ["T3-…:OF1"], "justificativa": "…" },
  "respostas": [ { "id": "T3-…", "verdadeFactual": "…", "norma": { "id": "citada", "forca": "…", "aplicabilidade": "…", "violada": "…" },
    "vinculo": "…", "sugestao": "${NAO_PERGUNTADO}", "forcaDoVeredito": "…", "evidencias": ["OBS", "OF1"], "justificativa": "… OF1 …" } ]
}
\`\`\`
A ingestão recusa o arquivo se faltar um cartão, se um id for de fora do grupo, se um valor estiver fora das listas, se a
justificativa não citar um id, se norma ou força de um cartão diferirem da leitura, se houver leitura alternativa e um
cartão com pergunta de norma sair com classe final, ou se \`loteSha256\` não conferir.
`;
}

// ───────────────────────────────────────────────────────────────── preparar

interface UnidadeChave { id: string; lote: string; membros: { id: string; idOriginal: string; chave: string; loteOriginal: string }[] }
interface LoteD { grupo: { id: string; pedeLeituraDaNorma: boolean; normaUnica: boolean; norma: unknown; membros: string[] }; referencias: Referencias; cartoes: (CartaoCego & { grupo: string })[] }
export interface MembroChave2 { id: string; idOriginal: string; idAdjudicacao: string; chave: string }
export interface Preparo2 { arquivosDoJuiz: Map<string, string>; arquivosInternos: Map<string, string>; falhas: string[]; porCartao: unknown[] }

export const idSegunda = (chave: string): string => `T3-${sha(SEMENTE_2 + "membro|" + chave).slice(0, 10)}`;

/** Textos da 1ª adjudicação da unidade (para provar que nada dela vai ao leitor novo). */
function textosDaAdjudicacao(dd: string, lote: string): string[] {
  const out: string[] = [];
  for (const etapa of ["a", "b"]) {
    const abs = join(dd, "respostas", `${lote}-${etapa}.json`);
    if (!existsSync(abs)) continue;
    const d = JSON.parse(lerTexto(abs)) as { leituraDaNorma: unknown; leiturasAlternativasPlausiveis?: string[]; classificacaoDaDivergencia?: { justificativa: string }; respostas: Resposta[] };
    if (d.leituraDaNorma && typeof d.leituraDaNorma === "object") out.push(...Object.values(d.leituraDaNorma as Record<string, string>).filter(x => x.length >= 40));
    out.push(...(d.leiturasAlternativasPlausiveis ?? []), ...(d.classificacaoDaDivergencia ? [d.classificacaoDaDivergencia.justificativa] : []), ...d.respostas.map(r => r.justificativa));
  }
  return out;
}

export function prepararSegunda(o: { fila?: string; desempate: string; lote: string; inv?: Inventario }): Preparo2 {
  const fila = o.fila ?? FILA(), dd = o.desempate, lote = o.lote;
  const inv = o.inv ?? inventarioDeAtomos();
  const ap = aplicarDesempate({ fila, desempate: dd, inv });
  if (ap.erros.length) throw new Error(`segunda leitura: a adjudicação não aplica:\n  ${ap.erros.slice(0, 20).join("\n  ")}`);
  const un = (ap.resumo!.unidades as { lote: string; segundaLeituraIndicada: boolean }[]).find(u => u.lote === lote);
  if (!un) throw new Error(`segunda leitura: unidade ${lote} não existe`);
  if (!un.segundaLeituraIndicada) throw new Error(`segunda leitura: ${lote} não tem segunda leitura indicada (regras §4)`);
  const chave = JSON.parse(lerTexto(join(dd, "chave", "desempate-chave.json"))) as { unidades: UnidadeChave[] };
  const u = chave.unidades.find(x => x.lote === lote)!;
  const l = JSON.parse(lerTexto(join(dd, `${lote}.json`))) as LoteD;
  const ev = evidenciaOficial(lote);
  const idsOf = [...ev.textos.map(t => t.id), "REGRA-BASE"];
  const membros: MembroChave2[] = u.membros.map(m => ({ id: idSegunda(m.chave), idOriginal: m.idOriginal, idAdjudicacao: m.id, chave: m.chave })).sort((x, y) => (x.id < y.id ? -1 : 1));
  const grupoId = `D-${sha(SEMENTE_2 + "grupo|" + membros.map(m => m.chave).sort().join("|")).slice(0, 10)}`;
  const cartaoNovo = new Map<string, CartaoCego>();
  const cartoes = membros.map(m => {
    const c = l.cartoes.find(x => x.id === m.idAdjudicacao)!;
    const n = { ...c, id: m.id, grupo: grupoId, citaveis: [...c.citaveis, ...idsOf] };
    cartaoNovo.set(m.idOriginal, n);
    return n;
  });
  const leiame = leiameSegunda(lote), esquema = jsonTexto(ESQUEMA_2);
  const loteTxt = jsonTexto({ formato: FORMATO_LOTE_2, lote: `${lote}-2`, etapa: "segunda-leitura", politica: POLITICA_PRINCIPAL,
    instrucoes: { arquivo: "LEIAME-segunda-leitura.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-segunda-leitura.schema.json", sha256: sha(esquema) },
    respostaEm: `respostas/${lote}-2.json`, n: cartoes.length,
    grupo: { id: grupoId, pedeLeituraDaNorma: l.grupo.pedeLeituraDaNorma, normaUnica: l.grupo.normaUnica,
      descricao: `Os ${cartoes.length} cartões citam a mesma regra sobre o mesmo tipo de elemento. Reunidos só para a regra ser lida do mesmo jeito; cada cartão tem a sua resposta.`,
      norma: l.grupo.norma, membros: cartoes.map(c => c.id) },
    textosOficiais: { nota: ev.nota, itens: [...ev.textos, ev.regraBase] }, referencias: l.referencias, cartoes });
  const juiz = new Map([[`${lote}-2.json`, loteTxt], ["LEIAME-segunda-leitura.md", leiame], ["esquema-segunda-leitura.schema.json", esquema]]);
  // Cegueira: porta da NAT-73 + 1ª passada (ids e justificativas) + nada da 1ª adjudicação (ids e textos).
  const analise = analisarFila(fila, inv);
  const ceg = conferirCegueira({ fila, analise, inv, arquivos: [...juiz].filter(([rel]) => !/schema/.test(rel)).map(([rel, texto]) => ({ rel, texto })), cartaoNovo });
  const falhas = [...ceg.falhas, ...ceg.falhasExtras].map(f => `${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`);
  const comoLido = (t: string) => t.replace(/\\"/g, '"').replace(/\s+/g, " ").toLowerCase();
  const publico = comoLido([lerTexto(join(dd, `${lote}.json`)), ...ev.textos.map(t => t.trecho), JSON.stringify(ev.regraBase)].join("\n"));
  const ws = unicos(textosDaAdjudicacao(dd, lote).flatMap(t => janelas(t))).filter(w => !publico.includes(w));
  for (const [rel, texto] of juiz) {
    for (const m of membros) if (texto.includes(m.idAdjudicacao)) falhas.push(`${rel}: id da 1ª adjudicação → ${m.idAdjudicacao}`);
    if (texto.includes(u.id)) falhas.push(`${rel}: id do grupo da 1ª adjudicação → ${u.id}`);
    const n = comoLido(texto); const w = ws.find(x => n.includes(x));
    if (w) falhas.push(`${rel}: trecho da 1ª adjudicação → ${w}`);
  }
  const internos = new Map<string, string>();
  internos.set(`chave/${lote}-chave.json`, jsonTexto({ formato: "nat74-t3-segunda-leitura-chave-1.0.0", aviso: "NÃO entregar ao leitor", lote, grupoAdjudicacao: u.id, grupo: grupoId, membros }));
  internos.set(`cegueira-${lote}.json`, jsonTexto({ resultado: falhas.length ? "FALHOU" : "OK", falhas, janelasDaAdjudicacao: ws.length, porCartao: ceg.porCartao }));
  internos.set(`manifesto-${lote}.json`, jsonTexto({ formato: "nat74-t3-segunda-leitura-manifesto-1.0.0", lote, loteArquivo: `${lote}-2.json`, sha256: sha(loteTxt),
    arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])), fontesDaEvidencia: ev.fontes,
    chaveSha256: sha(internos.get(`chave/${lote}-chave.json`)!) }));
  return { arquivosDoJuiz: juiz, arquivosInternos: internos, falhas, porCartao: ceg.porCartao };
}

// ───────────────────────────────────────────────────────────────── aplicar

interface Resp2 { formato: string; lote: string; loteSha256: string; juiz: string; etapa: string; grupo: string;
  leituraDaNorma: { norma: string; forca: string } | typeof NAO_PERGUNTADO; leiturasAlternativasPlausiveis: string[];
  classificacaoDaDivergencia: { tipos: string[]; evidencias: string[]; justificativa: string }; respostas: Resposta[] }

const FINAIS_PROIBIDOS_COM_ALTERNATIVA = ["pendente", "evidencia-indisponivel", "erro-factual"];
const resumoD = (d: Derivado) => ({ classe: d.classe, credito: creditoDe(d), fundamentacao: d.fundamentacao });

/** `e14-desempate aplicar` + as segundas leituras preparadas em desempate/segunda-leitura/. */
export function aplicarComSegunda(o: { fila?: string; desempate: string; inv?: Inventario }): Aplicacao {
  const fila = o.fila ?? FILA(), dd = o.desempate, sl = join(dd, "segunda-leitura");
  const inv = o.inv ?? inventarioDeAtomos();
  const r = aplicarDesempate({ fila, desempate: dd, inv });
  if (r.erros.length) return r;
  const vazio = (e: string[]): Aplicacao => ({ erros: e, arquivos: new Map(), sobrescritas: [], resumo: null });
  const resumo = r.resumo as Record<string, unknown> & { unidades: Record<string, unknown>[]; totais: Record<string, number> };
  const indicadas = resumo.unidades.filter(u => u.segundaLeituraIndicada).map(u => u.lote as string);
  if (!indicadas.length) return r;
  const erros: string[] = [];
  const itens = new Map((JSON.parse(lerTexto(join(fila, "chave", "fila-t3-chave.json"))) as { itens: ItemChave[] }).itens.map(i => [i.id, i]));
  const segundas: Record<string, unknown>[] = [];
  const novas = new Map<string, Resposta>();
  const v = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true }).compile(ESQUEMA_2 as object);
  // Só as unidades com segunda leitura preparada; as indicadas e não preparadas ficam registradas como pendentes.
  const preparadas = indicadas.filter(l => existsSync(join(sl, `manifesto-${l}.json`)));
  const naoPreparadas = indicadas.filter(l => !preparadas.includes(l));
  for (const lote of preparadas) {
    const mAbs = join(sl, `manifesto-${lote}.json`);
    const man = JSON.parse(lerTexto(mAbs)) as { lote: string; loteArquivo: string; sha256: string; chaveSha256: string };
    if (man.lote !== lote) { erros.push(`segunda-leitura/manifesto.json é de ${man.lote}, não de ${lote}`); continue; }
    const lTxt = lerTexto(join(sl, man.loteArquivo));
    if (sha(lTxt) !== man.sha256) { erros.push(`segunda-leitura/${man.loteArquivo} difere do manifesto`); continue; }
    const cTxt = lerTexto(join(sl, "chave", `${lote}-chave.json`));
    if (sha(cTxt) !== man.chaveSha256) { erros.push("segunda-leitura/chave difere do manifesto"); continue; }
    const chave = JSON.parse(cTxt) as { grupo: string; membros: MembroChave2[] };
    const rAbs = join(sl, "respostas", `${lote}-2.json`);
    if (!existsSync(rAbs)) { erros.push(`segunda-leitura/respostas/${lote}-2.json ausente`); continue; }
    const pre = `segunda-leitura/respostas/${lote}-2.json`;
    let doc: Resp2;
    try { doc = JSON.parse(lerTexto(rAbs)); } catch (e) { erros.push(`${pre}: JSON inválido (${(e as Error).message})`); continue; }
    if (!v(doc)) { erros.push(...(v.errors ?? []).map(x => `${pre}: esquema ${x.instancePath || "/"} ${x.message}`)); continue; }
    const l = JSON.parse(lTxt) as LoteD;
    if (doc.lote !== `${lote}-2` || doc.loteSha256 !== man.sha256 || doc.grupo !== chave.grupo) erros.push(`${pre}: lote/loteSha256/grupo não conferem`);
    const leitura = doc.leituraDaNorma;
    if (l.grupo.pedeLeituraDaNorma && leitura === NAO_PERGUNTADO) erros.push(`${pre}: leituraDaNorma é pedida`);
    if (leitura !== NAO_PERGUNTADO && leitura.norma !== "citada") erros.push(`${pre}: leituraDaNorma.norma = "citada"`);
    const ids = doc.respostas.map(x => x.id);
    for (const x of unicos(ids.filter((y, i) => ids.indexOf(y) !== i))) erros.push(`${pre}: id repetido ${x}`);
    for (const x of ids) if (!chave.membros.some(m => m.id === x)) erros.push(`${pre}: id fora do grupo ${x}`);
    for (const m of chave.membros) if (!ids.includes(m.id)) erros.push(`${pre}: incompleto — falta ${m.id}`);
    for (const ev of doc.classificacaoDaDivergencia.evidencias) {
      const [id, item] = ev.split(":"); const c = l.cartoes.find(x => x.id === id);
      if (!c) erros.push(`${pre}: classificacaoDaDivergencia.evidencias: cartão fora do grupo ${id}`); else if (item && !c.citaveis.includes(item)) erros.push(`${pre}: ${item} não é citável em ${id}`);
    }
    const resolvida = doc.leiturasAlternativasPlausiveis.length === 0;
    const membrosOut: Record<string, unknown>[] = [];
    let seAplica = 0, seNaoAplica = 0;
    for (const resp of doc.respostas) {
      const m = chave.membros.find(x => x.id === resp.id), c = l.cartoes.find(x => x.id === resp.id);
      if (!m || !c) continue;
      const ctx = contextoDe(c, itens.get(m.idOriginal)!, l.referencias[c.tela].defeitos.map(x => x.id));
      const e = validarResposta(resp, ctx);
      if (e.length) { erros.push(...e.map(x => `${pre}: ${resp.id}: ${x}`)); continue; }
      if (leitura !== NAO_PERGUNTADO && resp.norma !== NAO_PERGUNTADO && (resp.norma.id !== leitura.norma || resp.norma.forca !== leitura.forca))
        erros.push(`${pre}: ${resp.id}: norma/força diferente da leitura (a força é da norma)`);
      const d2 = derivarClasse(resp, ctx);
      if (!resolvida && resp.norma !== NAO_PERGUNTADO && !FINAIS_PROIBIDOS_COM_ALTERNATIVA.includes(d2.classe))
        erros.push(`${pre}: ${resp.id}: há leitura alternativa plausível: o cartão fica incerta/incerto (classe ${d2.classe})`);
      const s = r.sobrescritas.find(x => x.id === m.idOriginal)!;
      // A resposta entra na fila com o cartão ORIGINAL (a ingestão confere os ids citáveis dele): as citações aos
      // textos oficiais (OFn, REGRA-BASE) saem de `evidencias`, entra NORMA, e a justificativa ganha uma nota que diz
      // onde estão os textos. A resposta da segunda leitura, inteira, fica em sobrescritas.json.
      let final: Resposta = s.depois.resposta;
      if (resolvida) {
        const it = itens.get(m.idOriginal)!;
        const lo = JSON.parse(r.arquivos.get(`lotes/${it.lote}.json`)!) as { cartoes: CartaoCego[]; referencias: Referencias };
        const co = lo.cartoes.find(x => x.id === m.idOriginal)!;
        const ofs = resp.evidencias.filter(x => !co.citaveis.includes(x));
        const ev = unicos([...resp.evidencias.filter(x => co.citaveis.includes(x)), ...(ofs.length ? ["NORMA"] : [])]);
        final = { ...resp, id: m.idOriginal, evidencias: ev.length ? ev : ["NORMA"],
          justificativa: ofs.length || !ev.length ? `${resp.justificativa} [segunda leitura E14: apoio também nos textos oficiais ${ofs.join(", ") || "—"} de desempate/segunda-leitura/${lote}-2.json, ligados à NORMA]` : resp.justificativa };
        const eo = validarResposta(final, contextoDe(co, it, lo.referencias[co.tela].defeitos.map(x => x.id)));
        if (eo.length) erros.push(...eo.map(x => `${pre}: ${resp.id}: no cartão original: ${x}`));
      }
      // Sensibilidade: a mesma resposta final, com a regra de anatomia aplicável e violada × não aplicável.
      const forcaV = leitura !== NAO_PERGUNTADO && ["obrigatorio", "recomendado", "boa-pratica", "exemplo"].includes(leitura.forca) ? leitura.forca : "obrigatorio";
      const variante = (aplica: boolean): Resposta => final.norma === NAO_PERGUNTADO || final.verdadeFactual !== "verdadeira" ? final
        : { ...final, norma: { id: final.norma.id, forca: forcaV as never, aplicabilidade: aplica ? "aplica" : "nao-aplica", violada: aplica ? "sim" : "nao" } };
      const va = resumoD(derivarClasse(variante(true), ctx)), vn = resumoD(derivarClasse(variante(false), ctx));
      if (va.credito.startsWith("credita")) seAplica++;
      if (vn.credito.startsWith("credita")) seNaoAplica++;
      membrosOut.push({ id: m.idOriginal, idSegundaLeitura: m.id, segundaLeitura: resumoD(d2), aplicada: resolvida, respostaDaSegundaLeitura: resp,
        sensibilidade: { forcaUsada: forcaV, seAplica: va, seNaoAplica: vn } });
      if (resolvida) novas.set(m.idOriginal, final);
    }
    segundas.push({ lote, grupo: chave.grupo, juiz: doc.juiz, resolvida, regra: "regras §4 + instrução da coordenação: sem alternativa plausível → substitui; com alternativa → fica incerta e grava a sensibilidade",
      leituraDaNorma: doc.leituraDaNorma, leiturasAlternativasPlausiveis: doc.leiturasAlternativasPlausiveis, classificacaoDaDivergencia: doc.classificacaoDaDivergencia,
      sensibilidade: { descricao: "crédito de detecção de cada membro com a regra 'se aplica e foi violada' × 'não se aplica' (mesmo fato e vínculo da resposta final)", membrosQueCreditam: { seAplica, seNaoAplica }, total: membrosOut.length },
      respostasSha256: sha(lerTexto(rAbs)), membros: membrosOut });
  }
  if (erros.length) return vazio(erros);

  // Substituições (só com leitura resolvida) nos arquivos de respostas e nas sobrescritas.
  const arquivos = new Map(r.arquivos);
  for (const [rel, txt] of r.arquivos) {
    if (!/^respostas\/lote-\d{2}\.json$/.test(rel)) continue;
    const doc = JSON.parse(txt) as { juiz: string; respostas: Resposta[] } & Record<string, unknown>;
    const k = doc.respostas.filter(x => novas.has(x.id)).length;
    if (k) arquivos.set(rel, jsonTexto({ ...doc, juiz: `${doc.juiz} · segunda leitura E14 (${k})`, respostas: doc.respostas.map(x => novas.get(x.id) ?? x) }));
  }
  const sob: (Sobrescrita & { segundaLeitura?: unknown })[] = r.sobrescritas.map(s => {
    const sg = segundas.flatMap(x => x.membros as { id: string }[]).find(x => x.id === s.id);
    if (!sg) return s;
    const nova = novas.get(s.id);
    if (!nova) return { ...s, segundaLeitura: sg };
    const it = itens.get(s.id)!;
    const ctxLote = JSON.parse(r.arquivos.get(`lotes/${it.lote}.json`)!) as { cartoes: CartaoCego[]; referencias: Referencias };
    const c = ctxLote.cartoes.find(x => x.id === s.id)!;
    const d = resumoD(derivarClasse(nova, contextoDe(c, it, ctxLote.referencias[c.tela].defeitos.map(x => x.id))));
    return { ...s, depois: { resposta: nova, ...d }, mudouResposta: JSON.stringify(s.antes.resposta) !== JSON.stringify(nova), mudouClasse: s.antes.classe !== d.classe,
      mudouCredito: s.antes.credito !== d.credito || s.antes.fundamentacao !== d.fundamentacao, segundaLeitura: sg };
  });
  const porCampanhaBraco: Record<string, Record<string, { sobrescritos: number; mudouResposta: number; mudouClasse: number; mudouCredito: number }>> = {};
  for (const s of sob) {
    const it = itens.get(s.id)!;
    const x = ((porCampanhaBraco[it.campanha] ??= {})[it.braco] ??= { sobrescritos: 0, mudouResposta: 0, mudouClasse: 0, mudouCredito: 0 });
    x.sobrescritos++; if (s.mudouResposta) x.mudouResposta++; if (s.mudouClasse) x.mudouClasse++; if (s.mudouCredito) x.mudouCredito++;
  }
  const novoResumo = { ...resumo,
    totais: { ...resumo.totais, mudouResposta: sob.filter(s => s.mudouResposta).length, mudouClasse: sob.filter(s => s.mudouClasse).length, mudouCredito: sob.filter(s => s.mudouCredito).length,
      segundasLeituras: segundas.length, segundasLeiturasResolvidas: segundas.filter(x => x.resolvida).length, segundasLeiturasIndicadasNaoPreparadas: naoPreparadas.length },
    segundasLeiturasIndicadasNaoPreparadas: naoPreparadas,
    porCampanhaBraco: Object.fromEntries(Object.entries(porCampanhaBraco).sort().map(([c, b]) => [c, Object.fromEntries(Object.entries(b).sort())])),
    unidades: resumo.unidades.map(u => ({ ...u, segundaLeitura: segundas.find(x => x.lote === u.lote) ? { resolvida: segundas.find(x => x.lote === u.lote)!.resolvida } : null })),
    segundasLeituras: segundas, sobrescritas: ordenar(sob, s => s.id) };
  arquivos.set("desempate/sobrescritas.json", jsonTexto(novoResumo));
  let md = sobrescritasMd(novoResumo as never);
  md += "\n## Segunda leitura (regras §4)\n\n";
  for (const x of segundas) {
    const sens = x.sensibilidade as { membrosQueCreditam: { seAplica: number; seNaoAplica: number }; total: number };
    md += `- ${x.lote} (${x.grupo}): ${x.resolvida ? "resolvida — as respostas da segunda leitura substituem as da adjudicação" : `não resolvida — ${(x.leiturasAlternativasPlausiveis as string[]).length} leitura(s) alternativa(s) plausível(is); os membros ficam incerta (evidência indisponível)`}. ` +
      `Sensibilidade: creditam o defeito ${sens.membrosQueCreditam.seAplica}/${sens.total} se a regra se aplica; ${sens.membrosQueCreditam.seNaoAplica}/${sens.total} se não se aplica.\n`;
  }
  arquivos.set("desempate/sobrescritas.md", md);
  return { erros: [], arquivos, sobrescritas: novoResumo.sobrescritas, resumo: novoResumo };
}

// ───────────────────────────────────────────────────────────────── CLI

if (process.argv[1] && /(?:^|[\\/])e14-segunda-leitura\.ts$/.test(process.argv[1])) {
  const modo = process.argv[2];
  const fila = argumento("--fila") ?? FILA();
  const dd = argumento("--desempate");
  try {
    if (!dd) throw new Error("uso: e14-segunda-leitura preparar|aplicar --desempate PASTA/desempate …");
    if (modo === "preparar") {
      const i = process.argv.indexOf("--lote"), lote = i > 0 ? process.argv[i + 1] : null;
      if (!lote) throw new Error("uso: e14-segunda-leitura preparar --desempate PASTA/desempate --lote lote-dNN [--fila …]");
      const p = prepararSegunda({ fila, desempate: dd, lote });
      const sl = join(dd, "segunda-leitura");
      gravar(sl, `cegueira-${lote}.json`, p.arquivosInternos.get(`cegueira-${lote}.json`)!);
      if (p.falhas.length) { console.error(`CEGUEIRA FALHOU (${p.falhas.length}); nada mais gravado.`); for (const f of p.falhas.slice(0, 30)) console.error(`  ${f}`); process.exit(3); }
      if (existsSync(join(sl, "respostas", `${lote}-2.json`)))
        for (const [rel, t] of p.arquivosDoJuiz) { const abs = join(sl, rel); if (existsSync(abs) && readFileSync(abs, "utf8") !== t) { console.error(`PARADO: segunda-leitura/${rel} mudaria e já há resposta.`); process.exit(4); } }
      for (const [rel, t] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(sl, rel, t);
      console.log(`E14 segunda leitura preparar ok: ${join(sl, `${lote}-2.json`)}; cegueira OK (0 falhas). Dê ao leitor só ${lote}-2.json, LEIAME-segunda-leitura.md e esquema-segunda-leitura.schema.json.`);
    } else if (modo === "aplicar") {
      const saida = argumento("--saida");
      if (!saida) throw new Error("uso: e14-segunda-leitura aplicar --desempate PASTA/desempate --saida SAIDA [--fila …]");
      if (resolve(saida) === resolve(fila) || resolve(join(saida, "fila-t3")) === resolve(fila)) throw new Error("--saida não pode conter a fila de entrada");
      const r = aplicarComSegunda({ fila, desempate: dd });
      if (r.erros.length) { console.error(`RECUSADO (${r.erros.length}); nada gravado.`); for (const e of r.erros.slice(0, 60)) console.error(`  ${e}`); process.exit(1); }
      const destino = join(saida, "fila-t3");
      for (const [rel, t] of r.arquivos) gravar(destino, rel, t);
      const ing = ingerir(destino);
      if (ing.erros.length) { console.error("A ingestão recusou a saída:"); for (const e of ing.erros.slice(0, 40)) console.error(`  ${e}`); process.exit(1); }
      const t = (r.resumo as { totais: Record<string, number> }).totais;
      console.log(`E14 aplicar (+ segunda leitura) ok: ${t.sobrescritos} sobrescritos; classe mudou ${t.mudouClasse}, crédito ${t.mudouCredito}; segundas leituras ${t.segundasLeituras} (resolvidas ${t.segundasLeiturasResolvidas})`);
      console.log(`  próximo: npm run reanalise:nat74:e14-ingerir -- --saida ${saida}`);
    } else throw new Error("uso: e14-segunda-leitura preparar|aplicar …");
  } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
}
