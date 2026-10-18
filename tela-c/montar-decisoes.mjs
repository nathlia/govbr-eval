/**
 * Monta tela-c/decisoes.json: uma linha por regra da base normativa 3.7.0 (rules.jsonl, 186 regras; as
 * 45 com emagReferences são as recomendações do e-MAG 3.1) × a tela C (cadastrar-empresa) nas 2 paradas
 * escolhidas (inicial, lista-usuarios) — método da B § 3.2–3.3 (tela-b/metodo-auditoria.md), adendos da
 * B e da C (tela-c/metodo-auditoria-adendo-cadastrar-empresa.md).
 *
 * Lê SÓ texto de norma, da cópia ds-rules/06 (a mesma base normalizada de 186 regras que a B usou;
 * o auditor cego da C não abre govbr-ds-validator/ — auditoria.md § 1). As decisões estão escritas
 * abaixo, à mão, com a medida que as sustenta (inventario.json, estados.json, conferir-auditoria.mjs).
 * Regra sem decisão explícita cai num padrão declarado pela força e pelo componente — e o script PARA se
 * uma regra required/prohibited de componente presente ou global ficar sem decisão explícita. Nenhum
 * filtro por automatable, automationConfidence ou validationStrategy.
 *
 * Uso: node tela-c/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const KB = join(AQUI, "../../ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/rules.jsonl");
const textoKB = readFileSync(KB, "utf8");
const regras = textoKB.trim().split("\n").map(l => JSON.parse(l));

/** Componentes do DS visíveis em alguma parada (inventario.json › componentes; classe/tag br-*). */
const PRESENTES = new Set(["header", "button", "divider", "avatar", "signin", "breadcrumb", "input", "select", "tab", "checkbox", "list", "item", "radio", "message"]);
const NAO_VISIVEIS = new Set([]);

const NA = motivo => ({ veredito: "não-aplicável", destino: "registro", medida: motivo });
const NM = (escalada, medida) => ({ veredito: "não-mensurável", destino: "escalada", escalada, medida });
const OK = medida => ({ veredito: "conforme", destino: "registro", medida });
const V = (unidades, medida) => ({ veredito: "viola", destino: "unidade", unidades, medida });

const SEM_FONTE = "a tela é um build congelado (JS/CSS minificados, sem fonte: telas.json › sources vazio); a regra fala do código-fonte ou do processo, que a página não responde";
const PROCESSO = "regra dirigida ao processo ou à equipe, não a um observável da página";
const FORA_PARADAS = "nada disso é visível nas 2 paradas escolhidas (adendo da C § B: só conta o que aparece numa parada)";

const D = {
  // ---------- componentes presentes (F1)
  "accessibility-breadcrumb-992f162ca821": OK("Tab real (inventário, ordemTab) alcança os dois links do <br-breadcrumb> (\"Home\" e o botão circular dentro dele, \"Empresa\"). Controle K-07."),
  "accessibility-input-6fe41e804955": OK("Tab real percorre os 12 campos do formulário na ordem do DOM (Razão Social → Nome Fantasia → CNPJ → RGP → Validade → CEP [+ botão de busca] → Rua → Número → Complemento → Município → UF → Coordenadas), depois o checkbox, as abas e o campo do seletor."),
  "accessibility-list-03813ffeeb42": NM("E-03", "lista-usuarios: a lista do seletor (div.br-list tabindex=0, três br-item com rádio) recebe foco por Tab a partir do campo, mas o Tab seguinte fecha a lista e leva o foco ao <body>: nenhum item é alcançado por Tab/Shift+Tab. Os itens SÃO alcançados e escolhidos por seta + Enter/Espaço (medido: ArrowDown move o foco para o 1º/2º br-item, Enter/Espaço marca o rádio e preenche o campo). Se a regra de Tab da List vale para a lista de opções de um seletor é juízo de aplicabilidade."),
  "accessibility-tab-f1807d71dc5f": OK("as duas abas (\"Usuário Existente\", \"Cadastrar Usuário\") são <button> alcançados por Tab; Enter produz o mesmo efeito do clique em 3/3 cargas (teste de estados: troca de painel, nos dois gestos). Controle K-06. O estado da aba ativa só por classe segue o precedente E-03 da B (E-10 aqui)."),
  "component-avatar-81c7524692f0": OK(".br-avatar .content do cabeçalho: 40×40 px, border-radius 50% (casco da aplicação; não entra como controle)."),
  "component-button-4d7b5f978df1": NM("E-07", "\"Exibir lista\" do br-select-pnip: button.br-button só com ícone, sem a classe circle, mas com border-radius 50% computado (regra do core 3.4.1 `.br-input .br-button{border-radius:50%}`) e 32×32; a mesma anatomia do exemplo oficial do Select (examples/html/select.json: um br-button sem circle, com aria-label). Na B o mesmo elemento virou unidade (B-10). Os demais botões visíveis têm rótulo (Adicionar, Cancelar, Salvar, abas) ou são circulares (busca do CEP, Home do breadcrumb, Menu)."),
  "component-checkbox-6923ae0af84f": OK("o br-checkbox \"CAOL\" (lista de módulos disponíveis, de onde se marcam um ou mais) — uso para seleção múltipla. O rótulo vem de fixture; a anatomia é do web component."),
  "component-input-3788829b08fe": OK("CEP: o br-input com icon=\"search\" renderiza (shadow do web component 1.16.0) button.br-button.small.circle 32×32, sem primary/secondary (terciário), alta densidade, ícone de lupa. Controle K-09."),
  "component-list-8f67e7cc7677": OK("lista-usuarios: os três br-item da lista do seletor têm o mesmo padding computado (16px 16px) e alturas 53/53/52 px."),
  "component-message-66b01a712e67": NM("E-06", "a br-message.info \"Atenção. Não há usuários cadastrados para essa empresa.\" tem o ícone semântico (fa-info-circle) à esquerda (conforme nessa parte) e NENHUM botão Fechar (0 botões). Nos 8 exemplos oficiais de br-message (message-padrao, message-inverted) há botão Fechar circular. A regra fala da posição do botão; se a ausência viola é juízo."),
  "component-signin-2752fd23bbe8": OK("o Sign-in (\"U Olá, Usuária de Teste\") ocupa uma linha: 270×40 px (casco)."),
  "accessibility-divider-30bbcbf3a17c": OK("os dois <br-divider> do formulário: hospedeiro sem tabindex (fora do Tab) e span interno com papel none na árvore do Chromium. Controle K-10."),
  "component-item-c806c8feda5a": OK("br-item usado para as opções repetidas da lista do seletor (três usuários)."),
  "component-item-739294d90299": OK("os br-item da lista contêm só um br-radio (rádio + rótulo): nenhum Button primário nem navegação."),
  "component-item-a10751502b98": OK("padding computado dos br-item = 16px (= --spacing-scale-2x do core); nenhum estilo autoral no item."),
  "component-item-cb34ed616246": OK("cada br-item tem superfície (536×53) e conteúdo (rádio + rótulo)."),
  "component-item-a6d29ea54434": OK("lista-usuarios: hover sobre o br-item aplica o gradiente rgba(51,51,51,.16) em toda a superfície; clique perto da borda direita/topo do item (fora do texto) marca o rádio e preenche o campo. Controle K-08."),
  // ---------- globais: desenvolvimento
  "development-global-406774b1cb87": OK("font-family computado de todo texto visível nas 2 paradas = \"Rawline, Raleway, sans-serif\"."),
  "development-global-a43ad8231ad0": OK("<head>: rawline.css → raleway.css → Font Awesome → styles.css (core 3.4.1 empacotado) — fontes antes do CSS do DS."),
  "development-global-137c50bea6ca": NA(SEM_FONTE + ". O observável (cores computadas) está em foundation-global-21b1a2733f7b."),
  "development-global-659242ecda1d": NA(SEM_FONTE),
  "development-global-5765f1b8d2bc": NA(SEM_FONTE),
  "development-global-8c92e4e83038": NA(PROCESSO),
  "development-global-9c1d24af4f37": NA("a página não carrega core.min.js: os componentes vêm dos web components 1.16.0 e do CSS do core; a inicialização é do Angular"),
  "development-global-d0dff372c137": NA(SEM_FONTE),
  "development-global-0052d80d4f92": NA(SEM_FONTE),
  "development-global-9826b6862644": OK("scripts sem type ou com type=\"module\"; nenhum type=\"text/javascript\"."),
  "development-global-63b44801da86": NA(SEM_FONTE),
  "development-global-dfebe85e65d8": NA(PROCESSO),
  "development-global-067a1786b481": NA(SEM_FONTE),
  "development-global-b491c2e2c1a0": NA("o HTML da rota é gerado pelo Angular em tempo de execução; a forma das aspas não existe no DOM"),
  // ---------- globais: fundamentos (F3)
  "foundation-global-0578aa6c2828": NM("E-08", "colunas do formulário (.row > .col-*) com padding 12 px + 12 px (24 px entre colunas) — grid do core 3.4.1 congelado, não CSS autoral; a KB 3.7.0 diz 40 px. Valor que difere só entre a versão da página e a da norma (método § 1.4): vai à lista, não vira unidade."),
  "foundation-global-21b1a2733f7b": OK("cores computadas (texto, fundo, bordas) de todo elemento visível nas 2 paradas: #ffffff #cccccc #333333 #f8f8f8 #ff8c00 #1351b4 #005ea2 #888888 #0c326f #d4e5ff (+ #c2850c do foco) — todas presentes em tokens/colors.json 3.7.0; nenhuma fora da paleta."),
  "foundation-global-1c0146e93d2e": NM("E-07", "ícones interativos abaixo de 48×48: \"Exibir lista\" do br-select-pnip 32×32 (marcação autoral que reproduz o exemplo oficial do Select; na B virou a unidade B-29); busca do CEP 32×32 (renderizada pelo web component br-input, densidade small fixa no componente — fundo); Home do breadcrumb 32×32 e Menu 32×32 (web components — fundo)."),
  // ---------- globais: página, padrões, templates (F2)
  "page-global-f6e03bce515b": NA("regra-guarda sem observável próprio: é medida pelas demais linhas desta tabela"),
  "pattern-global-eb8c1606a52e": OK("onde ficaria a lista de usuários da empresa, a br-message informa \"Não há usuários cadastrados para essa empresa\" (texto fixo do template): diz que tipo de dado aparecerá ali."),
  "pattern-global-03695a4aede0": OK("o aviso de ausência de usuários ocupa o lugar da lista/tabela de usuários (entre o seletor e as ações finais)."),
  "pattern-global-9d9f1c9bf1ed": OK("nenhum título, rótulo, botão, item de menu ou mensagem recortado; único recorte medido é o texto visualmente oculto \"Home\" (sr-only) do breadcrumb do web component."),
  "pattern-global-abaec84ff915": NA("não há onboarding"),
  "pattern-global-a633e540aa5c": NA("a tela não é a página inicial do produto"),
  "pattern-global-5717506ac2e6": NM("E-10", "nenhum link ou item de ajuda nas paradas; se há ajuda noutra tela do portal a tela não responde (precedente E-16 da B: não-aplicável)"),
  "pattern-global-eebb093156e7": NA("não há Collapse nas paradas"),
  "template-global-19f93475dc5e": NM("E-10", "estrutura: cabeçalho (br-header + pnip-header), breadcrumb, main; nenhum rodapé nem skip link. Casco da aplicação, **exposto** (precedente E-02 da B: fora)"),
  "template-global-9cbfa5906031": NA("a tela não é tela de erro"),
  // ---------- globais: acessibilidade (e-MAG, F4)
  "accessibility-global-7e6420514860": V(["C-01", "C-02"], "inicial: (C-01) dois elementos com o mesmo id \"idUsuario\" — o hospedeiro <br-select-pnip id=\"idUsuario\"> e o <input> interno — o que faz o <label for=\"idUsuario\"> resolver para o hospedeiro (não rotulável); (C-02) o hospedeiro <br-button label=\"Cancelar\" tabindex=\"0\"> é um ponto de foco com papel generic e nome \"\" na árvore do Chromium, antes do botão interno. A busca do CEP (button com aria-label=\"\") está no shadow do web component br-input, sem propriedade que a nomeie: fundo."),
  "accessibility-global-1cb2c878824b": NM("E-11", "as ações \"Adicionar\", \"Cancelar\" e \"Salvar\" ficam fora do <form> (o form termina nos módulos); o formulário não tem botão de envio. Se isso fere o uso semântico (1.2) é juízo."),
  "accessibility-global-3ac0aaa53900": V(["C-05"], "títulos visíveis: <h2> \"Cadastrar empresa\", <h3> \"Módulos disponíveis\", <h2> \"Usuários\"; nenhum <h1> na página (light + shadow). **exposto** (casco: ordem de títulos, adendo § E)"),
  "accessibility-global-79db88c7f55d": V(["C-02"], "inicial: <br-button label=\"Cancelar\" tabindex=\"0\"> — o tabindex no hospedeiro (o \"Salvar\" não o tem) cria um ponto de Tab sem papel nem nome antes do <button> interno, que já é focável (tabIndex 0); Enter e Espaço nesse ponto não fazem nada (0/3 no teste de estados; endereço inalterado). Nenhum tabindex positivo. O Tab que sai da lista aberta do seletor cai no <body> → E-04."),
  "accessibility-global-7d2b85f81c52": V(["C-04"], "nenhuma âncora \"#…\" nem .br-skiplink nas 2 paradas; o primeiro ponto de Tab é o botão Menu do cabeçalho. **exposto** (casco)"),
  "accessibility-global-206c9fa6ae11": NA("não há tabela na tela"),
  "accessibility-global-cf61b3eb3c71": OK("os dois links adjacentes do breadcrumb estão cada um em seu <li>, separados por ícone chevron."),
  "accessibility-global-bfba9c1f5026": NM("E-10", "marcos: banner, main, form, navigation (o nav das abas); nenhum contentinfo. Casco, **exposto** (precedente E-02 da B: fora)"),
  "accessibility-global-5be1f553cc03": OK("nada abre sem ação da usuária: nenhum diálogo, janela ou aba na carga (0 diálogos visíveis); a lista do seletor só abre no clique/foco do campo."),
  "accessibility-global-e6fd5e1247de": OK("o seletor de usuário é operável por teclado: foco no campo abre a lista, seta para baixo move o foco entre os itens, Enter ou Espaço escolhe (medido: o rádio fica marcado e o campo recebe o nome). Abas por Enter. Controle K-12."),
  "accessibility-global-f639993e9416": OK("mesma medida da linha anterior: o seletor (componente Angular) funciona com teclado."),
  "accessibility-global-cd5de9a6f164": OK("nenhum meta http-equiv; endereço e conteúdo estáveis por 1 s em cada parada (47/47 da fase 1)."),
  "accessibility-global-d6e816588306": OK("nenhum meta refresh."),
  "accessibility-global-5d366ef29b04": NA("não há tarefa com limite de tempo"),
  "accessibility-global-8faca42c2c9a": OK("document.getAnimations() = 0 nas 2 paradas; nenhum GIF/vídeo."),
  "accessibility-global-33b13d9fa271": OK("nenhum conteúdo em movimento (0 animações)."),
  "accessibility-global-698e0a4783a9": OK("<html lang=\"pt-br\">."),
  "accessibility-global-1ccbc61dddbc": NA("não há tabela na tela"),
  "accessibility-global-fb83eab75d8d": NM("E-10", "texto fixo do template; linguagem simples fora do escopo (§ 6; precedente E-12 da B: fora)"),
  "accessibility-global-20c08f26d8e8": NM("E-10", "siglas no texto fixo sem expansão nem <abbr>: CNPJ, RGP, CEP, UF (rótulos), PNIP (título); CAOL é dado de fixture (fora). Precedente E-12 da B: fora"),
  "accessibility-global-1db13803cbf8": OK("nenhum trecho autoral em outro idioma nas paradas."),
  "accessibility-global-5d5a5f21d94b": V(["C-06"], "<title>PNIP</title>; o conteúdo principal é \"Cadastrar empresa\" (h2). O título só nomeia o sistema. **exposto** (casco; precedente B-25, decidido pela autora no D-61)"),
  "accessibility-global-75c11ccac582": OK("<br-breadcrumb> \"Home › Empresa › Cadastrar empresa\" indica a localização atual."),
  "accessibility-global-cdfbb56eebc5": OK("links com texto claro: \"Home\", \"Empresa\" (o destino recarrega fora da ala por causa do base href — artefato do mock, adendo § C)."),
  "accessibility-global-3a3e47354c53": NA("a única imagem visível é o logo do <br-header> (alt=\"logo\" fixo no web component — fundo); o ícone do \"Sair\" só existe no menu do avatar, fechado nas paradas"),
  "accessibility-global-609e3494150c": NA("não há mapa de imagem"),
  "accessibility-global-3a57435c3b32": NA("nenhum documento para download nas paradas"),
  "accessibility-global-cd705eb5da2a": NA("não há tabela na tela"),
  "accessibility-global-cb09bc0c77c0": V(["C-07"], "contraste pela fórmula da WCAG (cor computada × primeiro fundo opaco), 30 textos medidos na inicial e 33 na lista-usuarios: todos ≥ 4,5:1 (mín. 6,72:1 nos títulos, 7,33:1 em Adicionar/links, 9,9:1 na mensagem, 12,63:1 nos rótulos) exceto a inicial do avatar \"U\" branco sobre #ff8c00 = 2,33:1 (24,2 px/700). **exposto** (casco; B-14). Placeholder \"Selecione\" #333 sobre #fff = 12,63:1."),
  "accessibility-global-c2f94bdc17ce": NM("E-10", "a aba ativa (li.tab-item.active) indicada por classe (cor/sublinhado), sem aria-selected — a mesma anatomia do exemplo oficial do Tab (nenhum role/aria-selected); precedente E-03 da B: fora"),
  "accessibility-global-d9c42f188e2c": NA("zoom 200 % fora do escopo (método § 1 e § 6: só 1280×900)"),
  "accessibility-global-21fbcc2fe37b": OK("Tab real nas paradas: todo ponto tem indicador — outline dashed 4px rgb(194,133,12) (botões, links, abas), box-shadow 0 0 0 2px rgb(194,133,12) (campos), box-shadow no ::before do rótulo (checkbox), anel do navegador (hospedeiro do Cancelar). Exceções fora da conta: o botão do calendário do <input type=date> (shadow fechado do navegador) e a lista aberta do seletor, cujo foco não muda o estilo porque o core 3.4.1 declara `.br-select .br-list:focus{outline:none}` — regra padrão do DS (fundo)."),
  "accessibility-global-6c86b93df639": NA("não há vídeo"),
  "accessibility-global-dc45b57b8349": NA("não há áudio"),
  "accessibility-global-8f439a3c078c": NA("não há vídeo"),
  "accessibility-global-56cbcba602ce": NA("não há som"),
  "accessibility-global-6ea7ecc60c01": OK("nenhuma animação (0)."),
  "accessibility-global-dafac812b10b": NA("não há botão de imagem (input type=image)"),
  "accessibility-global-b95c42b61ed3": V(["C-01"], "inicial: o campo do seletor \"Selecione o usuário\" (input#idUsuario dentro do br-select-pnip) tem labels.length = 0 — o <label for=\"idUsuario\"> aponta para o id duplicado do hospedeiro; sem aria-label/aria-labelledby; o nome acessível é o placeholder \"Selecione\". Conformes: os 12 campos br-input (label for no mesmo shadow), o checkbox e os 3 rádios da lista (K-01, K-02, K-03)."),
  "accessibility-global-e101928665cc": OK("ordem do DOM = ordem visual do formulário (linhas de cima para baixo, colunas da esquerda para a direita)."),
  "accessibility-global-de1efebaf255": OK("focar ou sair de um campo não troca de rota nem abre janela; focar o campo do seletor só abre a lista dele."),
  "accessibility-global-01b1806c30e9": V(["C-03"], "inicial: 8 campos são obrigatórios (vazios, recebem ng-invalid; ao sair deles aparece \"Campo obrigatório\" — 3/3 no teste de estados e na carga auxiliar) — Razão Social, Nome Fantasia, CNPJ, RGP, Rua, Número, Município, UF — e 2 são opcionais (Validade do RGP, Complemento), mas nada o indica: rótulo sem marca, nenhuma instrução no formulário, nenhum required/aria-required (árvore: required=false). A KB 3.7.0 (evidência esperada da 6.5) diz: \"Campos obrigatórios são indicados textualmente.\" Instrução de formato (CNPJ, RGP, CEP com máscara) → E-01."),
  "accessibility-global-cc837bbaf713": NA("nenhuma mensagem de erro visível nas paradas (validação ao sair do campo ficou fora pela regra de escolha, adendo § B)"),
  "accessibility-global-11ffc5c577f6": NM("E-02", "o <form> tem 13 controles em três blocos (identificação, endereço, módulos) e 0 fieldset/legend; o grupo de módulos é titulado por <h3>. Se os blocos são \"campos relacionados\" que exigem fieldset é juízo."),
  "accessibility-global-a8f7ce66b1c4": NA("não há CAPTCHA"),
  // ---------- globais: acessibilidade (DS)
  "accessibility-global-e038367bd7d6": NM("E-05", "o seletor (input que abre lista de opções) não tem role combobox, aria-expanded, aria-haspopup nem aria-controls; a lista é div sem role listbox (árvore: textbox \"Selecione\" sem estado expandido) — a mesma marcação do exemplo oficial do Select (só aria-label no botão). A br-message estática tem role=alert desde a carga (E-06)."),
  "accessibility-global-695e4379e23f": NA(PROCESSO),
  "accessibility-global-1c3bd2a1c1a7": NA("outras janelas fora do escopo (§ 1 e § 6)"),
  "accessibility-global-41850b4791b8": OK("os componentes interativos das paradas (campos, checkbox, abas, seletor com lista, Adicionar, Cancelar, Salvar) são utilizáveis só com teclado."),
  "accessibility-global-b5fad7ce076d": V(["C-01"], "mesma medida de b95c42b61ed3."),
  "accessibility-global-cb56ad444da2": NM("E-04", "lista-usuarios: com a lista aberta e focada, o Tab seguinte fecha a lista e deixa o foco no <body> (o próximo Tab segue para \"Adicionar\"). Se um passo de Tab sem foco quebra a \"sequência lógica\" é juízo."),
  "accessibility-global-2f22b7245ef9": NA("nenhum controle construído com div/span onde existe nativo nas paradas: a lista é div.br-list (padrão do Select do DS) com rádios nativos"),
  "component-global-e30aab6e9a68": NM("E-10", "<br-header has-menu>: o botão Menu não produz efeito (clique e Enter, 0/3); casco, **exposto** (precedente E-15 da B: fora). A anatomia do br-select-pnip segue o exemplo oficial do Select."),
};

const OBS = {
  "accessibility-button-efd2d9e7c3c6": "todos os botões visíveis, exceto \"Exibir lista\" (tabindex -1, padrão do Select do DS), são alcançáveis por Tab.",
  "accessibility-button-41d9f439e103": "Enter produz o mesmo efeito do clique nos botões com efeito do teste de estados; no hospedeiro do Cancelar, não (C-02).",
  "accessibility-signin-a68a86f45877": "o Sign-in recebe foco por Tab; clique e Enter abrem o menu (3/3).",
  "component-message-088613b94e1c": "mensagem curta, uma linha.",
  "component-message-188aad85588b": "uma só br-message visível.",
  "component-radio-9cf59fa5bf60": "três rádios na lista do seletor (sem atributo name: não formam grupo).",
  "component-select-3d506ce4d7d3": "as opções são \"NOME / CPF / e-mail\" (dado de fixture).",
  "component-signin-837c5ed4fe6a": "rótulo do Sign-in: \"Olá, Usuária de Teste\".",
  "development-global-0b73051d7063": "nenhum CDN: todos os recursos vêm da árvore pnip-c/.",
  "development-global-c6889731433a": "Raleway declarada como alternativa depois de Rawline.",
  "development-global-4a614a5c88e2": "o app usa os web components 1.16.0 (br-header, br-button, br-input, br-breadcrumb, br-divider, br-checkbox) e classes CSS do core.",
  "foundation-global-9ef740ba1f28": "main.container-lg; formulário em grid do core.",
  "template-global-2387114907b1": "não há Skip Link (ver C-04).",
  "component-item-cb5d8f6d30b9": "os três br-item da lista com o mesmo padding.",
  "component-item-e08476d083e4": "os três br-item com a mesma largura (536 px).",
  "component-item-0e293b295c3d": "nenhum item selecionado na parada.",
};

const familia = r => {
  if (r.emagReferences.length) return "F4";
  if (r.component) return "F1";
  if (["page", "template", "pattern"].includes(r.category) || r.subcategory === "grid") return "F2";
  if (r.category === "foundation" || r.subcategory === "font") return "F3";
  return "global";
};

export function montar() {
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
  const sobras = Object.keys(D).filter(k => !regras.some(r => r.id === "govbr-3.7.0-" + k));
  return { linhas, faltando, sobras };
}

if (process.argv[1] && process.argv[1].endsWith("montar-decisoes.mjs")) {
  const { linhas, faltando, sobras } = montar();
  if (regras.length !== 186) { console.error(`a base tem ${regras.length} regras, esperadas 186`); process.exit(1); }
  if (faltando.length) { console.error(`regra required/prohibited sem decisão explícita:\n  ${faltando.join("\n  ")}`); process.exit(1); }
  if (sobras.length) { console.error(`decisão para regra inexistente: ${sobras.join(", ")}`); process.exit(1); }
  const contagem = {};
  for (const l of linhas) contagem[l.veredito] = (contagem[l.veredito] ?? 0) + 1;
  const saida = {
    _meta: {
      tela: "cadastrar-empresa (tela C, D-134)",
      metodo: "tela-b/metodo-auditoria.md @ 5838702 + tela-b/metodo-auditoria-adendo-vistorias.md @ 9406aed + tela-c/metodo-auditoria-adendo-cadastrar-empresa.md (final, sha256 42b2246a…838c)",
      fonte: "ds-rules/06/govbr-ds-knowledge/versions/3.7.0/normalized/rules.jsonl (186 regras; as 45 com emagReferences são as recomendações do e-MAG 3.1)",
      fonteSha256: createHash("sha256").update(textoKB).digest("hex"),
      estados: "inicial · lista-usuarios (tela-c/sequencia.mjs)",
      familias: "F1 componente presente · F2 Template Base/regras de página · F3 fundamentos (cor, tipografia, espaçamento) · F4 e-MAG · global = regra global da KB fora das quatro",
      destinos: "unidade (viola autoral) · escalada (não-mensurável → lista da autora, auditoria.md § 8) · registro · observacao · nenhum",
      contagem,
    },
    linhas,
  };
  writeFileSync(join(AQUI, "decisoes.json"), JSON.stringify(saida, null, 2) + "\n");
  console.log(`${linhas.length} linhas · ${Object.entries(contagem).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  console.log(`e-MAG: ${linhas.filter(l => l.emag.length).length} recomendações · fonte sha256 ${saida._meta.fonteSha256}`);
}
