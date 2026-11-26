/**
 * Tela F2 — fechamento da referência 1.0.0 (26/11/2026). Roda DEPOIS de montar-referencia.mjs. Molde: tela-f/fechar-1.0.0.mjs.
 *  1. confirmação cega: as duas auditorias × chave (tela-f2/auditoria-cega/) → `_meta.confirmacaoCega` e porSpec;
 *     confirmada = veredicto "verdadeira" e violaClausula "sim"; registra também juizDecide;
 *  2. NAT-71: classificadores 1 e 2 = a dupla classificação; onde discordam em classe ou nível, o 3 (cego) desempata por
 *     maioria (se houver desacordo e não houver classificador-3.json, o script PARA). As 13 naturais herdam
 *     (classes-nat71/heranca-naturais.json). → classes-nat71/classes-finais.json + comparacao.md;
 *  3. tira o RASCUNHO e grava o `_meta` final na referência (escolha, estados, ids, confirmação, porSpec, classes,
 *     estratos, critérios, página congelada, evidência).
 * Uso: node tela-f2/fechar-1.0.0.mjs
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const sha = b => createHash("sha256").update(b).digest("hex");
const J = p => JSON.parse(readFileSync(join(AQUI, p), "utf8"));
const REF = join(RAIZ, "ground-truth-processos-f2.json");
const ref = JSON.parse(readFileSync(REF, "utf8"));
if (!/RASCUNHO/.test(ref._meta.status)) throw new Error("referência já fechada: rode montar-referencia.mjs --forcar antes");
const sem = ref._meta.estratos.semeado.specs;

// ---------- 1. confirmação cega ----------
const chaveDoc = J("auditoria-cega/chave.json"), chave = chaveDoc.afirmacoes;
const aud = [1, 2].map(n => J(`auditoria-cega/auditor-${n}/respostas.json`));
for (const a of aud) if (a.pedidoSha256 !== chaveDoc._meta.pedidoSha256) throw new Error(`auditor ${a.auditor}: respondeu a outro pedido`);
const porAfirmacao = id => aud.map(a => a.respostas.find(v => v.id === id));
const confirmacao = {}, iscas = [];
const ok = v => v?.veredicto === "verdadeira" && v?.violaClausula === "sim";
const resumo = v => ({ veredicto: v.veredicto, violaClausula: v.violaClausula, clausulaConfere: v.clausulaConfere, juizDecide: v.juizDecide });
for (const c of chave) {
  const [x, y] = porAfirmacao(c.id);
  if (!x || !y) throw new Error(`${c.id}: sem resposta de algum auditor`);
  if (c.tipo === "semeada") confirmacao[c.origem] = { afirmacao: c.id, auditor1: resumo(x), auditor2: resumo(y), confirmadas: (ok(x) ? 1 : 0) + (ok(y) ? 1 : 0) };
  else iscas.push({ afirmacao: c.id, isca: c.origem, auditor1: x.veredicto, auditor2: y.veredicto, falsaNosDois: x.veredicto === "falsa" && y.veredicto === "falsa" });
}
const conf = { ambos: sem.filter(s => confirmacao[s].confirmadas === 2).length, um: sem.filter(s => confirmacao[s].confirmadas === 1).length, nenhum: sem.filter(s => confirmacao[s].confirmadas === 0).length };
const juizNao = aud.flatMap(a => a.respostas.filter(r => r.juizDecide !== "sim")).length;
if (conf.ambos !== sem.length || iscas.some(i => !i.falsaNosDois)) throw new Error(`confirmação cega não limpa: ${JSON.stringify(conf)}; iscas verdadeiras ${iscas.filter(i => !i.falsaNosDois).length} — não fecha`);

// ---------- 2. NAT-71 ----------
const cl = [1, 2, 3].filter(n => n < 3 || existsSync(join(AQUI, `classes-nat71/classificador-${n}.json`))).map(n => J(`classes-nat71/classificador-${n}.json`));
const her = J("classes-nat71/heranca-naturais.json");
const linhas = [], finais = [];
let acordoClasse = 0, acordoNivel = 0, desempates = 0, semMaioria = 0;
const maioria = vs => { const c = {}; for (const v of vs) c[v] = (c[v] ?? 0) + 1; const m = Object.entries(c).find(([, n]) => n >= 2); return m ? m[0] : null; };
for (const id of sem) {
  const [a, b, t] = cl.map(c => c.specs.find(s => s.id === id));
  if (!a || !b) throw new Error(`${id}: sem classificação de 1 ou 2`);
  const iguaisC = a.classe === b.classe, iguaisN = a.automatizabilidade === b.automatizabilidade;
  acordoClasse += iguaisC; acordoNivel += iguaisN;
  const usouT = !iguaisC || !iguaisN;
  if (usouT && !t) throw new Error(`${id}: 1 e 2 discordam e não há classificador 3`);
  const classe = iguaisC ? a.classe : maioria([a.classe, b.classe, t.classe]);
  const nivel = iguaisN ? a.automatizabilidade : maioria([a.automatizabilidade, b.automatizabilidade, t.automatizabilidade]);
  if (usouT) desempates++;
  const sm = classe === null || nivel === null;
  if (sm) semMaioria++;
  linhas.push({ id, a, b, t, iguaisC, iguaisN, classe, nivel, usouT });
  finais.push({ id, classe: classe ?? "sem-maioria", automatizabilidade: nivel ?? "sem-maioria", limitrofe: usouT ? !!(a.limitrofe || b.limitrofe || t.limitrofe) : !!(a.limitrofe || b.limitrofe),
    origem: sm ? "sem-maioria" : usouT ? "desempate-classificador-3" : "acordo",
    motivo: usouT ? "Classificadores 1 e 2 discordaram; o classificador 3, cego à disputa, desempatou por maioria. Motivos em classificador-1/2/3.json."
      : "Os dois classificadores cegos deram a mesma classe e o mesmo nível; motivos em classificador-1.json e classificador-2.json." });
}
for (const h of her.specs) finais.push({ id: h.id, classe: h.classe, automatizabilidade: h.automatizabilidade, limitrofe: h.limitrofe, origem: "herdada-da-D",
  motivo: `Spec da referência 1.1.0 da D (${h.diferencaDaD ? "idêntica fora a âncora, reancorada no mesmo elemento" : "idêntica byte a byte"}); ${h.origem}.` });
const conta = k => finais.reduce((o, s) => ((o[s[k]] = (o[s[k]] ?? 0) + 1), o), {});

// ---------- 3. referência final ----------
const comp = J("composicao.json");
const ids = J("conferencia-ids-base.json")._meta.contagens;
const conformes = J("conformes.json");
const nu = ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
const m = ref._meta;
m.status = `1.0.0 congelada — 2026-11-26. Tela F2 (segundo estudo de seguimento, adendo 2 de 26/11): ${ref.violations.length} specs (12 semeadas, 3 por tipo, + 13 naturais da D), ${nu} unidades, ${m.states.length} paradas em 3 segmentos (paradas nos segmentos 0 e 2), ${conformes.itens.length} controles conformes. Registro em tela-f2/congelamento-1.0.0.md.`;
m.version_note = "1.0.0 (2026-11-26): estrato semeado F2-01…F2-12 escolhido à mão por agente cego ao oráculo (seletor, cotas por tipo do adendo 2 § 3–§ 4), conferido por um segundo agente cego (conferente), filtrado e composto mecanicamente pelo agente da referência (tela-f2/filtros.json, composicao.json) — curado, não sorteado; construído no fonte da rota (pnip-mock tela-f2 9d16700; 12/12 pegaram). Estrato natural = as 13 specs da referência 1.1.0 da D, re-medidas nos dois builds pelo código da D (evidência idêntica), com a âncora da D-14 trocada por outra do mesmo elemento (_meta.estratos.natural.reancoradas).";
m.escolha = { regra: "adendo-2-tela-f2-protocolo-2026-11-26.md § 3–§ 4 (com o adendo da F § 4)", seletor: "tela-f2/selecao/ (24 candidatos, 6 por tipo, à mão, cego ao oráculo)", conferente: "tela-f2/conferencia/ (21 de 24 aprovados)", filtros: "tela-f2/filtros.json (21 → 16 sobreviventes; id na base é registro, não filtro; nível oficial = o menor entre seletor e conferente)", composicao: "tela-f2/composicao.json (3 por tipo + reserva por tipo)", natureza: "curada por agente cego ao oráculo e conferida por um segundo, não sorteada" };
m.estados_resumo = { paradas: m.states.length, segmentos: 3, segmentosComParada: [0, 2], nota: "2 passos navigate: segmento 1 é a passagem pela rota de vistorias, sem parada" };
m.idsNaBase = { arquivo: "tela-f2/conferencia-ids-base.json", validador: "govbr-ds-validator congelado-3.7.12 (816f4ba, árvore .tmp-eval/validator-3712r), só id/texto/fonte", ...ids };
m.confirmacaoCega = {
  regra: "pacote neutro de 24 afirmações (as 12 semeadas como um juiz as lê + 12 iscas da mesma forma, falsas na página, medidas antes), embaralhado com semente gravada; confirmada = veredicto 'verdadeira' e violaClausula 'sim'; dois auditores cegos independentes (tela-f2/auditoria-cega/)",
  pedidoSha256: chaveDoc._meta.pedidoSha256,
  semeadas: { confirmadasPelosDois: conf.ambos, porUm: conf.um, porNenhum: conf.nenhum },
  iscas: { falsasNosDois: iscas.filter(i => i.falsaNosDois).length, verdadeiraEmAlgum: iscas.filter(i => !i.falsaNosDois).length },
  juizNaoDecide: juizNao,
  descricoesReescritas: 0,
};
m.porSpec = Object.fromEntries(sem.map(id => [id, { confirmacaoCega: confirmacao[id], construcao: "pegou (tela-f2/conferencia-construcao.json)",
  aceitacao: ref.violations.find(v => v.id === id).acceptance ? "sustenta (conferir-referencia-1.0.0.log)" : "nao-implementado (critério em tela-f2/criterios-de-julgamento.json)" }]));
m.classes = { nota: "NAT-71 (protocolo NAT-78 § 5.3): 12 semeadas por dois classificadores cegos (desempate pelo 3º cego por maioria, se preciso); 13 naturais herdadas da D", arquivo: "tela-f2/classes-nat71/classes-finais.json", d156: "tela-f2/classes-d156-1.0.0.json" };
m.niveis = "tela-f2/estratos-1.0.0.json (id da spec semeada → tipo, subtipo, nível, interação; fora da referência)";
m.criteriosDeJulgamento = "tela-f2/criterios-de-julgamento.json";
m.paginaCongelada = "tela-f2/pagina-congelada.json (ala pnip-f2, 190 arquivos, lista b113879f…; govbr-corpus tela-f2 a7d6ccd)";
m.evidencia = { construcao: "tela-f2/construcao/ e tela-f2/conferencia-construcao.json", remedidaNaturais: "tela-f2/remedida-d/", conferenciaReferencia: "tela-f2/conferir-referencia-1.0.0.log" };
delete m.origem.construcao;
writeFileSync(REF, JSON.stringify(ref, null, 1) + "\n");
const refSha = sha(readFileSync(REF));

const fin = {
  arquivo: "classes-finais", protocolo: "NAT-78 §5.3 (NAT-71 §3.1–3.2); adendo da F § 4, mantido pelo adendo 2",
  referencia: "ground-truth-processos-f2.json", referenciaSha256: refSha,
  fontes: Object.fromEntries(cl.map((_, i) => [`classificador-${i + 1}.json`, sha(readFileSync(join(AQUI, `classes-nat71/classificador-${i + 1}.json`)))]).concat([["heranca-naturais.json", sha(readFileSync(join(AQUI, "classes-nat71/heranca-naturais.json")))]])),
  pedido: { referenciaSha256DoPedido: cl[0].referenciaSha256, nota: "o pedido foi montado sobre o rascunho; as 12 specs semeadas do pedido são idênticas às da referência final (só o _meta mudou)" },
  regra: "classificadores 1 e 2 = dupla classificação; onde discordam em classe ou nível, o 3 (cego) desempata por maioria; três diferentes → sem-maioria. Regra fixada pelo orquestrador (autora e orquestrador cegos à lista).",
  contagens: { classe: conta("classe"), automatizabilidade: conta("automatizabilidade"), origem: conta("origem"), total: finais.length, acordo1x2: { classe: acordoClasse, nivel: acordoNivel, de: sem.length }, desempates, semMaioria },
  specs: finais,
};
const pedidoSpecs = J("classes-nat71/pedido/specs.json").specs;
for (const p of pedidoSpecs) { const v = ref.violations.find(x => x.id === p.id); for (const k of ["anchor", "state", "description", "categories", "rules", "acceptance"]) if (JSON.stringify(p[k]) !== JSON.stringify(v[k])) throw new Error(`${p.id}.${k} mudou desde o pedido NAT-71`); }
const finTxt = JSON.stringify(fin, null, 1) + "\n";
writeFileSync(join(AQUI, "classes-nat71/classes-finais.json"), finTxt);
writeFileSync(join(AQUI, "classes-nat71/classes-finais.sha256"), `${sha(finTxt)}  tela-f2/classes-nat71/classes-finais.json\n`);
const md = [`# Classes pré-registradas da tela F2 (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 26/11/2026`, "",
  `Classificadores novos e cegos, cada um só com \`pedido/\` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver o outro, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (\`heranca-naturais.json\`). Referência final sha256 \`${refSha}\`.`, "",
  "| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Final |", "|---|---|---|---|---|---|---|---|",
  ...linhas.map(l => `| ${l.id} | ${l.a.classe} | ${l.b.classe} | ${l.iguaisC ? "igual" : "**difere**"} | ${l.a.automatizabilidade} | ${l.b.automatizabilidade} | ${l.iguaisN ? "igual" : "**difere**"} | ${l.classe ?? "sem-maioria"} / ${l.nivel ?? "sem-maioria"} |`),
  "", `Acordo 1×2: classe ${acordoClasse}/${sem.length}; nível ${acordoNivel}/${sem.length}. Desempates pelo 3: ${desempates}. Sem maioria: ${semMaioria}.`, "",
  "## Herdadas", "", "D-01…D-14 (13): classe final da D (`tela-d/classes-nat71/classes-finais.json`); 12 idênticas byte a byte, a D-14 idêntica fora a âncora (mesmo elemento).", ""].join("\n");
writeFileSync(join(AQUI, "classes-nat71/comparacao.md"), md);
writeFileSync(join(AQUI, "auditoria-cega/resultado.json"), JSON.stringify({ chaveSha256: sha(readFileSync(join(AQUI, "auditoria-cega/chave.json"))),
  respostas: Object.fromEntries(aud.map(a => [`auditor-${a.auditor}`, sha(readFileSync(join(AQUI, `auditoria-cega/auditor-${a.auditor}/respostas.json`)))])),
  semeadas: confirmacao, iscas, contagens: { ...conf, iscasFalsasNosDois: iscas.filter(i => i.falsaNosDois).length, juizNaoDecide: juizNao } }, null, 1) + "\n");
console.log(JSON.stringify({ conf, iscasFalsas: iscas.filter(i => i.falsaNosDois).length, juizNao, acordoClasse, acordoNivel, desempates, semMaioria, refSha }));
