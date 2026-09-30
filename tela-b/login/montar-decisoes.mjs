/**
 * Monta tela-b/login/decisoes.json (recuo do § 9: real/pnip-login.html): uma linha por regra da base normativa 3.7.0 (rules.jsonl, 186 regras,
 * das quais 45 são as recomendações do e-MAG 3.1) — tela-b/metodo-auditoria.md § 3.2–3.3.
 *
 * Lê SÓ texto de norma (`govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl`).
 * As decisões estão escritas abaixo, à mão, com a medida que as sustenta (inventario.json,
 * teste-estados.mjs, conferir-auditoria.mjs). Regra sem decisão explícita cai num padrão declarado
 * pela força e pelo componente — e o script PARA se uma regra required/prohibited de componente
 * presente ou global ficar sem decisão explícita.
 *
 * Uso: node tela-b/login/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const KB = join(AQUI, "../../../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");
const regras = readFileSync(KB, "utf8").trim().split("\n").map(l => JSON.parse(l));

const RENDERIZADOS = new Set(["header", "button", "divider"]);
const NAO_RENDERIZADOS = new Set(["signin", "avatar", "list", "item"]);

const NA = motivo => ({ veredito: "não-aplicável", destino: "registro", medida: motivo });
const NM = (escalada, medida) => ({ veredito: "não-mensurável", destino: "escalada", escalada, medida });
const OK = medida => ({ veredito: "conforme", destino: "registro", medida });
const V = (unidades, medida) => ({ veredito: "viola", destino: "unidade", unidades, medida });
const FUNDO = medida => ({ veredito: "viola", destino: "fundo", medida });

const SEM_FONTE = "a tela não tem código-fonte (telas.json › sources vazio; captura estática): a regra fala do código/processo de desenvolvimento, que a página congelada não responde";
const PROCESSO = "regra dirigida ao processo ou à equipe, não a um observável da página";

const D = {
  // ---------- globais: desenvolvimento
  "development-global-406774b1cb87": OK("font-family computado do conteúdo (h2, .info, botões) = \"Rawline, Raleway, sans-serif\" e rawline.css declarado no <head>. A fonte não carrega sob o isolamento — fundo."),
  "development-global-a43ad8231ad0": OK("<head>: rawline.css → Raleway (Google Fonts) → Font Awesome 5.15.4 → assets/core.min.css; o único <script> (webcomponents.umd.min.js) está no fim do <body>."),
  "development-global-137c50bea6ca": NA(SEM_FONTE + ". O observável na página (cores e tamanhos computados) está coberto por foundation-global-21b1a2733f7b e pelo inventário tipográfico."),
  "development-global-659242ecda1d": NA(SEM_FONTE),
  "development-global-5765f1b8d2bc": NA(SEM_FONTE),
  "development-global-8c92e4e83038": NA(PROCESSO),
  "development-global-9c1d24af4f37": NA("nenhum componente renderizado depende de core.min.js (a página não o carrega; <br-header> e <br-button> são web components 1.16.0, que se inicializam sozinhos). O dropdown do .br-sign-in está na subárvore não renderizada (E-06)."),
  "development-global-d0dff372c137": NA("nenhuma inicialização autoral de componente na página capturada (bindings do Angular não sobrevivem; o web component se inicializa sozinho)"),
  "development-global-0052d80d4f92": NA(SEM_FONTE),
  "development-global-9826b6862644": OK("único <script> da página: src=\"assets/webcomponents.umd.min.js\", sem atributo type."),
  "development-global-63b44801da86": NA(SEM_FONTE),
  "development-global-dfebe85e65d8": NA(PROCESSO),
  "development-global-067a1786b481": NA(SEM_FONTE),
  "development-global-b491c2e2c1a0": NA("o HTML disponível é a serialização da captura (outerHTML gravado por snapshot-real.ts), não a fonte autoral; a forma das aspas é propriedade do serializador"),
  // ---------- globais: fundamentos
  "foundation-global-0578aa6c2828": NM("E-09", "grid do conteúdo (.row > .col-md-8 + .col) em 1280: --grid-gutter computado 24px (--grid-desktop-gutter, o mesmo valor em 3.4.1 e nos tokens 3.7.0; 40px é --grid-tv-gutter, a partir de 1600px); o autor soma ml-4 pr-4 à primeira coluna, e o espaço entre as colunas fica 24 + 12 = 36px. A regra diz 40px sem breakpoint: conflito entre o texto da regra e os tokens da própria base"),
  "foundation-global-21b1a2733f7b": OK("cores computadas de todo elemento visível: #333 --gray-80, #fff --pure-0, #ccc --gray-20, rgb(0,94,162) = #005ea2 --blue-vivid-60 (h2), rgb(19,81,180) = #1351b4 --blue-warm-vivid-70 / --color-primary-default (botões) — todas tokens em tokens/colors.json 3.7.0; nenhuma difere só por versão."),
  "foundation-global-1c0146e93d2e": FUNDO("único ícone interativo, o botão Menu (br-header >>> #navigation), mede 32×32 px (< 48×48), tamanho do template do web component 1.16.0. Os dois botões do conteúdo têm rótulo textual (não são ícones)."),
  // ---------- globais: página, padrões, templates
  "page-global-f6e03bce515b": NA("regra-guarda sem observável próprio: é medida pelas demais linhas desta tabela"),
  "pattern-global-eb8c1606a52e": NA("a página não tem região de dados que possa ficar vazia"),
  "pattern-global-03695a4aede0": NA("a página não tem região de dados que possa ficar vazia"),
  "pattern-global-9d9f1c9bf1ed": OK("nenhum título ou rótulo recortado: o botão de ajuda tem overflow hidden e white-space nowrap, mas a caixa do texto (925–1477 px) cabe inteira na do botão (873–1501 px). O botão ultrapassa a janela — isso é a E-08, não truncamento."),
  "pattern-global-abaec84ff915": NA("não há onboarding"),
  "pattern-global-a633e540aa5c": NA("a tela não é a página inicial do produto"),
  "pattern-global-5717506ac2e6": OK("há ponto de ajuda visível no conteúdo: botão \"Problemas ou dificuldades? Contate nossa central de relacionamento\", focável, com nome acessível. O destino depende do Angular (fora do escopo)."),
  "pattern-global-eebb093156e7": NA("não há Collapse"),
  "template-global-19f93475dc5e": NM("E-03", "estrutura medida: banner (header do <br-header>) + main; sem rodapé, sem skip link, sem breadcrumb, sem navegação. A regra é semântica"),
  "template-global-9cbfa5906031": NA("a tela não é tela de erro"),
  // ---------- globais: acessibilidade (e-MAG)
  "accessibility-global-7e6420514860": NM("E-02", "nenhum elemento fora do HTML (<pnip-login> tem hífen). O botão de ajuda é um <button class=\"br-button primary\"> montado à mão com <slot> no light DOM, atributo \"_ngcontentwmyc1\" e aria-label=\"\" vazio — se isso fere a 1.1 é juízo. Subárvore não renderizada: E-06."),
  "accessibility-global-1cb2c878824b": NM("E-02", "\"Entrar com gov.br\" (<br-button>) e \"Contate nossa central\" (<button>) levam a outra tela na aplicação viva — link ou botão é juízo; nenhuma lista, nenhum parágrafo"),
  "accessibility-global-3ac0aaa53900": V(["L-02"], "cabeçalhos em ordem de documento (light + shadow): um único, h2 \"Acesso via gov.br\"; nenhum h1 na página. A hierarquia começa no nível 2."),
  "accessibility-global-79db88c7f55d": OK("nenhum tabindex positivo; Tab real: botão Menu (y=67) → \"Entrar com gov.br\" (y=320) → botão de ajuda (y=400) → body; ordem do DOM = ordem visual."),
  "accessibility-global-7d2b85f81c52": V(["L-01"], "nenhum <a href> na página inteira (light + shadow: 0), nenhuma âncora \"#…\", nenhum .br-skiplink; o primeiro ponto de Tab é o botão Menu do cabeçalho."),
  "accessibility-global-206c9fa6ae11": NA("não há <table>"),
  "accessibility-global-cf61b3eb3c71": NA("não há links (0 a[href])"),
  "accessibility-global-bfba9c1f5026": NM("E-03", "marcos: banner e main; nenhum contentinfo, navigation ou complementary"),
  "accessibility-global-5be1f553cc03": NA("nenhum link, janela, aba ou modal é aberto pela página (teste de estados: nenhum gatilho produz efeito)"),
  "accessibility-global-e6fd5e1247de": OK("os três controles renderizados (Menu, Entrar com gov.br, ajuda) recebem foco por Tab; Enter e clique têm o mesmo efeito em cada um (nenhum — bindings do Angular não sobrevivem); sem aprisionamento."),
  "accessibility-global-f639993e9416": OK("o conteúdo gerado por script (<br-header>, <br-button>) é alcançável e operável por teclado como por mouse — mesma medida da linha anterior."),
  "accessibility-global-cd5de9a6f164": OK("nenhum meta http-equiv; a URL não muda durante a carga e as medidas."),
  "accessibility-global-d6e816588306": OK("nenhum meta http-equiv=refresh."),
  "accessibility-global-5d366ef29b04": NA("não há tarefa com limite de tempo"),
  "accessibility-global-8faca42c2c9a": OK("document.getAnimations() = 0 depois da carga; nenhum GIF/vídeo."),
  "accessibility-global-33b13d9fa271": OK("nenhuma animação nem conteúdo em movimento (document.getAnimations() = 0)."),
  "accessibility-global-698e0a4783a9": OK("<html lang=\"pt-br\">."),
  "accessibility-global-1ccbc61dddbc": NA("não há <table>"),
  "accessibility-global-fb83eab75d8d": NM("E-07", "texto curto (h2 + 1 parágrafo + 2 rótulos); linguagem simples fora do escopo (§ 6) salvo decisão da autora"),
  "accessibility-global-20c08f26d8e8": NM("E-07", "\"GovBR\" / \"gov.br\" sem explicação (o parágrafo seguinte descreve o serviço)"),
  "accessibility-global-1db13803cbf8": NM("E-07", "palavra de outro idioma sem lang: \"online\""),
  "accessibility-global-5d5a5f21d94b": NM("E-01", "<title>PNIP</title>, idêntico ao da política de privacidade; o único título da página é \"Acesso via gov.br\""),
  "accessibility-global-75c11ccac582": NM("E-04", "nenhum breadcrumb, nenhum aria-current, nenhuma navegação; o cabeçalho mostra o nome do sistema e o h1 o da página"),
  "accessibility-global-cdfbb56eebc5": NA("não há links (0 a[href])"),
  "accessibility-global-3a3e47354c53": FUNDO("imagem renderizada única: logo do <br-header> com alt=\"logo\" fixo no template do web component 1.16.0, 404 na captura. O .image-container do conteúdo é um div vazio 0×0 sem imagem (CSS do componente não veio na captura, E-08). A imagem sem alt da subárvore não renderizada está na E-06."),
  "accessibility-global-609e3494150c": NA("não há mapa de imagem"),
  "accessibility-global-3a57435c3b32": NA("não há documento para download"),
  "accessibility-global-cd705eb5da2a": NA("não há <table>"),
  "accessibility-global-cb09bc0c77c0": OK("todo texto visível tem fundo opaco resolvido e razão ≥ 4,5:1: cabeçalho 12,63:1, h2 #005ea2/#fff 6,72:1, .info 12,63:1; rótulos dos botões (texto em <slot>/<span>) #fff sobre #1351b4 e #1351b4 sobre #fff, medidos em conferir-auditoria.mjs."),
  "accessibility-global-c2f94bdc17ce": NA("nenhuma informação medida que dependa só de cor, forma ou posição: título e botões têm texto"),
  "accessibility-global-d9c42f188e2c": NA("zoom 200 % está fora do escopo da auditoria (§ 1 e § 6: só 1280×900)"),
  "accessibility-global-21fbcc2fe37b": OK("os três focáveis com foco de teclado (:focus-visible) computam outline dashed 4px rgb(194,133,12) (--gold-vivid-40), offset 4px."),
  "accessibility-global-6c86b93df639": NA("não há vídeo"),
  "accessibility-global-dc45b57b8349": NA("não há áudio"),
  "accessibility-global-8f439a3c078c": NA("não há vídeo"),
  "accessibility-global-56cbcba602ce": NA("não há som"),
  "accessibility-global-6ea7ecc60c01": OK("nenhuma animação (document.getAnimations() = 0)."),
  "accessibility-global-dafac812b10b": NA("não há formulário nem botão de imagem"),
  "accessibility-global-b95c42b61ed3": NA("não há campo de formulário"),
  "accessibility-global-e101928665cc": NA("não há formulário"),
  "accessibility-global-de1efebaf255": NA("não há campo de formulário"),
  "accessibility-global-01b1806c30e9": NA("não há campo de formulário"),
  "accessibility-global-cc837bbaf713": NA("não há formulário"),
  "accessibility-global-11ffc5c577f6": NA("não há formulário"),
  "accessibility-global-a8f7ce66b1c4": NA("não há CAPTCHA nem formulário"),
  // ---------- globais: acessibilidade (DS)
  "accessibility-global-e038367bd7d6": NA("nenhum widget customizado renderizado: os três controles são <button> nativos (dois dentro de shadow root). O role=\"menu\" sem menuitem está na subárvore não renderizada (E-06)."),
  "accessibility-global-695e4379e23f": NA(PROCESSO),
  "accessibility-global-1c3bd2a1c1a7": NA("outras janelas estão fora do escopo (§ 1 e § 6)"),
  "accessibility-global-41850b4791b8": OK("mesma medida de e6fd5e1247de: os três controles renderizados são alcançáveis e acionáveis só com teclado."),
  "accessibility-global-b5fad7ce076d": NA("não há campo de formulário"),
  "accessibility-global-cb56ad444da2": OK("mesma medida de 79db88c7f55d: ordem do DOM = ordem de leitura e de foco."),
  "accessibility-global-2f22b7245ef9": NM("E-02", "o botão de ajuda imita a anatomia interna do web component (<slot> no light DOM) em <button> nativo; link × botão para navegação"),
  "component-global-e30aab6e9a68": NM("E-05", "cabeçalho: has-menu sem menu (#main-navigation inexistente); conteúdo: ação principal em Button secondary e ajuda em Button primary (E-02)"),
  // ---------- componentes renderizados
  "component-button-4d7b5f978df1": OK("três Buttons renderizados: Menu (variante circular — exceção — nome \"Menu\"), \"Entrar com gov.br\" (br-button secondary, rótulo visível) e o botão de ajuda (br-button primary, rótulo visível)."),
  "accessibility-divider-30bbcbf3a17c": OK("o Divider do cabeçalho (br-header >>> .br-divider) tem tabIndex -1 e é ignorado pela árvore de acessibilidade."),
};

const OBS = {
  "accessibility-button-efd2d9e7c3c6": "os três botões são alcançáveis por Tab.",
  "accessibility-button-41d9f439e103": "os três botões recebem foco por Tab; Enter, Espaço e clique não produzem efeito (bindings perdidos; Menu sem menu: E-05).",
  "development-global-0b73051d7063": "a página carrega rawline.css de cdngovbr-ds.estaleiro.serpro.gov.br (CDN do DS) e Font Awesome/Raleway de CDNs de terceiros; core e web components vêm de arquivos locais (assets/).",
  "development-global-c6889731433a": "Raleway é declarada como alternativa depois de Rawline (font-family \"Rawline, Raleway, sans-serif\").",
  "foundation-global-9ef740ba1f28": "o conteúdo usa main.container-lg com .row/.col-md-8/.col; a primeira coluna (.image-container) está vazia.",
  "development-global-4a614a5c88e2": "cabeçalho e botão Entrar são web components 1.16.0; o botão de ajuda é <button> com classes do core 3.4.1.",
  "template-global-8e553b2c8bc7": "grid do conteúdo: .row com .col-md-8 + .col (12 colunas).",
  "template-global-2387114907b1": "não há Skip Link (ver L-01).",
  "component-signin-837c5ed4fe6a": "o Sign-in está na subárvore não renderizada (E-06).",
  "accessibility-signin-a68a86f45877": "o Sign-in está na subárvore não renderizada (display:none): não recebe foco (E-06).",
  "component-item-cb5d8f6d30b9": "o Item está na subárvore não renderizada (E-06).",
  "component-item-e08476d083e4": "o Item está na subárvore não renderizada (E-06).",
  "component-item-0e293b295c3d": "o Item está na subárvore não renderizada (E-06).",
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
    const presente = !r.component || RENDERIZADOS.has(r.component) || NAO_RENDERIZADOS.has(r.component);
    linhas.push({ ...base, veredito: "observação", destino: "observacao", medida: OBS[curto] ?? (presente ? "sem observável na página" : "componente ausente da página") });
    continue;
  }
  if (D[curto]) { linhas.push({ ...base, ...D[curto] }); continue; }
  if (r.component && NAO_RENDERIZADOS.has(r.component)) {
    linhas.push({ ...base, ...NA(`componente presente só na subárvore .drop-menu-login, com display:none inline (estado de sessão do Angular, fora desta captura — § 2 e § 6); nada dele é renderizado — ver E-06`), escalada: "E-06" });
    continue;
  }
  if (r.component && !RENDERIZADOS.has(r.component)) { linhas.push({ ...base, ...NA("componente ausente da página") }); continue; }
  faltando.push(r.id);
}
if (faltando.length) { console.error(`regra required/prohibited sem decisão explícita:\n  ${faltando.join("\n  ")}`); process.exit(1); }
const usados = new Set(Object.keys(D));
const sobras = [...usados].filter(k => !regras.some(r => r.id === "govbr-3.7.0-" + k));
if (sobras.length) { console.error(`decisão para regra inexistente: ${sobras.join(", ")}`); process.exit(1); }

const contagem = {};
for (const l of linhas) contagem[l.veredito] = (contagem[l.veredito] ?? 0) + 1;
const saida = {
  _meta: {
    tela: "pnip-login (recuo do § 9 da tela B; não declarada em telas.json)", metodo: "tela-b/metodo-auditoria.md @ govbr-eval 5838702",
    fonte: "govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl (186 regras; as 45 com emagReferences são as recomendações do e-MAG 3.1)",
    estado: "inicial (único — node tela-b/teste-estados.mjs --pagina login)",
    familias: "F1 componente presente · F2 Template Base/regras de página · F3 fundamentos (cor, tipografia, espaçamento) · F4 e-MAG · global = regra global da KB fora das quatro",
    destinos: "unidade (viola autoral) · fundo (viola no código do DS ou na captura) · escalada (não-mensurável → lista da autora) · registro · observacao · nenhum",
    contagem,
  },
  linhas,
};
writeFileSync(join(AQUI, "decisoes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${linhas.length} linhas · ${Object.entries(contagem).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`e-MAG: ${linhas.filter(l => l.emag.length).length} recomendações`);
