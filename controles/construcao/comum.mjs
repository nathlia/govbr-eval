/**
 * Peças comuns das páginas de controle (NAT-85 P1): o "esqueleto" da Biblioteca Municipal e os
 * componentes do gov.br DS 3.7.0 escritos com a marcação oficial (classes da aba Desenvolvedor).
 *
 * Este arquivo mora no govbr-eval porque é ele quem sabe o que cada página testa. O corpus recebe
 * só o HTML resultante — sem comentário, sem nome de caso, sem rótulo de resultado.
 *
 * Regra de construção: o esqueleto é conforme em tudo que o catálogo mede (salto para o conteúdo,
 * cabeçalho com título, marcos, h1, título da página, rótulos). Cada caso mexe só no que testa,
 * para que nenhuma página carregue defeito incidental fora das células do catálogo.
 */

export const RECURSOS = "../recursos";

/** Esqueleto da página. `partes` permite trocar cabeçalho/rodapé/salto quando o caso exige. */
export function pagina({
  titulo,
  corpo,
  estilo = "",
  script = "",
  scriptExterno = "",
  depoisDoRodape = "",
  salto = SALTO,
  cabecalho = cabecalhoPadrao(),
  rodape = RODAPE,
  mainAttrs = ' id="conteudo"',
}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<link rel="stylesheet" href="${RECURSOS}/core.min.css">
<link rel="stylesheet" href="${RECURSOS}/fontawesome/css/all.min.css">
<link rel="stylesheet" href="${RECURSOS}/biblioteca.css">
${estilo ? `<style>\n${estilo.trim()}\n</style>\n` : ""}</head>
<body>
${salto}${cabecalho}
<main${mainAttrs} class="container-lg">
${corpo.trim()}
</main>
${rodape}
${depoisDoRodape ? depoisDoRodape.trim() + "\n" : ""}${scriptExterno ? `<script src="${scriptExterno}"></script>\n` : ""}${script ? `<script>\n${script.trim()}\n</script>\n` : ""}</body>
</html>
`;
}

export const SALTO = `<nav class="br-skiplink" aria-label="Atalhos de teclado"><a class="br-item" href="#conteudo">Ir para o conteúdo</a></nav>
`;

export function cabecalhoPadrao({ logo = LOGO_IMG, info = INFO_PADRAO, acoes = "", menu = "", attrs = ' id="topo"' } = {}) {
  return `<header class="br-header"${attrs}>
  <div class="container-lg">
    <div class="header-top">
${logo ? `      <div class="header-logo">${logo}<span class="br-divider vertical"></span><div class="header-sign">Prefeitura de Santa Aurora</div></div>\n` : ""}${acoes ? `      <div class="header-actions">\n${acoes}\n      </div>\n` : ""}    </div>
    <div class="header-bottom">
      <div class="header-menu">
${menu}${info}      </div>
    </div>
  </div>
</header>`;
}

export const LOGO_IMG = `<img src="${RECURSOS}/logo.svg" alt="" width="40" height="40">`;

export const INFO_PADRAO = `        <div class="header-info">
          <div class="header-title">Biblioteca Municipal</div>
          <div class="header-subtitle">Reservas e renovação de empréstimos</div>
        </div>
`;

export const RODAPE = `<footer class="br-footer" id="rodape">
  <div class="container-lg">
    <nav class="links-rodape" aria-label="Links do rodapé">
      <a href="#">Acervo</a>
      <a href="#">Horários e endereço</a>
      <a href="#">Regulamento de empréstimos</a>
    </nav>
    <p class="texto-rodape">Biblioteca Municipal de Santa Aurora · Rua das Acácias, 120 · Terça a sábado, das 9h às 18h</p>
  </div>
</footer>`;

/** Campo de texto do DS (br-input). `depois` entra dentro do .br-input, após o input. */
export function campo({ id, rotulo, tipo = "text", attrs = "", depois = "", classe = "br-input mb-3" }) {
  return `<div class="${classe}">
  <label for="${id}">${rotulo}</label>
  <input id="${id}" name="${id}" type="${tipo}"${attrs}>${depois}
</div>`;
}

/** Linha de empréstimo (br-item dentro de br-list). */
export function itemEmprestimo({ titulo, autor, prazo, acoes = "" }) {
  return `<div class="br-item">
    <div class="row align-items-center">
      <div class="col">
        <p class="titulo-livro mb-0">${titulo}</p>
        <p class="detalhe-livro mb-0">${autor} · devolução até ${prazo}</p>
      </div>
${acoes ? `      <div class="col-auto">${acoes}</div>\n` : ""}    </div>
  </div>`;
}

/** Modal do DS dentro de um scrim (br-scrim-util foco), escondido até receber .active. */
export function modal({
  id,
  titulo,
  corpo,
  botoes = "",
  tipo,
  fechar = true,
  nome = "titulo",
  tamanho = "medium",
}) {
  const rotulo = nome === "titulo" ? ` aria-labelledby="${id}-titulo"` : nome === "nenhum" ? "" : ` aria-label="${nome}"`;
  const cabecalho =
    titulo || fechar
      ? `    <div class="br-modal-header">
${titulo ? `      <div class="modal-title" id="${id}-titulo">${titulo}</div>\n` : ""}${fechar ? `      <button class="br-button close circle" type="button" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button>\n` : ""}    </div>
`
      : "";
  return `<div class="br-scrim-util foco" id="scrim-${id}">
  <div class="br-modal ${tamanho}" id="${id}" role="dialog" aria-modal="true"${rotulo} data-tipo="${tipo}">
${cabecalho}    <div class="br-modal-body">
${corpo.replace(/^\n+|\s+$/g, "")}
    </div>
${botoes ? `    <div class="br-modal-footer justify-content-end">\n${botoes}\n    </div>\n` : ""}  </div>
</div>`;
}

/** Controle de modal escrito como o de um projeto comum: abrir, fechar, Esc e laço de Tab. */
export function scriptModal({ id, invocador, foco = "fechar", restaurar = true, laco = true, botaoFecha = "" }) {
  const linhas = [];
  linhas.push(`(function () {`);
  linhas.push(`  const scrim = document.getElementById('scrim-${id}');`);
  linhas.push(`  const janela = document.getElementById('${id}');`);
  linhas.push(`  const abrir = document.getElementById('${invocador}');`);
  linhas.push(`  const fechar = janela.querySelector('.br-modal-header .close');`);
  if (restaurar) linhas.push(`  let origem = null;`);
  if (laco) {
    linhas.push(`  function focaveis() {`);
    linhas.push(`    return Array.from(janela.querySelectorAll('button, [href], input, select, textarea')).filter((el) => !el.disabled);`);
    linhas.push(`  }`);
  }
  linhas.push(`  function abrirJanela() {`);
  if (restaurar) linhas.push(`    origem = document.activeElement;`);
  linhas.push(`    scrim.classList.add('active');`);
  if (foco === "fechar") linhas.push(`    fechar.focus();`);
  else if (foco) linhas.push(`    janela.querySelector('${foco}').focus();`);
  linhas.push(`  }`);
  linhas.push(`  function fecharJanela() {`);
  linhas.push(`    scrim.classList.remove('active');`);
  if (restaurar) linhas.push(`    origem.focus();`);
  linhas.push(`  }`);
  linhas.push(`  abrir.addEventListener('click', abrirJanela);`);
  linhas.push(`  if (fechar) fechar.addEventListener('click', fecharJanela);`);
  if (botaoFecha) linhas.push(`  janela.querySelectorAll('${botaoFecha}').forEach((b) => b.addEventListener('click', fecharJanela));`);
  linhas.push(`  janela.addEventListener('keydown', (e) => {`);
  linhas.push(`    if (e.key === 'Escape') {`);
  linhas.push(`      fecharJanela();`);
  linhas.push(`    }`);
  if (laco) {
    linhas.push(`    if (e.key === 'Tab') {`);
    linhas.push(`      const lista = focaveis();`);
    linhas.push(`      const primeiro = lista[0];`);
    linhas.push(`      const ultimo = lista[lista.length - 1];`);
    linhas.push(`      if (e.shiftKey && document.activeElement === primeiro) {`);
    linhas.push(`        e.preventDefault();`);
    linhas.push(`        ultimo.focus();`);
    linhas.push(`      } else if (!e.shiftKey && document.activeElement === ultimo) {`);
    linhas.push(`        e.preventDefault();`);
    linhas.push(`        primeiro.focus();`);
    linhas.push(`      }`);
    linhas.push(`    }`);
  }
  linhas.push(`  });`);
  linhas.push(`})();`);
  return linhas.join("\n");
}

export const LIVROS = [
  { titulo: "Dom Casmurro", autor: "Machado de Assis", prazo: "18/10/2026" },
  { titulo: "Vidas secas", autor: "Graciliano Ramos", prazo: "21/10/2026" },
  { titulo: "Quarto de despejo", autor: "Carolina Maria de Jesus", prazo: "25/10/2026" },
];

/** Botão "Menu" do cabeçalho (gatilho do br-menu #menu-principal). */
export const GATILHO_MENU = `        <div class="header-menu-trigger">
          <button class="br-button small circle" type="button" id="abrir-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-principal"><i class="fas fa-bars" aria-hidden="true"></i></button>
        </div>
`;

/** Atalho de busca no cabeçalho: leva ao formulário de busca da própria página. */
export const ACAO_BUSCA = `        <div class="header-search-trigger">
          <a class="br-button circle" href="#busca" aria-label="Buscar no acervo"><i class="fas fa-search" aria-hidden="true"></i></a>
        </div>`;

/** Painel do menu principal (br-menu, off-canvas). `fechar=false` tira o botão fechar do painel. */
export function menuPrincipal({ fechar = true } = {}) {
  return `<div class="br-menu" id="menu-principal">
  <div class="menu-container">
    <div class="menu-panel">
      <div class="menu-header">
        <div class="menu-title"><img src="${RECURSOS}/logo.svg" alt="" width="32" height="32"><span>Biblioteca Municipal</span></div>
${fechar ? `        <div class="menu-close">
          <button class="br-button circle" type="button" aria-label="Fechar o menu"><i class="fas fa-times" aria-hidden="true"></i></button>
        </div>
` : ""}      </div>
      <nav class="menu-body" aria-label="Menu principal">
        <a class="menu-item" href="#"><span class="icon"><i class="fas fa-home" aria-hidden="true"></i></span><span class="content">Início</span></a>
        <a class="menu-item" href="#"><span class="icon"><i class="fas fa-book" aria-hidden="true"></i></span><span class="content">Acervo</span></a>
        <a class="menu-item" href="#"><span class="icon"><i class="fas fa-bookmark" aria-hidden="true"></i></span><span class="content">Minhas reservas</span></a>
        <a class="menu-item" href="#"><span class="icon"><i class="fas fa-redo" aria-hidden="true"></i></span><span class="content">Renovar empréstimos</span></a>
        <a class="menu-item" href="#"><span class="icon"><i class="fas fa-clock" aria-hidden="true"></i></span><span class="content">Horários e endereço</span></a>
      </nav>
    </div>
    <div class="menu-scrim"></div>
  </div>
</div>`;
}

/** Controle do menu: abre com o botão do cabeçalho, fecha pelo X, pelo fundo ou por Esc. */
export function scriptMenu({ focoAoAbrir = true } = {}) {
  return `(function () {
  const menu = document.getElementById('menu-principal');
  const botao = document.getElementById('abrir-menu');
  const fechar = menu.querySelector('.menu-close button');
  function abrirMenu() {
    menu.classList.add('active');
    botao.setAttribute('aria-expanded', 'true');
${focoAoAbrir ? "    fechar.focus();\n" : ""}  }
  function fecharMenu() {
    menu.classList.remove('active');
    botao.setAttribute('aria-expanded', 'false');
    botao.focus();
  }
  botao.addEventListener('click', abrirMenu);
  if (fechar) fechar.addEventListener('click', fecharMenu);
  menu.querySelector('.menu-scrim').addEventListener('click', fecharMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('active')) fecharMenu();
  });
})();`;
}
