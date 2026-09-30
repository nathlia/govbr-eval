/**
 * Monta tela-b/decisoes.json: uma linha por regra da base normativa 3.7.0 (rules.jsonl, 186 regras,
 * das quais 45 são as recomendações do e-MAG 3.1) — tela-b/metodo-auditoria.md § 3.2–3.3.
 *
 * Lê SÓ texto de norma (`govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl`).
 * As decisões estão escritas abaixo, à mão, com a medida que as sustenta (inventario.json,
 * teste-estados.mjs, conferir-auditoria.mjs). Regra sem decisão explícita cai num padrão declarado
 * pela força e pelo componente — e o script PARA se uma regra required/prohibited de componente
 * presente ou global ficar sem decisão explícita.
 *
 * Uso: node tela-b/montar-decisoes.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const KB = join(AQUI, "../../govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl");
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
  "development-global-406774b1cb87": OK("font-family computado do conteúdo = \"Rawline, Raleway, sans-serif\" e rawline.css declarado no <head>. A fonte não carrega sob o isolamento (host abortado) — isso é fundo (captura/isolamento), não defeito autoral."),
  "development-global-a43ad8231ad0": OK("<head>: rawline.css → Raleway (Google Fonts) → Font Awesome 5.15.4 → assets/core.min.css; o único <script> (webcomponents.umd.min.js) está no fim do <body>."),
  "development-global-137c50bea6ca": NA(SEM_FONTE + ". O observável na página (cores e tamanhos computados) está coberto por foundation-global-21b1a2733f7b e pelo inventário tipográfico."),
  "development-global-659242ecda1d": NA(SEM_FONTE),
  "development-global-5765f1b8d2bc": NA(SEM_FONTE),
  "development-global-8c92e4e83038": NA(PROCESSO),
  "development-global-9c1d24af4f37": NA("nenhum componente renderizado depende de core.min.js (a página não carrega core.min.js; o <br-header> é web component 1.16.0, que se inicializa sozinho). O dropdown do .br-sign-in, que dependeria dele, está na subárvore não renderizada (E-06)."),
  "development-global-d0dff372c137": NA("nenhuma inicialização autoral de componente na página capturada (bindings do Angular não sobrevivem; o web component se inicializa sozinho)"),
  "development-global-0052d80d4f92": NA(SEM_FONTE),
  "development-global-9826b6862644": OK("único <script> da página: src=\"assets/webcomponents.umd.min.js\", sem atributo type."),
  "development-global-63b44801da86": NA(SEM_FONTE),
  "development-global-dfebe85e65d8": NA(PROCESSO),
  "development-global-067a1786b481": NA(SEM_FONTE),
  "development-global-b491c2e2c1a0": NA("o HTML disponível é a serialização da captura (outerHTML gravado por snapshot-real.ts), não a fonte autoral; a forma das aspas é propriedade do serializador"),
  // ---------- globais: fundamentos
  "foundation-global-0578aa6c2828": NA("o conteúdo não usa colunas de grid (nenhum .row/.col* renderizado; a única .row, .drop-menu-login, está com display:none): não há espaçamento entre colunas a medir"),
  "foundation-global-21b1a2733f7b": OK("cores computadas de todo elemento visível (texto, fundo, borda pintada): rgb(51,51,51) = #333 --gray-80; rgb(255,255,255) = #fff --pure-0; rgb(204,204,204) = #ccc --gray-20 — todas tokens em tokens/colors.json 3.7.0 e declaradas no :root do core 3.4.1; nenhuma cor difere só por versão."),
  "foundation-global-1c0146e93d2e": FUNDO("único ícone interativo, o botão Menu (br-header >>> #navigation), mede 32×32 px (< 48×48). O tamanho vem do template do web component 1.16.0 (BrButton circle density=\"small\", no bundle congelado); o autor só pôs has-menu. Fundo — ver também E-05."),
  // ---------- globais: página, padrões, templates
  "page-global-f6e03bce515b": NA("regra-guarda sem observável próprio: é medida pelas demais linhas desta tabela"),
  "pattern-global-eb8c1606a52e": NA("a página não tem região de dados que possa ficar vazia"),
  "pattern-global-03695a4aede0": NA("a página não tem região de dados que possa ficar vazia"),
  "pattern-global-9d9f1c9bf1ed": OK("nenhum título, rótulo, botão ou texto visível com text-overflow: ellipsis ou recortado (scrollWidth > clientWidth com overflow ≠ visible); o título do cabeçalho computa text-overflow: clip, overflow: visible."),
  "pattern-global-abaec84ff915": NA("não há onboarding"),
  "pattern-global-a633e540aa5c": NA("a tela não é a página inicial do produto"),
  "pattern-global-5717506ac2e6": NM("E-09", "a página não tem nenhum link (0 a[href]) nem menu que leve a outra tela; se existe ajuda em outra tela do produto, a captura isolada não responde"),
  "pattern-global-eebb093156e7": NA("não há Collapse"),
  "template-global-19f93475dc5e": NM("E-03", "estrutura medida: banner (header do <br-header>) + main; sem rodapé (nenhum footer/.br-footer/contentinfo), sem skip link, sem breadcrumb, sem navegação. A regra (\"use o Template Base como ponto de partida\") é semântica; o quanto a ausência de rodapé a viola é juízo"),
  "template-global-9cbfa5906031": NA("a tela não é tela de erro"),
  // ---------- globais: acessibilidade (e-MAG)
  "accessibility-global-7e6420514860": V(["B-03"], "o conteúdo inteiro está dentro de <privacidade>: nome sem hífen (não é nome válido de custom element), não é elemento HTML (instanceof HTMLUnknownElement = true), customElements.get = undefined. Controle conforme: <br-header> é custom element válido e definido. Estilo inline max-width:800px no contêiner vai à escalada E-08; defeitos de validade da subárvore não renderizada, à E-06."),
  "accessibility-global-1cb2c878824b": NM("E-02", "12 parágrafos <p> cujo único filho é <strong> (16,8 px, peso 700) abrem subseções (\"Proprietário e Controlador de Dados\", \"Método de processamento\", \"Lugar\"…); os 16 <h3> envolvem todo o texto em <strong>. Listas: 4 <ul> com 26 <li>, nenhum filho fora de <li> (conforme). Se <p><strong> é título marcado como parágrafo é juízo"),
  "accessibility-global-3ac0aaa53900": V(["B-02"], "cabeçalhos em ordem de documento (light + shadow): h1, depois 16 × h3; nenhum h2 na página. O salto 1→3 ocorre no primeiro h3 (\"Tipos de Dados coletados\"). Parte conforme: h1 único e primeiro título (controle conforme). Os 12 pseudo-títulos <p><strong> vão à E-02."),
  "accessibility-global-79db88c7f55d": OK("nenhum tabindex positivo; Tab real a partir do body: único ponto de parada = botão Menu do cabeçalho, depois volta ao body; ordem do DOM = ordem visual (cabeçalho y=0, conteúdo y≥139)."),
  "accessibility-global-7d2b85f81c52": V(["B-01"], "nenhum <a href> na página inteira (light + shadow: 0), nenhuma âncora \"#…\", nenhum .br-skiplink; o primeiro ponto de Tab é o botão Menu do cabeçalho, não um salto para o conteúdo. <main> existe e não tem atalho."),
  "accessibility-global-206c9fa6ae11": NA("não há <table>"),
  "accessibility-global-cf61b3eb3c71": NA("não há links (0 a[href])"),
  "accessibility-global-bfba9c1f5026": NM("E-03", "marcos na árvore de acessibilidade: banner (header do <br-header>) e main; nenhum contentinfo, navigation ou complementary. A página está dividida em regiões; se a falta de rodapé viola a recomendação é juízo"),
  "accessibility-global-5be1f553cc03": NA("nenhum link, janela, aba ou modal é aberto pela página (teste de estados: nenhum gatilho produz efeito)"),
  "accessibility-global-e6fd5e1247de": OK("o único controle renderizado (botão Menu) recebe foco por Tab; Enter e clique têm o mesmo efeito (nenhum); o foco sai dele com Tab (não há aprisionamento)."),
  "accessibility-global-f639993e9416": OK("o único conteúdo gerado por script (o <br-header> hidratado) é alcançável e operável por teclado como por mouse — mesma medida da linha anterior."),
  "accessibility-global-cd5de9a6f164": OK("nenhum meta http-equiv; a URL não muda durante a carga e as medidas."),
  "accessibility-global-d6e816588306": OK("nenhum meta http-equiv=refresh."),
  "accessibility-global-5d366ef29b04": NA("não há tarefa com limite de tempo"),
  "accessibility-global-8faca42c2c9a": OK("document.getAnimations() = 0 depois da carga e 3 s depois; nenhum GIF/vídeo."),
  "accessibility-global-33b13d9fa271": OK("nenhuma animação nem conteúdo em movimento (document.getAnimations() = 0)."),
  "accessibility-global-698e0a4783a9": OK("<html lang=\"pt-br\">."),
  "accessibility-global-1ccbc61dddbc": NA("não há <table>"),
  "accessibility-global-fb83eab75d8d": NM("E-07", "texto jurídico de ~20 000 caracteres; linguagem simples está fora do escopo (§ 6) salvo decisão da autora"),
  "accessibility-global-20c08f26d8e8": NM("E-07", "siglas no conteúdo (primeira ocorrência): PNIP (no h1, depois da expansão), LUMAC (após a expansão), LGPD (após a expansão), ANPD (seguida da expansão), RS, TI, IP, ONU (sem expansão)"),
  "accessibility-global-1db13803cbf8": NM("E-07", "palavras de outro idioma no conteúdo, sem lang: \"marketing\", \"logs\"/\"Logs\", \"cookies\", \"E-mail\"; se são trechos em outro idioma ou empréstimos é juízo"),
  "accessibility-global-5d5a5f21d94b": NM("E-01", "<title>PNIP</title> — sigla do sistema, idêntica ao título da captura pnip-login; o h1 é \"Política de Privacidade do serviço Plataforma Nacional da Indústria do Pescado - PNIP\". Identifica o sistema; se \"representa o conteúdo principal\" é juízo de adequação de rótulo"),
  "accessibility-global-75c11ccac582": NM("E-04", "nenhum breadcrumb, nenhum aria-current, nenhuma navegação; o cabeçalho mostra o nome do sistema e o h1 o da página"),
  "accessibility-global-cdfbb56eebc5": NA("não há links (0 a[href])"),
  "accessibility-global-3a3e47354c53": FUNDO("imagem renderizada única: logo do <br-header> com alt=\"logo\", fixo no template do web component 1.16.0 (bundle congelado: img {src: r.image, alt: \"logo\"}), e o arquivo não veio na captura (404). A imagem da subárvore não renderizada (sem alt) está na E-06."),
  "accessibility-global-609e3494150c": NA("não há mapa de imagem"),
  "accessibility-global-3a57435c3b32": NA("não há documento para download"),
  "accessibility-global-cd705eb5da2a": NA("não há <table>"),
  "accessibility-global-cb09bc0c77c0": OK("111 elementos visíveis com texto próprio, fundo opaco resolvido em todos; razão mínima 12,63:1 (#333 sobre #fff); nenhum texto sobre imagem."),
  "accessibility-global-c2f94bdc17ce": NM("E-02", "os 12 pseudo-títulos <p><strong> distinguem-se do corpo só por peso (700 × 400) e posição"),
  "accessibility-global-d9c42f188e2c": NA("zoom 200 % está fora do escopo da auditoria (§ 1 e § 6: só 1280×900)"),
  "accessibility-global-21fbcc2fe37b": OK("o único focável (botão Menu) com foco de teclado (:focus-visible) computa outline dashed 4px rgb(194,133,12) (#c2850c = --gold-vivid-40), offset 4px; sem foco, outline none."),
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
  "accessibility-global-e038367bd7d6": NA("nenhum widget customizado renderizado: o único controle é <button> nativo. O role=\"menu\" sem menuitem está na subárvore não renderizada (E-06)."),
  "accessibility-global-695e4379e23f": NA(PROCESSO),
  "accessibility-global-1c3bd2a1c1a7": NA("outras janelas estão fora do escopo (§ 1 e § 6)"),
  "accessibility-global-41850b4791b8": OK("mesma medida de e6fd5e1247de: o único componente interativo renderizado é alcançável e acionável só com teclado."),
  "accessibility-global-b5fad7ce076d": NA("não há campo de formulário"),
  "accessibility-global-cb56ad444da2": OK("mesma medida de 79db88c7f55d: ordem do DOM = ordem de leitura e de foco."),
  "accessibility-global-2f22b7245ef9": NM("E-02", "os 12 pseudo-títulos são <p><strong> onde existe elemento nativo de título"),
  "component-global-e30aab6e9a68": NM("E-05", "anatomia do cabeçalho vem do web component; o autor ligou has-menu sem fornecer menu: o botão Menu aponta para #main-navigation, que não existe"),
  // ---------- componentes renderizados
  "component-button-4d7b5f978df1": OK("o único Button renderizado (br-header >>> #navigation) é a variante circular (classes br-button circle small) — exceção prevista — e tem nome acessível \"Menu\" (aria-label)."),
  "accessibility-divider-30bbcbf3a17c": OK("o Divider do cabeçalho (br-header >>> .br-divider) tem tabIndex -1 e é ignorado pela árvore de acessibilidade."),
};

const OBS = {
  "accessibility-button-efd2d9e7c3c6": "o botão Menu é alcançável por Tab (único ponto de parada).",
  "accessibility-button-41d9f439e103": "o botão Menu recebe foco por Tab; Enter e clique não produzem efeito algum (sem menu: E-05).",
  "development-global-0b73051d7063": "a página carrega rawline.css de cdngovbr-ds.estaleiro.serpro.gov.br (CDN do DS) e Font Awesome/Raleway de CDNs de terceiros; core e web components vêm de arquivos locais (assets/).",
  "development-global-c6889731433a": "Raleway é declarada como alternativa depois de Rawline (font-family \"Rawline, Raleway, sans-serif\").",
  "foundation-global-9ef740ba1f28": "o conteúdo usa main.container-lg (1240 px de largura em 1280) com um .container interno limitado a max-width: 800px por estilo inline.",
  "development-global-4a614a5c88e2": "o cabeçalho é o web component <br-header> 1.16.0; o restante usa classes CSS do core 3.4.1.",
  "template-global-8e553b2c8bc7": "o conteúdo não usa colunas de grid.",
  "template-global-2387114907b1": "não há Skip Link (ver B-01).",
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
    tela: "privacidade (tela B)", metodo: "tela-b/metodo-auditoria.md @ govbr-eval 5838702",
    fonte: "govbr-ds-validator/data/knowledge/versions/3.7.0/normalized/rules.jsonl (186 regras; as 45 com emagReferences são as recomendações do e-MAG 3.1)",
    estado: "inicial (único — tela-b/teste-estados.mjs)",
    familias: "F1 componente presente · F2 Template Base/regras de página · F3 fundamentos (cor, tipografia, espaçamento) · F4 e-MAG · global = regra global da KB fora das quatro",
    destinos: "unidade (viola autoral) · fundo (viola no código do DS ou na captura) · escalada (não-mensurável → lista da autora) · registro · observacao · nenhum",
    contagem,
  },
  linhas,
};
writeFileSync(join(AQUI, "decisoes.json"), JSON.stringify(saida, null, 2) + "\n");
console.log(`${linhas.length} linhas · ${Object.entries(contagem).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`e-MAG: ${linhas.filter(l => l.emag.length).length} recomendações`);
