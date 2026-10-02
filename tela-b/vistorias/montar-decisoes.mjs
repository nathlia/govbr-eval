/**
 * Monta tela-b/vistorias/decisoes.json: uma linha por regra da base normativa 3.7.0 (rules.jsonl, 186
 * regras; as 45 com emagReferences são as recomendações do e-MAG 3.1) × a tela Vistorias nos 4
 * estados escolhidos — metodo-auditoria.md § 3.2–3.3, adendo § A–D.
 *
 * Lê SÓ texto de norma. As decisões estão escritas abaixo, à mão, com a medida que as sustenta
 * (inventario.json, estados.json, conferir-auditoria.mjs). Regra sem decisão explícita cai num padrão
 * declarado pela força e pelo componente — e o script PARA se uma regra required/prohibited de
 * componente presente ou global ficar sem decisão explícita. Nenhum filtro por automatable,
 * automationConfidence ou validationStrategy.
 *
 * Uso: node tela-b/vistorias/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const KB = join(AQUI, "../../../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");
const regras = readFileSync(KB, "utf8").trim().split("\n").map(l => JSON.parse(l));

/** Componentes do inventário visíveis em alguma parada (inventario.json › componentes). */
const PRESENTES = new Set(["header", "button", "divider", "avatar", "signin", "breadcrumb", "input", "pagination", "select", "tab", "table", "tag", "list", "item", "textarea", "modal", "scrim", "checkbox"]);
/** Presentes no DOM, mas não visíveis em nenhuma parada escolhida. */
const NAO_VISIVEIS = new Set(["radio"]);

const NA = motivo => ({ veredito: "não-aplicável", destino: "registro", medida: motivo });
const NM = (escalada, medida) => ({ veredito: "não-mensurável", destino: "escalada", escalada, medida });
const OK = medida => ({ veredito: "conforme", destino: "registro", medida });
const V = (unidades, medida) => ({ veredito: "viola", destino: "unidade", unidades, medida });
/** Item escalado (auditoria.md § 8) decidido pela autora em 2026-10-01 (D-61; recomendacoes-escaladas.md). */
const AUTORA = (escalada, d) => ({ ...d, escalada, decididaPor: "autora (D-61, 2026-10-01)" });

const SEM_FONTE = "a tela é um build congelado (JS/CSS minificados, sem fonte: telas.json › sources vazio); a regra fala do código-fonte ou do processo, que a página não responde";
const PROCESSO = "regra dirigida ao processo ou à equipe, não a um observável da página";
const FORA_PARADAS = "nada disso é visível em nenhuma das 4 paradas escolhidas (adendo § B/C: só conta o que aparece numa parada)";

const D = {
  // ---------- componentes presentes (F1)
  "accessibility-breadcrumb-992f162ca821": OK("Tab real alcança os itens interativos do <br-breadcrumb> em todas as paradas: link \"Home\" (e o botão circular dentro dele) e, no detalhe, o link \"Vistorias\"."),
  "accessibility-input-6fe41e804955": OK("inicial: a busca e os dois campos de data são alcançados por Tab na ordem do DOM (busca → Buscar → data inicial → data final); no detalhe os 19 campos são `disabled` (exibição) e ficam fora do Tab, como o HTML prevê; no modal o campo \"Embarcação\" é alcançado por Tab."),
  "accessibility-list-03813ffeeb42": V(["B-19"], "detalhe-menu: o menu do avatar (div#avatar-menu.br-list) tem dois elementos interativos — o botão \"Sair\" (alcançado por Tab) e \"Trocar unidade\" (span com cursor:pointer, tabIndex -1: não alcançado por Tab nem Shift+Tab; o clique navega para /pnip/portal-mpa)."),
  "accessibility-modal-64b84991229c": AUTORA("E-06", V(["B-27"], "modal: Tab e Shift+Tab percorrem o conteúdo do br-modal (lista de embarcações, Cancelar, Trocar), mas o foco não fica contido: depois do Trocar, Tab sai para os botões do detalhe, o cabeçalho e o breadcrumb por trás do scrim.")),
  "accessibility-tab-f1807d71dc5f": OK("inicial: os três botões de aba (Agendar, Tramitando, Concluídos) são <button> alcançados por Tab; Enter produz o mesmo efeito do clique em 3/3 cargas (teste de estados). O estado da aba ativa só por classe vai à E-03."),
  "component-avatar-81c7524692f0": OK(".br-avatar .content: 40×40 px, border-radius 50% (superfície circular)."),
  "component-button-4d7b5f978df1": V(["B-08", "B-09", "B-10"], "inicial: 40 br-button das ações de linha (ícones user-plus/user-times, eye, trash, bell; classes \"br-button secondary middle\", sem circle) só com ícone, sem rótulo visível; o botão \"Buscar\" (button.br-button, 32×32, sem circle) e os dois \"Exibir lista\" do br-select-pnip (button.br-button, sem circle) idem. Conformes: Voltar, Limpar Filtro, Exportar Vistorias, as abas e o Trocar/Cancelar do modal têm rótulo visível; Página anterior/seguinte são circulares (C-01, C-02)."),
  "component-checkbox-6923ae0af84f": OK("inicial: caixas de seleção nativas nas linhas da tabela e no cabeçalho, para selecionar uma ou mais vistorias (ações em lote)."),
  "component-input-3788829b08fe": NM("E-09", "inicial: a busca é um br-input (density small) e, ao lado, um button.br-button de 32×32 com ícone de lupa e nome \"Buscar\", FORA do br-input; não é terciário circular. Se esse botão é a \"ação interna padrão do Input\" é juízo de anatomia."),
  "component-list-8f67e7cc7677": NA("a única br-list visível (menu do avatar, detalhe-menu) tem um só br-item; não há itens a comparar"),
  "component-scrim-d5ba51dda2b0": AUTORA("E-18", OK("modal: .br-scrim-util cobre a página inteira atrás do br-modal \"Trocar embarcação\", aberto pela usuária: o bloqueio tem justificativa (controle C-13).")),
  "component-signin-2752fd23bbe8": OK("o Sign-in (button.br-sign-in, \"U Olá, Usuária de Teste, SUPERVISOR\") ocupa uma linha: 392×40 px, sem <br> no rótulo."),
  "component-table-7c605ca2f85e": OK("tabela da lista: 9 colunas; tabela do detalhe (Dados da Notificação): 3 colunas."),
  "accessibility-divider-30bbcbf3a17c": OK("<br-divider> da lista e o divisor do cabeçalho: tabIndex -1 e o span interno é ignorado pela árvore de acessibilidade (role none)."),
  "component-item-c806c8feda5a": OK("br-item usado para o item repetível do menu do avatar (\"Sair\") e para as opções do br-select-pnip."),
  "component-item-739294d90299": OK("o br-item visível (\"Sair\") não contém Button primário nem navegação na área de conteúdo: é ele mesmo o botão."),
  "component-item-a10751502b98": NA("o padding do br-item \"Sair\" vem das classes do core 3.4.1 (nenhum estilo autoral no item): a regra falaria do DS, não da tela"),
  "component-item-cb34ed616246": OK("o br-item \"Sair\" tem superfície e conteúdo (imagem + texto)."),
  "component-item-a6d29ea54434": OK("o br-item interativo \"Sair\" é o próprio <button>: toda a superfície é a área acionável."),
  // ---------- globais: desenvolvimento
  "development-global-406774b1cb87": OK("font-family computado de todo texto visível = \"Rawline, Raleway, sans-serif\"; document.fonts: rawline 400/500/600/700 carregadas (cópias locais da árvore pnip/)."),
  "development-global-a43ad8231ad0": OK("<head>: rawline.css → raleway.css → Font Awesome 5.15.4 → styles.css (onde o core 3.4.1 está empacotado)."),
  "development-global-137c50bea6ca": NA(SEM_FONTE + ". O observável (cores computadas) está em foundation-global-21b1a2733f7b."),
  "development-global-659242ecda1d": NA(SEM_FONTE),
  "development-global-5765f1b8d2bc": NA(SEM_FONTE),
  "development-global-8c92e4e83038": NA(PROCESSO),
  "development-global-9c1d24af4f37": NA("a página não carrega core.min.js: os componentes vêm dos web components 1.16.0 e do CSS do core; a inicialização é do Angular"),
  "development-global-d0dff372c137": NA(SEM_FONTE),
  "development-global-0052d80d4f92": NA(SEM_FONTE),
  "development-global-9826b6862644": OK("scripts sem type (google-maps-stub, env, relogio, scripts) ou com type=\"module\" (runtime, polyfills, main), que não é redundante; nenhum type=\"text/javascript\"."),
  "development-global-63b44801da86": NA(SEM_FONTE),
  "development-global-dfebe85e65d8": NA(PROCESSO),
  "development-global-067a1786b481": NA(SEM_FONTE),
  "development-global-b491c2e2c1a0": NA("o HTML das rotas é gerado pelo Angular em tempo de execução; a forma das aspas não existe no DOM"),
  // ---------- globais: fundamentos (F3)
  "foundation-global-0578aa6c2828": NM("E-08", "detalhe: colunas .row > .col* com padding 12 px + 12 px (espaçamento de 24 px entre colunas) — valor do grid do core 3.4.1 congelado, não de CSS autoral; a KB 3.7.0 diz 40 px. Valor que difere entre a versão da página e a da norma (método § 1.4)."),
  "foundation-global-21b1a2733f7b": V(["B-15"], "cores computadas de todo elemento visível nas 4 paradas: todas estão em tokens/colors.json 3.7.0 (#333 --gray-80, #fff, #ccc, #888 --gray-40, #ff8c00 --orange-vivid-30, #4f97d1 --blue-40, #c5d4eb --blue-warm-20, #1351b4…), exceto a borda de 2px #bbb (rgb 187,187,187) do <hr class=\"solid\"> do menu do avatar (detalhe-menu), declarada no CSS do componente do cabeçalho do app (main.*.js: hr.solid[_ngcontent-%COMP%]{border-top:2px solid #bbb})."),
  "foundation-global-1c0146e93d2e": AUTORA("E-07", V(["B-28", "B-29"], "ícones interativos abaixo de 48×48. Autorais (unidade): Buscar 32×32 e os dois Exibir lista 32×32, montados pelo app. Fundo (padrão do DS, não unidade): ações de linha 78×40 (web component br-button, densidade padrão), Página anterior/seguinte 40×40, Menu 32×32 (web component), Home do breadcrumb 32×32 (web component).")),
  // ---------- globais: página, padrões, templates (F2)
  "page-global-f6e03bce515b": NA("regra-guarda sem observável próprio: é medida pelas demais linhas desta tabela"),
  "pattern-global-eb8c1606a52e": NA("nenhuma região de dados vazia em nenhuma das paradas (" + FORA_PARADAS + ")"),
  "pattern-global-03695a4aede0": NA("nenhuma região de dados vazia em nenhuma das paradas"),
  "pattern-global-9d9f1c9bf1ed": OK("nenhum título, rótulo, botão, item de menu ou mensagem com texto recortado (scrollWidth > clientWidth com overflow ≠ visible ou text-overflow: ellipsis). Recortados só: o texto visualmente oculto \"Home\" do breadcrumb do web component e valores de dados fictícios em campos desabilitados do detalhe (endereço, telefones, registro, e-mail) — valor de campo não está na lista da regra (observação). O \"Selec\" do README-MOCK § 8.6 não aparece em nenhuma parada: o \"Exibir\" mostra \"10\"."),
  "pattern-global-abaec84ff915": NA("não há onboarding"),
  "pattern-global-a633e540aa5c": NA("a tela não é a página inicial do produto"),
  "pattern-global-5717506ac2e6": NM("E-16", "nenhum link ou item de ajuda em nenhuma parada; se há ajuda noutra tela do portal a tela não responde"),
  "pattern-global-eebb093156e7": NM("E-17", "detalhe: seções recolhíveis acionadas por br-button \"Mostrar\" (ícone chevron-down) à direita do título; o título/área de destaque não é acionador. Se isto é o Collapse da regra é juízo"),
  "template-global-19f93475dc5e": NM("E-02", "estrutura: cabeçalho (br-header + pnip-header), breadcrumb, main; nenhum rodapé (footer/.br-footer/contentinfo), nenhum skip link, em todas as paradas. **exposto**"),
  "template-global-9cbfa5906031": NA("a tela não é tela de erro"),
  // ---------- globais: acessibilidade (e-MAG, F4)
  "accessibility-global-7e6420514860": V(["B-07", "B-18"], "inicial: os 10 botões de olho (br-button icon=\"eye\" >>> button) têm nome acessível vazio na árvore do Chromium (sem texto, aria-label, title; o hospedeiro não tem title — os das outras ações têm). detalhe-menu: o botão \"Sair\" do menu do avatar tem atributo href (não existe em <button>) e contém um <p> (conteúdo de fluxo dentro de <button>, que só admite conteúdo fraseado). Estilos inline autorais vão à E-11."),
  "accessibility-global-1cb2c878824b": NM("E-10", "controles construídos com <span> clicável (etiquetas de filtro, \"Trocar unidade\") onde existe <button>; o defeito de teclado deles é unidade (B-11, B-20); se o uso do elemento também viola a 1.2 é juízo"),
  "accessibility-global-3ac0aaa53900": V(["B-02", "B-21"], "inicial: um único título, <h2> \"Vistorias\"; nenhum <h1> na página (light + shadow). detalhe: <h3> (\"Programa Nacional de Regularização…\") seguido de 9 <h4>; nenhum h1 nem h2. **exposto**"),
  "accessibility-global-79db88c7f55d": NM("E-05", "nenhum tabindex positivo; a ordem de Tab segue o DOM em todas as paradas. Mas, na inicial, ao sair da lista aberta do \"Exibir\"/\"Página\" (div.br-list tabindex=0 que só aparece com o foco) o foco cai no <body> e a sequência recomeça do próximo campo. Se isso quebra a \"sequência lógica\" é juízo"),
  "accessibility-global-7d2b85f81c52": V(["B-01"], "nenhuma âncora \"#…\" nem .br-skiplink em nenhuma parada; o primeiro ponto de Tab é o botão Menu do cabeçalho (inicial) ou o botão do avatar. **exposto**"),
  "accessibility-global-206c9fa6ae11": OK("as duas tabelas são de dados (linhas de vistorias; status/data/hora da notificação); a diagramação é feita com grid CSS."),
  "accessibility-global-cf61b3eb3c71": OK("links adjacentes da paginação (1–4) e do breadcrumb estão cada um em seu <li>."),
  "accessibility-global-bfba9c1f5026": NM("E-02", "marcos: banner, main, 3 navigation (\"Abas de Navegação Simples\", \"Paginação de resultados\", \"paginação\") na inicial; banner, main, form no detalhe; nenhum contentinfo. **exposto**"),
  "accessibility-global-5be1f553cc03": OK("nenhuma janela, aba ou modal abre sem ação da usuária (o br-modal abre no clique em \"Trocar embarcação\"); nenhuma nova aba."),
  "accessibility-global-e6fd5e1247de": V(["B-11", "B-19"], "inicial: as 4 etiquetas de filtro (span.br-tag.interaction \"Cidade\", \"Porto\", \"Vistoriador\", \"Status\") abrem o painel ao clique (3/3), mas têm tabIndex -1, não entram na ordem de Tab e Enter com foco não produz efeito (0/3). detalhe-menu: \"Trocar unidade\" navega ao clique, tabIndex -1, Enter sem efeito. Conformes: abas e paginação (Enter ≡ clique, 3/3; C-09)."),
  "accessibility-global-f639993e9416": V(["B-11", "B-19"], "mesma medida da linha anterior: os controles gerados pelo Angular (painel de filtros, menu do avatar) só respondem ao mouse."),
  "accessibility-global-cd5de9a6f164": OK("nenhum meta http-equiv; nenhuma atualização periódica observada (endereço e conteúdo estáveis entre as medidas)."),
  "accessibility-global-d6e816588306": OK("nenhum meta refresh."),
  "accessibility-global-5d366ef29b04": NA("não há tarefa com limite de tempo"),
  "accessibility-global-8faca42c2c9a": OK("document.getAnimations() = 0 em todas as paradas; nenhum GIF/vídeo."),
  "accessibility-global-33b13d9fa271": OK("nenhum conteúdo em movimento (0 animações)."),
  "accessibility-global-698e0a4783a9": OK("<html lang=\"pt-br\">."),
  "accessibility-global-1ccbc61dddbc": AUTORA("E-04", V(["B-26"], "unidade só no th de ações (o th de caixas contém um controle; o defeito dele é a B-06). tabela da lista: 9 <th scope=col> no <thead>, <td> no corpo; dois cabeçalhos sem texto (o da coluna de caixas, que só contém um checkbox sem nome, e o da coluna de ações). Tabela do detalhe: 3 <th> sem scope, simples.")),
  "accessibility-global-fb83eab75d8d": NM("E-12", "texto fixo do template (rótulos, títulos, botões); linguagem simples fora do escopo (§ 6) salvo decisão da autora"),
  "accessibility-global-20c08f26d8e8": NM("E-12", "siglas no texto fixo, sem expansão nem <abbr>: RAEP, TIE, UF (detalhe), PNIP no título; \"Programa Nacional de Regularização de Embarcação de Pesca\" aparece por extenso no h3 do detalhe sem a sigla"),
  "accessibility-global-1db13803cbf8": NM("E-12", "nenhum trecho autoral em outro idioma medido; \"Show date picker\" é o nome dado pelo Chromium ao botão interno do <input type=date> (UI do navegador)"),
  "accessibility-global-5d5a5f21d94b": AUTORA("E-01", V(["B-25"], "<title>PNIP</title> nas três rotas (lista, dois detalhes); h2 \"Vistorias\" e h3 do detalhe. O título só nomeia o sistema e não representa o conteúdo principal de nenhuma rota.")),
  "accessibility-global-75c11ccac582": OK("<br-breadcrumb> em todas as rotas: \"Home › Vistorias\" (lista) e \"Home › Vistorias › …\" (detalhe). O item atual sem aria-current está no shadow root do web component (fundo)."),
  "accessibility-global-cdfbb56eebc5": NM("E-13", "links da paginação com texto \"1\", \"2\", \"3\", \"4\" e href=\"javascript:void(0)\"; os links do breadcrumb têm texto claro"),
  "accessibility-global-3a3e47354c53": V(["B-16"], "detalhe-menu: <img src=\"../../../assets/images/exit-icon.png\"> dentro do botão \"Sair\" do menu do avatar (template do pnip-header, autoral), sem atributo alt. O logo do <br-header> tem alt=\"logo\" fixo no web component (fundo)."),
  "accessibility-global-609e3494150c": NA("não há mapa de imagem"),
  "accessibility-global-3a57435c3b32": NA("nenhum documento para download visível nas paradas (" + FORA_PARADAS + ")"),
  "accessibility-global-cd705eb5da2a": V(["B-03", "B-22"], "inicial: a tabela da lista não tem <caption>, aria-label nem aria-labelledby (nome acessível vazio). detalhe: a tabela de \"Dados da Notificação\" (Status/Data/Hora) idem."),
  "accessibility-global-cb09bc0c77c0": V(["B-12", "B-13", "B-14", "B-23"], "contraste pela fórmula da WCAG, cor computada × primeiro fundo opaco: status \"Vistoria agendada\" branco sobre #4f97d1 = 3,14:1 (14 px/500, 10 linhas); etiqueta \"Nenhum filtro de data aplicado\" branco sobre #c5d4eb = 1,5:1 (14 px/500); inicial do avatar \"U\" branco sobre #ff8c00 = 2,33:1 (24,2 px/700, todas as paradas); \"0%\" branco sobre #888 = 3,54:1 (14 px/400, detalhe). Todos os demais textos ≥ 4,5:1 (C-05)."),
  "accessibility-global-c2f94bdc17ce": NM("E-03", "a aba ativa (li.tab-item.active) e a página atual (a.page.active) são indicadas por classe (cor/sublinhado), sem aria-selected/aria-current"),
  "accessibility-global-d9c42f188e2c": NA("zoom 200 % fora do escopo (método § 1 e § 6: só 1280×900)"),
  "accessibility-global-21fbcc2fe37b": OK("Tab real em todas as paradas: todo ponto de foco tem indicador — outline dashed 4px rgb(194,133,12) (botões e links), box-shadow 0 0 0 2px rgb(194,133,12) (campos) ou o anel do navegador (caixas de seleção nativas). Fora da conta: o botão do calendário de cada <input type=date>, no shadow fechado do navegador (não mensurável). A lista aberta do br-select-pnip, quando recebe foco, só mostra a sombra que já tinha — vai com a E-05."),
  "accessibility-global-6c86b93df639": NA("não há vídeo"),
  "accessibility-global-dc45b57b8349": NA("não há áudio"),
  "accessibility-global-8f439a3c078c": NA("não há vídeo"),
  "accessibility-global-56cbcba602ce": NA("não há som"),
  "accessibility-global-6ea7ecc60c01": OK("nenhuma animação (0)."),
  "accessibility-global-dafac812b10b": NA("não há botão de imagem (input type=image); os botões só com ícone estão em 7e6420514860 e em component-button"),
  "accessibility-global-b95c42b61ed3": V(["B-04", "B-05", "B-06", "B-20"], "inicial: busca (só placeholder \"Pesquise aqui ...\"), 2 campos de data e 11 caixas de seleção (1 no cabeçalho, 10 nas linhas) sem <label> associado, aria-label nem aria-labelledby. detalhe-menu: <textarea> do motivo do não comparecimento com <label> irmão SEM for (não associado). Conformes: \"Exibir\"/\"Página\" (label for) e os 19 campos do detalhe (C-03, C-04, C-08)."),
  "accessibility-global-e101928665cc": OK("formulários do detalhe e do modal: ordem do DOM = ordem visual (campos de cima para baixo, esquerda para a direita)."),
  "accessibility-global-de1efebaf255": OK("focar ou alterar campo não troca de rota nem abre janela: o endereço não muda. Focar a busca recarrega a lista (fica vazia por < 1 s e volta igual) — observação."),
  "accessibility-global-01b1806c30e9": NM("E-14", "campos de data sem rótulo nem instrução; os demais campos visíveis são desabilitados (exibição)"),
  "accessibility-global-cc837bbaf713": NA("nenhuma mensagem de erro visível nas paradas (a validação de \"Salvar\" e de \"Avançar\" ficou fora pela regra de escolha: auditoria.md § 3)"),
  "accessibility-global-11ffc5c577f6": NM("E-14", "detalhe: form com 19 campos desabilitados agrupados por <h4> (Dados da vistoria, da embarcação…), nenhum fieldset/legend. Se um formulário só de exibição é \"formulário longo\" que exige fieldset é juízo"),
  "accessibility-global-a8f7ce66b1c4": NA("não há CAPTCHA"),
  // ---------- globais: acessibilidade (DS)
  "accessibility-global-e038367bd7d6": V(["B-17", "B-24"], "detalhe-menu: div#avatar-menu com role=\"menu\" sem nenhum descendente role=menuitem (o \"Sair\" é <button> sem papel). modal: o br-modal \"Trocar embarcação\" (div.br-modal) não tem role dialog/alertdialog, aria-modal nem nome; a árvore do Chromium não expõe nenhum dialog. O estado de aba/página atual vai à E-03."),
  "accessibility-global-695e4379e23f": NA(PROCESSO),
  "accessibility-global-1c3bd2a1c1a7": NA("outras janelas fora do escopo (§ 1 e § 6)"),
  "accessibility-global-41850b4791b8": V(["B-11", "B-19"], "mesma medida de e6fd5e1247de: etiquetas de filtro e \"Trocar unidade\" não são utilizáveis só com teclado."),
  "accessibility-global-b5fad7ce076d": V(["B-04", "B-05", "B-06", "B-20"], "mesma medida de b95c42b61ed3."),
  "accessibility-global-cb56ad444da2": NM("E-05", "mesma medida de 79db88c7f55d"),
  "accessibility-global-2f22b7245ef9": NM("E-10", "mesma medida de 1cb2c878824b"),
  "component-global-e30aab6e9a68": NM("E-15", "<br-header has-menu> autoral: o botão Menu do web component não produz efeito (clique e Enter, 0/3, teste de estados); o br-select-pnip autoral usa button.br-button não circular. **exposto** (E-05 da auditoria de /privacidade)"),
};

const OBS = {
  "accessibility-button-efd2d9e7c3c6": "todos os botões visíveis são alcançáveis por Tab (Tab real, 4 paradas).",
  "accessibility-button-41d9f439e103": "Enter produz o mesmo efeito do clique em todos os gatilhos com efeito do teste de estados.",
  "accessibility-modal-31c45e5f6081": "o br-modal não usa aria-label (ver B-26).",
  "accessibility-modal-65446caf1efc": "o br-modal não declara aria-modal (ver B-26).",
  "accessibility-signin-a68a86f45877": "o Sign-in recebe foco por Tab; clique e Enter abrem o menu (3/3).",
  "component-modal-091e0e012f86": "o br-modal tem dois botões de ação (Cancelar, Trocar).",
  "component-table-88941e76c77b": "a tabela da lista tem a coluna \"Vistoriador\" vazia em parte das linhas (dado fictício) e o cabeçalho da coluna de ações vazio.",
  "component-table-8b8d4b403cb9": "sem barra de título na tabela; cada linha tem 4 ícones de ação lado a lado.",
  "component-select-3d506ce4d7d3": "opções do \"Exibir\" (10/25/50/100) e da \"Página\" (1–4) curtas.",
  "development-global-0b73051d7063": "nenhum CDN: todos os recursos vêm da árvore pnip/ (fontes e Font Awesome copiados localmente pelo modo mock).",
  "development-global-c6889731433a": "Raleway declarada como alternativa depois de Rawline.",
  "foundation-global-9ef740ba1f28": "main.container-lg; conteúdo em grid do core.",
  "development-global-4a614a5c88e2": "o app usa os web components 1.16.0 (br-header, br-button, br-input, br-breadcrumb, br-divider) e classes CSS do core.",
  "template-global-2387114907b1": "não há Skip Link (ver B-01).",
  "component-item-cb5d8f6d30b9": "um único br-item visível no menu do avatar.",
  "component-item-e08476d083e4": "um único br-item visível no menu do avatar.",
  "component-item-0e293b295c3d": "o br-item selecionado do br-select-pnip usa a classe selected (lista fechada nas paradas).",
  "component-radio-9cf59fa5bf60": "radios só dentro das listas do br-select-pnip e do painel de filtros, não visíveis nas paradas.",
  "component-signin-837c5ed4fe6a": "rótulo do Sign-in: \"Olá, Usuária de Teste, SUPERVISOR\".",
  "component-tag-7d70c8be6a0c": "não há Tag de contagem.",
};

const familia = r => {
  if (r.emagReferences.length) return "F4";
  if (r.component) return "F1";
  if (["page", "template", "pattern"].includes(r.category) || r.subcategory === "grid") return "F2";
  if (r.category === "foundation" || r.subcategory === "font") return "F3";
  return "global";
};

const linhas = [];
const faltando = [];
for (const r of regras) {
  const curto = r.id.replace("govbr-3.7.0-", "");
  const base = { id: r.id, force: r.force, component: r.component, familia: familia(r), emag: r.emagReferences, wcag: r.wcagReferences, norma: r.normalizedRule };
  if (["example", "informative"].includes(r.force)) { linhas.push({ ...base, veredito: "não normatiza", destino: "nenhum", medida: `force ${r.force} (D-10, D-32)` }); continue; }
  if (["recommended", "discouraged", "permitted"].includes(r.force)) {
    const presente = !r.component || PRESENTES.has(r.component) || NAO_VISIVEIS.has(r.component);
    linhas.push({ ...base, veredito: "observação", destino: "observacao", medida: OBS[curto] ?? (presente ? "sem observável nas paradas" : "componente ausente da tela") });
    continue;
  }
  if (D[curto]) { linhas.push({ ...base, ...D[curto] }); continue; }
  if (r.component && NAO_VISIVEIS.has(r.component)) { linhas.push({ ...base, ...NA("componente presente no DOM, mas não visível em nenhuma parada escolhida") }); continue; }
  if (r.component && !PRESENTES.has(r.component)) { linhas.push({ ...base, ...NA("componente ausente da tela") }); continue; }
  faltando.push(r.id);
}
if (faltando.length) { console.error(`regra required/prohibited sem decisão explícita:\n  ${faltando.join("\n  ")}`); process.exit(1); }
const sobras = Object.keys(D).filter(k => !regras.some(r => r.id === "govbr-3.7.0-" + k));
if (sobras.length) { console.error(`decisão para regra inexistente: ${sobras.join(", ")}`); process.exit(1); }

const contagem = {};
for (const l of linhas) contagem[l.veredito] = (contagem[l.veredito] ?? 0) + 1;
const saida = {
  _meta: {
    tela: "vistorias (tela B, D-57)", metodo: "tela-b/metodo-auditoria.md @ govbr-eval 5838702 + tela-b/metodo-auditoria-adendo-vistorias.md @ 9406aed",
    fonte: "govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl (186 regras; as 45 com emagReferences são as recomendações do e-MAG 3.1)",
    estados: "inicial · detalhe-menu · detalhe · modal (tela-b/vistorias/sequencia.mjs)",
    familias: "F1 componente presente · F2 Template Base/regras de página · F3 fundamentos (cor, tipografia, espaçamento) · F4 e-MAG · global = regra global da KB fora das quatro",
    destinos: "unidade (viola autoral) · escalada (não-mensurável → lista da autora) · registro · observacao · nenhum",
    escaladas: "decididas pela autora em 2026-10-01 (D-61; recomendacoes-escaladas.md): as linhas com `decididaPor` saíram de `escalada`; as que seguem `escalada` ficaram fora da referência com o motivo em ground-truth-vistorias.json › _meta.escaladas",
    contagem,
  },
  linhas,
};
writeFileSync(join(AQUI, "decisoes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${linhas.length} linhas · ${Object.entries(contagem).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`e-MAG: ${linhas.filter(l => l.emag.length).length} recomendações`);
