/**
 * E14 passo 1 (plano NAT-74 §6.6): prepara a fila T3 para os juízes. Não julga nada.
 *
 *   npm run reanalise:nat74:e14-preparar -- [--saida PASTA_DO_DERIVADO]
 *
 * 1. extrai os 285 átomos T3 da trilha principal e confere contra filas-e6.json (diverge → para, código 2);
 * 2. monta a vista cega de cada átomo (máscara D-87 + rodada 2 da NAT-73), ordenada pelo hash;
 * 3. roda a verificação de cegueira sobre tudo o que o juiz recebe (falha → para, código 3, nada é gravado em lotes/);
 * 4. grava os lotes (~32 átomos), o LEIAME do juiz, o esquema, o manifesto, a chave (não cega) e o relato de cegueira.
 *
 * Determinístico: nenhum carimbo de tempo, nenhuma rede, nenhum modelo.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { NAT73, POLITICA_PRINCIPAL, gravar, jsonTexto, lerJson, posix, raizSaida, sha, unicos } from "./comum";
import { inventarioDeAtomos, type Inventario } from "./e1";
import { verificarCegueira, type Cegueira } from "./e14-cegueira";
import {
  ALVO_LOTE, E14_VERSAO, ESQUEMA_RESPOSTAS, FORMATO_LOTE, FORMATO_RESPOSTAS, NAO_PERGUNTADO, SEMENTE_T3, TETO_AUTORA, nomeLote,
  type CartaoCego, type ItemChave,
} from "./e14-comum";
import { cartaoCego, cartaoDoAtomo, extrairFila, fatosMedidos, normas, referencias, type Extracao } from "./e14-fila";

export interface Preparo {
  extracao: Extracao;
  cartoes: CartaoCego[];
  /** Conteúdo de cada arquivo entregue ao juiz, relativo a fila-t3/. */
  arquivosDoJuiz: Map<string, string>;
  /** Arquivos não entregues ao juiz (chave, cegueira, manifesto). */
  arquivosInternos: Map<string, string>;
  cegueira: Cegueira;
  lotes: { lote: string; ids: string[] }[];
}

/** Divide n itens em lotes contíguos de tamanho quase igual, com alvo ALVO_LOTE (25–35). */
export function tamanhosDosLotes(n: number, alvo = ALVO_LOTE): number[] {
  const k = Math.max(1, Math.round(n / alvo));
  const base = Math.floor(n / k), resto = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < resto ? 1 : 0));
}

/** Justificativas arquivadas e notas de juízes anteriores do átomo (para as janelas da verificação). */
function justificativasDe(ex: Extracao): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (chave: string, t: unknown) => { if (typeof t === "string" && t.trim()) out.set(chave, [...(out.get(chave) ?? []), t]); };
  for (const it of ex.itens) {
    const p = ex.inv.pares.find(x => x.campanha === it.campanha && x.par === it.par)!;
    add(it.chave, p.reviews.decisions.find(d => d.cardId === it.cardIdOriginal)?.rationale);
  }
  const porM = new Map(ex.itens.filter(i => i.mId).map(i => [i.mId!, i.chave]));
  const rev = lerJson<Record<string, Record<string, Record<string, unknown>>>>(join(NAT73, "equivalencia", "julgamentos-revisor-novo.json"));
  const notas = (id: string, v: unknown) => { const c = porM.get(id); if (!c || !v || typeof v !== "object") return;
    const x = v as { julgamento?: { nota?: string }[]; atomos?: { nota?: string }[]; motivoExcecao?: string };
    for (const a of [...(x.julgamento ?? []), ...(x.atomos ?? [])]) add(c, a.nota); add(c, x.motivoExcecao); };
  for (const [id, v] of Object.entries(rev.nivel1?.membros ?? {})) notas(id, v);
  for (const [id, v] of Object.entries(rev.nivel2?.representantes ?? {})) notas(id, v);
  for (const [id, v] of Object.entries(rev.nivel2?.membros ?? {})) notas(id, v);
  const sel = lerJson<{ amostra: { chave: string; campanha: string; par: string; cardId: string }[] }>(join(NAT73, "selecao-ratificacao.json")).amostra;
  for (const [s, v] of Object.entries(rev.nivel3 ?? {})) {
    const a = sel.find(x => x.chave === s);
    const it = a && ex.itens.find(i => i.campanha === a.campanha && i.par === a.par && i.cardIdOriginal === a.cardId);
    if (it) for (const x of (v as { atomos?: { nota?: string }[] }).atomos ?? []) add(it.chave, x.nota);
  }
  const casos = lerJson<{ casos: Record<string, { id: string }> }>(join(NAT73, "ratificacao", "chave", "revelacao.json")).casos;
  const jdir = join(NAT73, "ratificacao", "julgamentos");
  for (const f of readdirSync(jdir).filter(f => f.endsWith(".json")).sort()) {
    const j = lerJson<{ caso?: string; nota?: string; atomos?: { nota?: string }[] }>(join(jdir, f));
    const c = j.caso ? porM.get(casos[j.caso]?.id ?? "") : undefined;
    if (c) { add(c, j.nota); for (const a of j.atomos ?? []) add(c, a.nota); }
  }
  return out;
}

export function prepararFila(o: { raiz?: string; inv?: Inventario } = {}): Preparo {
  const raiz = o.raiz ?? raizSaida();
  const ex = extrairFila(raiz, o.inv ?? inventarioDeAtomos());
  if (ex.diferencas.length) throw Object.assign(new Error("E14: a fila T3 extraída não bate com filas-e6.json"), { codigo: 2, diferencas: ex.diferencas });
  const nr = normas();
  const refs = referencias(ex.inv.pares, nr.resolver);
  const fm = fatosMedidos();
  const cartoes = ex.itens.map(it => cartaoCego(it, cartaoDoAtomo(ex.inv, it.atomo), nr.resolver, fm.de(it.atomo), refs.porTela[it.tela].specs.map(s => s.id)));

  // Lotes contíguos na ordem do hash.
  const tamanhos = tamanhosDosLotes(cartoes.length);
  const lotes: { lote: string; ids: string[] }[] = [];
  let i = 0;
  tamanhos.forEach((t, k) => { lotes.push({ lote: nomeLote(k), ids: cartoes.slice(i, i + t).map(c => c.id) }); i += t; });
  const loteDe = new Map(lotes.flatMap(l => l.ids.map(id => [id, l.lote] as const)));
  for (const it of ex.itens) it.lote = loteDe.get(it.id)!;

  const leiame = leiameJuiz(cartoes.length, lotes.length);
  const esquema = jsonTexto(ESQUEMA_RESPOSTAS);
  const juiz = new Map<string, string>([["lotes/LEIAME-juiz.md", leiame], ["lotes/esquema-respostas.schema.json", esquema]]);
  const porId = new Map(cartoes.map(c => [c.id, c]));
  for (const l of lotes) {
    const cs = l.ids.map(id => porId.get(id)!);
    const telas = unicos(cs.map(c => c.tela)) as ("A" | "B")[];
    juiz.set(`lotes/${l.lote}.json`, jsonTexto({ formato: FORMATO_LOTE, lote: l.lote, politica: POLITICA_PRINCIPAL,
      instrucoes: { arquivo: "LEIAME-juiz.md", sha256: sha(leiame) }, esquema: { arquivo: "esquema-respostas.schema.json", sha256: sha(esquema) },
      respostaEm: `respostas/${l.lote}.json`, n: cs.length,
      referencias: Object.fromEntries(telas.map(t => [t, { nome: t === "A" ? "Tela A · Solicitar serviço" : "Tela B · Vistorias", versao: refs.porTela[t].versao, defeitos: refs.porTela[t].specs }])),
      cartoes: cs }));
  }

  // Cegueira sobre tudo o que o juiz recebe.
  const just = justificativasDe(ex);
  const cegueira = verificarCegueira({ arquivos: [...juiz].map(([rel, texto]) => ({ rel, texto })),
    cartoes: ex.itens.map((it, k) => ({ cartao: cartoes[k], card: cartaoDoAtomo(ex.inv, it.atomo), item: it, justificativas: just.get(it.chave) ?? [] })) });

  // Arquivos internos (não vão ao juiz).
  const chaveItens: ItemChave[] = ex.itens.map(({ linha: _l, atomo: _a, ...x }) => x);
  const sinaisPorBraco: Record<string, Record<string, { cartoes: number; comSinal: number; sinais: Record<string, number> }>> = {};
  ex.itens.forEach((it, k) => {
    const s = cegueira.porCartao[k];
    const x = ((sinaisPorBraco[it.campanha] ??= {})[it.braco] ??= { cartoes: 0, comSinal: 0, sinais: {} });
    x.cartoes++; if (s.sinais.length) x.comSinal++;
    for (const n of s.sinais) { const r = n.replace(/ \(.*\).*$/, ""); x.sinais[r] = (x.sinais[r] ?? 0) + 1; }
  });
  const fontes = { ...ex.fontes, ...nr.fontes, ...refs.fontes, ...fm.fontes };
  const internos = new Map<string, string>();
  internos.set("chave/fila-t3-chave.json", jsonTexto({ formato: "nat74-t3-chave-1.0.0", aviso: "NÃO entregar aos juízes: liga o id opaco ao átomo, ao braço, ao run e à campanha",
    versao: E14_VERSAO, ordem: { regra: "sha256(semente + chave do átomo), crescente; id = T3- + 10 primeiros hex", semente: SEMENTE_T3 },
    total: chaveItens.length, porCampanhaBraco: ex.porCampanhaBraco, porMotivo: ex.porMotivo,
    porTipo: chaveItens.reduce((m, x) => ({ ...m, [x.tipo]: (m[x.tipo] ?? 0) + 1 }), {} as Record<string, number>),
    sinaisResiduaisPorCampanhaBraco: sinaisPorBraco, itens: chaveItens }));
  const comSinal = cegueira.porCartao.filter(c => c.sinais.length).length;
  const contagemSinais: Record<string, number> = {};
  for (const c of cegueira.porCartao) for (const s of c.sinais) { const r = s.replace(/ \(.*\).*$/, ""); contagemSinais[r] = (contagemSinais[r] ?? 0) + 1; }
  internos.set("cegueira.json", jsonTexto({ formato: "nat74-t3-cegueira-1.0.0",
    regra: "porta de ratificacao/verificar-cegueira.mjs (NAT-73): FALHA nos padrões proibidos e valores exatos; RELATA os sinais que ainda denunciam o braço apesar da máscara (não corrigíveis, plano §10 risco 4)",
    resultado: cegueira.falhas.length ? "FALHOU" : "OK", falhas: cegueira.falhas, padroes: cegueira.padroes, janelasDeJustificativa: cegueira.janelas,
    resumo: { cartoes: cartoes.length, comSinalResidual: comSinal, porSinal: contagemSinais,
      retirados: { idsDeFerramenta: cegueira.porCartao.reduce((n, c) => n + c.retirados.idsDeFerramenta, 0),
        caminhosLocais: cegueira.porCartao.reduce((n, c) => n + c.retirados.caminhosLocais, 0), emagHifen: cegueira.porCartao.reduce((n, c) => n + c.retirados.emagHifen, 0),
        cartoesComNotasOuEscopoOmitidos: cegueira.porCartao.filter(c => c.retirados.notasEEscopo).length },
      coincidencias: cegueira.porCartao.filter(c => c.coincidencias.length).length },
    porCartao: cegueira.porCartao }));
  internos.set("lotes/manifesto.json", jsonTexto({ formato: "nat74-t3-manifesto-1.0.0", versao: E14_VERSAO, politica: POLITICA_PRINCIPAL,
    total: cartoes.length, alvoPorLote: ALVO_LOTE, tetoAutora: TETO_AUTORA,
    ordem: { regra: "sha256(semente + chave), crescente; lotes contíguos", semente: SEMENTE_T3 },
    arquivos: Object.fromEntries([...juiz].map(([rel, t]) => [rel, sha(t)])),
    lotes: lotes.map(l => ({ lote: l.lote, n: l.ids.length, sha256: sha(juiz.get(`lotes/${l.lote}.json`)!), ids: l.ids })),
    chaveSha256: sha(internos.get("chave/fila-t3-chave.json")!), fontes }));
  return { extracao: ex, cartoes, arquivosDoJuiz: juiz, arquivosInternos: internos, cegueira, lotes };
}

// ───────────────────────────────────────────────────────────────── LEIAME do juiz

export function leiameJuiz(total: number, nLotes: number): string {
  return `# Fila T3 — instruções do juiz (política normativa 1.2.0)

Este lote faz parte de uma fila de ${total} alegações, dividida em ${nLotes} lotes. Cada alegação ("cartão") afirma que
algo está errado numa tela de serviço público congelada (Tela A · Solicitar serviço, ou Tela B · Vistorias). Você
responde perguntas fechadas sobre cada cartão. **Você não escreve a classe final**: ela sai das suas respostas por regra
fixa (no fim deste texto). Responda **um** registro por cartão, só para os cartões do seu lote.

**Use só o lote.** Tudo o que se pode usar está nele: o texto do cartão, a norma citada, os defeitos da referência da
tela e os fatos já medidos na página congelada. Não procure outros arquivos, não abra páginas e não tente descobrir de
onde o cartão veio nem quem o escreveu: isso não entra no julgamento. Quando o lote não basta para responder, a resposta
certa é \`indeterminado\` / \`incerta\` / \`incerto\` / \`indisponivel\` — nunca um palpite "por precaução".

## O que cada cartão traz

- \`alegacao\`: o que o cartão diz. \`observado\` (o fato alegado), \`esperado\` (a sugestão de correção; pode faltar),
  \`regra\` (a regra citada; pode ser nula), \`seletor\`, \`estado\` (tamanho da janela e passos até o estado), \`cena\`,
  \`sinais\` (avisos da preparação), \`evidencias\` (ids \`E1\`, \`E2\`…) e \`sujeitos\` (ids \`S1\`, \`S2\`…: os elementos de que
  o cartão fala, com a chave CSS e o rótulo; até 12 — \`sujeitosNaoListados\` conta os demais, do mesmo cartão).
- \`normaCitada\`: o texto da norma que o cartão cita (WCAG 2.2, e-MAG, regra do axe-core com as etiquetas, ou regra da
  base do Design System). Ids de regra da base do DS aparecem como \`[regra citada]\`; o texto dela vem junto.
- \`candidatas\`: defeitos da referência que a ancoragem por elemento ofereceu para este cartão. É só uma pista: o vínculo
  pode ser a outro defeito da lista da tela, ou a nenhum.
- \`fatosMedidos\` (ids \`F1\`, \`F2\`…): medidas já feitas na página congelada. \`deste-caso\` = medida feita para esta mesma
  alegação; \`mesmo-elemento\` = medida sobre o mesmo elemento, que pode tratar de outro defeito. \`origemMedida\` diz quem
  escreveu o que viola (\`pagina\`, \`pagina-copiando-exemplo-ds\`, \`ds-entregue\`, \`indeterminada\`).
- \`vereditoRegistrado\` (id \`VR\`, só em alguns cartões): fato e norma já julgados. Nesses cartões só se pergunta a
  qualidade da sugestão.
- \`perguntas\`: o que responder neste cartão (abaixo).
- \`citaveis\`: os ids que a justificativa pode citar. Além dos já listados: \`OBS\` (texto observado), \`ESP\` (texto
  esperado), \`REGRA\` (a regra citada), \`NORMA\` (o texto da norma citada) e os ids dos defeitos da referência
  (\`A-01\`, \`B-05\`…, na seção \`referencias\` do lote).

## As perguntas

### \`fato\` → campo \`verdadeFactual\`
"O que o cartão observa é verdade no estado declarado?"
- \`verdadeira\`: o texto e as evidências do cartão, ou um fato medido, sustentam o fato.
- \`falsa\`: um fato medido no lote **contradiz** o cartão (contraevidência). Ausência de prova não é \`falsa\` (R1).
- \`indisponivel\`: não há base para decidir no estado declarado (estado que a receita não alcança, elemento ausente,
  medida impossível) (R9, R10).
- \`indeterminado\`: você não consegue decidir com o lote.

### \`norma\` → campo \`norma\` = \`{ id, forca, aplicabilidade, violada }\`
"Que norma o cartão invoca? Ela é obrigatória, aplica-se ao fato e foi violada?"
- \`id\`: se o cartão cita regra, sempre \`"citada"\` — é a regra citada que se julga, mesmo que outra norma
  coubesse melhor (R11, R15). Se o cartão não cita regra (\`regra: null\`): a norma pública que a alegação implica
  (\`wcag:x.y.z\` ou \`emag:x.y\`), ou \`"nenhuma"\` se ela não implica norma.
- \`forca\`: \`obrigatorio\` · \`recomendado\` · \`boa-pratica\` · \`exemplo\` · \`nenhuma\` (só com \`id: "nenhuma"\`) ·
  \`indeterminado\`. Regra do axe-core só com a etiqueta \`best-practice\` (sem etiqueta WCAG) é \`boa-pratica\`. Convenção
  do DS não é WCAG (R3); regra de *token* vale para estilo escrito pela página, não para o que o DS entrega (R4).
- \`aplicabilidade\`: \`aplica\` · \`nao-aplica\` · \`incerta\`. Ex.: WCAG 3.3.1 pressupõe erro **detectado**; aceitar um valor
  sem detectar nada não o viola (R11). "Sem nome" é refutado por nome calculado não vazio (R2).
- \`violada\`: \`sim\` · \`nao\` · \`incerto\`.

### \`vinculo\` → campo \`vinculo\`
"A alegação descreve o fato de um defeito da referência da tela (mesmo sujeito, mesmo estado, mesma evidência)?"
- \`{ "spec": "B-05", "relacao": "…" }\`: o id do defeito (qualquer um da lista \`referencias\` da tela, não só os
  candidatos) e a relação: \`direta\` (o sujeito é o elemento do defeito), \`ausencia-global\` (defeito de ausência na
  página inteira), \`host-interno\` (componente e seu controle interno), \`participante-relacionado\` (elemento ligado ao
  do defeito).
- \`"nenhum"\`: não descreve defeito algum da lista. \`"indeterminado"\`: não dá para decidir.
- Nunca pelo id da regra nem por semelhança de texto (R7): só pelo fato.

### \`sugestao\` → campo \`sugestao\` = \`{ trataOFato, especificaDoSujeito, naoViolaNormaObrigatoria, qualidade }\`
"A correção que o cartão propõe (\`esperado\`) é válida?" Obrigatória quando a pergunta é \`sugestao\`; quando é
\`sugestao-se-erro-normativo\`, obrigatória só se as suas respostas de fato e norma derem erro normativo (tabela abaixo);
nos outros casos use \`"${NAO_PERGUNTADO}"\` (ou responda, se quiser registrar).
- As três condições (\`sim\` · \`nao\` · \`incerto\`): (1) \`trataOFato\` — trata o fato verdadeiro registrado; (2)
  \`especificaDoSujeito\` — é específica deste sujeito, não o texto fixo de ajuda da regra; (3)
  \`naoViolaNormaObrigatoria\` — aplicada, não viola norma obrigatória.
- \`qualidade\`: \`valida\` (as três = \`sim\`) · \`generica\` (texto fixo de ajuda; condição 2 = \`nao\`) · \`invalida\` (alguma
  condição = \`nao\`) · \`ausente\` (o cartão não tem \`esperado\`) · \`indeterminada\` (alguma condição = \`incerto\`).
- Uma sugestão útil **não prova** que a violação alegada existia: ela não muda o fato nem a norma.

### Em todo cartão
- \`forcaDoVeredito\`: \`medido\` (um fato medido do lote decide) · \`inferido\` (decidido pelo texto e evidências do cartão) ·
  \`incerto\`.
- \`evidencias\`: lista não vazia de ids de \`citaveis\` em que a resposta se apoia.
- \`justificativa\`: 1 a 4 frases (mínimo 30 caracteres) que citam pelo menos um desses ids. Diga o que o id mostra.
- Campo não perguntado neste cartão: \`"${NAO_PERGUNTADO}"\`.

## Como a classe sai das respostas (para você saber o efeito; não escreva a classe)

| Respostas | Classe (política 1.2.0) |
|---|---|
| fato \`falsa\` | erro factual (R1) |
| fato \`indisponivel\` | evidência indisponível (pendente, R9) |
| fato \`indeterminado\`, ou força \`indeterminado\` | pendente |
| fato \`verdadeira\` + norma \`nenhuma\` (cartão sem regra citada) + vínculo a um defeito | credita a detecção do defeito, sem fundamentação (regra nula; Q1) |
| fato \`verdadeira\` + norma \`nenhuma\` sem vínculo | observação (R11b) |
| fato \`verdadeira\` + aplicabilidade \`incerta\` ou violada \`incerto\` | evidência indisponível (R13) |
| fato \`verdadeira\` + \`nao-aplica\` ou violada \`nao\` | erro normativo (R11a); com sugestão \`valida\`: observação com norma errada (R11d) |
| fato \`verdadeira\` + \`obrigatorio\` + \`aplica\` + violada \`sim\` | violação (com vínculo, credita o defeito: R7) |
| fato \`verdadeira\` + norma mais fraca (\`recomendado\`, \`boa-pratica\`, \`exemplo\`) + \`aplica\` + \`sim\` | com vínculo: credita a detecção do defeito, sem crédito de fundamentação (R15); sem vínculo: erro normativo (R13) |

A origem (página ou DS) de uma violação **não** é perguntada: vale a medida (\`fatosMedidos\`) e, sem medida, fica
"indeterminada (não medida)". Nos cartões com \`vereditoRegistrado\`, a classe é erro normativo, ou observação com norma
errada se a sugestão é \`valida\`.

## O arquivo de resposta

Grave \`respostas/lote-NN.json\` (o caminho está em \`respostaEm\` no lote) com exatamente um registro por cartão do lote,
na mesma ordem ou não, sem cartões a mais. O esquema é \`esquema-respostas.schema.json\`; a ingestão recusa o arquivo
inteiro se faltar um cartão, se um id se repetir, se aparecer id fora do lote, se um valor estiver fora das listas, se a
justificativa não citar um id ou se \`loteSha256\` não for o sha256 do lote recebido.

\`\`\`json
{
  "formato": "${FORMATO_RESPOSTAS}",
  "lote": "lote-01",
  "loteSha256": "<sha256 do arquivo lote-01.json, em hex minúsculo>",
  "juiz": "<quem julgou, ex.: assistente, subagente novo e cego>",
  "respostas": [
    {
      "id": "T3-0123456789",
      "verdadeFactual": "verdadeira",
      "norma": { "id": "citada", "forca": "obrigatorio", "aplicabilidade": "aplica", "violada": "sim" },
      "vinculo": { "spec": "B-05", "relacao": "direta" },
      "sugestao": "${NAO_PERGUNTADO}",
      "forcaDoVeredito": "inferido",
      "evidencias": ["OBS", "S1", "B-05"],
      "justificativa": "OBS e S1 mostram o mesmo campo sem rótulo que a B-05 descreve; a norma citada exige rótulo e não há nenhum."
    }
  ]
}
\`\`\`
`;
}

// ───────────────────────────────────────────────────────────────── CLI

if (process.argv[1] && /e14-preparar\.ts$/.test(process.argv[1])) {
  try {
    const raiz = raizSaida();
    const fila = join(raiz, "fila-t3");
    const p = prepararFila({ raiz });
    for (const [rel, t] of p.arquivosInternos) if (rel === "cegueira.json") gravar(fila, rel, t);
    if (p.cegueira.falhas.length) {
      console.error(`CEGUEIRA FALHOU (${p.cegueira.falhas.length}); nada gravado em lotes/. Ver fila-t3/cegueira.json`);
      for (const f of p.cegueira.falhas.slice(0, 30)) console.error(`  ${f.arquivo} ${f.cartao ?? ""}: ${f.regra} → ${f.trecho}`);
      process.exit(3);
    }
    // Lotes já respondidos não mudam em silêncio.
    const resp = join(fila, "respostas");
    if (existsSync(resp) && readdirSync(resp).some(f => f.endsWith(".json"))) {
      for (const [rel, t] of p.arquivosDoJuiz) { const abs = join(fila, rel); if (existsSync(abs) && readFileSync(abs, "utf8") !== t) {
        console.error(`PARADO: ${rel} mudaria, e já há respostas em respostas/. Versão nova da fila = pasta nova.`); process.exit(4); } }
    }
    for (const [rel, t] of [...p.arquivosDoJuiz, ...p.arquivosInternos]) gravar(fila, rel, t);
    const ex = p.extracao;
    console.log(`E14 preparar ok: ${p.cartoes.length} átomos T3 (= filas-e6), ${p.lotes.length} lotes (${p.lotes.map(l => l.ids.length).join(", ")})`);
    console.log(`  por campanha × braço: ${JSON.stringify(ex.porCampanhaBraco)}`);
    console.log(`  cegueira: OK; ${p.cegueira.porCartao.filter(c => c.sinais.length).length}/${p.cartoes.length} cartões com sinal residual (fila-t3/cegueira.json)`);
    console.log(`  gravado em ${posix(relative(process.cwd(), fila))}/ (chave/ NÃO vai aos juízes)`);
  } catch (e) {
    const x = e as { codigo?: number; diferencas?: string[] };
    console.error(e instanceof Error ? e.message : e);
    if (x.diferencas) for (const d of x.diferencas) console.error(`  ${d}`);
    process.exit(x.codigo ?? 1);
  }
}
