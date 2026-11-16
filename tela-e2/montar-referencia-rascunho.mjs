/**
 * Tela E2 — rascunho da referência (passo 7 da reconciliação), na estrutura da referência da A2
 * (ground-truth-acompanhamento.json: _meta + violations; estados, conformes, fundo, exposto, porSpec).
 * NÃO congelada: versão 0.9.0-rascunho; decisões da autora pendentes em decisoes-da-autora.md.
 * Entradas: sementes-vigentes.json, elegibilidade-passo2.json (categorias seladas), reconciliacao.json,
 * coviolacoes.json, ancoras-referencia.json, portao.json, conferencia-construcao.json, sorteio.json.
 * Uso: node tela-e2/montar-referencia-rascunho.mjs → referencia-rascunho.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const json = f => JSON.parse(readFileSync(join(AQUI, f), "utf8"));
const sha = f => createHash("sha256").update(readFileSync(join(AQUI, f))).digest("hex");
const vig = json("sementes-vigentes.json").vigentes;
const p2 = json("elegibilidade-passo2.json").regras;
const rec = json("reconciliacao.json");
const cv = json("coviolacoes.json").porCelula;
const anc = json("ancoras-referencia.json");
const portao = json("portao.json");
const conf = json("conferencia-construcao.json");
const sorteio = json("sorteio.json");

// Descrição de cada spec (fato construído e medido; o que a conferência de construção mede). Escrita à mão.
const DESCR = {
  "btn-limpar::a2-2ac598dc24db": "Limpar Campos (secundário) aparece à direita de Salvar País (primário) na barra de ações: `order: 1` na folha da página; DOM e ordem de Tab inalterados (Cancelar → Limpar → Salvar). Medido: x do Limpar 525,1 > borda direita do Salvar 509,1.",
  "msg-orientacao::a2-d6b3f0e36943": "O corpo da mensagem informativa de orientação usa jargão de sistema (persistidos, banco, commit, transação, renderizada, cache, endpoint), sem explicação, no mesmo assunto do cadastro. Medido: 7 termos técnicos.",
  "btn-ajuda::a2-5b47246a41c1": "Botão circular de ajuda (40×40) sem ícone: só o texto oculto; nome acessível mantido. Medido: 0 ícone visível, 0 pixel não branco em repouso.",
  "inp-codigo::a2-a39f3ad397d4": "O campo do código usa Arial (`font-family: Arial, Helvetica, sans-serif` na raiz .br-input pela folha da página): rótulo, campo e texto de apoio com Arial declarada e usada, não Rawline.",
  "rad-situacao::a2-f838b54da560": "A legenda do grupo de opções fica centralizada (legend com `width: 100%; text-align: center`): o texto começa em 296,1 px, centrado no grupo, enquanto as opções começam em 62 px. A caixa da legend continua em 62 px; o desvio é do texto. A 1ª auditoria cega deu a frase como conforme medindo a caixa (EC-062); o 2º auditor cego, no pedido neutro, mediu o texto em 296,09 px e decidiu viola (R-05).",
  "msg-erro::a2-ef29db5bb4ac": "Em S1, a mensagem de erro (classe danger, ícone times-circle) recebe o visual do estado Selecionado: fundo --blue-warm-vivid-50 (#2670e8), ícone e texto --pure-0, e um ícone fa-check antes do título.",
  "sel-continente::a2-7348bce34289": "Em S2 (lista aberta), os rótulos das 6 opções do select ficam #AAAAAA sobre branco: 2,32:1 (texto 14 px, peso 500); o item selecionado mantém a cor do core.",
  "inp-nome-pais::a2-328f62cfe4ce": "O campo Nome do país é `readonly` até receber um clique de ponteiro (script da página): com foco por Tab o texto digitado não entra (valor vazio).",
  "lst-paises::a2-5432c282d0d7": "Os 4 itens da lista de países têm `height: 74px; overflow: hidden`: a 1280×900 nada é cortado; a 640×450 (equivalente a 200 %) o conteúdo de cada item passa 19 px da altura visível. Medida da conferência de construção (E-02), que compara scrollHeight (93 px, inclui o padding-bottom de 16 px) com a altura visível (74 px). Os dois auditores cegos julgaram conforme: a 1ª auditoria mediu só a rolagem horizontal da página (EC-111); o 2º mediu a tinta do texto inteira a 640×450 (0 px de glifo cortado; só a caixa de linha passa ~1,6 px) (R-14). confirmacaoCega: false.",
};
const STATE = Object.fromEntries(anc.specs.map(s => [s.celula, s]));

const ordem = [...vig.filter(v => v.classe === "DS"), ...vig.filter(v => v.classe === "G")];
const violations = [], porSpec = {};
ordem.forEach((v, i) => {
  const id = `U-0${i + 1}`;
  const a = STATE[v.id], r = rec.sorteadas.find(s => s.celula === v.id), c = cv[v.id];
  const spec = { id, anchor: a.anchor, scope: a.scope, expectedCount: a.expectedCount };
  if (a.participantCount) spec.participantCount = a.participantCount;
  Object.assign(spec, { state: a.state, rules: c.rules, categories: p2[v.regra].categorias,
    description: `Estrato semeada · classe ${v.classe} · variante ${v.variante} · sorteada (${v.regra}). ${DESCR[v.id]}` });
  violations.push(spec);
  porSpec[id] = {
    celula: v.id, regra: v.regra, idsBase: r.idsBase, fonte: r.arquivo, estrato: "semeada", classe: v.classe,
    categoriasSeladas: p2[v.regra].categorias, tipo: p2[v.regra].tipo, variante: v.variante, instancia: v.sitio,
    posicaoNaOrdemDaClasse: v.posicao, ancoraTexto: a.texto,
    construcao: { violado: conf.variantes.semeada.obs[v.id].violado, fato: conf.variantes.semeada.obs[v.id].fato },
    auditoria: { resultado: r.auditoria.resultado, via: r.auditoria.via, achados: [r.auditoria.achado, ...r.auditoria.outrosAchadosDaMesmaTroca].filter(Boolean),
      conformeContrario: r.auditoria.conformeContrario, porque: r.auditoria.porque },
    coviolacoes: { emRules: c.coviolacoes.filter(x => x.entraEmRules).map(x => x.unidade), fora: c.coviolacoes.filter(x => !x.entraEmRules).map(x => ({ unidade: x.unidade, motivo: x.fora })), idsExpostosEmRules: c.rulesExpostos },
    remedidaCega: portao.porSpec.find(p => p.celula === v.id)?.remedida ?? null,
    confirmacaoCega: portao.porSpec.find(p => p.celula === v.id)?.confirmacaoCega ?? null,
    contaParaPortao: portao.porSpec.find(p => p.celula === v.id)?.contaEstrito ?? null,
    decisao: null,
  };
});

const CONFORMES = {
  "K-01": "andaime hdr-govbr: cabeçalho visível no topo, antes do main (conferência de construção); auditoria: 0 achado, 0 incerto.",
  "K-02": "andaime ftr-govbr: rodapé visível depois do main (construção); auditoria: 0 achado, 0 incerto.",
  "K-03": "andaime div-secoes: divisor entre a configuração e a lista, fora do foco (construção); auditoria: 0 achado, 0 incerto.",
  "K-04": "sorteável sem semente swt-certificado: role switch, aria-checked acompanha o estado, texto de estado pelos data-*, efeito imediato, Espaço alterna (construção); auditoria: 8 conformes, 0 achado, 0 incerto.",
  "K-05": "andaime btn-cancelar: secundário, 40 px, rótulo em uma linha com inicial maiúscula, à esquerda de Salvar (construção); auditoria: 8 conformes, 0 achado, 0 incerto.",
};

const fundo = rec.incertos.filter(x => x.destino === "fundo").map(x => `${x.id} (${x.instancia}): ${x.porque}`);
const ref = {
  _meta: {
    version: "0.9.0-rascunho",
    status: "RASCUNHO, não congelado (2026-11-14). Decisões da autora pendentes: tela-e2/decisoes-da-autora.md. Nenhuma execução de agente sobre a tela.",
    version_note: "Rascunho a partir do sorteio único (tela-e2/sorteio.json, semente f82c2f7c…, selo c2de436), da construção (tela-e2/construcao.md; conferir-construcao 100 % antes e depois da correção F-01, corpus 386a8d8) e da auditoria cega por medição (tela-e2/auditoria/, re-medida em tela-e2/remedida-2026-11-14). Ids U-* = unidades sorteadas (9: 6 DS + 3 G); EA-*/EC-*/EI-* = achados, conformes e incertos da auditoria. Regras de co-violação: R-CV (coviolacoes.mjs).",
    page: "Cadastrar país importador — tela E2 (página construída pelo procedimento da A2; plano B da tela E, D-200)",
    url: "/cadastro-pais.html",
    waitFor: anc.waitFor,
    suite: "cadastro-pais",
    ds: "gov.br Design System 3.7.0 (página com @govbr-ds/core 3.7.0)",
    unit_of_evaluation: "(elemento × defeito), no estado aplicável — a mesma unidade das telas A, A2, B e D. 'composicao' vale uma unidade com vários participantes.",
    viewport: { width: 1280, height: 900 },
    setup: anc.setup,
    setup_rationale: "Paradas da construção, em sequência aditiva: clicar Salvar País com o formulário vazio e esperar a mensagem de retorno (S1); clicar o gatilho do select Continente e esperar a lista aberta (S2). Conferido em tela-e2/conferir-ancoras.mjs: tudo o que se ancora em S0 e S1 continua visível em S2.",
    states: anc.states,
    sorteio: { arquivo: "tela-e2/sorteio.json", sha256: sha("sorteio.json"), semente: sorteio._meta.semente, selo: sorteio._meta.selo, vigentes: "tela-e2/sementes-vigentes.json", decisao: "D-200" },
    estratos: {
      semeada: { nota: "As 9 unidades sorteadas e em vigor; classe = a selada da célula (categorias do passo 2, regra CLASSE_DA_CATEGORIA). O desfecho coprimário da E é sobre as DS.", DS: violations.slice(0, 6).map(v => v.id), G: violations.slice(6).map(v => v.id) },
      naturais: { nota: "Página construída: não há defeitos naturais de rota. O único defeito acidental achado pela auditoria (F-01) foi corrigido; os incertos ficam em `fundo`.", specs: [] },
      exposto: { nota: "Nenhuma unidade sorteada é exposta (a exposição foi exclusão antes do sorteio). Ids expostos que entraram como co-violação estão em coviolacoes.idsExpostos.", specs: [] },
    },
    classes: Object.fromEntries(violations.map(v => [v.id, porSpec[v.id].classe])),
    coviolacoes: { regra: "R-CV (tela-e2/coviolacoes.mjs; reconciliacao.md § 5): mesmo defeito no mesmo hospedeiro = regras adicionais da mesma spec; não criam spec nem contam para o portão.",
      idsExpostos: Object.fromEntries(violations.filter(v => porSpec[v.id].coviolacoes.idsExpostosEmRules.length).map(v => [v.id, porSpec[v.id].coviolacoes.idsExpostosEmRules])) },
    conformes: {
      note: "Controles conformes pela regra de reconciliacao.md § 8: instância do inventário (sorteável sem semente ou andaime) que não hospeda unidade sorteada nem participa do observável de uma, com 0 achados e 0 incertos na auditoria cega, e medida conforme na conferência de construção. A E2 não sorteou chamarizes nem alternativas válidas.",
      itens: anc.controles.map(k => ({ id: k.id, state: k.state, selector: k.selector, count: k.count, rules: [], status: "conta", medida: CONFORMES[k.id] })),
    },
    fundo: "Condições que não são unidades (alegação correta = descoberta; reconciliacao.md § 3): " + fundo.join(" · "),
    fora_de_escopo: "Outras janelas e zoom (salvo os 200 % da U-09), outros navegadores, leitor de tela real, envio com sucesso (fora dos estados), redação salvo a regra sorteada, normas que saíram antes da semente (elegibilidade-passo2.json, exclusões). Alegação correta sobre o que está fora vira descoberta.",
    nunca_agregar_com: "ground-truth-processos.json (tela D), ground-truth-acompanhamento.json (A2), ground-truth-solicitacao.json (A), ground-truth-vistorias.json (B) e as demais referências — páginas diferentes (D-13, D-49). D e E nunca se somam (protocolo § 3.8).",
    baselines: "MEDIDAS sob o carimbo de cada bateria; nenhuma expectativa de detecção por ferramenta é declarada aqui (D-06).",
    rules_nota: "Ids da base literal 3.7.0 pelo localizador de proveniência (tela-e2/ponte-base.json: só id, source.corpusFile e source.charRange de normalizacao/rules.jsonl, sha256 408402bd…). e-MAG como emag:X.Y. Conferir contra a base que o oráculo congelado serve antes de congelar (não feito aqui: fora das entradas permitidas).",
    portao: { regra: portao._meta.regra, regraDaRemedida: portao._meta.regraDaRemedida, n_estrito: portao.n_estrito, passaEstrito: portao.passaEstrito, folga: portao.folga, n_soPrimeiraAuditoria: portao.n_soPrimeiraAuditoria, n_estritoSeItens2e3ForemB: portao.n_estritoSeItens2e3ForemB, iscas: portao._meta.iscas, arquivo: "tela-e2/portao.json" },
    semConfirmacaoCega: { nota: "Sorteadas que nenhum auditor cego confirmou (as duas medidas julgaram conforme): ficam pela E-02, com confirmacaoCega: false em porSpec; recall relatado com e sem elas; item 5 de decisoes-da-autora.md.", specs: Object.keys(porSpec).filter(k => porSpec[k].confirmacaoCega === false) },
    porSpec,
    escaladas: { fonte: "tela-e2/decisoes-da-autora.md", status: "pendente" },
    auditoria: "tela-e2/auditoria/ (cópia sem edição; auditoria.md · achados.json · conformes.json · incertos.json · medidas/)",
    remedida: "tela-e2/remedida-2026-11-14/ (rodar.mjs do 1º auditor na página corrigida: 12 achados, 0 novos; corrigidos.json) · tela-e2/remedida/ (2º auditor cego, pedido neutro de 14 itens com 10 iscas: 10/10 iscas satisfaz; remedida-juncao.json)",
    construcao: "tela-e2/construcao.md · node tela-e2/conferir-construcao.mjs (100 %)",
    reconciliacao: "tela-e2/reconciliacao.md · reconciliacao.json · coviolacoes.json · ancoras-referencia.json · portao.json",
  },
  violations,
};
writeFileSync(join(AQUI, "referencia-rascunho.json"), JSON.stringify(ref, null, 1) + "\n");
console.log(`specs ${violations.length} (DS ${ref._meta.estratos.semeada.DS.length}, G ${ref._meta.estratos.semeada.G.length}); conformes ${ref._meta.conformes.itens.length}; estados ${ref._meta.states.length}; rules ${violations.map(v => v.rules.length).join(",")}`);
