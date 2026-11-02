/**
 * Tabela regra × veredito da tela A2 e os entregáveis achados.json / conformes.json / incertos.json /
 * decisoes.json. Universo: a base literal DS 3.7.0 (+ e-MAG 3.1 nela contido) —
 * govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized/rules.jsonl, só o TEXTO
 * das normas (nenhum código do validador é importado) — filtrada a: força required/prohibited E
 * (componente presente na lista neutra OU regra global). Mais a camada WCAG 2.1 (critérios citados por número,
 * do conhecimento do auditor) para o que a base não cobre literalmente.
 *
 * Os vereditos estão escritos abaixo, à mão, cada um com a medida que o sustenta (arquivos de medidas/).
 * Regra sem decisão explícita cai em `incerto` do tipo "nao-medida" (listada em incertos.json) — nunca em
 * conforme. Nenhum filtro por automatable/automationConfidence/validationStrategy.
 * Uso: node tela-a2/auditoria/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { AQUI, KB_DIR, ANCORAS } from "./comum.mjs";

const KB = join(KB_DIR, "rules.jsonl");
const textoKB = readFileSync(KB, "utf8");
const REGRAS = textoKB.trim().split("\n").map(l => JSON.parse(l));
const PORID = new Map(REGRAS.map(r => [r.id, r]));
const PRESENTES = new Set(ANCORAS.componentesPresentes);
const UNIVERSO = REGRAS.filter(r => (r.force === "required" || r.force === "prohibited") && (r.component === null || PRESENTES.has(r.component)));
const P = "govbr-3.7.0-";
const id = s => s.startsWith(P) ? s : P + s;

/* ---------- construtores ---------- */
const D = new Map();          // id completo → [decisões]
const ACHADOS = [];           // defeitos (um por unidade violada: regra principal × elemento × estado(s))
const add = (rid, d) => { const k = id(rid); if (!PORID.has(k)) throw new Error("regra inexistente na base: " + k); (D.get(k) || D.set(k, []).get(k)).push(d); };
const OK = (rid, medida, evid, estados = "S0 S1 S2") => add(rid, { veredito: "conforme", estados, medida, evidencia: evid });
const NA = (rid, motivo, evid = null) => add(rid, { veredito: "nao-se-aplica", medida: motivo, evidencia: evid });
const INC = (rid, medida, motivo, evid = null, tipo = "medido-ambiguo") => add(rid, { veredito: "incerto", tipo, medida, motivo, evidencia: evid });
const SEMOBS = (rids, motivo) => rids.forEach(r => add(r, { veredito: "incerto", tipo: "sem-observavel", medida: null, motivo }));
const NAS = (rids, motivo) => rids.forEach(r => NA(r, motivo));
const OKS = (rids, medida, evid) => rids.forEach(r => OK(r, medida, evid));

/** Achado: `regra` é uma regra da base (id curto) ou um critério WCAG ({ wcag: "2.5.3", nivel: "A", texto }). */
function V({ regra, tambem = [], estado, seletor, componente, medida, esperado, justificativa, evidencia, origem }) {
  let r;
  if (typeof regra === "string") {
    const k = id(regra); const base = PORID.get(k); if (!base) throw new Error("regra inexistente: " + k);
    r = { id: k, texto: base.normalizedRule.replace(/\s+/g, " ").slice(0, 220), fonte: base.emagReferences.length ? `e-MAG 3.1 rec. ${base.emagReferences.join(", ")} (via base DS 3.7.0)` : `DS 3.7.0 (${base.source.pageTitle ?? base.source.locator}${base.source.tab ? " › " + base.source.tab : ""})`, forca: base.force, wcag: base.wcagReferences };
    add(regra, { veredito: "violada", estados: estado, medida, achado: null });
  } else r = { id: `WCAG-2.1-${regra.wcag}`, texto: regra.texto, fonte: `WCAG 2.1 critério ${regra.wcag} (nível ${regra.nivel})`, forca: `WCAG ${regra.nivel}`, wcag: [regra.wcag] };
  const tb = tambem.map(t => typeof t === "string" ? (() => { const k = id(t); const b = PORID.get(k); if (!b) throw new Error("regra inexistente: " + k); add(t, { veredito: "violada", estados: estado, medida: "mesmo fato do achado principal", achado: null }); return { id: k, fonte: b.emagReferences.length ? `e-MAG ${b.emagReferences.join(",")}` : "DS 3.7.0", forca: b.force }; })() : { id: `WCAG-2.1-${t.wcag}`, fonte: `WCAG 2.1 ${t.wcag} (${t.nivel})`, forca: `WCAG ${t.nivel}` });
  const a = { id: `A2-${String(ACHADOS.length + 1).padStart(2, "0")}`, estado, seletor, componente, regra: { id: r.id, texto: r.texto, fonte: r.fonte, wcag: r.wcag }, medida, esperado, forca: r.forca, justificativa, tambemViola: tb, evidencia, origem: origem ?? null };
  ACHADOS.push(a);
  for (const k of [r.id, ...tb.map(x => x.id)]) { const ds = D.get(k); if (ds) ds.filter(x => x.veredito === "violada" && !x.achado).forEach(x => (x.achado = a.id)); }
  return a;
}
const ORIG_SCRIPT = "posto por script (origem.json: o core.min.js sozinho não muda o DOM; core do DS instanciado pela página e script autoral são inseparáveis por ablação)";
const ORIG_MARC = "marcação servida (origem.json: presente com JavaScript desligado)";
const ORIG_CSS = "estilo computado da folha servida (um só bundle CSS; DS e autoral inseparáveis sem ler fontes)";

/* =====================================================================================
 * ACHADOS (violadas)
 * ===================================================================================== */
V({ regra: "accessibility-global-6021746e010c", tambem: ["accessibility-global-6b0032e5c8b1", "accessibility-global-53236e27ac9c", "accessibility-global-e47b4f4c0b26", { wcag: "3.2.5", nivel: "AAA" }],
  estado: "S0 S1 S2 (observação de 360 s)", seletor: "head > meta[http-equiv=refresh]", componente: "pagina",
  medida: "<meta http-equiv=\"refresh\" content=\"300\"> no HTML servido; na observação de 360 s sem interação o documento foi recarregado aos 300,1 s (beforeunload 300 123 ms, documento novo 300 132 ms, load 300 174 ms) — 2 documentos na janela, 1 recarga.",
  esperado: "nenhuma atualização/redirecionamento automático por meta refresh (e-MAG 2.3 e 2.4)",
  justificativa: "Proibição literal (force prohibited) do uso de http-equiv refresh; a recarga periódica foi observada com carimbo.", evidencia: "medidas/observacao-360.json; medidas/html-servido.json › metaRefresh", origem: ORIG_MARC });
V({ regra: "accessibility-global-7bb1e5ca34ff", tambem: ["accessibility-global-31cf88f381f6", "accessibility-global-8d14c83c9686", "accessibility-global-29482716b19d", "accessibility-global-3a0935b60260", { wcag: "2.2.1", nivel: "A" }],
  estado: "S1 (observação complementar de 330 s)", seletor: "head > meta[http-equiv=refresh]", componente: "pagina",
  medida: "Em S1, com 'Comprovante de residência' escolhido no select e o switch de e-mail ligado, a recarga dos 300,2 s devolveu a página ao estado inicial: aba ativa aba-andamento, select vazio, switch desligado. Nenhum texto visível com 'atualiz…' em 36 amostras; nenhum controle para desligar, ajustar ou prolongar o limite.",
  esperado: "limite de tempo informado e com opção de desligar/ajustar/prolongar; tempo suficiente para preencher o formulário de consulta a processo",
  justificativa: "A recarga de 300 s funciona como limite de tempo não anunciado que descarta o preenchimento (dados perdidos medidos).", evidencia: "medidas/observacao-recarga-estado.json; medidas/observacao-360.json › amostras", origem: ORIG_MARC });
V({ regra: "accessibility-global-19cbc02f51c6", tambem: ["accessibility-global-1f1370424402", "accessibility-global-49089865cd5d"],
  estado: "S0 S1 S2", seletor: "#msg-pendencia > div:nth-of-type(2) (align=\"left\") e #msg-pendencia > div:nth-of-type(2) > font", componente: "message",
  medida: "o conteúdo da mensagem de pendência usa <div align=\"left\"> e <font color=\"#333333\"> (obsoletos no HTML vigente do W3C); presentes no HTML servido.",
  esperado: "HTML conforme às normas do W3C, apresentação só por CSS (camadas separadas)",
  justificativa: "font e o atributo align são marcação apresentacional obsoleta.", evidencia: "medidas/S0/pagina.json › apresentacional; medidas/html-servido.json › elementosApresentacionais", origem: ORIG_MARC });
V({ regra: "development-global-a4f97ebb50c5", estado: "HTML servido", seletor: "img (2) e input (8) com '/>' — linhas 18, 156, 163, 169, 175, 186, 201, 207, 213, 257", componente: "pagina",
  medida: "10 elementos vazios fechados com '/>' no HTML servido (2 img, 8 input); os meta/link não.", esperado: "elementos de fecho automático sem '/>'",
  justificativa: "Proibição literal (NÃO fechar tags de fecho automático), medida nos bytes servidos.", evidencia: "medidas/html-servido.json › autoFechados", origem: ORIG_MARC });
V({ regra: "accessibility-global-748eb01e1800", estado: "S0 S1 S2", seletor: "html", componente: "pagina",
  medida: "0 elementos <noscript>; abas, select (lista de opções), botão do upload e mensagens dependem de script (origem.json: 31 elementos com atributos postos por script; 12 elementos da lista do select são refeitos por script).",
  esperado: "elemento NOSCRIPT cobrindo os casos em que scripts não são suportados", justificativa: "Obrigação literal do e-MAG 2.2; ausência medida.", evidencia: "medidas/S0/pagina.json › noscript; medidas/origem.json", origem: ORIG_MARC });
V({ regra: "accessibility-global-7c91abad32ce", tambem: [{ wcag: "4.1.2", nivel: "A" }], estado: "S0 S1 S2", seletor: ".atalhos-pagina (role=menubar) > a (role=menuitem)", componente: "skiplink",
  medida: "o skiplink é <nav role=\"menubar\"> com links role=\"menuitem\"; com foco no 1º item, ArrowRight e ArrowDown não movem o foco (continua em 'Ir para o conteúdo'); a árvore AX expõe menubar/menuitem.",
  esperado: "papel de acordo com a função (lista de links de atalho), sem papel de widget cujo modelo de teclado não é implementado",
  justificativa: "menubar promete navegação por setas que não existe; o papel não corresponde ao propósito.", evidencia: "medidas/S0/interacoes.json › skiplink-setas; medidas/S0/instancias.json (AX)", origem: ORIG_MARC });
V({ regra: "accessibility-skiplink-fc59fbdac2c2", estado: "S0", seletor: ".atalhos-pagina > a", componente: "skiplink",
  medida: "ponteiro em (20,5), (100,20) e (200,10): os dois itens continuam em y = −900 (não visíveis); só aparecem com foco de teclado.", esperado: "skip link visível também para quem navega com mouse",
  justificativa: "Obrigação literal; o skiplink nunca aparece para o ponteiro.", evidencia: "medidas/S0/interacoes.json › skiplink-mouse", origem: ORIG_CSS });
V({ regra: "accessibility-global-742fd4c4f54b", tambem: ["accessibility-global-fefed87ed8b9"], estado: "S0 S1 S2", seletor: ".trilha-servico [aria-current=page] (span tabindex=0)", componente: "breadcrumb",
  medida: "o item atual 'Acompanhar requerimento' é <span tabindex=\"0\">: recebe foco (3ª parada de Tab depois do skiplink), papel AX genérico, Enter não faz nada, cursor auto.",
  esperado: "tabindex só com semântica correta e real necessidade (elemento não interativo fora da ordem de Tab)",
  justificativa: "Parada de Tab sem função num elemento sem papel interativo.", evidencia: "medidas/S0/tab.json; medidas/S0/interacoes.json › breadcrumb-atual; medidas/S0/pagina.json › tabindexNaoInterativo", origem: ORIG_MARC });
V({ regra: "component-breadcrumb-8c4ff87d861a", estado: "S0 S1 S2", seletor: ".trilha-servico [aria-current=page]", componente: "breadcrumb",
  medida: "font-weight computado 500 (Medium) no título da página atual; o link 'Meus requerimentos' também 500.", esperado: "título da página atual em destaque, semi bold (600)",
  justificativa: "Peso medido difere do exigido.", evidencia: "medidas/S0/interacoes.json › breadcrumb-atual.estilo", origem: ORIG_CSS });
V({ regra: "accessibility-global-9751560f0ae6", tambem: ["accessibility-global-b18c7684019f", { wcag: "3.1.2", nivel: "AA" }], estado: "S0 S1 S2", seletor: "nav.trilha-servico[aria-label=Breadcrumbs]", componente: "breadcrumb",
  medida: "nome acessível do breadcrumb = 'Breadcrumbs' (inglês), sem atributo lang; página lang=pt-BR.", esperado: "conteúdo em outro idioma identificado com lang (ou nome em português)",
  justificativa: "O nome lido pelo leitor de tela está em inglês e herda pt-BR.", evidencia: "medidas/S0/instancias.json (.trilha-servico AX nome)", origem: ORIG_MARC });
V({ regra: "accessibility-global-a54fe3e9b8d7", estado: "S0 S1 S2", seletor: ".home > a ('Página inicial') e .crumb:nth-of-type(2) > a ('Meus requerimentos')", componente: "breadcrumb",
  medida: "os dois links apontam para meus-requerimentos.html com descrições diferentes ('Página inicial' × 'Meus requerimentos'); o botão 'Voltar para meus requerimentos' também vai ao mesmo destino.",
  esperado: "links para o mesmo destino com a mesma descrição", justificativa: "Destino idêntico medido (href), descrições distintas.", evidencia: "medidas/S0/pagina.json › links", origem: ORIG_MARC });
for (const [sel, rot, nome] of [["#tip-protocolo-gatilho", "Ajuda sobre o NUP", "Use o NUP para consultar"], ["#tip-prazo-gatilho", "Ajuda sobre o prazo", "Prazo em dias corridos"]]) {
  V({ regra: { wcag: "2.5.3", nivel: "A", texto: "Rótulo no nome: o nome acessível de um componente com rótulo visível contém o texto do rótulo." }, estado: "S0 S1 S2", seletor: sel, componente: "button",
    medida: `rótulo visível '${rot}' (span.rotulo-botao visível, 16,8 px, à direita do ícone); nome acessível = '${nome}' (aria-labelledby → tooltip sobrepõe o aria-label '${rot}').`,
    esperado: "nome acessível contendo o texto visível do rótulo", justificativa: "O texto visível não aparece no nome computado (CDP).", evidencia: "medidas/S0/instancias.json (AX nome, fonteNome relatedElement); medidas/S0/interacoes.json › card-ajuda-click.rotuloVisivel", origem: ORIG_MARC });
  V({ regra: "component-button-81f5e26ec0ef", estado: "S0 S1 S2", seletor: sel, componente: "button",
    medida: `botão circular de 40×40 px com rótulo visível '${rot}' de ${sel.includes("protocolo") ? "149" : "158"} px de largura posicionado fora da superfície (position absolute, white-space nowrap).`,
    esperado: "o botão cresce com o rótulo (rótulo dentro da superfície)", justificativa: "O rótulo extrapola a superfície; o botão não acompanha seu tamanho.", evidencia: "medidas/S0/interacoes.json › card-ajuda-click; medidas/S0/instancias.json", origem: ORIG_CSS });
}
V({ regra: "accessibility-global-24ee65d5b46b", tambem: [{ wcag: "1.4.10", nivel: "AA" }], estado: "S0 (janela 640×450 = 200%)", seletor: "#tip-protocolo-gatilho > span.rotulo-botao", componente: "button",
  medida: "a 640×450 CSS px: scrollWidth 648 > clientWidth 640 (barra horizontal); o único elemento além da borda é o rótulo 'Ajuda sobre o NUP' (direita em 648 px).",
  esperado: "sem barra horizontal nem sobreposição a 200%", justificativa: "Rolagem horizontal medida, causada por um elemento.", evidencia: "medidas/S0/interacoes.json › redimensionar-200, rotulo-largo-200", origem: ORIG_CSS });
for (const [sel, med] of [["#tip-protocolo", "balão x 370–571,5 (centro 470,8); seta centro 480,0 → 9,2 px fora do centro"], ["#msg-pendencia > div:nth-of-type(3) > div", "balão x 1157–1234,3 (centro 1195,6); seta centro 1204,0 → 8,4 px fora do centro"]])
  V({ regra: "component-tooltip-187fe90aeefd", estado: "S0 S1 S2", seletor: sel, componente: "tooltip", medida: `seta na base/topo do balão: ${med} (hover no gatilho, 1280×900).`,
    esperado: "seta no topo/base centralizada horizontalmente com o balão", justificativa: "Deslocamento medido; no #tip-prazo a seta fica centrada (0 px), o que mostra que a centragem é atingível.", evidencia: "medidas/S0/interacoes.json › tooltip-hover", origem: ORIG_SCRIPT });
for (const sel of ["#tip-protocolo-gatilho", "#tip-prazo-gatilho", "#msg-pendencia > div:nth-of-type(3) > button"])
  V({ regra: { wcag: "1.4.13", nivel: "AA", texto: "Conteúdo em hover/foco: dispensável, pairável (o ponteiro pode ir sobre ele sem que desapareça) e persistente." }, estado: "S0 S1 S2", seletor: sel, componente: "tooltip",
    medida: "hover no gatilho mostra o tooltip; mover o ponteiro (5 passos) até o centro do balão → tooltip some (visível = false). Escape fecha (dispensável: ok).",
    esperado: "tooltip permanece enquanto o ponteiro está sobre ele", justificativa: "Falha medida da condição 'pairável'.", evidencia: "medidas/S0/interacoes.json › tooltip-hover " + sel, origem: ORIG_SCRIPT });
V({ regra: "accessibility-global-5817ddd685a6", tambem: ["accessibility-global-6a2b33a873d8", { wcag: "4.1.2", nivel: "A" }], estado: "S0 S1 S2", seletor: "#acc-duvidas button.header (3)", componente: "accordion",
  medida: "Enter/Space/clique expandem o item (conteúdo passa a display:block, ícone vira fa-angle-up), mas aria-expanded continua 'false' e a árvore AX diz expanded=false.",
  esperado: "aria-expanded=true / expanded na AX enquanto o item está aberto", justificativa: "Estado do widget não acompanha o ciclo de vida.", evidencia: "medidas/S0/interacoes.json › acordeao, acordeao-ativo, acordeao-ax", origem: ORIG_SCRIPT });
V({ regra: "component-step-518405a28697", estado: "S0", seletor: "#stp-andamento .etapa-decisao", componente: "step",
  medida: "o indicador (::before, content \"3\") da etapa 'Decisão' tem visibility:hidden; os das outras três etapas são visíveis (captura: só os círculos 1, 2 e 4).", esperado: "indicador presente em toda etapa",
  justificativa: "Elemento obrigatório da anatomia invisível numa etapa.", evidencia: "medidas/S0/interacoes.json › etapa-indicadores, etapas", origem: ORIG_CSS });
V({ regra: { wcag: "4.1.2", nivel: "A", texto: "Nome, função, valor: componentes de interface têm nome e função determináveis por programa." }, estado: "S1 S2", seletor: "#sel-tipo-documento > div:nth-of-type(1) (role=combobox)", componente: "select",
  medida: "o contêiner .br-input recebe role=combobox (aria-expanded, aria-controls) e na árvore AX é combobox de nome '' (o label 'Tipo de documento' nomeia só o input interno).", esperado: "combobox com nome acessível",
  justificativa: "Componente com papel de widget sem nome.", evidencia: "medidas/S2/instancias.json (AX); medidas/origem.json (role posto por script)", origem: ORIG_SCRIPT });
V({ regra: { wcag: "4.1.2", nivel: "A", texto: "Nome, função, valor: controles focáveis não podem estar ocultos da tecnologia assistiva (aria-hidden)." }, estado: "S1 S2", seletor: "#upl-documento > button.upload-button", componente: "upload",
  medida: "o botão 'Selecione o arquivo' tem aria-hidden=\"true\" e tabIndex 0: é a parada de Tab do upload (Enter abre o seletor de arquivo); o input[type=file] tem display:none e não é alcançável.", esperado: "controle operável exposto à AT (sem aria-hidden)",
  justificativa: "Elemento focável e operável marcado como oculto para AT.", evidencia: "medidas/S1/pagina.json › ariaHiddenFocavel; medidas/S1/interacoes.json › upload-teclado", origem: ORIG_SCRIPT });
V({ regra: "accessibility-global-25887e6e360f", estado: "S1 S2", seletor: "#upl-documento label.upload-label → #arquivo-documento", componente: "upload",
  medida: "a etiqueta 'Envio de documento' (for=arquivo-documento) está associada a um input com display:none (AX ignorado: notRendered); o controle que recebe foco é o botão aria-hidden, sem etiqueta associada; em S2 a mensagem de erro é descrita (aria-describedby) só no input não renderizado.",
  esperado: "etiqueta associada ao campo operável", justificativa: "Associação existe só com elemento que não é percebido nem operável.", evidencia: "medidas/S1/interacoes.json › upload-teclado; medidas/S2/pagina.json › campos", origem: ORIG_SCRIPT });
for (const sel of ["#aviso-email", "#aviso-sms"])
  V({ regra: "accessibility-switch-364149c5aea4", tambem: ["accessibility-global-5817ddd685a6"], estado: "S1 S2", seletor: sel, componente: "switch",
    medida: "ligado por Space, por clique no rótulo e pelo checkbox pai: checked=true, mas o atributo aria-checked continua \"false\" (o Chromium expõe checked=true pela propriedade nativa).", esperado: "aria-checked=\"true\" quando ligado, \"false\" quando desligado",
    justificativa: "Obrigação literal sobre o atributo (estratégia dom); o atributo nunca muda.", evidencia: "medidas/S1/interacoes.json › switch-teclado, switch-clique, switch-ax-ligado, checkbox-pai", origem: ORIG_MARC + "; não atualizado por script" });
V({ regra: "accessibility-global-4d5b05a1c29c", tambem: ["pattern-global-c648efdf7201", { wcag: "1.3.1", nivel: "A" }], estado: "S1 S2", seletor: "#fs-avisos", componente: "checkbox / switch (grupo)",
  medida: "<fieldset id=fs-avisos> sem <legend> (nem aria-label/labelledby); o título visual 'Avisos sobre o requerimento' é um <p> (16,8 px, 600) fora do fieldset.", esperado: "agrupamento com LEGEND explicando o propósito",
  justificativa: "Grupo sem legenda programática.", evidencia: "medidas/S1/pagina.json › fieldsets, textosComoTitulo", origem: ORIG_MARC });
V({ regra: "accessibility-global-271582e4fbe8", tambem: ["pattern-global-dc80c4e7406b", { wcag: "3.3.1", nivel: "A" }], estado: "S2", seletor: "#sel-tipo-documento .br-input.danger / #tipo-documento", componente: "select",
  medida: "depois de 'Enviar documento' com o formulário vazio, o campo 'Tipo de documento' ganha só a classe danger (borda 1 px #888 → 2 px #e52207): nenhum texto de erro, nenhum ícone, sem aria-invalid nem aria-describedby; a mensagem geral diz 'Corrija os campos indicados' sem nomear o campo. O upload, ao contrário, recebe 'Selecione o arquivo do documento.'.",
  esperado: "item com erro identificado e descrito por texto", justificativa: "Erro do select só por cor/espessura de borda.", evidencia: "medidas/S2/interacoes.json › erro-identificacao; medidas/S1/interacoes.json › erro-borda-S1", origem: ORIG_SCRIPT });
V({ regra: "foundation-global-21fb08664799", estado: "S0 S1 S2", seletor: "#titulo-duvidas (h2 'Dúvidas Frequentes')", componente: "pagina (tipografia)",
  medida: "font-size computado 16px (peso 700); todos os outros textos usam valores da escala Minor Third (11,662 · 14 · 16,8 · 20,16 · 24,192 · 34,832 · 41,804 px). O outro h2 da página tem 34,832 px.",
  esperado: "tamanho dentro da escala Minor Third (…14 · 16,8…)", justificativa: "16 px não pertence à escala de base 14 px × 1,2ⁿ.", evidencia: "medidas/S0/pagina.json › tamanhosUsados, titulos; medidas/S0/contraste.json", origem: ORIG_CSS });
for (const [sel, txt] of [[".acao-enviar", "Enviar documento"], [".acao-voltar", "Voltar para meus requerimentos"]])
  V({ regra: "pattern-global-f4a0aa1ba9c3", estado: sel === ".acao-enviar" ? "S1 S2" : "S0 S1 S2", seletor: sel, componente: "button",
    medida: `rótulo '${txt}': palavras que não são artigo/preposição começam com minúscula.`, esperado: `iniciais maiúsculas (ex.: '${txt === "Enviar documento" ? "Enviar Documento" : "Voltar para Meus Requerimentos"}')`,
    justificativa: "Regra de microcopy específica de buttons (required).", evidencia: "medidas/S1/pagina.json › botoes; medidas/S0/pagina.json › links", origem: ORIG_MARC });
V({ regra: "accessibility-global-37aeaff46667", estado: "S1 S2", seletor: "label[for=aviso-sms] ('Receber avisos por SMS')", componente: "switch",
  medida: "única ocorrência da sigla 'SMS' na página, sem forma completa nem explicação (sem <abbr>/title/texto). A sigla NUP é expandida ('Número Único de Protocolo (NUP)').", esperado: "explicação ou forma completa na primeira ocorrência",
  justificativa: "Obrigação literal do e-MAG 3.12.", evidencia: "medidas/S1/pagina.json › campos (rótulos)", origem: ORIG_MARC });

/* =====================================================================================
 * DECISÕES POR COMPONENTE (conforme / não se aplica / incerto)
 * ===================================================================================== */
const PROC = "regra dirigida ao processo de projeto/equipe, sem observável na página";
const SEMOBS_TXT = "julgamento de projeto/redação sem observável inequívoco no DOM, na árvore AX ou no estilo computado; não medida";

// accordion
OK("development-accordion-c00fa869bb69", "os 3 headers são <button class=header type=button>", "medidas/S0/instancias.json #acc-duvidas");
OK("development-accordion-54d50ff04589", "título em span.title nos 3 itens", "medidas/S0/instancias.json #acc-duvidas");
OK("development-accordion-10bc63ecbc3e", "ícone em span.icon (fa-angle-down/up, aria-hidden)", "medidas/S0/instancias.json #acc-duvidas");
NA("component-accordion-d674d4c37b4b", "accordion sobre fundo claro (transparente sobre #fff)");
OK("component-accordion-8f58dd30c6bb", "Enter/Space/clique: conteúdo passa de display:none a block (h 49 px); single fecha o anterior", "medidas/S0/interacoes.json › acordeao");
INC("component-accordion-d9410709c503", "título do item expandido: cor #1351b4 (igual à dos fechados), peso 600 (fechados 400)", "a base não fixa numericamente a 'cor do estado ativo' para o accordion", "medidas/S0/interacoes.json › acordeao-ativo");

// breadcrumb
OK("accessibility-breadcrumb-1fff147d3cfd", "Home e 'Meus requerimentos' alcançados por Tab (paradas 3 e 4)", "medidas/S0/tab.json");
OK("accessibility-breadcrumb-a532cd44b675", "todos os interativos (2 links) percorridos", "medidas/S0/tab.json");
OK("accessibility-breadcrumb-c252cce23b3b", "chevrons <i aria-hidden> fora da ordem de Tab", "medidas/S0/tab.json");
NAS(["accessibility-breadcrumb-1d914c820cb2", "accessibility-breadcrumb-c57200c05e3d"], "breadcrumb sem truncamento nem menu flutuante (3 itens)");
OK("accessibility-breadcrumb-7e348f84b5b6", "visível no topo do conteúdo (y 131–187, logo abaixo do header)", "medidas/S0/instancias.json");
OK("accessibility-breadcrumb-53db61fa81f9", "item atual é <span aria-current=page>, não link", "medidas/S0/pagina.json › links");
OK("accessibility-breadcrumb-41145c4140ac", "item atual: cor #333 (texto), sem sublinhado, cursor auto (links: #1351b4, cursor pointer)", "medidas/S0/interacoes.json › breadcrumb-atual");
OKS(["development-breadcrumb-4ae0c4a60862", "development-breadcrumb-4f1c2a2a3712", "development-breadcrumb-09dcc61e7e47", "development-breadcrumb-c2d45d767aaf", "development-breadcrumb-b326df7e278b"], "classes br-breadcrumb, crumb-list, crumb (3), home, icon (2) presentes", "medidas/S0/instancias.json .trilha-servico");
OKS(["component-breadcrumb-dad867cfc7f2", "component-breadcrumb-c744e5494795", "component-breadcrumb-a907794f4b16", "component-breadcrumb-478cffdbb111"], "anatomia: botão Home (br-button circle), separadores, link, título da página atual", "medidas/S0/instancias.json .trilha-servico");
NA("component-breadcrumb-027aa0651590", "medida em 1280 px (12 colunas), não em 4 colunas");
NAS(["component-breadcrumb-a1455eff9c4f", "component-breadcrumb-ee4751cc40d4", "component-breadcrumb-7690bbe5ccc7"], PROC);
OK("component-breadcrumb-80443ce3ae3e", "nenhum item truncado (3 itens, texto inteiro)", "medidas/S0/instancias.json");
INC("component-breadcrumb-27095244993c", "Home presente; destino meus-requerimentos.html (o mesmo do 2º item)", "não há como saber pela página se meus-requerimentos.html é a tela inicial do sistema", "medidas/S0/pagina.json › links");
OK("component-breadcrumb-660169599b49", "título 'Acompanhar requerimento' = h1 'Acompanhar Requerimento' (tela atual)", "medidas/S0/pagina.json");
INC("component-breadcrumb-daf213d9a2cf", "o header não tem menu principal (só logo, assinatura e título); o breadcrumb é a única navegação além do 'Voltar'", "não há menu principal para comparar; substituição ou não é julgamento de arquitetura", "medidas/S0/instancias.json #cabecalho");
INC("component-breadcrumb-73c2c42378d7", "idem: sem menu principal na página", "idem", "medidas/S0/instancias.json #cabecalho");

// button
OK("accessibility-button-23e3cfbf49f3", "nenhum botão/link com atributo title", "medidas/S0/pagina.json › botoes, links; S1; S2");
OK("development-button-b77ff20ad216", "botões do DS com classe br-button (Home, Fechar, ajuda ×2, Exibir lista, Enviar, Voltar)", "medidas/S*/pagina.json › botoes");
OK("development-button-cce88702f880", "todos os <i> de ícone têm aria-hidden=\"true\"", "medidas/S2/instancias.json");
OK("development-button-323bef5db0fd", "circulares com nome: Home 'Página inicial' (sr-only), Fechar (aria-label), ajuda (aria-label/labelledby), 'Exibir lista'", "medidas/S2/pagina.json › botoes; AX");
SEMOBS(["component-button-0e0714e2b09c", "component-button-4a7bcaaa9ba3", "component-button-3eaee8c3e9ed", "component-button-2dc40e721b23", "component-button-a4d904dedad5", "component-button-bb4ca76cd0b2", "component-button-3b591843f42b"], SEMOBS_TXT);
OK("component-button-9d77803305c0", "rótulos em Rawline 16,8 px/600 (Enviar, Voltar)", "medidas/S1/instancias.json");
OK("component-button-3acf0a99f2d8", "superfície: primário fundo #1351b4; secundário borda 1px #1351b4, raio de pílula", "medidas/S1/instancias.json");
OK("component-button-627dd3089562", "todos os circulares têm ícone (fa-home, fa-times, fa-question-circle, fa-angle-down)", "medidas/S2/instancias.json");
OK("component-button-7ef75d42ac65", "botões não circulares têm rótulo de texto", "medidas/S2/pagina.json › botoes");
OK("component-button-5c08566d1bf9", "rótulos em uma linha (altura 40 px)", "medidas/S2/pagina.json › botoes");
OK("component-button-b1c0168342fb", "'Enviar documento': padding 24px/24px, altura 40 px", "medidas/S1/instancias.json .acao-enviar");
OK("component-button-f13d992a7903", "superfície distinta por tipo (primário cheio, secundário contorno, terciário sem fundo)", "medidas/S1/instancias.json");
NA("component-button-77dfc156b422", "nenhum grupo de botões com ênfases diferentes lado a lado (Enviar sozinho no formulário; Voltar em outra seção)");

// card
OK("accessibility-card-c5958e0e9380", "controles do card (2 botões de ajuda, link) alcançados por Tab/Shift+Tab; link e botões acionam com Enter", "medidas/S0/tab.json; medidas/S0/interacoes.json › card-link, tooltip-foco");
OKS(["development-card-d31bdeb4823b", "development-card-f913a1ba1944"], "br-card com card-header, card-content, card-footer", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-3961fedc0963", "superfície #fff com sombra rgba(0,0,0,.16) 0 1px 6px; conteúdo presente", "medidas/S0/instancias.json #crd-resumo");
OKS(["component-card-c6aeb922f827", "component-card-e57096a3169c"], "superfície e área de conteúdo presentes", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-c9a64038bcbf", "padding interno 16 px (header/content/footer)", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-529693b92469", "respiro: 24 px acima (mensagem) e 32 px abaixo (abas)", "medidas/S0/instancias.json");
OK("component-card-8188b01a738a", "overflow visible nos dois eixos; sem rolagem", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-4d7c0c35a536", "card estático, sem estado aplicado", "medidas/S0/instancias.json #crd-resumo");
NA("component-card-e3773cec025e", "card não interativo (não há comportamento a herdar)");
NA("component-card-f362057bfa0c", "medido em 1280 px");
OK("component-card-d9e849ec168c", "nenhum .br-card dentro do card", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-1c234d0e6df9", "um card único, inteiro", "medidas/S0/instancias.json");
OK("component-card-27d2c467f699", "blocos .dado-resumo separados (48 px entre linhas)", "medidas/S0/instancias.json #crd-resumo");
OK("component-card-f5cfc40d615e", "resumo + caminho para detalhes ('Ver andamento detalhado' → #tab-requerimento)", "medidas/S0/interacoes.json › card-link");
SEMOBS(["component-card-fbf85e4d105f", "component-card-ad28b9fd9723", "component-card-7ab2781859f4", "component-card-5972545ae191"], SEMOBS_TXT);

// checkbox
OK("accessibility-checkbox-364a3d387f68", "Tab alcança #avisos-todos; Space marca/desmarca", "medidas/S1/interacoes.json › checkbox-pai", "S1 S2");
OK("accessibility-checkbox-69b527fe644d", "label for=avisos-todos 'Todos os avisos'; nome AX 'Todos os avisos'", "medidas/S1/interacoes.json › switch-ax-ligado", "S1 S2");
OK("development-checkbox-20cf87708f54", "div.br-checkbox", "medidas/S1/instancias.json", "S1 S2");
OK("development-checkbox-8044feffaa99", "pai com 2 filhos; 1 filho ligado → pai indeterminate (AX mixed)", "medidas/S1/interacoes.json › switch-ax-ligado, checkbox-pai", "S1 S2");
OK("development-checkbox-9ac846bae733", "data-parent=\"avisos\" no input pai", "medidas/S1/pagina.json", "S1 S2");
OK("development-checkbox-b82b029f0076", "data-child=\"avisos\" nos dois filhos", "medidas/S1/pagina.json", "S1 S2");
OK("development-checkbox-5d277fc52e91", "comportamento pai/filho funciona (Space no pai liga os dois filhos)", "medidas/S1/interacoes.json › checkbox-pai", "S1 S2");
OK("component-checkbox-6923ae0af84f", "usado para selecionar um conjunto (todos os avisos)", "medidas/S1/pagina.json", "S1 S2");
NAS(["component-checkbox-62ad1c64575b", "component-checkbox-855ca334de98"], "lista curta (1 checkbox + 2 switches)");
INC("component-checkbox-ff168417d00a", "há rótulo visual 'Avisos sobre o requerimento' antes do grupo; não há breve descrição de que mais de uma opção pode ser escolhida", "é discutível se um checkbox 'todos' + switches é 'lista de opções múltiplas'", "medidas/S1/pagina.json › textosComoTitulo");
SEMOBS(["component-checkbox-0681eb428303"], SEMOBS_TXT);
OK("component-checkbox-52a2a389c47a", "'Todos os avisos' — 3 palavras", "medidas/S1/pagina.json", "S1 S2");
OKS(["component-checkbox-941b80a2d2a1", "component-checkbox-250744748eea"], "caixa de opção (label::before) e item presentes", "medidas/S1/instancias.json #chk-avisos-todos");
INC("component-checkbox-30a91fbbb0d0", "um único checkbox (o 'pai'); os itens filhos são switches", "a anatomia 'lista de opções' pressupõe vários checkboxes", "medidas/S1/instancias.json");
INC("component-checkbox-c31818f9d2e1", "ícone de estado desenhado por pseudo-elemento do label; não capturado marcado", "estado selecionado não fotografado", null);
OKS(["component-checkbox-298dabadba22", "component-checkbox-c1b531588ba2", "component-checkbox-800e6838e2f2"], "textos com só a primeira letra maiúscula ('Todos os avisos')", "medidas/S1/pagina.json › campos");
OK("component-checkbox-0eb7a992d8f8", "'Todos os avisos' é o primeiro item do grupo", "medidas/S1/instancias.json", "S1 S2");
OKS(["component-checkbox-bbda812a72bd", "component-checkbox-55135cc6ee8e", "component-checkbox-670f12e1eb3b"], "rótulo do grupo 'Avisos sobre o requerimento' acima e à esquerda (x 60)", "medidas/S1/pagina.json › textosComoTitulo");
OK("component-checkbox-e753f086d316", "texto à direita da caixa", "medidas/S1/instancias.json #chk-avisos-todos");
OK("component-checkbox-65d783ab477f", "texto à direita da caixa", "medidas/S1/instancias.json #chk-avisos-todos");
NAS(["component-checkbox-4530a07e757f", "component-checkbox-40f206bd6875", "component-checkbox-f33df5abc886", "component-checkbox-9e0dbad5b664", "component-checkbox-ea8de37b7cb1", "component-checkbox-826a658e5290", "component-checkbox-020d9fe34a42"], "grupo sem texto auxiliar nem mensagem de feedback");
NAS(["component-checkbox-8277c787c113", "component-checkbox-70f53836093f", "component-checkbox-cdc1d3db8f5c", "component-checkbox-534f02eaff4e", "component-checkbox-0c19bd2ad908", "component-checkbox-7c09620eba06"], "um único checkbox de uma linha; sem lista horizontal nem itens de larguras/alturas diferentes");
SEMOBS(["component-checkbox-7b0a4ab025f3", "component-checkbox-04bdc4d8f68e", "component-checkbox-97394f74c8c4", "component-checkbox-d3d1a6eeffeb", "component-checkbox-7a7fb03e41d0"], "espaçamentos/larguras remetem a tokens não listados na base literal; não medidos contra valor");

// divider
OK("accessibility-divider-8af696e7c150", "3 divisores ignorados na AX; #div-secoes é nó 'generic' sem nome (não anunciado)", "medidas/S0/instancias.json (AX)");
OK("accessibility-divider-4fe076bfdc93", "nenhum divisor na ordem de Tab", "medidas/S*/tab.json");
OK("development-divider-b718d9699939", "4 span.br-divider", "medidas/S0/instancias.json");
OK("component-divider-c7e96a24a522", "borda 1px solid #ccc (horizontais); vertical no header", "medidas/S0/instancias.json");
OK("component-divider-dd36acf0251e", "sem estados (sem hover/foco/cursor)", "medidas/S0/instancias.json");
OK("component-divider-3bb3d8b5127f", "visíveis (1 px #ccc sobre #fff)", "medidas/S0/instancias.json");
OK("component-divider-463500ec9aba", "nenhum divisor circunda item", "medidas/S0/instancias.json");
SEMOBS(["component-divider-784c49a4982f", "component-divider-728d544b45dc", "component-divider-65ea6ead69f0"], SEMOBS_TXT);

// footer
NA("accessibility-footer-f63c3f2171b4", "footer sem links");
NAS(["development-footer-e5084132fdc1", "development-footer-14f4122847cf", "development-footer-eae0dd6a1888", "development-footer-38dcb550ba72", "development-footer-aa7a0ceb4c1d", "development-footer-5c5482e5ada3", "component-footer-ef94bc021e79", "component-footer-cb327c43e06b", "component-footer-25d632b56d84", "component-footer-f152b3b7e674", "component-footer-454feae60a35", "component-footer-5b418a868245"], "footer sem listas de links/mapa do site (só logo + informação legal)");
OKS(["development-footer-f4bc700322d9", "development-footer-98828ad43cff", "component-footer-6dce32688f49"], "footer.br-footer com div.logo e container (fundo #071d41)", "medidas/S0/instancias.json #rodape");
OK("component-footer-e8c03172ffeb", "último elemento da página (fecha o conteúdo), papel contentinfo", "medidas/S0/instancias.json #rodape");
NAS(["component-footer-7c4a1623ea06", "component-footer-ac6887157e91"], "sem componentes novos/logos secundários no footer");
INC("component-footer-11e00c6f65c2", "há divider entre logo e informação legal (#rodape > span); entre o conteúdo e o footer não há divider (só a troca de fundo para #071d41)", "a necessidade de divider quando o footer já tem superfície escura não é decidível pela medida", "medidas/S0/instancias.json #rodape");
SEMOBS(["accessibility-footer-aaaeb5d9f348", "component-footer-26e8cbb6ebbe", "component-footer-a87cd5c79677", "component-footer-c0a12e98cce9", "component-footer-ea2d6840914c"], SEMOBS_TXT + " (uma só página/uma janela)");

// header
OK("accessibility-header-c6e9d6acd201", "header com logo, assinatura e título; sem funcionalidades", "medidas/S0/instancias.json #cabecalho");
OKS(["development-header-be1225dcac60", "development-header-1bd49622d7d5", "development-header-1b37e73f42fb", "development-header-b732799fe313"], "classes br-header, header-bottom, header-menu, header-title", "medidas/S0/instancias.json #cabecalho");
OK("component-header-296a09e0ff45", "título 'Acompanhamento de Requerimentos' em Rawline 24,192 px", "medidas/S0/pagina.json › textosComoTitulo");
OK("component-header-85b52544095a", "superfície #fff com sombra", "medidas/S0/instancias.json #cabecalho");
OK("component-header-6e2c3f6cb9b5", "divider vertical entre logo e assinatura", "medidas/S0/instancias.json .header-logo > span");
OKS(["component-header-f072ec1a3cb6", "component-header-e58979706103"], "título presente e identifica o sistema", "medidas/S0/instancias.json #cabecalho");
OK("component-header-d86b5ba96fa8", "título em 1 linha", "medidas/S0/instancias.json #cabecalho");
NAS(["component-header-86cb7c93b37e"], "título curto (sem truncamento)");
NA("component-header-0edddeebd0c5", "medido em 1280 px");
NAS(["component-header-9532a2bf22b6", "component-header-536dd0604581", "component-header-63d3506e85cb", "component-header-319fcbeeb68f", "component-header-20438b086c16"], "header sem links, ícones de funcionalidade, busca ou login");
NAS(["component-header-5ff447923c99", "component-header-4b1707b1d721", "component-header-35ef3421792f", "component-header-f95256e9e7c8"], "header não sticky (position relative)");
SEMOBS(["component-header-d6ec0af7b794"], SEMOBS_TXT);

// input (campo do select)
OK("accessibility-input-01715e9e2fde", "input#tipo-documento é parada de Tab", "medidas/S1/tab.json", "S1 S2");
OK("accessibility-input-007f596c3906", "input nativo type=text (navegação por palavra do próprio navegador)", "medidas/S1/pagina.json › campos", "S1 S2");
OKS(["development-input-cfa9708df3b8", "component-input-f20d6d45078d", "component-input-acbd0e607b75"], "div.br-input com campo de texto", "medidas/S1/instancias.json", "S1 S2");
OK("component-input-7d99eb1f25e1", "rótulo 'Tipo de documento'", "medidas/S1/pagina.json", "S1 S2");
OK("component-input-2e96ef63caba", "ícone de lupa em .input-icon à esquerda do placeholder", "medidas/S1/instancias.json", "S1 S2");
OK("component-input-1aec5265dab8", "lupa: digitar 'pro' filtra a lista (2 itens); 'xyz' mostra 'Não encontramos…'", "medidas/S1/interacoes.json › select-digitar, select-sem-resultado", "S1 S2");
OK("component-input-67fb902a01f7", "placeholder 'Selecione o tipo do documento pendente' mais completo que o rótulo", "medidas/S1/pagina.json", "S1 S2");
OK("component-input-650701a11fbe", "ao apagar o texto o placeholder volta (:placeholder-shown)", "medidas/S1/interacoes.json › select-digitar", "S1 S2");
OK("component-input-d7a1ddee8372", "cursor text no campo", "medidas/S1/interacoes.json › cursores", "S1 S2");
NAS(["component-input-99e994057e86", "component-input-4a2e0d99a2c0", "component-input-db5764d4472a", "component-input-d55a76fc89b0", "component-input-0a6d86fbed18", "component-input-e991b7a2a506"], "variante/recurso não usado (sem texto auxiliar, máscara, densidade baixa, estado só-leitura)");

// item
OK("development-item-dc1b64ecec36", "br-item nos itens do skiplink e da lista do select", "medidas/S1/instancias.json");
OKS(["component-item-da62b1dff8c5", "component-item-8a27ddc76060", "component-item-f5ef182cb289", "component-item-e3c7c972fb5f"], "itens repetidos (opções) com superfície e área de conteúdo", "medidas/S1/interacoes.json › select-clique");
OK("component-item-ac625d05a747", "padding 16 px nos 3 itens da lista", "medidas/S1/interacoes.json › select-clique");
NAS(["component-item-2b0c496ce3a4", "component-item-02793133181a"], "itens só com rádio/texto (sem mídia)");

// list
OK("accessibility-list-300a3d636087", "ArrowDown percorre os itens da lista do select; Tab com a lista aberta vai ao 1º rádio", "medidas/S1/interacoes.json › select-teclado, select-clique", "S1 S2");
OKS(["development-list-962aaf818c10", "development-list-1fe48e54a02e", "component-list-ca8054947d88", "component-list-4358446c3587", "component-list-d129e19b56dc"], "div.br-list com br-item e texto principal; superfície com sombra", "medidas/S1/interacoes.json › select-clique");
OKS(["component-list-1355e21fcfbc", "component-list-01ffe281dd61", "component-list-899d8219f3d2"], "padding idêntico (16 px) nos 3 itens", "medidas/S1/interacoes.json › select-clique");
OK("component-list-bec85875d664", "hover do item: sobreposição cinza (gradiente rgba(51,51,51,.16)), não cor de estado", "medidas/S1/interacoes.json › select-clique.hoverItem");
NAS(["development-list-c75b1858204d", "development-list-cf23f8823d88", "component-list-baca62157686", "component-list-2f87c2946f8a", "component-list-5d2ec532bb25", "component-list-d82ea718f17d", "component-list-6ce81bd04029", "component-list-e5b1ad94c674"], "lista vertical simples (sem agrupador, suporte visual/complementar, dividers ou arrastar)");

// message
add("accessibility-message-ad83724b777f", { veredito: "conforme", estados: "S2", medida: "ao exibir #msg-retorno (Enviar com o formulário vazio, por clique ou Enter) o foco vai para o botão Fechar dela", evidencia: "medidas/S2/pagina.json › focoNaChegada; medidas/S1/interacoes.json › enviar-enter" });
INC("accessibility-message-ad83724b777f", "S0: #msg-pendencia é exibida na carga e o foco fica no <body>", "mover o foco na carga conflita com o skiplink como primeiro foco (accessibility-skiplink-b0641993618f); a regra fala do 'momento da exibição', ambíguo para mensagem presente na carga", "medidas/S0/pagina.json › focoNaChegada");
OKS(["development-message-6bd70842446f", "development-message-0cf7ad61e509"], "br-message (pendência, retorno) e .feedback (erro do upload)", "medidas/S2/instancias.json");
OKS(["component-message-91274eb7d1b6", "component-message-d0c7ed3f91af", "component-message-829632c90fd3"], "superfície (#fff5c2 / #fde0db), mensagem em Rawline, texto presente", "medidas/S2/instancias.json");
OK("component-message-add10093ae9f", "ícone semântico à esquerda (x 76) nas duas mensagens", "medidas/S2/instancias.json");
OK("component-message-4bfd5a220fb8", "fechar no topo à direita (x 1180–1212, y topo+8)", "medidas/S2/instancias.json");
OK("component-message-14e2d886d429", "warning para advertência ('Documento pendente')", "medidas/S0/instancias.json #msg-pendencia");
OK("component-message-07540d5e07e5", "danger para erro ('Erro: documento não enviado')", "medidas/S2/instancias.json #msg-retorno", "S2");
OK("component-message-93618f9100f5", "mensagem de retorno do formulário dentro do formulário (.retorno-formulario)", "medidas/S2/instancias.json", "S2");
OK("component-message-b9fc27b83897", "erro: título em semi bold + descrição complementar em regular", "medidas/S2/instancias.json", "S2");
NAS(["component-message-f1e6da027383", "component-message-535bd3e259b2"], "sem mensagem informativa nem de sucesso nos estados");
INC("component-message-e215ef0e1ed8", "#msg-pendencia fica abaixo do breadcrumb e do h1 (y 267), dentro da grid (x 60, 1160 px), sem sangrar", "depende de classificá-la como 'geral' (resposta à página toda) ou 'direcionada'; a página não declara o tipo", "medidas/S0/instancias.json #msg-pendencia");
INC("component-message-b996fc6ea88a", "idem: largura 1160 px na grid", "idem", "medidas/S0/instancias.json #msg-pendencia");
INC("component-message-928a670d43dd", "pendência de documento do requerimento exibido", "classificação de escopo da mensagem", null);
OK("component-message-b88d6c2bf01d", "conteúdo dentro das margens da área útil", "medidas/S0/instancias.json #msg-pendencia");
SEMOBS(["component-message-3b6fb4ad1e0e", "component-message-21f628ccc725"], SEMOBS_TXT);

// radio (rádios internos da lista do Select)
OK("accessibility-radio-77230de0d493", "lista aberta: Tab chega ao 1º rádio; Space escolhe a opção focada (valor 'Documento de identidade')", "medidas/S1/interacoes.json › select-clique, select-teclado", "S1 S2");
OK("accessibility-radio-cdfeb185e64a", "3 rádios com label for= (texto da opção)", "medidas/S1/pagina.json › campos", "S1 S2");
OK("development-radio-b6fc1fab228c", "div.br-radio nos 3 itens", "medidas/S1/instancias.json", "S1 S2");
OK("component-radio-218b7e051a16", "seleção única com rádios de mesmo name", "medidas/S1/interacoes.json › select-clique", "S1 S2");
OK("component-radio-d5ca3424ae8f", "textos curtos (≤ 3 palavras)", "medidas/S1/pagina.json", "S1 S2");
OKS(["component-radio-f290ff178142", "component-radio-383a77d3f0de", "component-radio-383a77d3f0de-2"], "primeira letra maiúscula, resto minúsculo", "medidas/S1/pagina.json");
const RADIO_NA = "rádio usado como mecanismo interno do Select (lista flutuante); a anatomia/diagramação de grupo de rádios não se aplica";
NAS(["component-radio-0f3650f28ae4", "component-radio-b70c7dcfafc6", "component-radio-a4b4a1259755", "component-radio-5713395aefd5", "component-radio-84b47e9d5749", "component-radio-5b842129ebf2", "component-radio-a2c189c59ef4", "component-radio-2c0c0383ea7a", "component-radio-ed648a8a1b5b", "component-radio-000593ac3f4b", "component-radio-e0d0383a01bb", "component-radio-e512912e9a7b", "component-radio-bef23088d752", "component-radio-8a68f00d1c59", "component-radio-d23d670b1bae", "component-radio-ec622e02e997", "component-radio-331797975ce6", "component-radio-1ffd9dfd23da", "component-radio-32ac0a462c41", "component-radio-54a979f497a3", "component-radio-7555dd50b213", "component-radio-97993a4c7e96", "component-radio-e62106338c07", "component-radio-afcb0a096b08", "component-radio-64456afaa3d7", "component-radio-89ca628b5ca0", "component-radio-2a0aa30db030", "component-radio-e5a708b27e43", "component-radio-6fb2a96ebab9", "component-radio-9a3b1781cc55", "component-radio-8574a5d7db07", "component-radio-9844af8f3b9b", "component-radio-632700f059b8", "component-radio-d951d056e939", "component-radio-6017ccdc1eca", "component-radio-cdd016ca62d4"], RADIO_NA);

// select
OK("accessibility-select-b1d8722f293a", "campo do select é parada de Tab", "medidas/S1/tab.json", "S1 S2");
OK("accessibility-select-6f5756164710", "com foco no campo, ArrowDown abre a lista (aria-expanded true) e foca o 1º item; Enter no campo submete o formulário (não abre)", "medidas/S1/interacoes.json › select-teclado, select-enter-no-campo", "S1 S2");
OK("accessibility-select-fadca364b240", "ArrowDown move entre itens (1º → 2º)", "medidas/S1/interacoes.json › select-teclado", "S1 S2");
OKS(["development-select-89c58184619d", "development-select-30d5a5a78675", "development-select-0dfad0565a80", "development-select-a91eb310313b", "development-select-c30dbdfa715c"], "br-select > br-input + br-button + br-list > br-item", "medidas/S1/instancias.json", "S1 S2");
NA("development-select-e47457f67ba5", "select simples (não múltiplo)");
OK("development-select-33023f40d1fd", "botão com data-trigger", "medidas/S1/instancias.json", "S1 S2");
OKS(["development-select-6936d523e5a3", "development-select-2ebc5246d07d"], "rádios com name=tipo-documento-opcoes e value", "medidas/S1/interacoes.json › select-clique");
OK("development-select-228ce7fb15c3", "pesquisa sem resultado mostra div.br-item.not-found", "medidas/S1/interacoes.json › select-sem-resultado");
OKS(["component-select-9484a812fe9f", "component-select-a0222f08c249", "component-select-4ccd859c7e6a", "component-select-0681c950ba25"], "input, button, list e modo de seleção (rádio) presentes", "medidas/S1/instancias.json");
OK("component-select-b6e7bf2e8831", "botão na extremidade direita do campo (x 424–456 de 60–460)", "medidas/S2/instancias.json");
OK("component-select-9e153556ac33", "a lista apresenta os 3 tipos de documento", "medidas/S1/interacoes.json › select-clique");
OK("component-select-ba2187bb7906", "lista flutuante (absolute, z-index 1) com sombra rgba(0,0,0,.16) 0 3px 6px", "medidas/S1/interacoes.json › select-clique");
NAS(["component-select-cfe569a395fe", "component-select-a1fcbe2d11e5"], "seleção única");
NAS(["component-select-1f437c751d97", "component-select-6f72061bbcda", "component-select-6f233c2d4a39", "component-select-8cba5d158c47"], "há espaço abaixo para abrir; 3 itens; textos curtos");
OK("component-select-9f18a23f8cd2", "lista com a largura do campo (400 px)", "medidas/S1/interacoes.json › select-clique");
OK("component-select-7888b92deb88", "textos curtos", "medidas/S1/interacoes.json › select-clique");
OK("component-select-98a0287c6fdd", "pesquisa 'xyz': logo abaixo do campo, item 'Não encontramos o que você está procurando!'", "medidas/S1/interacoes.json › select-sem-resultado");

// skiplink
OK("accessibility-skiplink-b0641993618f", "1ª parada de Tab = 'Ir para o conteúdo'", "medidas/S0/tab.json; S1; S2");
OK("accessibility-skiplink-459233c263d7", "com foco o item aparece em (16,0) 300×44", "medidas/S0/interacoes.json › skiplink-tab");
OK("accessibility-skiplink-410f86810464", "posicionado no topo (y 0)", "medidas/S0/interacoes.json › skiplink-tab");
OK("accessibility-skiplink-e3375c2e682b", "alvos são regiões semânticas: main#main-content e footer#rodape (contentinfo)", "medidas/S0/instancias.json");
OKS(["development-skiplink-b7fd536dad96", "development-skiplink-4bfa33bc6e65", "development-skiplink-df8758eefe30"], "nav.br-skiplink; href #main-content/#rodape; accesskey 1 e 2", "medidas/S0/pagina.json › accesskeys, links");
OKS(["component-skiplink-7e0a659e413b", "component-skiplink-cf02184ecd2a", "component-skiplink-4efe84e7d11e"], "superfície, item e rótulo presentes", "medidas/S0/instancias.json");
OK("component-skiplink-c28eba2ff50c", "os dois itens com 300×44 px", "medidas/S0/interacoes.json › skiplink-tab");
OK("component-skiplink-6751802e3b57", "2º item aparece na mesma posição (16,0) do 1º", "medidas/S0/interacoes.json › skiplink-tab");
OK("component-skiplink-cb53759c476c", "3º Tab (Home): os dois itens voltam a y −900", "medidas/S0/interacoes.json › skiplink-tab");
OK("component-skiplink-a8808aa08483", "Enter leva a #main-content (scrollY 115) e a #rodape (scrollY 968)", "medidas/S0/interacoes.json › skiplink-enter, skiplink-enter-rodape");
OK("component-skiplink-4f5b52d5b9b1", "itens habilitados", "medidas/S0/pagina.json › links");
OKS(["component-skiplink-5100f5c691fe", "component-skiplink-bfd1512ea126"], "todos os interativos visíveis alcançados por Tab nos 3 estados (o upload pelo botão; os rádios com a lista aberta)", "medidas/S*/tab.json");
OK("component-skiplink-02c2e513d936", "primeiro filho do <body>", "medidas/S0/pagina.json");
NAS(["component-skiplink-409918de1035", "component-skiplink-f76c5154febf"], PROC);

// step
OK("accessibility-step-487fd8ea1fa2", "Tab/Shift+Tab entre 'Envio' e 'Análise' (habilitadas); desabilitadas fora do Tab", "medidas/S0/interacoes.json › etapas", "S0");
NA("accessibility-step-c0da05b77e1c", "step sem controles internos além das etapas");
OKS(["development-step-27f34abaf745", "development-step-c0eead3701dd"], "nav.br-step com 4 button.step-progress-btn", "medidas/S0/instancias.json", "S0");
OKS(["component-step-22ddef1501cc", "component-step-6eae53e95696", "component-step-8bd1dd9babc2"], "sequência linear de 4 etapas relacionadas, um só tipo (numérico)", "medidas/S0/interacoes.json › etapas", "S0");
OK("component-step-51d21c25c517", "linha do tempo (::after 1 px #1351b4) entre as etapas", "medidas/S0/interacoes.json › etapas", "S0");
NA("component-step-5a06469d13b9", "modelo numérico (o ícone de concluído é a tag de alerta)");
OK("component-step-136cde4b8c25", "4 etapas", "medidas/S0/interacoes.json › etapas", "S0");
OK("component-step-8ee37ee83dac", "rótulos de uma palavra (Envio, Análise, Decisão, Conclusão)", "medidas/S0/interacoes.json › etapas", "S0");
OKS(["component-step-6536cf8355a8", "component-step-6536cf8355a8-2"], "rótulo abaixo do indicador, text-align center", "medidas/S0/interacoes.json › etapas", "S0");
NAS(["component-step-39a79a8a5da5", "component-step-75276480d257"], "rótulos centralizados (variantes à esquerda/direita não usadas)");
NAS(["component-step-fd1162b673b3", "component-step-36fa3137a669", "component-step-5e203a93a872", "component-step-7805ff69a0bb"], "todas as etapas cabem na largura (sem etapas ocultas/rolagem)");
OKS(["component-step-f63d9a82d5ae", "component-step-42ddeda15674"], "etapas não visitadas (Decisão, Conclusão) disabled, cursor not-allowed", "medidas/S0/interacoes.json › etapas", "S0");
OKS(["component-step-ad6625a017ad", "component-step-f1607f6b89c1"], "etapa concluída 'Envio' com data-alert=success e sr-only ', etapa concluída'", "medidas/S0/interacoes.json › etapas", "S0");
NA("component-step-487905445d90", "fluxo linear (não 'não linear')");
NA("component-step-5dd746c1e283", "a etapa ativa ('Análise') não tem alerta");

// switch
OK("accessibility-switch-56c3754b5e04", "Tab alcança; Space alterna (Enter não alterna — a regra aceita Space ou Enter)", "medidas/S1/interacoes.json › switch-teclado", "S1 S2");
OK("accessibility-switch-98c995a6b199", "AX: papel switch, nome 'Receber avisos por e-mail', checked true/false acompanhando o estado nativo", "medidas/S1/interacoes.json › switch-ax-ligado, switch-teclado", "S1 S2");
OK("accessibility-switch-adfcdbfe51b1", "rótulos 'Receber avisos por e-mail' / 'por SMS'", "medidas/S1/pagina.json", "S1 S2");
OKS(["development-switch-1c141c58c929", "component-switch-58bafaddd0a7", "component-switch-423879360423"], "div.br-switch com container e chave", "medidas/S1/instancias.json", "S1 S2");
NAS(["development-switch-cddce4dcdc4c", "development-switch-4d14eb6aa333"], "switch sem textos de estado (data-enabled/data-disabled não usados)");
OKS(["component-switch-76a01f06b97d", "component-switch-b89ef612e3d8", "component-switch-121944aa658b"], "rótulos descrevem o efeito quando ligado", "medidas/S1/pagina.json", "S1 S2");
NA("component-switch-cdaa37a49af0", "label e container adjacentes");
OK("component-switch-3ce79e28735b", "switches agrupados sob o checkbox principal 'Todos os avisos' (pai/filho, estado intermediário)", "medidas/S1/interacoes.json › checkbox-pai", "S1 S2");
OKS(["component-switch-f35a757c9366", "component-switch-1febec360d2a"], "efeito imediato: região aria-live mostra 'Preferência salva.' sem botão Salvar", "medidas/S1/interacoes.json › switch-teclado", "S1 S2");
SEMOBS(["component-switch-2acff890915f"], "posição do container durante a alternância não medida quadro a quadro");

// tab
OK("accessibility-tab-14789c5ef831", "Tab chega às abas; ArrowRight/ArrowLeft movem o foco entre elas", "medidas/S0/interacoes.json › abas-teclado");
OK("accessibility-tab-0ceb168206ca", "primeira parada no componente = 1ª aba 'Andamento'", "medidas/S0/interacoes.json › abas-teclado");
OK("accessibility-tab-e282c450c32d", "foco visível nas abas (contorno tracejado 4 px #c2850c; 1040–1048 px alterados)", "medidas/S0/tab.json");
OKS(["development-tab-883480e0295b", "development-tab-3f9ad5ebe1c2", "development-tab-3dd6810ecaf4", "development-tab-bd97709a288d", "development-tab-80096e965bc6"], "br-tab, tab-nav, tab-item, tab-content, tab-panel", "medidas/S0/instancias.json #tab-requerimento");
OKS(["component-tab-7ce162b3416f", "component-tab-7083f9fe58fa", "component-tab-e1fb11053f17", "component-tab-e7a1619979e5", "component-tab-a94224c7dcba"], "itens, superfície e divider (.separador-abas) presentes", "medidas/S0/instancias.json #tab-requerimento");
OK("component-tab-8a02522a6502", "ativo (borda inferior 4 px #0c326f, cor #0c326f) e interativo (#333, sem borda)", "medidas/S0/instancias.json #tab-requerimento");
OK("component-tab-57671d0e6635", "largura = rótulo + padding 24/24 (124,9 e 132 px)", "medidas/S0/instancias.json #tab-requerimento");
OKS(["component-tab-baf5e964f88b", "component-tab-df53a74bf6e7"], "rótulos de uma palavra", "medidas/S0/instancias.json");
NA("component-tab-9c1d566900b8", "abas com rótulo de texto");
OK("component-tab-fe674ea8f675", "tab-nav com 1160 px (largura do container)", "medidas/S0/instancias.json #tab-requerimento");
NAS(["component-tab-eced88814038", "component-tab-32bb5de7ccd5", "component-tab-46f48b951028", "component-tab-19dbdc545089"], "2 abas que cabem na largura; sem subcategorias");
OK("component-tab-c67819d62d0c", "itens alinhados à esquerda (x 60)", "medidas/S0/instancias.json #tab-requerimento");

// table
OKS(["accessibility-table-1402cdab7058", "accessibility-table-570dd0af2a17"], "tabela nativa (table/caption/thead/th/tbody/td headers=) navegável célula a célula pela AT", "medidas/S0/instancias.json #tbl-movimentacoes", "S0");
NA("accessibility-table-c9d8feb59cd6", "tabela sem controles interativos");
OK("development-table-ac6aff401d8d", "div.br-table", "medidas/S0/instancias.json", "S0");
OKS(["component-table-54d5095fb447", "component-table-56b4e3aa164f", "component-table-f01c42eed45b", "component-table-4f4d94c1f942"], "cabeçalho com 3 th concisos (Data, Movimentação, Responsável)", "medidas/S0/instancias.json", "S0");
OKS(["component-table-21f11e056a5a", "component-table-710f3fb2bcd6"], "5 linhas com borda inferior 1px #ccc", "medidas/S0/instancias.json", "S0");
INC("component-table-da77938a63e4", "nenhuma borda vertical entre colunas (border-left/right 0)", "a anatomia cita 'Colunas | Divider' mas não exige linha vertical visível no texto", "medidas/S0/instancias.json #tbl-movimentacoes");
OK("component-table-c555acbca17d", "título 'Movimentações do Requerimento'", "medidas/S0/instancias.json", "S0");
OK("component-table-98034d8758a2", "cursor auto nas células (padrão)", "medidas/S0/instancias.json", "S0");
OK("component-table-7c605ca2f85e", "3 colunas", "medidas/S0/instancias.json", "S0");
OK("component-table-b53cb7e903ef", "th sem ordenação em #333 (não na cor interativa)", "medidas/S0/instancias.json", "S0");
NAS(["component-table-c1a4cb6e71c0", "component-table-6952f53a9a2a", "component-table-bc0d039ca6cc", "component-table-2f6b9b3f3f93", "component-table-62e16afd5e52", "component-table-231dbe00349e", "component-table-73262b2878e0", "component-table-446f72ce0e4b", "component-table-ec24917f4c30", "component-table-3bc4b8496bb8", "component-table-23bbdc43b48c", "component-table-4f61b99081d2", "component-table-561c13acd830"], "tabela simples: sem ações, seleção, truncamento, rolagem, expansão, ordenação ou agrupamento");

// tag (tags de atalho do skiplink)
NAS(["accessibility-tag-2fbfebacf7b8", "accessibility-tag-9fc559eb6f8d", "component-tag-a63f46e79b01", "component-tag-21af1e5d1855", "component-tag-f524df7adaf2", "component-tag-0593dd73e34d", "component-tag-1c42b0603260", "component-tag-65966473383c", "component-tag-03f562fed12f", "component-tag-ef1a79ff5c4c", "component-tag-782b57f88880", "component-tag-3a1fcff6ca42", "component-tag-b9f7cc122fd6", "component-tag-36e369b1212b", "component-tag-165dbf6ec3f4"], "tags de texto estáticas ('1', '2') dentro dos itens do skiplink: sem ícone, interação, contagem, arrasto ou entrada");
OK("development-tag-cb1c2b36c92f", "span.br-tag.text", "medidas/S0/instancias.json");
OKS(["component-tag-b7c0bc2ec1f1", "component-tag-60344762a4ac"], "tag mostra a tecla de atalho do item; superfície #1351b4", "medidas/S0/instancias.json");
OK("component-tag-78ee2401dfe8", "tag de texto sem borda (border 0)", "medidas/S0/instancias.json");
INC("component-tag-b9bb5ab79f50", "rótulos '1' e '2' (numerais)", "numeral não é claramente adjetivo nem substantivo; é o padrão de atalho do skiplink", "medidas/S0/instancias.json");
OKS(["component-tag-4b136ecea1d5", "component-tag-3395ecf77ec3", "component-tag-b4c3c322f9f3", "component-tag-e7e47c24dca0", "component-tag-05981542d609"], "sem verbos, uma cor, só tags estáticas, uma linha (28 px)", "medidas/S0/instancias.json");
OK("component-tag-d6209e720791", "a tag de texto não recebe foco nem ação própria (aria-hidden; o link pai é o interativo)", "medidas/S0/tab.json");

// tooltip
OK("accessibility-tooltip-3159f024fb6d", "nenhum tooltip na ordem de Tab", "medidas/S*/tab.json");
OK("accessibility-tooltip-3d28dab9faa5", "o texto de cada tooltip está no nome do gatilho (protocolo/prazo via aria-labelledby; 'Fechar'; 'Exibir lista')", "medidas/S0/instancias.json (AX)");
OK("accessibility-tooltip-47b0445fec0e", "os 3 tooltips medidos aparecem com foco de teclado e somem com Escape", "medidas/S0/interacoes.json › tooltip-foco");
NAS(["development-tooltip-a13639a93806", "development-tooltip-2507e2516655", "development-tooltip-e937cb91ec57", "development-tooltip-6e381ea6a99e"], "tooltips simples (não popover)");
OKS(["development-tooltip-28d5ef864d9b", "development-tooltip-3bce7ef644ea"], ".br-tooltip com span.text", "medidas/S0/instancias.json");
OKS(["component-tooltip-f9dc5d35b7ed", "component-tooltip-53ea06a3f0cf", "component-tooltip-fd1b375690ae", "component-tooltip-43cefdddb2d8"], "balão, seta (.arrow 16×8) e conteúdo", "medidas/S0/interacoes.json › tooltip-hover");
OK("component-tooltip-277f2b36bcb3", "sombra rgba(0,0,0,.16) 0 3px 6px", "medidas/S0/interacoes.json › tooltip-hover");
add("component-tooltip-187fe90aeefd", { veredito: "conforme", estados: "S0", medida: "#tip-prazo: seta centrada no balão (287,0 × 287,0)", evidencia: "medidas/S0/interacoes.json › tooltip-hover #tip-prazo-gatilho" });
NA("component-tooltip-6a0f0ee7ceea", "nenhum tooltip lateral");
NA("component-tooltip-68918076ee57", "tooltips sem título");
OKS(["component-tooltip-3b61e743a9ea", "component-tooltip-9dbb38ee90da", "component-tooltip-b235b4010a48", "component-tooltip-85757a53fd4e"], "texto informativo curto (1–5 palavras)", "medidas/S0/interacoes.json › tooltip-hover");
OK("component-tooltip-ffbac5193e02", "seta aponta para dentro do gatilho nos 3 casos (centro da seta dentro da largura do gatilho)", "medidas/S0/interacoes.json › tooltip-hover");
OK("component-tooltip-d624cba3faab", "balão a ~8 px do gatilho", "medidas/S0/interacoes.json › tooltip-hover");
NAS(["component-tooltip-0397367a4687", "component-tooltip-390c1ef7ea0b", "component-tooltip-4132406916f9"], "gatilhos longe do topo, da base e da lateral esquerda da janela");
INC("component-tooltip-8b9010a710bf", "gatilhos 'Fechar' a 68 px da borda direita: tooltip acima (place=top), inteiro dentro da janela", "'próximo à lateral direita' não tem limiar na base", "medidas/S0/interacoes.json › tooltip-hover; medidas/S2/interacoes.json › retorno-tooltip");
NA("component-tooltip-663b9ce6ffa9", "nenhum tooltip de alerta");
OK("component-tooltip-beb34d5e8c7f", "tooltips só informativos (cor não carrega significado)", "medidas/S0/interacoes.json › tooltip-hover");
NA("component-tooltip-e76c2b6b1207", "sem tooltip de aprendizado de funcionalidade");
SEMOBS(["component-tooltip-6c0ff733e696", "component-tooltip-7fa075c064c2", "component-tooltip-e96c4eb1bbed"], SEMOBS_TXT);

// upload
OKS(["development-upload-fce124a3079e", "development-upload-b8546e243b2e", "development-upload-c379e1665c57"], "br-upload, label.upload-label, input.upload-input", "medidas/S1/instancias.json", "S1 S2");
OK("component-upload-10b79d5d8a0a", "placeholder 'Selecione o arquivo' e ícone fa-upload", "medidas/S1/interacoes.json › upload-teclado", "S1 S2");
OKS(["component-upload-1c4131f455f4", "component-upload-600760f31d74"], "label 'Envio de documento' (variação de 'Envio de arquivo' para um único arquivo), placeholder 'Selecione o arquivo'", "medidas/S1/pagina.json", "S1 S2");
NA("component-upload-b32b07f8e18d", PROC);
OK("component-upload-4d6c1f1860ec", "superfície (área tracejada 1px dashed #1351b4, 550×40)", "medidas/S1/interacoes.json › upload-teclado", "S1 S2");
INC("component-upload-f0d98f9e5880", "o texto de apoio anuncia arrastar", "arrastar arquivo não foi simulado", "medidas/S1/pagina.json");
OK("component-upload-a54eed419af5", "'Você também pode arrastar o arquivo até a área acima.' abaixo do campo", "medidas/S1/pagina.json", "S1 S2");
OK("component-upload-ad04631e3e0e", "erro de envio sem arquivo tratado com feedback de mensagem ('Selecione o arquivo do documento.', .feedback.danger)", "medidas/S2/interacoes.json › erro-identificacao", "S2");
NA("component-upload-13be871b9f7b", "nenhum arquivo selecionado nos estados");
INC("component-upload-53f1c7450c4b", "nenhuma mensagem de alerta sobre o comportamento de envio", "o comportamento a que a regra se refere não é identificável fora do contexto", null);

/* =====================================================================================
 * GLOBAIS (e-MAG 3.1 via base, fundamentos, padrões, template, desenvolvimento)
 * ===================================================================================== */
SEMOBS(["accessibility-global-d45cbedbac01", "accessibility-global-2e90b5314678", "accessibility-global-ecf38f996b3f", "accessibility-global-7bf4fd5a5cb8", "accessibility-global-0ea649a25d34", "accessibility-global-092602f71da7"], "princípio geral; medido através das regras específicas (ver achados)");
NAS(["accessibility-global-f941a29c942e", "accessibility-global-e9275b5b8b5e", "accessibility-global-9f1bef37ba33", "accessibility-global-99426889f765", "accessibility-global-bd6ce6757c97"], PROC);
OK("accessibility-global-9282ff8b00ff", "conteúdo em HTML", "medidas/html-servido.json");
OKS(["accessibility-global-2afc99353c13", "accessibility-global-01554d3d9446", "accessibility-global-67a136404372"], "cabeçalhos h1/h2, listas ol/ul, tabela de dados, strong, form/fieldset, main/nav/header/footer", "medidas/S*/pagina.json");
OK("accessibility-global-1b05051817ed", "elementos usados conforme o propósito, exceto os achados A2 (font/align, menubar, span com tabindex)", "medidas/S*/pagina.json");
OKS(["accessibility-global-e436bded3d73", "accessibility-global-88d6a1a5da75", "accessibility-global-12fb45707041", "accessibility-global-7514e57eb1d7"], "um h1 ('Acompanhar Requerimento', conteúdo principal); h2 subordinados; sem salto", "medidas/S*/pagina.json › titulos");
OK("accessibility-global-fb9dfcacbb34", "ordem de Tab = ordem do DOM = ordem visual (skiplink, breadcrumb, mensagem, card, abas, conteúdo da aba, accordion, voltar)", "medidas/S*/tab.json");
OKS(["accessibility-global-87639c7875d6", "accessibility-global-0a487b46e706", "accessibility-global-538e57855252", "accessibility-global-370be2b830da", "accessibility-global-2eb5a14f268c", "accessibility-global-5cdb30e93a18"], "skiplink no início: 1º link 'Ir para o conteúdo', 2º 'Ir para o rodapé'; accesskeys 1 e 2 únicas; oculto mas na AX", "medidas/S0/pagina.json; medidas/S0/interacoes.json › skiplink-tab");
INC("accessibility-global-362451854ed6", "âncoras alvo têm só id (main#main-content, footer#rodape)", "o atributo name não é válido em main/footer no HTML vigente (conflita com e-MAG 1.1)", "medidas/S0/pagina.json");
OKS(["accessibility-global-6441869aa9dc", "accessibility-global-0b5865596a8d", "accessibility-global-6bf6afb35fac"], "a única tabela é de dados", "medidas/S0/instancias.json");
OK("accessibility-global-2c9bfe2a1ce8", "links adjacentes do breadcrumb em li separados por ícone separador", "medidas/S0/instancias.json");
OKS(["accessibility-global-de4271a11af7", "accessibility-global-9e7607ee8724", "accessibility-global-0a8d4701a05b", "accessibility-global-b524f2350f1a"], "regiões banner (header), main, navigation, contentinfo (footer); títulos h1/h2", "medidas/S*/ax.json");
NA("accessibility-global-cf3fd419f6ef", "sem rodapé de seção");
SEMOBS(["accessibility-global-13a02791f19f", "accessibility-global-b4c141aac9ab"], "exige comparar com outras páginas (uma só página medida)");
INC("accessibility-global-c760d556bf14", "'Dúvidas frequentes' em <section>; o card e as abas em <div>", "o que é 'divisão com significado importante' é julgamento", "medidas/S0/pagina.json");
OKS(["accessibility-global-f217a4680edd", "accessibility-global-fbf3730eb056", "accessibility-global-b3ec53516611", "accessibility-global-c11ae4dea1e2", "accessibility-global-1405b3ed2bf5"], "nenhum target, pop-up ou janela nova", "medidas/S*/pagina.json › links");
OK("accessibility-global-b2964e6923f0", "o foco só muda por ação da pessoa (Enviar → Fechar da mensagem; fechar → h1/Enviar); na carga fica no body", "medidas/S*/interacoes.json");
NA("accessibility-global-a7019570c265", "sem modal");
OKS(["accessibility-global-f47bc235ae0c", "accessibility-global-7a97103ce64c"], "todas as funções operáveis por teclado: abas, accordion, select (setas), checkbox/switch (Space), upload (Enter no botão), mensagens (Enter/Space)", "medidas/S*/interacoes.json");
OK("accessibility-global-ec99df81a596", "sem armadilha: Tab percorre até o fim e sai para o body", "medidas/S*/tab.json");
NAS(["accessibility-global-6dafb05f7638", "accessibility-global-9a421b318e17", "accessibility-global-171e4cb5436e"], "sem eventos dependentes de dispositivo nem objeto programável não acessível");
SEMOBS(["accessibility-global-069571393812"], SEMOBS_TXT);
OKS(["accessibility-global-ea6c205acc54", "accessibility-global-5077c5ea2ad1", "accessibility-global-ed75d8d915ba", "accessibility-global-3b17bcc16108", "accessibility-global-b5195c8fdcb7", "accessibility-global-5cf090705f78"], "nenhum conteúdo piscante, em movimento ou animado nas 36 amostras de 360 s nem nos estados", "medidas/observacao-360.json");
OKS(["accessibility-global-8170ddf527be", "accessibility-global-8dca38b3d6d8", "accessibility-global-32912f18470f", "accessibility-global-fa5e490a277d"], "<html lang=\"pt-BR\">", "medidas/S0/pagina.json");
OK("accessibility-global-9a6edd7d551e", "título 'Acompanhar requerimento — Atendimento gov.br'", "medidas/S0/pagina.json");
OKS(["accessibility-global-e177af0de858", "accessibility-global-b20da5827b28"], "breadcrumb em ol; caminho como links, exceto a página atual", "medidas/S0/instancias.json");
OKS(["accessibility-global-cf4fe5bb4b7e", "accessibility-global-a95b1d3bc496", "accessibility-global-74f4438054c2", "accessibility-global-3f41d7ddc85a", "accessibility-global-5538932e545e"], "textos de link descritivos; nenhum 'clique aqui'; nenhum title; nenhum texto repetido para destinos diferentes", "medidas/S0/pagina.json › links");
NA("accessibility-global-db3114c7c604", "sem links de download");
OKS(["accessibility-global-72ab4a3bffee", "accessibility-global-bb4c4848ebed", "accessibility-global-e913d32a2f64"], "2 imagens (marca) com alt 'gov.br'", "medidas/S0/pagina.json › imagens");
NAS(["accessibility-global-ad9b34aa4f6a", "accessibility-global-9db70f2144d5", "accessibility-global-e680fb7db930"], "sem imagem complexa nem figure");
OK("accessibility-global-e5b40ebae74d", "ícones decorativos por fonte (Font Awesome) com aria-hidden; as únicas <img> são informativas", "medidas/S0/pagina.json");
NAS(["accessibility-global-c681074558be", "accessibility-global-9ae52a07780b", "accessibility-global-e2223f6033be"], "sem mapa de imagem");
NA("accessibility-global-9d12c9a94f40", "sem PDF");
OKS(["accessibility-global-29bd6bf04fc5", "accessibility-global-d2b8f974a815", "accessibility-global-00290bc67eb5", "accessibility-global-abddec330caf"], "caption primeiro filho da table; thead/tbody; td headers= ids dos th", "medidas/S0/instancias.json #tbl-movimentacoes");
NA("accessibility-global-7ec16b12e078", "tabela curta (5 linhas)");
SEMOBS(["accessibility-global-0aa7f023d1e2", "accessibility-global-ea07483a7db3"], "nível de leitura exige avaliação de texto (não medida)");
OKS(["accessibility-global-9068b253efd7", "foundation-global-606524c94570", "foundation-global-5dbaa4947aa9"], "contraste de todos os textos visíveis ≥ 4,5:1 (mín. 4,59 'Envio' verde; 4,60 feedback branco sobre #e52207; placeholder 12,63)", "medidas/S*/contraste.json");
OK("accessibility-global-5f1552e3f4ff", "nenhum texto sobre imagem de fundo", "medidas/S*/contraste.json (imagemFundo null)");
INC("accessibility-global-21f137078108", "erro do select sinalizado por cor vermelha + espessura de borda (1 → 2 px), sem texto — ver achado de e-MAG 6.6", "a espessura é característica não cromática, mas sensorial; o caso já entra como violação de 6.6", "medidas/S2/interacoes.json › erro-identificacao");
INC("accessibility-global-b396d1fcdadc", "idem", "idem", "medidas/S2/interacoes.json › erro-identificacao");
INC("accessibility-global-b5c25d164e86", "a 640×450 o conteúdo continua legível; só um rótulo extrapola 8 px (ver achado 4.3)", "legibilidade não medida item a item", "medidas/S0/interacoes.json › redimensionar-200");
SEMOBS(["accessibility-global-a14af95174c3"], "só uma largura extra (640 px) medida");
OKS(["accessibility-global-bc492500708d", "accessibility-global-2a241e6b0ff6", "accessibility-global-5f3ebabe87e6"], "todas as paradas de Tab (18/23/24) mudam visualmente com foco (300–7296 px diferentes); contorno tracejado 4 px #c2850c ou anel 2 px no campo", "medidas/S*/tab.json");
NAS(["accessibility-global-423cb570bbad", "accessibility-global-b06dab914718", "accessibility-global-53f4aeeb8e48", "accessibility-global-a40ac6218645", "accessibility-global-dc1ff3526350", "accessibility-global-a8bfd13463ba", "accessibility-global-a82bb7c8380b", "accessibility-global-b57d739ec686", "accessibility-global-7ea17e958d4c", "accessibility-global-31f89032a9ca", "accessibility-global-f69be25e659f", "accessibility-global-32dfc5f39fe0", "pattern-global-7c2c2e52a977", "pattern-global-d85b7d629c79", "pattern-global-99fe25b9ff52", "pattern-global-473690d2a6e0"], "sem vídeo, áudio ou multimídia (nenhum papel de mídia na árvore AX)");
NAS(["accessibility-global-671baab82534", "accessibility-global-9b182531e76c", "accessibility-global-2f8ae4c353fc"], "sem botões de imagem");
OK("accessibility-global-9d6c7091b9bf", "labels usados nos campos (select, rádios, checkbox, switches, upload)", "medidas/S1/pagina.json › campos");
OKS(["accessibility-global-76b4b213047e", "accessibility-global-f2edbc796e74"], "ordem do formulário: tipo → arquivo → Enviar → avisos (DOM = visual = Tab)", "medidas/S1/tab.json");
OKS(["accessibility-global-9e7fb4dfa31c", "accessibility-global-1131c20a8b5d", "accessibility-global-711bf7223f5c"], "foco em campo não muda contexto; o envio só pelo botão (ou Enter no campo)", "medidas/S1/interacoes.json");
OKS(["accessibility-global-d301511184d7", "accessibility-global-bbe29662febf"], "'Todos os campos são obrigatórios.' antes dos campos; placeholder orienta o select", "medidas/S1/pagina.json");
OK("accessibility-global-0e9cecc8b4d7", "nenhum campo pré-preenchido", "medidas/S1/pagina.json › campos");
INC("accessibility-global-316e1f31a4ac", "envio bem-sucedido não alcançado (exigiria escolher arquivo)", "tela de confirmação não observável sem dados", null);
NAS(["accessibility-global-118922c0cbd9", "accessibility-global-883d61bbf499", "accessibility-global-5b7eea28e7d7"], "sem CAPTCHA");

// fundamentos
OK("foundation-global-21b1a2733f7b", "todas as cores computadas visíveis estão na paleta (#000, #333, #fff, #ccc, #1351b4, #155bcb, #0c326f, #071d41, #fff5c2, #168821, #f0f0f0, #888, #fde0db, #e52207); rgba(16,16,16,.3) é a cor do agente nos botões de etapa desabilitados, sem texto próprio", "medidas/S*/pagina.json › coresUsadas; corpus fundamentos-visuais/cores.md");
OK("foundation-global-450420b746a8", "font-family computado 'Rawline, Raleway, sans-serif' em todo texto", "medidas/S*/pagina.json › familiasUsadas");
OK("foundation-global-e0e913d352f3", "ícones decorativos com aria-hidden", "medidas/S2/instancias.json");
OK("foundation-global-5f213b4dbcb5", "ícones interativos ≥ 32×32 (≥ 24×24)", "medidas/S2/pagina.json › botoes");
INC("foundation-global-1c0146e93d2e", "botões de ícone com 32×32 (Fechar, Exibir lista) e 40×40 (Home, ajuda)", "a área de 48×48 é dita para toque/dispositivos móveis; medida em desktop 1280 px", "medidas/S2/pagina.json › botoes");
OK("foundation-global-7dc943e89a3d", "área de interação dos ícones ≥ 32 px", "medidas/S2/pagina.json › botoes");
OK("foundation-global-65281f15cfbb", "cursor pointer em todos os interativos visíveis (links, botões, abas, rótulos de checkbox/switch/rádio)", "medidas/S1/interacoes.json › cursores; medidas/S0/interacoes.json › cursores-S0");
OK("foundation-global-85acc17bb79e", "etapas desabilitadas com cursor not-allowed", "medidas/S0/interacoes.json › cursores-S0");
OK("foundation-global-1b38d4fabe89", "elementos desabilitados fora da ordem de Tab", "medidas/S0/tab.json");
OK("foundation-global-6cf9c58cc6b6", "um elemento com foco por vez", "medidas/S*/tab.json");
OK("foundation-global-bd9546eb77e4", "clique em aba, accordion e botão de ajuda: foco sem :focus-visible e sem contorno", "medidas/S0/interacoes.json › foco-por-clique");
OK("foundation-global-9fceb57bb720", "foco por teclado visível", "medidas/S*/tab.json");
OK("foundation-global-e2c92935c052", "uma aba ativa por vez; um passo ativo", "medidas/S*/instancias.json");
INC("foundation-global-e6f2b4950df2", "etapas desabilitadas: borda do indicador a 45% (amenizada), mas o rótulo segue em #1351b4 como as habilitadas", "parcial: 'baixa ênfase' não tem limiar", "medidas/S0/interacoes.json › etapas");
INC("foundation-global-787286ee99e4", "switch ligado/desligado não fotografado", "contraste entre estados não medido", null);
INC("foundation-global-d045940b9198", "cor de link visitado não medida (histórico limpo em toda carga)", "estado visitado não alcançado", null);

// padrões / template / desenvolvimento
OKS(["template-global-c21ff1c7eefc", "template-global-10b091d3e7d1", "template-global-79cf9ea963ee"], "Template Base: header (br-header), conteúdo (main), rodapé (br-footer)", "medidas/S0/instancias.json");
OKS(["pattern-global-3d865f569bdb", "pattern-global-62888bfde020", "pattern-global-aabbc9b63402"], "todos os campos com rótulo; placeholder não substitui rótulo", "medidas/S1/pagina.json › campos");
INC("pattern-global-55e03d854e1d", "ao abrir a aba Documentos (S1) o foco fica na aba; em S2 vai ao Fechar da mensagem — o 1º campo obrigatório não recebe foco", "conflita com o comportamento exigido das abas (foco permanece na aba) e da mensagem (foco no fechar)", "medidas/S*/pagina.json › focoNaChegada");
OK("pattern-global-17cd1e002181", "largura do campo fixa (400 px) ao digitar", "medidas/S1/interacoes.json › select-digitar");
OK("pattern-global-1ab5a66de008", "título do formulário h2 34,832 px, maior texto do formulário", "medidas/S1/pagina.json › titulos");
OK("pattern-global-e7baadab728a", "ícones de ajuda: botão terciário com ícone, mesma linha, à direita do dado", "medidas/S0/instancias.json #crd-resumo");
INC("pattern-global-4ab3c641f946", "tooltip 'Prazo em dias corridos' qualifica o prazo; 'Use o NUP para consultar'", "se é 'informação vital' é julgamento", "medidas/S0/interacoes.json › tooltip-hover");
NAS(["pattern-global-a0e5ee1b1a71", "pattern-global-343c0e30323f"], "formulário com um único botão");
NAS(["pattern-global-2d49bd4cbbc9", "pattern-global-0eb8e518d38c", "pattern-global-bab13e36d0ad", "pattern-global-bcf7f9ef0172", "pattern-global-95ff7bedd7c4"], "sem senha, máscara ou seletor de país");
OK("pattern-global-582e7bbd5156", "o rótulo de grupo 'Avisos sobre o requerimento' (16,8 px) tem menos ênfase que o título do formulário (34,8 px)", "medidas/S1/pagina.json");
OK("pattern-global-9ac14bf357d4", "rótulos de campo com só a primeira letra maiúscula", "medidas/S1/pagina.json › campos");
OKS(["pattern-global-70b1f49fd18a", "pattern-global-9f15124db29f", "pattern-global-eaa8a5e4349c"], "sem texto todo em caixa alta; datas dd/mm/aaaa; NUP alinhado à esquerda", "medidas/S0/instancias.json");
NA("pattern-global-613ac9ec24e0", "tabela sem coluna numérica");
OK("pattern-global-7ffb713fc93f", "links indicam destino/ação", "medidas/S0/pagina.json › links");
NAS(["pattern-global-755bfecde108", "pattern-global-475507f19bd1"], "tags só numéricas (atalho)");
OK("pattern-global-38e29fcf7bc4", "nenhum title em link", "medidas/S0/pagina.json › links");
OKS(["pattern-global-e6f64d045f26", "pattern-global-83528ebfc1ca"], "estados das etapas e mensagens têm texto (', etapa concluída'; 'Erro:'; 'Documento pendente.'); exceção medida: borda do select — ver achado 6.6", "medidas/S0/pagina.json; medidas/S2/interacoes.json");
NAS(["pattern-global-88ff311db57f", "pattern-global-5052e0ad6f98", "pattern-global-e4837afb47e9", "pattern-global-66a7f441f4de", "pattern-global-891dbb5d1430", "pattern-global-b2760f582bb5", "pattern-global-b61529e83092", "pattern-global-32ca9b3cb3d1", "pattern-global-d3588a29dc79", "pattern-global-9e2189d345ed", "pattern-global-8c6ae168c80d", "pattern-global-54d389106e74", "pattern-global-fce755dd628a", "pattern-global-946537b312f2", "pattern-global-f7aa9af18abf", "pattern-global-1e35e19a3990", "pattern-global-4879e83797d6", "pattern-global-4ccc45fc9786", "pattern-global-1f8dbbf76be4", "pattern-global-4600cb6647ba", "pattern-global-e5134be8f4e3", "pattern-global-addada3c8805", "pattern-global-0418dbc75af6", "pattern-global-c0d1dc1d062f", "pattern-global-093985af0168", "pattern-global-52053b9380b0", "pattern-global-d647aa805741", "pattern-global-279d485d8d97"], "sem Empty State nos estados (tabela e lista com dados; o 'não encontrado' do select só existe com texto digitado, fora dos estados)");
OKS(["development-global-851d30cb11a1", "development-global-b6c03441339c"], "head/body sem recuo; atributos booleanos sem valor (single, disabled, active, novalidate) no HTML servido", "medidas/html-servido.json");

// fundamentos: cores, estados, grid, iconografia, tipografia (restantes)
OK("foundation-global-865b0ffb9e2a", "superfícies (#fff, #fff5c2, #fde0db, #071d41) contrastam com texto e interativos (≥ 4,59:1)", "medidas/S*/contraste.json");
OK("foundation-global-7429b5798c99", "cor de interação #1351b4 a 7,33:1 sobre #fff", "medidas/S*/contraste.json");
OK("foundation-global-18aac6974d3e", "hover realça o próprio objeto (item da lista)", "medidas/S1/interacoes.json › select-clique.hoverItem");
OK("foundation-global-638a80845429", "cursor pointer nos interativos", "medidas/S1/interacoes.json › cursores");
OK("foundation-global-8dc5ad0d4f07", "etapas desabilitadas sem sombra", "medidas/S0/interacoes.json › etapas");
OKS(["foundation-global-d9a6863df99b", "foundation-global-8728bcb794ff", "foundation-global-bdf0f786b5ed", "foundation-global-21a5e909bdaa", "foundation-global-df2ced45525c"], "foco por teclado: contorno tracejado 4 px #c2850c em volta do elemento com afastamento (offset 4 px; −4 px nas abas e skiplink), um só tipo por elemento", "medidas/S*/tab.json");
NA("foundation-global-ae68a470eb35", "foco tênue não usado");
OKS(["foundation-global-af10fbd77297", "foundation-global-ba8db8363b21", "foundation-global-6528d31819e8"], "uma aba ativa; accordion single; etapa ativa única; desabilitadas não ativas", "medidas/S0/interacoes.json › acordeao, etapas");
OKS(["foundation-global-19fe027ffdd8", "foundation-global-796412737a0d", "foundation-global-18fdaca382b7", "foundation-global-ced823e7339b", "foundation-global-837c59d3da82"], "abas, tooltips, botões, mensagens e divisores sem estado visual 'selecionado' (só ativo/interativo)", "medidas/S0/instancias.json");
NA("foundation-global-f9ae0a0a96bb", "sem modal");
INC("foundation-global-c8ba52179fd1", "checkbox/switch ligados não fotografados", "estado selecionado não capturado em imagem", null);
INC("foundation-global-fe9b3e6fb979", "idem", "idem", null);
NAS(["foundation-global-3f8a0a689c4f", "foundation-global-49d08615852f", "foundation-global-f8fe940b2ddb", "foundation-global-2deb65dc01cc", "foundation-global-91a73107399e", "foundation-global-9ac65ed57a1f", "foundation-global-41a1406cc7a5", "foundation-global-3716e2c36925", "foundation-global-41ed878e2e9c", "foundation-global-1ef4025976f5"], "nenhum elemento arrastável na página");
add("foundation-global-97dad3f0c05a", { veredito: "incerto", tipo: "medido-ambiguo", medida: "o upload anuncia arrastar arquivo", motivo: "arrastar sobre a área não foi simulado", evidencia: "medidas/S1/pagina.json" });
INC("foundation-global-50fe72c90a88", "idem (dropzone do upload)", "não simulado", null);
INC("foundation-global-c0052af42790", "idem", "não simulado", null);
INC("foundation-global-4342853c4908", "idem", "não simulado", null);
INC("foundation-global-9738e4747189", "idem", "não simulado", null);
INC("foundation-global-cde7b935427a", "idem", "não simulado", null);
NA("foundation-global-ad7f4f8389c7", "nenhum link sobre fundo escuro (footer sem links)");
OKS(["foundation-global-02c52c687799", "foundation-global-5f09d3ccaf40"], "a 1280 px todo o conteúdo fica entre x 60 e 1220 (margens da grid); só header/footer/fundos sangram", "medidas/S0/instancias.json");
NA("foundation-global-4b6c47547911", "medido em 1280 px (grid de 12 colunas)");
OKS(["foundation-global-df5e11a0719f", "foundation-global-9ed834a493e9"], "ícones correspondem à ação: fa-home → página inicial, fa-times → fechar, fa-question-circle → ajuda, fa-angle-down → exibir lista/expandir, fa-upload → enviar arquivo, fa-search → pesquisar opções", "medidas/S2/instancias.json");
NAS(["foundation-global-e3cab0e59add", "foundation-global-e9da06d89083"], "nenhum ícone semântico isolado: os ícones são decorativos com nome no controle; o ícone de alerta da mensagem tem texto sr-only");
INC("foundation-global-2f3975f066de", "16 px fora da escala no h2 'Dúvidas Frequentes' (achado de foundation-global-21fb08664799)", "regra condicional ('caso seja necessário alterar algum valor'); o fato já é achado", "medidas/S0/pagina.json");

// padrões restantes
OKS(["pattern-global-b8cf68552989", "pattern-global-8b378760f70b", "pattern-global-8d2c60f53010", "pattern-global-d2347a3c39a5", "pattern-global-7ae19fa4a286", "pattern-global-a537fc405080", "pattern-global-aa56f7a1318a", "pattern-global-7ea5627fa002"], "campos com largura compatível; select para dados predeterminados; texto auxiliar de 1 frase; títulos e rótulos curtos e objetivos", "medidas/S1/pagina.json");
NAS(["pattern-global-b9169f7968e5", "pattern-global-84c61a2988e1"], "o formulário não é o único elemento da página e não tem subtítulo");
NA("pattern-global-f2af1e26d865", "sem seleção múltipla");
NA("pattern-global-bda01def4eb6", "orientação para rótulos de tags; as tags são numéricas");
OK("pattern-global-a1c3fb8b701e", "alt 'gov.br' (marca)", "medidas/S0/pagina.json › imagens");
OKS(["pattern-global-d940aeb025a5", "pattern-global-3452ebb82982", "pattern-global-72f4217f6a64"], "links com sentido isolados (lista de links da página)", "medidas/S0/pagina.json › links");
OKS(["pattern-global-e8dde0646f49", "pattern-global-fc43c36e8153", "pattern-global-1ae939f092f9", "pattern-global-5cf60bf7ef93", "pattern-global-d91e1703086d", "pattern-global-5edee73f5cfb", "pattern-global-ef292ba8111c", "pattern-global-8216757861d9"], "todo o texto visível dos 3 estados lido (textos de contraste.json): nenhuma ironia, culpa, gíria, regionalismo, termo sobre deficiência, palavrão ou repetição de palavras-chave", "medidas/S*/contraste.json");
const ACH = f => ACHADOS.filter(f).map(a => a.id);
add("pattern-global-6ede62040f7a", { veredito: "violada", estados: "S1 S2", medida: "campos do formulário com falhas WCAG medidas (combobox sem nome, upload com aria-hidden e etiqueta desassociada, grupo sem legend, erro do select sem texto)", achado: ACH(a => ["select", "upload", "checkbox / switch (grupo)"].includes(a.componente)).join(", ") });

/* =====================================================================================
 * camada WCAG 2.1 — pontos conformes medidos que a base não cobre literalmente
 * ===================================================================================== */
const WCAG_OK = [
  { wcag: "1.4.3", medida: "contraste ≥ 4,5:1 em todo texto visível dos 3 estados (mínimo 4,59)", evidencia: "medidas/S*/contraste.json" },
  { wcag: "2.4.7", medida: "foco visível nas 18/23/24 paradas (diferença de pixels > 0 em todas)", evidencia: "medidas/S*/tab.json" },
  { wcag: "2.1.1", medida: "todas as funções operáveis por teclado", evidencia: "medidas/S*/interacoes.json" },
  { wcag: "2.1.2", medida: "sem armadilha de teclado", evidencia: "medidas/S*/tab.json" },
  { wcag: "2.4.1", medida: "skiplink para #main-content e #rodape funciona", evidencia: "medidas/S0/interacoes.json › skiplink-enter" },
  { wcag: "2.4.2", medida: "título descritivo", evidencia: "medidas/S0/pagina.json" },
  { wcag: "3.1.1", medida: "lang=pt-BR", evidencia: "medidas/S0/pagina.json" },
  { wcag: "1.1.1", medida: "imagens com alt; ícones aria-hidden; botões de ícone nomeados", evidencia: "medidas/S*/pagina.json" },
  { wcag: "4.1.2 (switch, AX)", medida: "Chromium expõe switch com checked true/false correto (propriedade nativa), apesar do aria-checked fixo", evidencia: "medidas/S1/interacoes.json › switch-ax-ligado" },
  { wcag: "3.3.2", medida: "rótulos e instrução 'Todos os campos são obrigatórios.'", evidencia: "medidas/S1/pagina.json" },
  { wcag: "1.4.13 (dispensável)", medida: "Escape fecha os 3 tooltips medidos", evidencia: "medidas/S0/interacoes.json › tooltip-foco" },
  { wcag: "4.1.3", medida: "'Preferência salva.' em região aria-live=polite; erros em role=alert", evidencia: "medidas/S1/interacoes.json › switch-teclado; medidas/S2/pagina.json › regioesVivas" },
];

/* =====================================================================================
 * montagem
 * ===================================================================================== */
const linhas = [], conformes = [], incertos = [], naoSeAplica = [];
let semDecisao = 0;
for (const r of UNIVERSO) {
  let ds = D.get(r.id);
  if (!ds) { ds = [{ veredito: "incerto", tipo: "nao-medida", medida: null, motivo: "sem decisão explícita: não medida nesta auditoria" }]; semDecisao++; }
  for (const d of ds) {
    const l = { id: r.id, componente: r.component ?? "global", force: r.force, categoria: r.category, fonte: r.emagReferences.length ? `e-MAG ${r.emagReferences.join(",")}` : `DS ${r.source.pageTitle ?? r.source.locator ?? ""}`.trim(), wcag: r.wcagReferences, norma: r.normalizedRule.replace(/\s+/g, " ").slice(0, 240), ...d };
    linhas.push(l);
    if (d.veredito === "conforme") conformes.push({ regra: r.id, componente: l.componente, fonte: l.fonte, estados: d.estados ?? "S0 S1 S2", medida: d.medida, evidencia: d.evidencia });
    if (d.veredito === "incerto") incertos.push({ regra: r.id, componente: l.componente, fonte: l.fonte, force: r.force, tipo: d.tipo, medida: d.medida, motivo: d.motivo, evidencia: d.evidencia ?? null, norma: l.norma });
    if (d.veredito === "nao-se-aplica") naoSeAplica.push(r.id);
  }
}
for (const k of D.keys()) if (!UNIVERSO.some(r => r.id === k)) throw new Error("decisão para regra fora do universo: " + k);
for (const w of WCAG_OK) conformes.push({ regra: `WCAG-2.1-${w.wcag}`, componente: "pagina", fonte: "WCAG 2.1", estados: "S0 S1 S2", medida: w.medida, evidencia: w.evidencia });

const conta = f => linhas.reduce((o, l) => ((o[f(l)] = (o[f(l)] || 0) + 1), o), {});
const fonteDe = a => a.regra.id.startsWith("WCAG") ? "WCAG" : a.regra.fonte.startsWith("e-MAG") ? "e-MAG" : "DS";
const resumo = {
  universo: { regras: UNIVERSO.length, componentes: [...PRESENTES], linhas: linhas.length },
  vereditos: conta(l => l.veredito),
  incertosPorTipo: incertos.reduce((o, i) => ((o[i.tipo] = (o[i.tipo] || 0) + 1), o), {}),
  semDecisaoExplicita: semDecisao,
  achados: ACHADOS.length,
  achadosPorFonte: ACHADOS.reduce((o, a) => ((o[fonteDe(a)] = (o[fonteDe(a)] || 0) + 1), o), {}),
  achadosPorComponente: ACHADOS.reduce((o, a) => ((o[a.componente] = (o[a.componente] || 0) + 1), o), {}),
  regrasDaBaseVioladas: [...new Set(linhas.filter(l => l.veredito === "violada").map(l => l.id))].length,
  criteriosWcagCitados: [...new Set(ACHADOS.flatMap(a => [a.regra.id, ...a.tambemViola.map(t => t.id)]).filter(x => x.startsWith("WCAG")))],
};
const meta = { tela: "acompanhamento (A2)", auditoria: "cega, por medição (sem oráculo, sem axe)", geradoPor: "tela-a2/auditoria/montar-decisoes.mjs",
  base: "govbr-ds-validator/data/knowledge/versions/3.7.0-literal-2026-10-15/normalized/rules.jsonl", baseSha256: createHash("sha256").update(textoKB).digest("hex"),
  filtro: "force ∈ {required, prohibited} e (component ∈ componentesPresentes da lista neutra ou component = null)", resumo };
const grava = (n, o) => writeFileSync(join(AQUI, n), JSON.stringify(o, null, 1) + "\n");
grava("achados.json", { _meta: { ...meta, nota: "um item por unidade violada (regra principal × elemento × estados); 'tambemViola' = outras regras do mesmo fato" }, achados: ACHADOS });
grava("conformes.json", { _meta: { ...meta, nota: "pontos verificados por medição; regras da base e critérios WCAG" }, conformes });
grava("incertos.json", { _meta: { ...meta, nota: "medido-ambiguo = medida feita, norma não decide; sem-observavel = julgamento de projeto/redação sem observável; nao-medida = sem decisão explícita" }, incertos });
grava("decisoes.json", { _meta: meta, linhas });
console.log(JSON.stringify(resumo, null, 1));
