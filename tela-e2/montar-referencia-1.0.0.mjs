/**
 * Tela E2 — referência 1.0.0 a partir do rascunho 0.9.0 (referencia-rascunho.json), com as decisões da autora de
 * 2026-11-16 (D-202; tela-e2/decisoes-da-autora.md, opções "a" dos itens 2, 3, 6, 7, 8, 9, 10 e 11; itens 1, 4, 5 e
 * 12 só registro) e a adjudicação isolada da U-09 (tela-e2/adjudicacao-u09/veredito.json).
 *
 * Nada aqui muda semente, sorteio, variante, âncora ou estado. O que muda em relação ao rascunho:
 *   - U-09 sai de `violations` (denominador de positivos da referência principal) e vai, inteira, para a variante
 *     de sensibilidade declarada `_meta.sensibilidades.comU09` (desvio DV-01, registrado);
 *   - co-violações: cada regra adicional ganha o observável e o vínculo com a troca semeada (item 6a);
 *   - ids expostos: ficam em `rules`, marcados; a variante `semIdsExpostos` fica fixada agora (item 7a);
 *   - controles, fundo, portão e decisões registrados como a autora decidiu (itens 2a, 3a, 8a, 10a, 11a);
 *   - predicados de aceitação (`acceptance`) onde uma espécie implementada mede o observável (PREDICADOS abaixo).
 *
 * Uso:
 *   node tela-e2/montar-referencia-1.0.0.mjs              → tela-e2/referencia-candidata.json (1.0.0-candidata)
 *   node tela-e2/montar-referencia-1.0.0.mjs --congelar   → ground-truth-cadastro-pais.json (1.0.0) na raiz
 * O congelamento exige tela-e2/pagina-congelada.json (sha256 da página corrigida) e tela-e2/conferencia-ids-base.json
 * sem divergência.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const json = f => JSON.parse(readFileSync(join(AQUI, f), "utf8"));
const sha = f => createHash("sha256").update(readFileSync(join(AQUI, f))).digest("hex");
const CONGELAR = process.argv.includes("--congelar");

const rascunho = json("referencia-rascunho.json");
const veredito = json("adjudicacao-u09/veredito.json");
const cv = json("coviolacoes.json").porCelula;
const p2 = json("elegibilidade-passo2.json").regras;
const U = Object.fromEntries(json("universo.json").unidades.map(u => [u.id, u]));
const achados = json("auditoria/achados.json").achados;
const portao = json("portao.json");

const SHA_VEREDITO = sha("adjudicacao-u09/veredito.json");
if (!SHA_VEREDITO.startsWith("648daf95")) throw new Error(`veredito da U-09 com sha256 inesperado: ${SHA_VEREDITO}`);
if (veredito.unidade !== "U-09") throw new Error("veredito não é da U-09");
const U09_SAI = veredito.veredito === "violacao-nao-demonstrada";

const meta = structuredClone(rascunho._meta);
const todas = structuredClone(rascunho.violations);

// ── Item 6a: observável e vínculo com a troca semeada, por regra adicional (co-violação em `rules`) ─────────────────
// Escrito à mão a partir de construcao.md › Acoplamentos e dos achados da auditoria cega (auditoria/achados.json).
// Mesmo hospedeiro, mesma troca, mesmo estado; nenhuma regra adicional cria spec ou unidade.
const OBS_CV = {
  "a2-df449a7d5cd8": { observavel: "posição relativa na barra de ações: o secundário Limpar Campos à direita do primário Salvar País (x do Limpar > borda direita do Salvar), S0–S2", vinculo: "o mesmo `order: 1` da variante sorteada; é o mesmo observável lido por outra frase do Button" },
  "a2-bde476da44c9": { observavel: "ordem visual da barra (Cancelar, Salvar, Limpar) diferente da ordem de Tab e do DOM (Cancelar → Limpar → Salvar), S0–S2 (EA-02)", vinculo: "a variante manda mover o Limpar só pela folha, sem mudar o DOM; a ordem visual passa a divergir da de tabulação por construção" },
  "a2-66f05213a674": { observavel: "ênfase de maior relevância (primária) fora da posição mais à direita da barra, S0–S2 (EA-01)", vinculo: "o mesmo `order: 1`; frase do Button julgada `duplicada` de a2-df449a7d5cd8 no passo 2 selado" },
  "a2-0f20577609d3": { observavel: "a mesma divergência entre ordem visual e ordem de navegação do formulário, S0–S2 (EA-02)", vinculo: "o mesmo `order: 1` sem mudança do DOM" },
  "a2-db30195b0e66": { observavel: "corpo da mensagem de orientação com jargão de sistema (7 termos técnicos), S0–S2 (EA-10, cláusula principal)", vinculo: "o texto da própria variante sorteada (mensagem-jargao-tecnico)" },
  "a2-a06dc9ebbfe4": { observavel: "o mesmo texto com jargão, sem explicação dos termos, S0–S2 (EA-11)", vinculo: "o texto da própria variante sorteada" },
  "a2-460f5696acde": { observavel: "botão de ajuda sem o ícone de referência de ajuda (0 ícone visível), S0–S2", vinculo: "a variante tira o `<i>` do botão circular (construcao.md › Acoplamentos)" },
  "a2-d47f4c470491": { observavel: "botão sem texto visível e sem ícone que exprima a ação (0 ícone visível), S0–S2", vinculo: "a mesma remoção do `<i>`" },
  "a2-db50df136f86": { observavel: "elemento de ação sem ícone que represente a ação (0 ícone visível), S0–S2", vinculo: "a mesma remoção do `<i>`" },
  "a2-d43497944f79": { observavel: "acionador de ajuda do formulário sem ícone nem texto que indique a finalidade, S0–S2 (EA-03)", vinculo: "a mesma remoção do `<i>`; passo 2 selado `nao-se-aplica` para a frase como sorteável, citada pelo auditor como cláusula do mesmo defeito" },
  "a2-0b6ac0a6bc42": { observavel: "mensagem de erro com o fundo do estado Selecionado (#2670e8), cor que não indica o estado de erro, S1 (EA-12)", vinculo: "o fundo `--blue-warm-vivid-50` da própria variante (mensagem-com-visual-selecionado)" },
  "a2-2f6900335a84": { observavel: "rótulos das 6 opções a 2,32:1 sobre branco (< 4,5:1), S2 (EA-08)", vinculo: "o #AAAAAA da própria variante (opcoes-texto-claro)" },
  "a2-66fbdcf13772": { observavel: "o mesmo contraste de 2,32:1 nas 6 opções, S2 (EA-08)", vinculo: "o #AAAAAA da própria variante" },
  "a2-3fb37eb25f3c": { observavel: "cor dos rótulos (#AAAAAA) fora da paleta pré-definida, S2 (EA-09)", vinculo: "o valor literal #AAAAAA está escrito na própria variante selada" },
  "a2-d817fab151df": { observavel: "campo obrigatório que não aceita digitação logo após o foco por Tab (valor vazio), S0–S2 (EA-04)", vinculo: "o `readonly` até o clique da própria variante (campo-readonly-ate-clique)" },
  "a2-acc4801af71c": { observavel: "liberação do campo (remoção do readonly) só por clique de ponteiro, não por teclado, S0–S2 (EA-05)", vinculo: "o ouvinte de clique da própria variante" },
  "a2-a14d31901423": { observavel: "itens da lista com altura fixa (74 px, overflow hidden), que não acompanha o conteúdo a 640×450", vinculo: "o `height: 74px; overflow: hidden` da própria variante (altura-fixa-corta); só na variante de sensibilidade comU09" },
};

// ── Item 7a: ids expostos marcados; distinção "detectou o defeito do DS" × "fundamentada por norma exposta" ───────
const EXPOSTOS = rascunho._meta.coviolacoes.idsExpostos; // { spec: [ids] }
const tipoId = id => id.startsWith("emag:") ? "emag (geral)" : "base literal do DS";

// ── Passo 3: predicados de aceitação (espécies implementadas em scripts/acceptance-predicates.ts) ─────────────────
// Só onde uma espécie implementada mede o observável da variante. As outras specs ficam sem predicado
// (`nao-implementado`), com a razão em SEM_PREDICADO; isso nunca é aceitação nem recusa.
// Valores medidos na página servida (corpus 386a8d8 e depois da F-02), 1280×900, nos estados da spec.
const PREDICADOS = {
  "U-01": { kind: "estilo-computado", properties: ["order"], forbidden: ["1"],
    note: "pagina.css: .acoes-formulario .acao-limpar { order: 1 } (a troca da variante secundario-a-direita-do-primario); Cancelar e Salvar computam order 0. O predicado mede a troca que põe o secundário à direita do primário; a posição (x do Limpar > borda direita do Salvar) é medida em tela-e2/conferir-construcao.mjs." },
  "U-04": { kind: "estilo-computado", properties: ["font-family"], allowed: ["Rawline, Raleway, sans-serif"],
    note: "Família do DS: o que o core 3.7.0 computa para --font-family-base (Rawline), medido no campo irmão #inp-nome-pais. pagina.css: .campo-codigo .br-input { font-family: Arial, Helvetica, sans-serif }." },
  "U-05": { kind: "estilo-computado", properties: ["text-align"], forbidden: ["center"],
    note: "pagina.css: legend do grupo com width: 100%; text-align: center (variante legenda-centralizada); o texto começa centrado no grupo, à direita do início das opções (medido em tela-e2/conferir-construcao.mjs)." },
  "U-06": { kind: "estilo-computado", properties: ["background-color"], forbidden: ["rgb(38, 112, 232)"],
    note: "pagina.css: .formulario-pais .retorno-envio { --message-background: var(--blue-warm-vivid-50) } = #2670e8, o fundo do estado Selecionado (variante mensagem-com-visual-selecionado), numa mensagem de classe danger. O fa-check, segundo observável da variante, não tem espécie de predicado; medido em tela-e2/conferir-construcao.mjs." },
  "U-07": { kind: "estilo-computado", properties: ["color"], forbidden: ["rgb(170, 170, 170)"],
    note: "pagina.css: --text-color #aaa nos itens do select (variante opcoes-texto-claro); sobre o fundo branco da lista dá 2,32:1 (contraste medido em tela-e2/conferir-construcao.mjs)." },
};
const SEM_PREDICADO = {
  "U-02": "sem predicado: o observável é o texto (jargão técnico no corpo da mensagem); nenhuma espécie implementada mede texto. Medido em tela-e2/conferir-construcao.mjs (termos técnicos contados).",
  "U-03": "sem predicado: o observável é a ausência de ícone visível no botão circular; nenhuma espécie implementada mede ausência de filho ou pixels. Medido em tela-e2/conferir-construcao.mjs.",
  "U-08": "sem predicado: o observável é comportamento (digitar após foco por Tab não entra no valor); a espécie de atributos mede só ausência, e o readonly presente não é o defeito por si. Medido em tela-e2/conferir-construcao.mjs.",
  "U-09": "sem predicado (variante comU09): a altura fixa é medível, mas a adjudicação concluiu que a perda de conteúdo não foi demonstrada; um predicado sobre a troca não provaria o defeito.",
};

// ── Specs da referência principal ────────────────────────────────────────────────────────────────────────────────
const violations = todas.filter(v => !(U09_SAI && v.id === "U-09")).map(v => {
  const out = { ...v };
  if (PREDICADOS[v.id]) {
    const { rules, categories, description, ...antes } = out;
    Object.assign(antes, { acceptance: PREDICADOS[v.id] });
    return { ...antes, rules, categories, description };
  }
  return out;
});
const specU09 = todas.find(v => v.id === "U-09");

// porSpec: decisões e co-violações com observável
const porSpec = meta.porSpec;
for (const [id, s] of Object.entries(porSpec)) {
  const c = cv[s.celula];
  s.coviolacoes.emRules = c.coviolacoes.filter(x => x.entraEmRules).map(x => {
    const o = OBS_CV[x.unidade];
    if (!o) throw new Error(`co-violação sem observável escrito: ${x.unidade}`);
    return { unidade: x.unidade, ids: x.idsBase, origem: x.origem, passo2: x.passo2, observavel: o.observavel, vinculo: o.vinculo, exposto: x.expostos.length > 0 };
  });
  s.aceitacao = PREDICADOS[id] ? "predicado" : (SEM_PREDICADO[id] ?? null);
}
porSpec["U-02"].decisao = { item: 3, opcao: "a", data: "2026-11-16", texto: "mesma cláusula: a frase sorteada em `tambem` do achado, no mesmo hospedeiro, estado e observável, conta como na principal (regra uniforme, _meta.regraMesmaClausula)" };
const ea06 = achados.find(a => a.id === "EA-06");
porSpec["U-04"].decisao = {
  item: 2, opcao: "a", data: "2026-11-16",
  texto: "mesma cláusula pela duplicata julgada e selada antes do sorteio; a decisão vale pela equivalência, precise ou não o portão dela",
  equivalencia: {
    citada: { unidade: "a2-f82d600db413", arquivo: U["a2-f82d600db413"].fonte.arquivo, texto: U["a2-f82d600db413"].texto, citacaoDoAuditor: ea06.clausulas.find(c => c.citacao.includes("Rawline")).citacao, achado: "EA-06" },
    sorteada: { unidade: "a2-a39f3ad397d4", arquivo: U["a2-a39f3ad397d4"].fonte.arquivo, texto: U["a2-a39f3ad397d4"].texto },
    julgamentoSelado: { motivo: p2["a2-f82d600db413"].motivo, justificativa: p2["a2-f82d600db413"].justificativa, lote: p2["a2-f82d600db413"].origem, arquivo: "tela-e2/elegibilidade-passo2.json", selo: "c2de4360e1269535b3be20424833c874767195a6", sorteio: "479e730 (depois do selo)" },
  },
};
porSpec["U-09"].decisao = { item: "U-09 (opção a)", data: "2026-11-16", texto: `adjudicação isolada sobre a evidência existente: ${veredito.veredito}; sai do denominador de positivos da referência principal; fica na variante de sensibilidade comU09`, veredito: { arquivo: "tela-e2/adjudicacao-u09/veredito.json", sha256: SHA_VEREDITO } };
porSpec["U-09"].naReferenciaPrincipal = !U09_SAI;
for (const id of ["U-01", "U-07", "U-08"]) porSpec[id].decisao = { item: 7, opcao: "a", data: "2026-11-16", texto: "ids expostos ficam em `rules`, marcados; a variante semIdsExpostos fica fixada antes da coleta" };

// ── _meta ────────────────────────────────────────────────────────────────────────────────────────────────────────
Object.assign(meta, {
  version: CONGELAR ? "1.0.0" : "1.0.0-candidata",
  status: CONGELAR
    ? "CONGELADA (2026-11-16). Nenhuma execução de agente sobre a tela antes deste congelamento. Mudança só por versão nova com decisão registrada."
    : "CANDIDATA a 1.0.0 (2026-11-16), não congelada: decisões da autora aplicadas (D-202).",
  version_note: "1.0.0 a partir do rascunho 0.9.0 (tela-e2/referencia-rascunho.json) com as decisões da autora de 2026-11-16 (D-202; tela-e2/decisoes-aplicadas-2026-11-16.md) e a adjudicação isolada da U-09 (tela-e2/adjudicacao-u09/). Sorteio único (tela-e2/sorteio.json, semente f82c2f7c…, selo c2de436); construção tela-e2/construcao.md; auditoria cega tela-e2/auditoria/; re-medidas tela-e2/remedida-2026-11-14/, tela-e2/remedida/ e tela-e2/remedida-2026-11-16/. Ids U-* = unidades sorteadas; EA-*/EC-*/EI-* = achados, conformes e incertos da auditoria. Referência principal: 8 specs (6 DS + 2 G), 8 unidades; variantes de sensibilidade em _meta.sensibilidades.",
  decisoesDaAutora: {
    data: "2026-11-16", decisao: "D-202", fonte: "tela-e2/decisoes-da-autora.md", aplicadas: "tela-e2/decisoes-aplicadas-2026-11-16.md",
    opcoes: { "2": "a", "3": "a", "6": "a", "7": "a", "8": "a", "9": "a", "10": "a", "11": "a" },
    soRegistro: [1, 4, 5, 12],
    U09: "opção a: adjudicação isolada sobre a evidência existente (tela-e2/adjudicacao-u09/), aplicada como veio",
  },
  regraMesmaClausula: "Regra uniforme (item 3a): a sorteada foi achada com a mesma cláusula quando a frase sorteada é a cláusula principal OU está em `tambem` de um achado, no mesmo hospedeiro, no mesmo estado e com o mesmo observável; ou quando o auditor citou uma frase que o passo 2 selado julgou `duplicada:<sorteada>` antes do sorteio (item 2a). Vale igual para todas as specs.",
});
meta.estratos.semeada.G = meta.estratos.semeada.G.filter(id => !(U09_SAI && id === "U-09"));
meta.estratos.semeada.nota = "Unidades sorteadas e em vigor na referência principal; classe = a selada da célula (categorias do passo 2, regra CLASSE_DA_CATEGORIA). O desfecho coprimário da E é sobre as DS. A U-09 (G) está fora da principal (desvio DV-01) e entra só na variante comU09.";
meta.classes = Object.fromEntries(violations.map(v => [v.id, meta.classes[v.id]]));
meta.coviolacoes = {
  regra: "R-CV (tela-e2/coviolacoes.mjs; reconciliacao.md § 5), aceita pela autora (item 6a): co-violação obrigatória e inseparável — a mesma troca semeada, ao pé da letra, quebra outra unidade no mesmo hospedeiro — entra como regra adicional da MESMA spec.",
  condicoes: [
    "não aumenta o número de specs nem de unidades: uma spec por hospedeiro × defeito;",
    "cada regra adicional registra o observável e o vínculo com a troca semeada (porSpec.<U>.coviolacoes.emRules);",
    "não dá crédito citar uma norma de `rules` sem mostrar o defeito daquela unidade (o observável, no hospedeiro e no estado): a norma só fundamenta uma alegação que já detectou o defeito;",
    "co-violação não conta para o portão.",
  ],
  idsExpostos: EXPOSTOS,
};
meta.fundamentacao = {
  regra: "Item 7a. Versão principal = a descrição normativa verdadeira: `rules` com os ids expostos (ids que são spec em A, A2, B ou D), marcados em _meta.coviolacoes.idsExpostos. Variante de sensibilidade fixada antes da coleta: _meta.sensibilidades.semIdsExpostos. Detecção não depende de id.",
  distincao: "Onde uma unidade pode ser fundamentada por norma do DS não exposta e também por norma já exposta, a contagem separa: (i) 'detectou o defeito do DS' — a alegação afirma o defeito da unidade e, se cita norma, cita um id não exposto de `rules`; (ii) 'fundamentada por norma exposta' — a alegação afirma o defeito, mas o único id de `rules` que ela cita é exposto. (ii) nunca é contado como (i).",
  porSpec: Object.fromEntries(Object.entries(EXPOSTOS).filter(([id]) => violations.some(v => v.id === id)).map(([id, exp]) => {
    const rules = violations.find(v => v.id === id).rules;
    return [id, { classe: meta.classes[id], naoExpostos: rules.filter(r => !exp.includes(r)).map(r => ({ id: r, tipo: tipoId(r) })), expostos: exp.map(r => ({ id: r, tipo: tipoId(r) })) }];
  })),
};
meta.conformes.note = "Controles conformes (item 8a): instância do inventário (sorteável sem semente ou andaime) que não hospeda unidade sorteada nem participa do observável de uma, com 0 achados e 0 incertos na auditoria cega, e medida conforme na conferência de construção. A E2 não sorteou chamarizes nem alternativas válidas.";
meta.conformes.selecao = "Ressalva declarada (item 8a): a regra de seleção dos controles foi escrita DEPOIS de ver a cobertura da auditoria cega (reconciliacao.md § 8), não antes do sorteio. Os 5 controles ficam como negativos declarados; a taxa de falso alarme sobre eles é descritiva e condicionada a essa seleção, nunca um estimador da especificidade na página.";
meta.fundo = rascunho._meta.fundo +
  " · EI-08 (sel-continente; item 10a, fundo): ícone angle no gatilho do select, marcação do exemplo do @govbr-ds/core 3.7.0; o BRSelect do core.min.js 3.7.0 servido troca fa-angle-down/fa-angle-up por nome de classe ao abrir e fechar. Fica como fundo documentando comportamento e versão do core; nada aqui afirma conformidade normativa por ser exemplo do core." +
  " · EI-14 (msg-orientacao; item 11a, fundo): estrangeirismos do jargão sem `lang`; o e-MAG 3.2 é `nao-se-aplica` no passo 2 selado e a elegibilidade não é alargada; não entra em `rules` da U-02.";
meta.correcoesDaPagina = [
  { id: "F-01", achado: "EA-07", corpus: "386a8d8", oque: "espaçamento do texto de apoio do código pelo token base", data: "2026-11-14" },
  { id: "F-02", incertos: ["EI-02", "EI-03", "EI-04"], item: "9a", oque: "instrução geral no formulário (campos obrigatórios, salvo os marcados como opcionais); nenhuma unidade sorteada tocada", data: "2026-11-16", registro: "tela-e2/pagina-congelada.json" },
];
meta.fora_de_escopo = "Outras janelas e zoom, outros navegadores, leitor de tela real, envio com sucesso (fora dos estados), redação salvo a regra sorteada, normas que saíram antes da semente (elegibilidade-passo2.json, exclusões). A janela de 640×450 (200 %) só entra na variante de sensibilidade comU09. Alegação correta sobre o que está fora vira descoberta.";
meta.portao = {
  regra: portao._meta.regra,
  regraDaRemedida: portao._meta.regraDaRemedida,
  regraDaRemedidaFixadaEm: "2026-11-14, antes da medida: tela-e2/remedida-mapa.json no commit eval 6d456bd (2026-11-14 23:02 -0300); a saída do 2º auditor entrou depois, em 4dc0b2c",
  n_soPrimeiraAuditoria: portao.n_soPrimeiraAuditoria,
  n_combinadoComRemedida: portao.n_estrito,
  specsDSemVigor: portao.specsDSemVigor,
  limiar: portao.limiar,
  passa: portao.n_estrito >= portao.limiar,
  folga: portao.n_estrito - portao.limiar,
  leitura: "Ficam os dois números: 4 de 6 pela 1ª auditoria sozinha (não passaria) e 6 de 6 pela regra combinada com a re-medida (passa, folga 1). Itens 2 e 3 decididos 'a' (2026-11-16): a contagem combinada fica em 6.",
  iscas: portao._meta.iscas,
  arquivo: "tela-e2/portao.json",
};
delete meta.semConfirmacaoCega;
meta.desvios = [
  { id: "DV-01", oque: "U-09 (classe G) sai do denominador de positivos da referência principal", porque: `adjudicação isolada sobre a evidência existente, sem medição nova: ${veredito.veredito} (as medições do observável — tinta, pixels, rolagem horizontal — dão conforme; a única medida contrária, scrollHeight − clientHeight, é substituto que inclui o padding)`, data: "2026-11-16", decisao: "D-202 (opção a da U-09)", veredito: { arquivo: "tela-e2/adjudicacao-u09/veredito.json", sha256: SHA_VEREDITO }, alcance: "É unidade geral (G): não toca o portão do DS nem a contagem DS. A regra E-02 do método (sorteada medida fica) não é aplicada a ela por decisão explícita, registrada aqui.", sensibilidade: "_meta.sensibilidades.comU09" },
  { id: "DV-02", oque: "S2 alcançado depois de S1 (sequência aditiva S0 → S1 → S2)", porque: "na construção e na auditoria S2 partia da carga; o `setup` da referência exige sequência aditiva (item 12)", data: "2026-11-14", conferido: "conferir-ancoras.mjs e conferir:referencia: âncoras, controles e predicados resolvem em cada parada, sem recarga" },
  { id: "DV-03", oque: "controles conformes selecionados depois da auditoria", porque: "a E2 não sorteou chamarizes; a regra dos controles foi escrita depois de ver a cobertura da auditoria (item 8a)", data: "2026-11-14", efeito: "falso alarme sobre os controles é descritivo e condicionado à seleção" },
];
meta.sensibilidades = {
  nota: "Variantes declaradas antes da coleta, como dados. Relatam-se ao lado da principal, nunca no lugar dela, e nunca se somam entre si.",
  semIdsExpostos: {
    oque: "a referência principal com os ids expostos retirados de `rules` (item 7a)",
    rules: Object.fromEntries(violations.filter(v => EXPOSTOS[v.id]).map(v => [v.id, v.rules.filter(r => !EXPOSTOS[v.id].includes(r))])),
    demais: "as outras specs não têm id exposto: `rules` igual à principal",
  },
  comU09: {
    oque: "a referência principal mais a U-09 (classe G), como no rascunho 0.9.0: 9 specs (6 DS + 3 G), 9 unidades",
    porque: "DV-01: a U-09 saiu da principal por violacao-nao-demonstrada; a variante mostra o recall com ela",
    classe: "G",
    confirmacaoCega: false,
    spec: specU09,
    porSpec: "porSpec.U-09",
  },
};
meta.escaladas = { fonte: "tela-e2/decisoes-da-autora.md", status: "decididas 2026-11-16 (D-202): opções a dos itens 2, 3, 6, 7, 8, 9, 10 e 11; U-09 pela adjudicação", aplicadas: "tela-e2/decisoes-aplicadas-2026-11-16.md" };
meta.remedida = rascunho._meta.remedida + " · tela-e2/remedida-2026-11-16/ (rodar.mjs do 1º auditor na página com a F-02)";
meta.reconciliacao = rascunho._meta.reconciliacao + " · decisoes-aplicadas-2026-11-16.md · adjudicacao-u09/";

// Ids conferidos contra a base que o oráculo congelado serve (passo 2) e página congelada (passo 4)
if (existsSync(join(AQUI, "conferencia-ids-base.json"))) {
  const ci = json("conferencia-ids-base.json");
  meta.rules_nota = `Ids da base literal 3.7.0 pelo localizador de proveniência (tela-e2/ponte-base.json); e-MAG como emag:X.Y. Conferidos contra a base que o oráculo congelado 3.7.12 serve (${ci._meta.base.versao}, rules.jsonl sha256 ${ci._meta.base.rulesSha256.slice(0, 12)}…): ${ci._meta.contagens.conferidos} ids, ${ci._meta.contagens.casam} casam, ${ci._meta.contagens.divergem} divergem (tela-e2/conferencia-ids-base.json, sha256 ${sha("conferencia-ids-base.json")}).`;
}
if (existsSync(join(AQUI, "pagina-congelada.json"))) {
  const pg = json("pagina-congelada.json");
  meta.pagina = { corpus: pg.corpus, arquivos: pg.arquivos, registro: "tela-e2/pagina-congelada.json" };
}

if (CONGELAR) {
  const ci = json("conferencia-ids-base.json");
  if (ci._meta.contagens.divergem !== 0) throw new Error("há id divergente da base servida: não congela");
  if (!existsSync(join(AQUI, "pagina-congelada.json"))) throw new Error("falta pagina-congelada.json");
}

const ref = { _meta: meta, violations };
const destino = CONGELAR ? join(RAIZ, "ground-truth-cadastro-pais.json") : join(AQUI, "referencia-candidata.json");
writeFileSync(destino, JSON.stringify(ref, null, 1) + "\n");
const ds = violations.filter(v => meta.classes[v.id] === "DS").length;
console.log(`${meta.version}: specs ${violations.length} (DS ${ds}, G ${violations.length - ds}); unidades ${violations.reduce((n, v) => n + (v.scope === "composicao" ? 1 : v.expectedCount), 0)}; ` +
  `conformes ${meta.conformes.itens.length}; estados ${meta.states.length}; com predicado ${violations.filter(v => v.acceptance).length}; ` +
  `co-violações em rules ${Object.values(porSpec).reduce((n, s) => n + s.coviolacoes.emRules.length, 0)} → ${destino}`);
