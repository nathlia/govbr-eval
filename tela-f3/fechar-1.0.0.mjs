/**
 * Tela F3 — fechamento da referência 1.0.0 (27/11/2026). Roda DEPOIS de montar-referencia.mjs. Molde: tela-f2/fechar-1.0.0.mjs.
 *  1. confirmação cega: as duas auditorias × chave (tela-f3/auditoria-cega/) → `_meta.confirmacaoCega` e porSpec;
 *     confirmada = veredicto "verdadeira" e violaClausula "sim"; registra também juizDecide;
 *  2. NAT-71: classificadores 1 e 2 = a dupla classificação; onde discordam em classe ou nível, o 3 (cego) desempata por
 *     maioria (se houver desacordo e não houver classificador-3.json, o script PARA). As 13 naturais herdam
 *     (classes-nat71/heranca-naturais.json). → classes-nat71/classes-finais.json + comparacao.md;
 *  3. tira o RASCUNHO e grava o `_meta` final na referência (escolha, estados, ids, confirmação, porSpec, classes,
 *     estratos, critérios, página congelada, evidência).
 * Uso: node tela-f3/fechar-1.0.0.mjs
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const sha = b => createHash("sha256").update(b).digest("hex");
const J = p => JSON.parse(readFileSync(join(AQUI, p), "utf8"));
const REF = join(RAIZ, "ground-truth-processos-f3.json");
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
const ids = J("conferencia-ids-base.json");
const conformes = J("conformes.json");
const nu = ref.violations.reduce((n, v) => n + (v.expectedCount ?? 1), 0);
const m = ref._meta;
const segs = [...new Set(m.states.map(s => m.setup.slice(0, s.afterStep).filter(p => p.action === "navigate").length))];
const nSeg = m.setup.filter(p => p.action === "navigate").length + 1;
m.status = `1.0.0 congelada — 2026-11-27. Tela F3 (terceiro estudo de seguimento, adendo 3 de 27/11): ${ref.violations.length} specs (12 semeadas da lista da autora — T1 3, T2 2, T3 1, T4 5, R 1 — + 13 naturais da D), ${nu} unidades, ${m.states.length} paradas em ${nSeg} segmentos (paradas nos segmentos ${segs.join(", ")}), ${conformes.itens.length} controles conformes. Registro em tela-f3/congelamento-1.0.0.md.`;
m.version_note = "1.0.0 (2026-11-27): estrato semeado F3-01…F3-12 = a lista da autora (adendo 3 § 2.2 e § 3: 5 mantidos da F2, 6 trocados, 1 novo; 3 controles da varredura, 05–07), implementada pelo Codex no fonte da rota (pnip-mock tela-f3 088a086; 12/12 M passaram na medida da construção), conferida aqui nos dois builds e confirmada por dois auditores cegos com iscas — escolhida por quem conhece o oráculo, não sorteada nem curada às cegas. Estrato natural = as 13 specs da referência 1.1.0 da D, re-medidas nos dois builds pelo código da D (evidência idêntica), com a âncora da D-14 trocada por outra do mesmo elemento, como na F2 (_meta.estratos.natural.reancoradas).";
delete m.escolha;
m.escolha = { regra: "adendo-3-tela-f3-protocolo-2026-11-27.md § 2.2 e § 3", quemEscolheu: "a autora (reviu a lista da F2: manteve 5, trocou 6, acrescentou 1); o Codex implementou e conferiu as cláusulas; a sessão principal conferiu o fonte", lista: "tela-f3/semeadas.mjs (ordem do adendo 3 § 3; F3-nn = M-nn da construção)", natureza: "lista aberta, escolhida por quem conhece o oráculo e as leituras de cobertura da F e da F2; não sorteada (adendo 3 § 2.1–§ 2.3, § 8)" };
m.estados_resumo = { paradas: m.states.length, segmentos: nSeg, segmentosComParada: segs, nota: `${nSeg - 1} passos navigate: os segmentos ímpares são passagens pela rota de vistorias, sem parada; a árvore de cada segmento com parada é a mesma da entrada direta (tela-f3/conferir-arvores.json)` };
m.idsNaBase = { arquivo: "tela-f3/conferencia-ids-base.json", validador: "govbr-ds-validator congelado-3.7.12 (816f4ba, árvore .tmp-eval/validator-3712r), só id/texto/fonte", ...ids._meta.contagens };
m.regrasRepetidas = { arquivo: "tela-f3/conferencia-ids-base.json › repetidas", nota: "declaradas, não filtradas (adendo 3 § 3)", repeticoes: ids.repetidas.map(r => `${r.semeada} ${r.id.replace(/^govbr-3\.7\.0-/, "")} → ${r.tela}${r.specsComARegra.length ? " " + r.specsComARegra.join(", ") : " (nota de chamariz, " + r.ondeAparece.join(", ") + ")"}`) };
m.confirmacaoCega = {
  regra: "pacote neutro de 24 afirmações (as 12 semeadas como um juiz as lê + 12 iscas da mesma forma, falsas na página, medidas antes; 5 iscas pedem interação), embaralhado com semente gravada; confirmada = veredicto 'verdadeira' e violaClausula 'sim'; dois auditores cegos independentes (tela-f3/auditoria-cega/)",
  pedidoSha256: chaveDoc._meta.pedidoSha256,
  semeadas: { confirmadasPelosDois: conf.ambos, porUm: conf.um, porNenhum: conf.nenhum },
  iscas: { falsasNosDois: iscas.filter(i => i.falsaNosDois).length, verdadeiraEmAlgum: iscas.filter(i => !i.falsaNosDois).length },
  juizNaoDecide: juizNao,
  descricoesReescritas: 0,
};
m.porSpec = Object.fromEntries(sem.map(id => [id, { confirmacaoCega: confirmacao[id], construcao: "pegou (tela-f3/conferencia-construcao.json)",
  aceitacao: ref.violations.find(v => v.id === id).acceptance ? "sustenta (conferir-referencia-1.0.0.log)" : "nao-implementado (critério em tela-f3/criterios-de-julgamento.json; predicado próprio em tela-f3/sonda.json)" }]));
m.classes = { nota: "NAT-71 (protocolo NAT-78 § 5.3): 12 semeadas por dois classificadores cegos (desempate pelo 3º cego por maioria, se preciso); 13 naturais herdadas da D", arquivo: "tela-f3/classes-nat71/classes-finais.json", d156: "tela-f3/classes-d156-1.0.0.json" };
m.niveis = "tela-f3/estratos-1.0.0.json (id da spec semeada → tipo, subtipo, nível, interação, origem, controle da varredura; fora da referência)";
m.criteriosDeJulgamento = "tela-f3/criterios-de-julgamento.json";
m.paginaCongelada = "tela-f3/pagina-congelada.json (ala pnip-f3, 190 arquivos, lista 30b16f0d…; govbr-corpus tela-f3 9d194d7)";
m.evidencia = { construcao: "tela-f3/construcao/ e tela-f3/conferencia-construcao.json", sonda: "tela-f3/sonda.json", arvores: "tela-f3/conferir-arvores.json", remedidaNaturais: "tela-f3/remedida-d/", conferenciaReferencia: "tela-f3/conferir-referencia-1.0.0.log" };
delete m.origem.construcao;
writeFileSync(REF, JSON.stringify(ref, null, 1) + "\n");
const refSha = sha(readFileSync(REF));

const fin = {
  arquivo: "classes-finais", protocolo: "NAT-78 §5.3 (NAT-71 §3.1–3.2); adendo da F § 4, mantido pelos adendos 2 e 3",
  referencia: "ground-truth-processos-f3.json", referenciaSha256: refSha,
  fontes: Object.fromEntries(cl.map((_, i) => [`classificador-${i + 1}.json`, sha(readFileSync(join(AQUI, `classes-nat71/classificador-${i + 1}.json`)))]).concat([["heranca-naturais.json", sha(readFileSync(join(AQUI, "classes-nat71/heranca-naturais.json")))]])),
  pedido: { referenciaSha256DoPedido: cl[0].referenciaSha256, nota: "o pedido foi montado sobre o rascunho; as 12 specs semeadas do pedido são idênticas às da referência final (só o _meta mudou)" },
  regra: "classificadores 1 e 2 = dupla classificação; onde discordam em classe ou nível, o 3 (cego) desempata por maioria; três diferentes → sem-maioria. Regra da F e da F2, mantida (na F3 a lista é aberta; os classificadores não a conhecem além das 12 specs que recebem).",
  contagens: { classe: conta("classe"), automatizabilidade: conta("automatizabilidade"), origem: conta("origem"), total: finais.length, acordo1x2: { classe: acordoClasse, nivel: acordoNivel, de: sem.length }, desempates, semMaioria },
  specs: finais,
};
const pedidoSpecs = J("classes-nat71/pedido/specs.json").specs;
for (const p of pedidoSpecs) { const v = ref.violations.find(x => x.id === p.id); for (const k of ["anchor", "state", "description", "categories", "rules", "acceptance"]) if (JSON.stringify(p[k]) !== JSON.stringify(v[k])) throw new Error(`${p.id}.${k} mudou desde o pedido NAT-71`); }
const finTxt = JSON.stringify(fin, null, 1) + "\n";
writeFileSync(join(AQUI, "classes-nat71/classes-finais.json"), finTxt);
writeFileSync(join(AQUI, "classes-nat71/classes-finais.sha256"), `${sha(finTxt)}  tela-f3/classes-nat71/classes-finais.json\n`);
const md = [`# Classes pré-registradas da tela F3 (protocolo NAT-78 §5.3, NAT-71 §3) — classificações cegas, 27/11/2026`, "",
  `Classificadores novos e cegos, cada um só com \`pedido/\` (definições NAT-71 §3.1–3.2 e protocolo §5.3, as 12 specs semeadas, os critérios de julgamento como leitura auxiliar), sem ver o outro, sem navegador e sem ferramenta. Regra: 1 e 2 são a dupla classificação; o 3 só desempata onde 1 e 2 discordam (maioria). As 13 naturais herdam a classe final da D (\`heranca-naturais.json\`). Referência final sha256 \`${refSha}\`.`, "",
  "| Spec | Classe (1) | Classe (2) | | Nível (1) | Nível (2) | | Final |", "|---|---|---|---|---|---|---|---|",
  ...linhas.map(l => `| ${l.id} | ${l.a.classe} | ${l.b.classe} | ${l.iguaisC ? "igual" : "**difere**"} | ${l.a.automatizabilidade} | ${l.b.automatizabilidade} | ${l.iguaisN ? "igual" : "**difere**"} | ${l.classe ?? "sem-maioria"} / ${l.nivel ?? "sem-maioria"} |`),
  "", `Acordo 1×2: classe ${acordoClasse}/${sem.length}; nível ${acordoNivel}/${sem.length}. Desempates pelo 3: ${desempates}. Sem maioria: ${semMaioria}.`, "",
  "## Herdadas", "", "D-01…D-14 (13): classe final da D (`tela-d/classes-nat71/classes-finais.json`); 12 idênticas byte a byte, a D-14 idêntica fora a âncora (mesmo elemento, a mesma troca da F2).", ""].join("\n");
writeFileSync(join(AQUI, "classes-nat71/comparacao.md"), md);
writeFileSync(join(AQUI, "auditoria-cega/resultado.json"), JSON.stringify({ chaveSha256: sha(readFileSync(join(AQUI, "auditoria-cega/chave.json"))),
  respostas: Object.fromEntries(aud.map(a => [`auditor-${a.auditor}`, sha(readFileSync(join(AQUI, `auditoria-cega/auditor-${a.auditor}/respostas.json`)))])),
  semeadas: confirmacao, iscas, contagens: { ...conf, iscasFalsasNosDois: iscas.filter(i => i.falsaNosDois).length, juizNaoDecide: juizNao } }, null, 1) + "\n");
console.log(JSON.stringify({ conf, iscasFalsas: iscas.filter(i => i.falsaNosDois).length, juizNao, acordoClasse, acordoNivel, desempates, semMaioria, refSha }));
