/**
 * Revisão §8, passo 4 (protocolo NAT-78 §8.4; plano de revisão 19/10, entrega 6): seleção de no máximo 10 cartões para a
 * autora julgar às cegas, pelos estratos da NAT-87 parte 2, com a semente da campanha — e a leitura das respostas dela,
 * que o recálculo consome no S4' (`recalculo-campanha.ts --ratificacoes`). Sem modelo, sem rede, determinístico.
 *
 *   npm run revisao:material-autora -- preparar --passada P [--passada …] --saida PASTA_NOVA
 *       [--analise DIR …] [--coleta coleta-trio.json …] [--origem PASTA_DA_ORIGEM …] [--teto 10|15] [--site DIR]
 *     → PASTA_NOVA/autora/{LEIAME.md, casos.md}            (o que a autora lê: cego, casos R-01…)
 *       PASTA_NOVA/chave/chave-autora.json                  (NÃO vai à autora: caso → cartão, braço, estrato, desfecho)
 *       PASTA_NOVA/selecao.{json,json.sha256,md}            (interno: estratos, cotas, repasses, "julgado só por LLM")
 *       PASTA_NOVA/cegueira.json, manifesto.json            (conferência e sha256 de todas as entradas e saídas)
 *
 *   npm run revisao:material-autora -- responder --material PASTA --texto RESPOSTAS.txt --saida PASTA_NOVA
 *     → PASTA_NOVA/{respostas-autora.json(+.sha256), texto-da-autora.txt}: as linhas "R-01: sim sim A-04 pagina" que ela
 *       mandou, conferidas contra o material (todo caso respondido, valores das listas fechadas, defeito da lista da tela).
 *
 * Estratos (§8.4, fixados antes; um cartão fica só no de MENOR número em que cabe):
 *   1. o veredito muda o D_fc de um trio em ≥ 1 — medido: para cada cartão vinculado ou creditado (política 1.2.0, origem
 *      medida aplicada), o veredito é invertido (crédito sai; vínculo sem crédito passa a creditar a spec do vínculo) e o
 *      D_fc do trio (ferramentas × com, desfecho primário por spec, D-102) é recalculado pelas funções do recálculo
 *      (`creditosDoTrio` + `contar`); |ΔD_fc| ≥ 1 → estrato 1;
 *   2. alegação julgada falsa (FP): veredito `false` na 1.2.0 (erro factual ou erro normativo);
 *   3. achado correto novo, fora da referência: violação de origem página/indeterminada sem crédito;
 *   4. origem DS (D-129): `violacao-ds` com a origem medida (sem `--origem`, vazio e dito);
 *   5. achado de linha de base (axe, validator não guiado, Stylelint): cartão de execução `lb-*`.
 * Cotas: teto 10 → 3/2/2/2/1; teto 15 → 5/3/3/2/2 ([ABERTO] do §8.4). Os estratos 2–5 são sorteados primeiro; a cota que
 * um deles não usa (vazio ou com menos cartões que a cota) passa ao estrato 1; o que o estrato 1 não usa fica sem uso e é
 * registrado. Dentro do estrato: ordem por sha256(semente | estrato | chave); com `com` e `ferramentas` presentes, alterna
 * entre os dois (o primeiro pela semente); depois o resto dos dois, depois os outros braços. Tudo o que não vai à autora
 * é rotulado "julgado só por LLM".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  FATO, FORMATO_CHAVE_AUTORA, FORMATO_RESPOSTAS_AUTORA, ORIGEM, VIOLA, desfechoDaAutora, desfechoDaPassada, lerTextoDaAutora,
  type CasoChave, type Desfecho,
} from "./autora-respostas";
import { TCC, jsonTexto, posix, sha } from "./comum";
import { prepararCampanha } from "./e14-campanha";
import { janelas } from "./e14-cegueira";
import { IMAGENS_VERSAO, capturarCasos, type Captura } from "./material-imagens";
import { loadSite } from "../measurement-surface";
import { createRequire } from "node:module";
import type { CartaoCego, CitacaoPorReferencia, Derivado, ItemChave } from "./e14-comum";
import {
  Entradas, RECALCULO_VERSAO, carregarCampanha, contar, creditosDoTrio, julgadosDoTrio, vereditoNaPolitica,
  type AnaliseLida, type CargaCampanha, type CartaoJulgado, type Comparacao,
} from "./recalculo-campanha";
import { cegueiraArquivos, gravarImutavel, lerArgs, type Passada } from "./revisao-campanha";

export const MATERIAL_VERSAO = "nat78-material-autora-1.1.0";
const PLAYWRIGHT_VERSAO = (() => { try { return (createRequire(import.meta.url)("playwright/package.json") as { version: string }).version; } catch { return "?"; } })();
export const FORMATO_SELECAO = "nat78-material-autora-selecao-1.0.0";
export const COTAS: Readonly<Record<number, readonly number[]>> = { 10: [3, 2, 2, 2, 1], 15: [5, 3, 3, 2, 2] };
export const ESTRATOS: readonly { n: number; nome: string }[] = [
  { n: 1, nome: "o veredito muda o D_fc de um trio em ≥ 1" },
  { n: 2, nome: "alegação julgada falsa (FP)" },
  { n: 3, nome: "achado correto novo, fora da referência" },
  { n: 4, nome: "origem DS (defeito atribuído ao DS, D-129)" },
  { n: 5, nome: "achado de linha de base (axe, validator não guiado, Stylelint)" },
];
export const ROTULO_SO_LLM = "julgado só por LLM";
export const nomeCaso = (i: number): string => `R-${String(i + 1).padStart(2, "0")}`;
const CLASSES_VIOLACAO_PAGINA = new Set(["violacao-pagina", "violacao-origem-indeterminada"]);

// ───────────────────────────────────────────────────────────────── estrato 1: efeito do veredito no D_fc

export interface EfeitoDfc { id: string; trio: string; braco: string; inversao: "tira-credito" | "da-credito"; spec: string; dBase: number; dInvertido: number; delta: number }

/**
 * Para cada cartão vinculado ou creditado do trio, o D da comparação com o veredito invertido. Usa as funções do recálculo
 * (`creditosDoTrio`: decisão do scorer por unidade; `contar`: desfecho primário por spec), nunca uma contagem própria.
 */
export function efeitosNoD(a: AnaliseLida, julgados: CartaoJulgado[], carga: Pick<CargaCampanha, "regra" | "bracos">, comp: Comparacao): { efeitos: EfeitoDfc[]; dBase: number | null; motivo: string | null } {
  const specDe = new Map(a.pkg.units.map(u => [u.id, u.specId]));
  const cnt = contar(carga.regra, "primario", u => specDe.get(u));
  const [x, y] = comp.arms;
  const op = { politica: "1.2.0" as const, reviewer: `${RECALCULO_VERSAO} · ${a.passada.nome} · ${MATERIAL_VERSAO}`, fonte: `${a.passada.nome}/julgamentos.json sha256:${a.passada.julgSha}`, bracos: carga.bracos };
  const dDe = (js: CartaoJulgado[], removidos?: ReadonlySet<string>): number | null => {
    const cr = creditosDoTrio(a.pkg, js, { ...op, removidos }).porBraco;
    return cr[x] && cr[y] ? cnt(cr[y].confirmadas) - cnt(cr[x].confirmadas) : null;
  };
  const dBase = dDe(julgados);
  if (dBase === null) return { efeitos: [], dBase: null, motivo: `trio ${a.coleta.trio} sem os dois braços de ${comp.id}` };
  const efeitos: EfeitoDfc[] = [];
  for (const j of julgados) {
    if (!comp.arms.includes(j.braco) || j.derivado.classe === "pendente") continue;
    const credita = vereditoNaPolitica(j.derivado, "1.2.0").veredito === "reference";
    const vinc = typeof j.resposta.vinculo === "object" ? j.resposta.vinculo.spec : null;
    if (!credita && !vinc) continue;
    let d: number | null, spec: string;
    if (credita) { spec = j.derivado.spec!; d = dDe(julgados, new Set([j.id])); }
    else {
      spec = j.derivado.spec ?? vinc!;
      const dado: Derivado = { ...j.derivado, classe: "violacao-pagina", spec, fundamentacao: "norma" };
      d = dDe(julgados.map(k => (k.id === j.id ? { ...k, derivado: dado } : k)));
    }
    efeitos.push({ id: j.id, trio: a.coleta.trio, braco: j.braco, inversao: credita ? "tira-credito" : "da-credito", spec, dBase, dInvertido: d!, delta: d! - dBase });
  }
  return { efeitos, dBase, motivo: null };
}

// ───────────────────────────────────────────────────────────────── estratos e sorteio (parte pura)

export interface Candidato { id: string; chave: string; braco: string; trio: string; classe: string; estrato: number | null; motivo: string }

/** Estrato de um cartão pela precedência 1 → 5 (o menor em que cabe), com o motivo. */
export function estratoDe(x: { braco: string; derivado: Pick<Derivado, "classe" | "spec" | "fundamentacao">; efeito: EfeitoDfc | null }): { estrato: number | null; motivo: string } {
  if (x.efeito && Math.abs(x.efeito.delta) >= 1) return { estrato: 1, motivo: `${x.efeito.inversao === "tira-credito" ? "sem o crédito" : "creditando"} ${x.efeito.spec}, D_fc ${x.efeito.dBase} → ${x.efeito.dInvertido}` };
  const v = vereditoNaPolitica(x.derivado, "1.2.0").veredito;
  if (v === "false") return { estrato: 2, motivo: `${x.derivado.classe} (veredito falso na 1.2.0)` };
  if (v === "novel" && CLASSES_VIOLACAO_PAGINA.has(x.derivado.classe)) return { estrato: 3, motivo: `${x.derivado.classe} sem crédito (fora da referência)` };
  if (x.derivado.classe === "violacao-ds") return { estrato: 4, motivo: "violacao-ds (origem medida ds-entregue)" };
  if (x.braco.startsWith("lb-")) return { estrato: 5, motivo: `linha de base ${x.braco}` };
  return { estrato: null, motivo: x.efeito ? `vinculado/creditado sem efeito no D_fc (Δ ${x.efeito.delta})` : `${x.derivado.classe}: fora dos estratos` };
}

export interface EstratoSel { n: number; nome: string; cota: number; cotaEfetiva: number; candidatos: number; porBraco: Record<string, number>;
  selecionados: string[]; repassadoAo1: number; recebido: number; semUso: number; inicio: string | null }
export interface Selecao { teto: number; cotas: number[]; semente: string; balanceamento: [string, string]; estratos: EstratoSel[]; selecionados: string[]; semUso: number }

const ordemNoEstrato = (semente: string, n: number, chave: string) => sha(`${semente}|material-autora|e${n}|${chave}`);

/** Ordem de sorteio de um estrato: alterna os dois braços da comparação primária (o primeiro pela semente), depois o resto. */
export function ordemDoEstrato(cs: Candidato[], n: number, semente: string, par: [string, string]): { ordem: Candidato[]; inicio: string | null } {
  const ord = [...cs].sort((a, b) => (ordemNoEstrato(semente, n, a.chave) < ordemNoEstrato(semente, n, b.chave) ? -1 : 1));
  const A = ord.filter(c => c.braco === par[0]), B = ord.filter(c => c.braco === par[1]), resto = ord.filter(c => !par.includes(c.braco));
  if (!A.length || !B.length) return { ordem: [...A, ...B, ...resto].sort((a, b) => (par.includes(a.braco) ? 0 : 1) - (par.includes(b.braco) ? 0 : 1) || (ordemNoEstrato(semente, n, a.chave) < ordemNoEstrato(semente, n, b.chave) ? -1 : 1)), inicio: null };
  const primeiro = parseInt(sha(`${semente}|material-autora|inicio|e${n}`).slice(0, 1), 16) % 2 === 0 ? 0 : 1;
  const filas = primeiro === 0 ? [A, B] : [B, A];
  const alternada: Candidato[] = [];
  for (let i = 0; i < Math.max(A.length, B.length); i++) for (const f of filas) if (f[i]) alternada.push(f[i]);
  return { ordem: [...alternada, ...resto], inicio: par[primeiro] };
}

/** Sorteio por estratos com as cotas; estratos 2–5 primeiro, o não usado vai ao estrato 1, o que o 1 não usa fica sem uso. */
export function selecionar(cands: Candidato[], o: { teto: number; semente: string; par: [string, string] }): Selecao {
  const cotas = COTAS[o.teto];
  if (!cotas) throw new Error(`teto ${o.teto} sem cotas pré-registradas (só ${Object.keys(COTAS).join(" ou ")})`);
  const est: EstratoSel[] = ESTRATOS.map((e, k) => {
    const cs = cands.filter(c => c.estrato === e.n);
    const porBraco: Record<string, number> = {};
    for (const c of cs) porBraco[c.braco] = (porBraco[c.braco] ?? 0) + 1;
    return { n: e.n, nome: e.nome, cota: cotas[k], cotaEfetiva: cotas[k], candidatos: cs.length, porBraco: Object.fromEntries(Object.entries(porBraco).sort()),
      selecionados: [], repassadoAo1: 0, recebido: 0, semUso: 0, inicio: null };
  });
  const sortear = (e: EstratoSel, q: number) => {
    const { ordem, inicio } = ordemDoEstrato(cands.filter(c => c.estrato === e.n), e.n, o.semente, o.par);
    e.selecionados = ordem.slice(0, q).map(c => c.id); e.inicio = inicio;
  };
  for (const e of est.slice(1)) { sortear(e, e.cota); e.repassadoAo1 = e.cota - e.selecionados.length; }
  const e1 = est[0];
  e1.recebido = est.slice(1).reduce((s, e) => s + e.repassadoAo1, 0);
  e1.cotaEfetiva = e1.cota + e1.recebido;
  sortear(e1, e1.cotaEfetiva);
  e1.semUso = e1.cotaEfetiva - e1.selecionados.length;
  const selecionados = est.flatMap(e => e.selecionados);
  if (selecionados.length > o.teto) throw new Error("seleção acima do teto (erro interno)");
  return { teto: o.teto, cotas: [...cotas], semente: o.semente, balanceamento: o.par, estratos: est, selecionados, semUso: e1.semUso };
}

// ───────────────────────────────────────────────────────────────── material cego (o que a autora lê)

const esc = (t: string | null | undefined): string => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\s+/g, " ").trim();
const cod = (t: string | null | undefined): string => `\`${String(t ?? "").replace(/`/g, "'").replace(/\s+/g, " ").trim()}\``;
type Defeito = { id: string; estado: string; unidades: number; descricao: string };
export interface Tela { nome: string; versao: string; endereco: string; defeitos: Defeito[] }

/** Uma seção do `casos.md`: o cartão cego (máscara 1.3.0), sem braço, sem decisão da passada, sem estrato. */
/**
 * Descrição do defeito para a autora: tira, mecanicamente, só o jargão interno da construção da referência — o prefixo
 * "Estrato X · variante y ·", a frase "Sem predicado na referência…" e os caminhos de arquivo ("medido em tela-a/….mjs").
 * O resto da descrição fica como o juiz leu.
 */
export function descricaoParaAutora(t: string): string {
  return t.replace(/^Estrato [^·]+·\s*variante [^·.]+(?:·\s*|\.\s*)/, "")
    .replace(/(?:^|\s)Sem predicado na refer[eê]ncia(?:[^.]|\.(?=\S))*\.(?=\s|$)/g, "")
    .replace(/[;,—–-]?\s*(?:está\s+)?medid[oa]s? em [\w./-]+\.(?:mjs|md|js|ts)\b\.?/g, "")
    .replace(/\s+/g, " ").trim();
}

export interface CapturaMd { passos: string[]; medida: string[]; alcancou: boolean; recorte: boolean; viewport: { width: number; height: number } }

function capturaMd(caso: string, k: CapturaMd): string[] {
  const L = [`**Na página congelada, depois desses passos** (refeitos automaticamente, como estão escritos, em janela ${k.viewport.width}×${k.viewport.height}):`];
  for (const p of k.passos) L.push(`- ${esc(p)}`);
  if (!k.alcancou) L.push("", "**Atenção: refeitos como estão escritos, os passos não chegam ao estado que o cartão descreve** (ver acima). As imagens e a medida são do estado a que eles chegam.");
  L.push("");
  if (k.recorte) L.push(`![${caso}: recorte em volta dos elementos do cartão (contorno rosa)](img/${caso}-recorte.png)`, "");
  L.push(`![${caso}: a tela inteira depois dos passos, elementos do cartão contornados em rosa](img/${caso}-tela.png)`, "",
    `[a mesma tela sem o contorno](img/${caso}-tela-sem-marca.png)`, "", "**Medido** (não é julgamento):");
  for (const m of k.medida) L.push(`- ${esc(m)}`);
  L.push("");
  return L;
}

export function casoMd(caso: string, c: CartaoCego, tela: Tela, k: CapturaMd | null = null): string {
  const a = c.alegacao, L: string[] = [`## ${caso}`, ""];
  L.push(`**O que o cartão diz que acontece:** ${esc(a.observado) || "(o cartão não descreve)"}`, "");
  L.push(`**Correção que o cartão sugere:** ${esc(a.esperado) || "(o cartão não sugere correção)"}`, "");
  const n = c.normaCitada;
  if (!n) L.push("**Regra citada:** nenhuma (o cartão não cita regra; julgue pela norma pública que o fato implicaria, se houver).", "");
  else {
    L.push(`**Regra citada:** ${esc([n.fonte, n.id && n.id !== "[regra citada]" ? n.id : null, n.titulo, n.nivel ? `nível ${n.nivel}` : null].filter(Boolean).join(" · "))}`);
    if (n.texto) L.push(`> ${esc(n.texto)}`);
    for (const r of n.regrasDaBase ?? []) L.push(`> ${esc(r.texto)} *(força declarada na base: ${esc(r.forcaDeclarada)})*`);
    if (n.etiquetas?.length) L.push(`> etiquetas: ${esc(n.etiquetas.join(", "))}`);
    L.push("");
  }
  // [D-156] Cartão com referências: as outras normas que o cartão cita para o mesmo fato (valem só se a citada não valer).
  if (c.referencias?.length) {
    L.push("**Outras normas que o cartão cita para o mesmo fato** (só contam se a regra citada não valer para ele):");
    for (const r of c.referencias) {
      const nv = r.norma;
      L.push(`- ${r.id}: ${esc([nv?.fonte, r.regra, nv?.titulo, nv?.nivel ? `nível ${nv.nivel}` : null].filter(Boolean).join(" · ") || "(sem texto na base)")}`);
      if (nv?.texto) L.push(`  > ${esc(nv.texto)}`);
    }
    L.push("");
  }
  L.push("**Onde:**");
  for (const s of a.sujeitos) L.push(`- ${cod(s.rotulo)}${s.chave ? ` — seletor ${cod(s.chave)}` : ""}`);
  if (a.sujeitosNaoListados) L.push(`- (mais ${a.sujeitosNaoListados} elemento(s) do mesmo cartão, não listados)`);
  if (a.seletor) L.push(`- seletor escrito no cartão: ${cod(a.seletor)}`);
  L.push("");
  const vp = a.estado.viewport;
  L.push(`**Como chegar ao estado** (janela ${vp ? `${vp.width}×${vp.height}` : "não declarada"}):`);
  if (a.estado.passos.length) a.estado.passos.forEach((p, i) => L.push(`${i + 1}. ${esc(p)}`));
  else L.push("1. abrir a página (estado inicial)");
  L.push("");
  if (k) L.push(...capturaMd(caso, k));
  if (a.evidencias.length) { L.push("**Evidências que o cartão traz:**"); for (const e of a.evidencias) L.push(`- ${esc(e.ref)}`); L.push(""); }
  if (c.fatosMedidos.length) { L.push("**Já medido na página congelada:**"); for (const f of c.fatosMedidos) L.push(`- ${esc(f.descricao)}`); L.push(""); }
  if (a.sinais.length) L.push(`*Avisos da preparação do cartão: ${esc(a.sinais.join(", "))}.*`, "");
  const cand = c.candidatas.map(id => tela.defeitos.find(d => d.id === id)).filter((d): d is Defeito => !!d);
  if (cand.length) {
    L.push("**Defeitos da lista que parecem próximos** (só uma pista; pode ser outro da lista, ou nenhum):");
    for (const d of cand) L.push(`- **${d.id}** — ${esc(descricaoParaAutora(d.descricao))}`);
    L.push("");
  }
  L.push("**Sua resposta** (copie a linha e complete):", "", "```", `${caso}: fato  descumpre  defeito  quem-escreveu`, "```", "");
  return L.join("\n");
}

export function casosMd(casos: { caso: string; cartao: CartaoCego }[], tela: Tela, capturas: ReadonlyMap<string, CapturaMd> | null = null): string {
  const L = [`# Casos para julgar — ${esc(tela.nome)}`, "",
    `${casos.length} casos. Leia antes o [LEIAME](LEIAME.md) (5 min). Cada caso leva uns 3 a 4 minutos.`, "",
    "Responda num comentário do Linear com uma linha por caso (modelo no fim desta página).", ""];
  for (const c of casos) L.push(casoMd(c.caso, c.cartao, tela, capturas?.get(c.caso) ?? null), "---", "");
  L.push("## Lista de defeitos da tela", "", "Use o id (ex.: `" + (tela.defeitos[0]?.id ?? "A-01") + "`) na 3ª resposta.", "");
  for (const d of tela.defeitos) L.push(`- **${d.id}** (estado: ${esc(d.estado)}) — ${esc(descricaoParaAutora(d.descricao))}`);
  L.push("", "## Modelo para copiar no comentário", "", "```", ...casos.map(c => `${c.caso}: `), "```", "");
  return L.join("\n");
}

/** [D-156] Pergunta 2 quando algum caso traz outras normas (referências): a mesma pergunta de resgate do juiz. */
const DESCUMPRE_REFERENCIAS = `
   Se o caso lista **outras normas que o cartão cita para o mesmo fato** e a regra citada não vale para ele, responda
   \`sim\` quando uma dessas outras normas vale para o elemento e foi descumprida (o fato continua o mesmo: elas não mudam o
   fato nem o defeito).`;

export function leiameAutora(o: { n: number; tela: Tela; servir: string | null; imagens?: boolean; referencias?: boolean }): string {
  const ex = o.tela.defeitos[0]?.id ?? "A-01";
  return `# Julgamento cego da autora — como responder

**O que é.** São ${o.n} cartões (alegações de defeito) escolhidos por sorteio, entre os que um juiz automático já decidiu
nesta coleta. Você julga cada um **sem saber de qual execução ele veio nem o que o juiz decidiu**. Depois, um script
compara a sua resposta com a do juiz: onde vocês concordam, a decisão passa a ser "ratificada pela autora"; onde
discordam, nada é sobrescrito, só fica registrado. Isso é revisão da pesquisadora, não validação por especialista
independente (protocolo NAT-78 §8.4).

**Tempo.** Uns 3 a 4 minutos por caso, uns 45 minutos no total. Pode parar e voltar: responda só os que der e marque o
resto com \`nao-sei\`.

**O que abrir.** Só esta pasta \`autora/\`: este LEIAME e o [casos.md](casos.md). **Não abra** \`chave/\`, \`selecao.*\`,
\`manifesto.json\` nem \`cegueira.json\`, na pasta de cima: eles dizem de onde cada caso veio.

## Como é cada caso

Cada caso (\`R-01\`, \`R-02\`…) traz o que o cartão diz que acontece, a correção que ele sugere, a regra que ele cita (o
texto da regra vem junto; o nome interno de regra do Design System aparece como "[regra citada]"), os elementos de que
ele fala, os passos até o estado em que o defeito apareceria e as evidências que o próprio cartão traz. No fim do
arquivo está a lista de defeitos da tela (${o.tela.defeitos.length} itens).

A página é a ${esc(o.tela.nome)} congelada (\`${o.tela.endereco}\`). ${o.servir
    ? `No computador, para conferir na própria página: \`${o.servir}\` e abra \`http://127.0.0.1:3300${o.tela.endereco}\` numa janela de 1280×900.`
    : "No computador, ela é servida pelo `e14-campanha.ts --servir <pasta do site>` em `http://127.0.0.1:3300`."}
${o.imagens ? "Cada caso já traz a página fotografada depois dos passos do cartão (refeitos automaticamente, como estão escritos), com os elementos do cartão contornados em rosa, um recorte em volta deles e uma linha **medida**: onde está o foco e os valores que o cartão cita. Se os passos não chegam ao estado que o cartão descreve, o caso diz isso. A medida não é julgamento: julgar é com você.\n" : "Pelo celular, julgue pelo texto do caso. "}Se não der para decidir, responda \`nao-sei\`.

## As 4 perguntas (sempre nesta ordem; pare quando a resposta disser para parar)

1. **fato** — O que o cartão diz que acontece acontece mesmo, no estado descrito?
   \`${FATO.join("` · `")}\`. Se \`nao\` ou \`nao-sei\`, **pare aqui**.
2. **descumpre** — Isso descumpre a regra citada (ela vale para esse elemento e foi descumprida)? Se o cartão não cita
   regra: descumpre uma norma pública (WCAG, e-MAG)? Recomendação conta como \`sim\`; regra que só *permite* algo, não.
   \`${VIOLA.join("` · `")}\`. Se \`nao\` ou \`nao-sei\`, **pare aqui**.${o.referencias ? DESCUMPRE_REFERENCIAS : ""}
3. **defeito** — É qual defeito da lista da tela (mesmo elemento, mesmo estado, mesmo fato)? O id (\`${ex}\`…), ou
   \`nenhum\` (defeito real que não está na lista), ou \`nao-sei\`.
4. **quem-escreveu** — O que está errado foi escrito pela página ou veio pronto do Design System (o componente ou o CSS
   do DS, sem a página mexer)? \`${ORIGEM.join("` · `")}\`.

## Como mandar

Uma linha por caso, num comentário do Linear (ou num arquivo de texto). Acentos, maiúsculas e vírgulas não importam;
"não sei" pode ir com espaço. Tudo depois de \`#\` é nota sua (opcional).

\`\`\`
R-01: sim sim ${ex} pagina
R-02: nao
R-03: sim nao
R-04: sim sim nenhum ds   # nota opcional
R-05: nao sei
\`\`\`

Depois, o assistente grava as suas linhas com \`npm run revisao:material-autora -- responder\` (que recusa caso faltando
ou valor fora das listas e diz qual) e o recálculo lê esse arquivo no S4'.
`;
}

/**
 * Cegueira do material da autora: a porta da NAT-73 com os braços do desenho (`cegueiraArquivos`), por passada, sobre os
 * arquivos da autora (padrões proibidos, ids exatos, ids da passada, texto que separa com de ferramentas). As janelas de
 * justificativa vão à parte: num .md o cartão inteiro está no texto, e a exceção "citação do próprio cartão / da lista de
 * defeitos" que o verificador só aplica a lotes .json é aplicada aqui contra o mesmo material público. Também nada de
 * estrato nem de decisão no texto.
 */
export function cegueiraDoMaterial(o: { autora: [string, string][]; casos: { caso: string; id: string; cartao: CartaoCego }[]; passadas: Passada[]; passadaDe: Map<string, Passada>;
  publicos: string[]; lerTexto: (abs: string) => string }): { formato: string; resultado: "OK" | "FALHOU"; falhas: unknown[]; nota: string; residuoPorBraco: Record<string, Record<string, number>>; porCartao: unknown[] } {
  const { autora, casos, passadaDe } = o;
  const proibidos = o.passadas.flatMap(p => [...p.item.keys()]);
  const falhas: unknown[] = [], porCartao: unknown[] = [], residuo: Record<string, Record<string, number>> = {};
  const justs: string[] = [];
  const lido = (t: string) => t.replace(/\\"/g, '"').replace(/\s+/g, " ").toLowerCase();
  let publicoTxt = o.publicos.join("");
  for (const p of o.passadas) {
    for (const [, j] of p.julgados) justs.push(j.resposta.justificativa);
    const prim = join(p.dir, "julgamentos-1a-passada.json");
    if (existsSync(prim)) for (const j of (JSON.parse(o.lerTexto(prim)) as { julgamentos: { resposta: { justificativa: string } }[] }).julgamentos) justs.push(j.resposta.justificativa);
    publicoTxt += JSON.stringify([...p.cartao.values()]) + p.leiameJuiz + JSON.stringify(p.referencias);
    const novos = new Map(casos.filter(c => passadaDe.get(c.id) === p).map(c => [c.id, c.cartao]));
    if (!novos.size) continue;
    const c = cegueiraArquivos({ p, arquivos: autora.map(([rel, texto]) => ({ rel, texto })), novos, proibidos, justificativas: new Map(), informado: true });
    falhas.push(...c.falhas); porCartao.push(...c.porCartao);
    for (const [b, x] of Object.entries(c.residuoPorBraco)) { const r = (residuo[b] ??= {}); for (const [k, v] of Object.entries(x)) r[k] = (r[k] ?? 0) + v; }
  }
  const pub = lido(publicoTxt);
  const plano = (t: string) => lido(t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/[`*]/g, ""));
  for (const [rel, t] of autora) {
    const n = plano(t);
    const w = justs.flatMap(j => janelas(j)).find(x => n.includes(x) && !pub.includes(x));
    if (w) falhas.push({ arquivo: rel, cartao: null, regra: "trecho de justificativa da passada (fora do material público)", trecho: w });
  }
  for (const [rel, t] of autora) for (const pal of [/\bestrato [1-5]\b/i, /julgado só por LLM/i, /\bcredita\b/i, /violacao-|erro-factual|erro-normativo/]) if (pal.test(t)) falhas.push({ arquivo: rel, cartao: null, regra: "estrato ou decisão no material da autora", trecho: String(pal) });
  return { formato: "nat78-material-autora-cegueira-1.0.0", resultado: falhas.length ? "FALHOU" : "OK", falhas,
    nota: "cegueiraArquivos (porta da NAT-73 com os braços do desenho) sobre autora/*.md; janelas de justificativa contra o material público; sinal residual de braço contado por braço (não é falha; vai ao S4')", residuoPorBraco: residuo, porCartao };
}

// ───────────────────────────────────────────────────────────────── preparar

export interface OpcoesMaterial { passadas: string[]; analises?: string[]; coletas?: string[]; origens?: string[]; teto?: number; site?: string | null; validador?: string }
export interface Material { arquivos: [string, string | Buffer][]; selecao: Record<string, unknown>; cegueira: { resultado: string; falhas: unknown[] }; resumo: string[];
  /** A mesma conferência de cegueira sobre outros textos da autora (teste de vazamento). */
  conferir: (autora: [string, string][], nomesDeImagens?: string[]) => { resultado: string; falhas: unknown[] } }

export async function prepararMaterial(o: OpcoesMaterial): Promise<Material> {
  const teto = o.teto ?? 10;
  if (!COTAS[teto]) throw new Error(`--teto ${teto}: só ${Object.keys(COTAS).join(" ou ")} (cotas pré-registradas no §8.4)`);
  const E = new Entradas();
  const carga = carregarCampanha({ passadas: o.passadas, analises: o.analises, coletas: o.coletas, origens: o.origens }, E);
  for (const p of carga.passadas) { E.arvore(join(p.dir, "lotes")); E.arvore(join(p.dir, "chave")); for (const f of ["julgamentos.json", "julgamentos.json.sha256"]) E.texto(join(p.dir, f)); }
  const comp = carga.comps.find(c => c.role === "primary") ?? carga.comps[0];
  const par = comp.arms as [string, string];
  const semente = carga.camp.design.seed !== null && carga.camp.design.seed !== undefined ? `campanha.design.seed=${carga.camp.design.seed}` : `sem-semente-declarada|${carga.camp.campaignId}`;
  // Estrato 1 (efeito medido) e estratos de todo cartão.
  const efeitos = new Map<string, EfeitoDfc>();
  const trioDe = new Map<string, string>(), avisos: string[] = [];
  const dBase: Record<string, number | null> = {};
  for (const a of carga.analises) {
    const js = julgadosDoTrio(a, carga.derivadoNa);
    for (const j of js) trioDe.set(j.id, a.coleta.trio);
    const r = efeitosNoD(a, js, carga, comp);
    dBase[a.coleta.trio] = r.dBase;
    if (r.motivo) avisos.push(r.motivo);
    for (const e of r.efeitos) efeitos.set(e.id, e);
  }
  const passadaDe = new Map<string, Passada>();
  const cands: Candidato[] = [];
  for (const p of carga.passadas) for (const it of p.itens) {
    passadaDe.set(it.id, p);
    const d = carga.derivadoNa(p, it.id);
    const e = estratoDe({ braco: it.braco, derivado: d, efeito: efeitos.get(it.id) ?? null });
    cands.push({ id: it.id, chave: it.chave, braco: it.braco, trio: trioDe.get(it.id) ?? "?", classe: d.classe, ...e });
  }
  const sel = selecionar(cands, { teto, semente, par });
  const temOrigem = !!o.origens?.length;
  if (!temOrigem) avisos.push("sem --origem: o estrato 4 (origem DS) fica vazio por falta de medida, não por ausência de defeito do DS");
  // Cartões cegos com a máscara 1.3.0 (entrega 2), regenerados das análises pelo mesmo preparo da passada cega.
  // [D-156] Mesmo formato da passada (cartões com referências só se ela é 1.3.0): o cartão regenerado é o do lote.
  if (carga.passadas.some(p => p.v13) && carga.passadas.some(p => !p.v13)) throw new Error("material sobre passadas 1.3.0 e 1.2.0 misturadas");
  const prep = prepararCampanha(carga.analises.map(a => a.dir), { validador: o.validador, politica: carga.passadas.some(p => p.v13) ? "1.3.0" : "1.2.0" });
  const chaveReg = JSON.parse(prep.arquivosInternos.get("chave/fila-t3-chave.json")!) as { itens: ItemChave[] };
  const cegoDe = new Map<string, CartaoCego>();
  for (const [rel, t] of prep.arquivosDoJuiz) if (/^lotes\/lote-\d+\.json$/.test(rel)) for (const c of (JSON.parse(t) as { cartoes: CartaoCego[] }).cartoes) cegoDe.set(c.id, c);
  const telaDe = new Map<string, Tela>();
  for (const [rel, t] of prep.arquivosDoJuiz) if (/^lotes\/lote-\d+\.json$/.test(rel)) for (const [k, v] of Object.entries((JSON.parse(t) as { referencias: Record<string, Tela> }).referencias)) telaDe.set(k, v);
  for (const id of sel.selecionados) {
    const p = passadaDe.get(id)!, it = p.item.get(id)!, reg = chaveReg.itens.find(x => x.id === id);
    if (!reg || reg.chave !== it.chave || reg.cardSha256 !== it.cardSha256) throw new Error(`${id}: o preparo 1.3.0 das análises não reproduz o cartão da passada (chave/cardSha256)`);
    if (p.mascara13 && JSON.stringify(cegoDe.get(id)) !== JSON.stringify(p.cartao.get(id))) throw new Error(`${id}: o cartão regenerado com a máscara 1.3.0 difere do lote da passada ${p.nome} (1.3.0)`);
  }
  // Casos em ordem sorteada (não pela ordem dos estratos).
  const ordemCaso = [...sel.selecionados].sort((a, b) => (sha(`${semente}|material-autora|caso|${passadaDe.get(a)!.item.get(a)!.chave}`) < sha(`${semente}|material-autora|caso|${passadaDe.get(b)!.item.get(b)!.chave}`) ? -1 : 1));
  const casos = ordemCaso.map((id, i) => ({ caso: nomeCaso(i), id, cartao: { ...cegoDe.get(id)!, id: nomeCaso(i) } as CartaoCego }));
  const telas = [...new Set(casos.map(c => c.cartao.tela))];
  if (telas.length > 1) throw new Error(`material com mais de uma tela: ${telas.join(", ")}`);
  const tela = telaDe.get(telas[0] ?? [...telaDe.keys()][0])!;
  const siteDir = o.site ? resolve(o.site) : null;
  const servir = siteDir ? `npx tsx scripts/reanalise-nat74/e14-campanha.ts --servir ${posix(relative(join(TCC, "govbr-eval"), siteDir))}` : null;
  // Imagens (com --site): a página congelada do pacote, receita refeita como escrita, medida literal (material-imagens.ts).
  let capturas: Map<string, Captura> | null = null;
  if (siteDir) {
    const site = loadSite(siteDir);
    for (const a of carga.analises) {
      const esperado = (a.pkg as { provenance?: { site?: { manifestSha256?: string } } }).provenance?.site?.manifestSha256;
      if (esperado !== site.manifestSha256) throw new Error(`--site: manifesto ${site.manifestSha256.slice(0, 12)}… ≠ site do pacote de ${a.nome} (${String(esperado).slice(0, 12)}…)`);
    }
    const ref0 = JSON.parse(E.texto(join(carga.analises[0].dir, "entradas", "referencia.json"))) as { _meta: { waitFor?: string } };
    capturas = await capturarCasos(casos, { siteDir, endereco: tela.endereco, waitFor: ref0._meta.waitFor ?? null });
  }
  const capMd = capturas ? new Map([...capturas].map(([k, v]) => [k, { passos: v.passos, medida: v.medida, alcancou: v.alcancou, recorte: !!v.recorte,
    viewport: casos.find(c => c.caso === k)!.cartao.alegacao.estado.viewport ?? { width: 1280, height: 900 } }])) : null;
  const imagens: [string, Buffer][] = [];
  for (const [k, v] of capturas ?? []) {
    imagens.push([`autora/img/${k}-tela.png`, v.tela], [`autora/img/${k}-tela-sem-marca.png`, v.telaSemMarca]);
    if (v.recorte) imagens.push([`autora/img/${k}-recorte.png`, v.recorte]);
  }
  const comRefs = casos.some(c => c.cartao.referencias?.length);
  const autora: [string, string][] = [["autora/LEIAME.md", leiameAutora({ n: casos.length, tela, servir, imagens: !!capturas, ...(comRefs ? { referencias: true } : {}) })], ["autora/casos.md", casosMd(casos, tela, capMd)]];
  const conferir0 = (arquivos: [string, string][]) => cegueiraDoMaterial({ autora: arquivos, casos, passadas: carga.passadas, passadaDe, publicos: [JSON.stringify([...cegoDe.values()]), JSON.stringify([...telaDe.values()])], lerTexto: f => E.texto(f) });
  // A cegueira cobre também as imagens: os nomes (só R-NN-tela/-tela-sem-marca/-recorte.png, todos citados no casos.md)
  // entram como texto na mesma conferência; o conteúdo é a página congelada, igual para qualquer execução.
  const conferir = (arquivos: [string, string][], nomes: string[] = imagens.map(([r]) => r)) => {
    const r = conferir0([...arquivos, ["autora/img/(nomes dos arquivos)", nomes.join("\n")]]);
    const ruins = nomes.filter(x => !/^autora\/img\/R-\d{2}-(?:tela|tela-sem-marca|recorte)\.png$/.test(x));
    const naoCitadas = nomes.filter(x => !arquivos.some(([rel, t]) => rel === "autora/casos.md" && t.includes(`(${x.replace("autora/", "")})`)));
    const falhas = [...r.falhas, ...ruins.map(x => ({ arquivo: x, cartao: null, regra: "nome de imagem fora do padrão R-NN-(tela|tela-sem-marca|recorte).png", trecho: x })),
      ...naoCitadas.map(x => ({ arquivo: x, cartao: null, regra: "imagem não citada no casos.md", trecho: x }))];
    return { ...r, resultado: (falhas.length ? "FALHOU" : "OK") as "OK" | "FALHOU", falhas, imagens: nomes.length };
  };
  const cegueira = conferir(autora);
  // Chave, seleção e manifesto (internos).
  const desfecho = (id: string): Desfecho => { const d = carga.derivadoNa(passadaDe.get(id)!, id); return desfechoDaPassada(d, vereditoNaPolitica(d, "1.2.0").veredito === "reference"); };
  // [D-156] Proveniência do resgate pela referência secundária (só nesses cartões): regra citada que caiu × referência usada.
  const citacao = (id: string): { citacao?: CitacaoPorReferencia } => { const d = carga.derivadoNa(passadaDe.get(id)!, id);
    if (!d.citacaoPor) return {};
    if (!d.citacao) throw new Error(`${id}: derivado com citacaoPor sem a proveniência (citacao): reingira a passada`);
    return { citacao: d.citacao }; };
  const cand = new Map(cands.map(c => [c.id, c]));
  const casoDe = new Map(casos.map(c => [c.id, c.caso]));
  const corpoSel = { formato: FORMATO_SELECAO, versao: MATERIAL_VERSAO, aviso: "NÃO entregar à autora: liga o cartão ao braço e ao estrato",
    campanha: carga.camp.campaignId, ensaio: /^ensaio/.test(carga.camp.campaignId),
    passadas: carga.passadas.map(p => ({ nome: p.nome, julgamentosSha256: p.julgSha, versao: p.versao, mascara13: p.mascara13 })),
    origem: carga.origemInfo.map(i => ({ passada: i.passada, arquivo: i.arquivo, sha256: i.sha256 })),
    teto: teto, cotas: sel.cotas, cotasAlternativas: COTAS, semente: { valor: semente, regra: "ordem no estrato = sha256(semente|material-autora|e<n>|chave); 1º braço da alternância = paridade do 1º hex de sha256(semente|material-autora|inicio|e<n>); ordem dos casos = sha256(semente|material-autora|caso|chave)" },
    regras: {
      precedencia: "um cartão fica só no estrato de menor número em que cabe (1 → 5)",
      estrato1: `para cada cartão vinculado ou creditado (1.2.0, origem medida aplicada): veredito invertido (crédito sai / vínculo passa a creditar), D da comparação ${comp.id} (${par[1]} − ${par[0]}, desfecho primário por spec) recalculado por creditosDoTrio + contar (recalculo-campanha.ts); |ΔD| ≥ 1`,
      estrato2: "veredito false na 1.2.0 (erro-factual ou erro-normativo)", estrato3: "violacao-pagina ou violacao-origem-indeterminada sem crédito",
      estrato4: "violacao-ds (com a origem medida)", estrato5: "cartão de linha de base (execução lb-*)",
      balanceamento: `alterna ${par.join(" e ")} quando o estrato tem os dois; depois o resto deles; depois os outros braços`,
      repasse: "estratos 2–5 sorteados primeiro; cota não usada (vazio ou poucos cartões) vai ao estrato 1; o que o estrato 1 não usa fica sem uso",
    },
    comparacao: { id: comp.id, bracos: par, dBasePorTrio: dBase }, avisos,
    estratos: sel.estratos, semUso: sel.semUso,
    efeitosNoDfc: [...efeitos.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    paraAutora: casos.map(c => ({ caso: c.caso, id: c.id, braco: cand.get(c.id)!.braco, trio: cand.get(c.id)!.trio, estrato: cand.get(c.id)!.estrato, motivo: cand.get(c.id)!.motivo, classe: cand.get(c.id)!.classe, desfechoPassada: desfecho(c.id), ...citacao(c.id) })),
    julgadoSoPorLLM: cands.filter(c => !casoDe.has(c.id)).sort((a, b) => (a.id < b.id ? -1 : 1)).map(c => ({ id: c.id, braco: c.braco, trio: c.trio, estrato: c.estrato, motivo: c.motivo, classe: c.classe, rotulo: ROTULO_SO_LLM, ...citacao(c.id) })),
  };
  const selTxt = jsonTexto(corpoSel);
  const casosChave: CasoChave[] = casos.map(c => { const p = passadaDe.get(c.id)!; return { caso: c.caso, id: c.id, chave: p.item.get(c.id)!.chave, braco: p.item.get(c.id)!.braco, estrato: cand.get(c.id)!.estrato!, passada: p.nome, julgamentosSha256: p.julgSha, desfechoPassada: desfecho(c.id), ...citacao(c.id) }; });
  const chaveTxt = jsonTexto({ formato: FORMATO_CHAVE_AUTORA, aviso: "NÃO entregar à autora: liga o caso ao cartão, ao braço, ao estrato e à decisão da passada", selecaoSha256: sha(selTxt), casos: casosChave });
  const cegTxt = jsonTexto(cegueira);
  const internos: [string, string][] = [["selecao.json", selTxt], ["selecao.json.sha256", `${sha(selTxt)}  selecao.json\n`], ["selecao.md", selecaoMd(corpoSel)],
    ["chave/chave-autora.json", chaveTxt], ["cegueira.json", cegTxt]];
  const manifesto = { formato: "nat78-material-autora-manifesto-1.0.0", versao: MATERIAL_VERSAO, campanha: carga.camp.campaignId, teto, cotas: sel.cotas,
    casos: casos.map(c => c.caso), defeitos: tela.defeitos.map(d => d.id), tela: { nome: tela.nome, versao: tela.versao, endereco: tela.endereco },
    respostas: { formato: FORMATO_RESPOSTAS_AUTORA, comando: "npm run revisao:material-autora -- responder --material <esta pasta> --texto <linhas da autora> --saida <pasta nova>" },
    arquivosDaAutora: Object.fromEntries([...autora, ...imagens].map(([r, t]) => [r, sha(t)])),
    imagens: capturas ? { versao: IMAGENS_VERSAO, site: posix(relative(TCC, siteDir!)), playwright: PLAYWRIGHT_VERSAO,
      regra: "Playwright headless, janela do cartão, receita refeita como escrita; camada de contorno própria (elemento fixo acrescentado, estilos da página intactos); tela sem marca, com marca e recorte; medida literal (tracosDaAlegacao) antes da marca",
      receitaNaoAlcancada: [...capturas].filter(([, v]) => !v.alcancou).map(([k]) => k) } : { motivo: "sem --site: sem imagens" },
    descricoes: "defeitos mostrados à autora sem o prefixo 'Estrato X · variante y', sem a frase 'Sem predicado na referência…' e sem caminhos de arquivo (retirada mecânica, descricaoParaAutora)", internos: Object.fromEntries(internos.map(([r, t]) => [r, sha(t)])),
    chaveSha256: sha(chaveTxt), selecaoSha256: sha(selTxt), cegueira: cegueira.resultado, entradas: E.manifesto() };
  E.conferir(manifesto.entradas);
  const resumo = [
    `seleção (teto ${teto}, cotas ${sel.cotas.join("/")}, semente ${semente}): ${casos.length} caso(s) para a autora; ${corpoSel.julgadoSoPorLLM.length} ${ROTULO_SO_LLM}`,
    ...sel.estratos.map(e => `  estrato ${e.n} (${e.nome}): ${e.candidatos} candidato(s) ${JSON.stringify(e.porBraco)}; cota ${e.cota}${e.n === 1 ? ` + ${e.recebido} recebida = ${e.cotaEfetiva}` : ""}; ${e.selecionados.length} selecionado(s)${e.repassadoAo1 ? `; ${e.repassadoAo1} repassada(s) ao estrato 1` : ""}${e.semUso ? `; ${e.semUso} sem uso` : ""}`),
    ...avisos.map(a => `  aviso: ${a}`), `  cegueira: ${cegueira.resultado}`];
  if (capturas) resumo.push(`  imagens: ${imagens.length} arquivo(s); receita não alcança o estado em: ${[...capturas].filter(([, v]) => !v.alcancou).map(([k]) => k).join(", ") || "nenhum"}`);
  return { arquivos: [...autora, ...imagens, ...internos, ["manifesto.json", jsonTexto(manifesto)]], selecao: corpoSel, cegueira, resumo, conferir };
}

export function selecaoMd(s: Record<string, unknown>): string {
  const x = s as { campanha: string; ensaio: boolean; teto: number; cotas: number[]; semente: { valor: string }; estratos: EstratoSel[]; semUso: number; avisos: string[];
    paraAutora: { caso: string; id: string; braco: string; estrato: number; motivo: string; desfechoPassada: string }[]; julgadoSoPorLLM: { id: string; braco: string; estrato: number | null; motivo: string }[];
    comparacao: { id: string; dBasePorTrio: Record<string, number | null> } };
  const L = [`# Seleção para a autora (§8.4) — \`${x.campanha}\``, "", "> **Interno: não entregar à autora** (traz braço e estrato).", ""];
  if (x.ensaio) L.push("> ENSAIO fora da amostra: nenhum número daqui é resultado.", "");
  L.push(`Teto ${x.teto}, cotas ${x.cotas.join("/")}; semente \`${x.semente.valor}\`; D base por trio (${x.comparacao.id}): ${Object.entries(x.comparacao.dBasePorTrio).map(([t, d]) => `${t} ${d ?? "—"}`).join(", ")}.`, "",
    "| estrato | candidatos (por braço) | cota | recebida | selecionados | repassada ao 1 | sem uso |", "|---|---|---|---|---|---|---|");
  for (const e of x.estratos) L.push(`| ${e.n}. ${e.nome} | ${e.candidatos} ${JSON.stringify(e.porBraco)} | ${e.cota} | ${e.n === 1 ? e.recebido : "—"} | ${e.selecionados.length} | ${e.n === 1 ? "—" : e.repassadoAo1} | ${e.n === 1 ? e.semUso : "—"} |`);
  L.push("", "| caso | cartão | braço | estrato | por quê | desfecho da passada |", "|---|---|---|---|---|---|");
  for (const c of x.paraAutora) L.push(`| ${c.caso} | ${c.id} | ${c.braco} | ${c.estrato} | ${c.motivo} | ${c.desfechoPassada} |`);
  L.push("", `${ROTULO_SO_LLM}: ${x.julgadoSoPorLLM.length} cartão(ões) (lista em \`selecao.json › julgadoSoPorLLM\`).`);
  for (const a of x.avisos) L.push(`- aviso: ${a}`);
  return L.join("\n") + "\n";
}

// ───────────────────────────────────────────────────────────────── responder

export function responder(o: { material: string; texto: string }): { arquivos: [string, string][]; erros: string[]; resumo: string } {
  const mat = resolve(o.material);
  const mTxt = readFileSync(join(mat, "manifesto.json"), "utf8");
  const man = JSON.parse(mTxt) as { formato: string; casos: string[]; defeitos: string[]; chaveSha256: string };
  if (man.formato !== "nat78-material-autora-manifesto-1.0.0") throw new Error(`${mat}: não é material da autora (manifesto ${man.formato})`);
  const cTxt = readFileSync(join(mat, "chave", "chave-autora.json"), "utf8");
  if (sha(cTxt) !== man.chaveSha256) throw new Error(`${mat}: chave difere do manifesto`);
  const texto = readFileSync(resolve(o.texto), "utf8").replace(/^﻿/, "");
  const r = lerTextoDaAutora(texto, { casos: man.casos, defeitos: man.defeitos });
  if (r.erros.length) return { arquivos: [], erros: r.erros, resumo: "" };
  const rel = relative(TCC, mat);
  const dirMat = rel.startsWith("..") || isAbsolute(rel) ? posix(mat) : posix(rel); // fora do TCC (teste, temporário): caminho absoluto
  const doc = { formato: FORMATO_RESPOSTAS_AUTORA, aviso: "respostas cegas da autora (§8.4); lidas pelo recalculo-campanha.ts --ratificacoes", juiz: "autora" as const,
    material: { dir: dirMat, manifestoSha256: sha(mTxt), chaveSha256: man.chaveSha256 }, textoSha256: sha(texto),
    respostas: r.respostas.map(x => ({ ...x, desfecho: desfechoDaAutora(x) })) };
  const t = jsonTexto(doc);
  const n = (d: string) => doc.respostas.filter(x => x.desfecho === d).length;
  return { arquivos: [["respostas-autora.json", t], ["respostas-autora.json.sha256", `${sha(t)}  respostas-autora.json\n`], ["texto-da-autora.txt", texto]], erros: [],
    resumo: `${doc.respostas.length} respostas gravadas (${n("pendente")} "não sei"); respostas-autora.json sha256 ${sha(t)}` };
}

// ───────────────────────────────────────────────────────────────── CLI

const USO = `uso:
  material-autora.ts preparar --passada P [--passada …] --saida PASTA_NOVA [--analise DIR …] [--coleta ARQ …] [--origem PASTA …] [--teto 10|15] [--site DIR] [--validador DIR]
  material-autora.ts responder --material PASTA --texto ARQ --saida PASTA_NOVA`;

/** Grava texto e imagens sem nunca trocar conteúdo (versão nova = pasta nova). */
export function gravarArquivos(raiz: string, arquivos: [string, string | Buffer][]): void {
  for (const [rel, t] of arquivos) { const abs = join(raiz, rel); if (existsSync(abs) && !readFileSync(abs).equals(Buffer.from(t))) throw new Error(`PARADO: ${abs} já existe com outro conteúdo; nada gravado`); }
  for (const [rel, t] of arquivos) { const abs = join(raiz, rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, t); }
}

export async function executar(argv: string[]): Promise<number> {
  const a = lerArgs(argv, ["--passada", "--saida", "--analise", "--coleta", "--origem", "--teto", "--site", "--validador", "--material", "--texto"], []);
  if ("erro" in a) { console.error(`RECUSADO: ${a.erro}\n${USO}`); return 1; }
  try {
    const um = (k: string, obrig = true) => { const v = a.opts.get(k); if (!v?.length) { if (obrig) throw new Error(`falta ${k} (obrigatório; nunca há pasta padrão)`); return null; } if (v.length > 1) throw new Error(`${k} mais de uma vez`); return v[0]; };
    const [modo, ...resto] = a.modo;
    if (resto.length) throw new Error(`argumento solto: ${resto.join(" ")}`);
    const saida = resolve(um("--saida")!);
    if (existsSync(saida)) throw new Error(`--saida ${saida} já existe (pasta NOVA)`);
    if (modo === "preparar") {
      const passadas = (a.opts.get("--passada") ?? []).map(x => resolve(x));
      if (!passadas.length) throw new Error("falta --passada (obrigatório; nunca há pasta padrão)");
      for (const p of passadas) { const r = relative(p, saida); if (r === "" || (!r.startsWith("..") && !isAbsolute(r))) throw new Error(`--saida não pode ficar dentro da passada ${p}`); }
      const teto = um("--teto", false);
      const m = await prepararMaterial({ passadas, analises: a.opts.get("--analise"), coletas: a.opts.get("--coleta"), origens: (a.opts.get("--origem") ?? []).map(x => resolve(x)),
        teto: teto ? Number(teto) : undefined, site: um("--site", false), validador: um("--validador", false) ?? undefined });
      if (m.cegueira.resultado !== "OK") {
        gravarArquivos(saida, m.arquivos.filter(([r]) => r === "cegueira.json"));
        console.error(`CEGUEIRA FALHOU (${m.cegueira.falhas.length}); só cegueira.json gravado.`); for (const f of m.cegueira.falhas.slice(0, 30)) console.error(`  ${JSON.stringify(f)}`); return 3;
      }
      gravarArquivos(saida, m.arquivos);
      for (const l of m.resumo) console.log(l);
      console.log(`gravado em ${saida}; à autora vai SÓ ${join(saida, "autora")}`);
    } else if (modo === "responder") {
      const r = responder({ material: um("--material")!, texto: um("--texto")! });
      if (r.erros.length) { console.error(`RESPOSTAS RECUSADAS (${r.erros.length}); nada gravado:`); for (const e of r.erros) console.error(`  ${e}`); return 1; }
      gravarImutavel(saida, r.arquivos);
      console.log(`${r.resumo}; gravado em ${saida} (use --ratificacoes ${join(saida, "respostas-autora.json")} no recálculo)`);
    } else { console.error(USO); return 1; }
    return 0;
  } catch (e) { console.error(e instanceof Error ? e.message : e); return 1; }
}

if (process.argv[1] && /(?:^|[\\/])material-autora\.ts$/.test(process.argv[1])) void executar(process.argv.slice(2)).then(c => process.exit(c));
