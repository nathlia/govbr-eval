// F4 — presença/ausência global (casos de desenvolvimento).
import { pagina, cabecalhoPadrao, SALTO, RODAPE, RECURSOS, itemEmprestimo, LIVROS } from "../comum.mjs";
import { ax, dom, foco, titulos, depois } from "../dsl.mjs";

const LOGO_LINK = `<a href="#" class="logo-inicio"><img src="${RECURSOS}/logo.svg" alt="Página inicial da Biblioteca Municipal" width="40" height="40"></a>`;

const ACERVO_DIGITAL = `
<h1>Acervo digital</h1>
<p>Livros digitais podem ser lidos no navegador por até 21 dias, sem fila de espera para títulos de domínio público.</p>
<div class="secao">
  <h2>Coleções</h2>
  <ul>
    <li><a href="#">Literatura brasileira em domínio público</a></li>
    <li><a href="#">História de Santa Aurora</a></li>
    <li><a href="#">Livros infantis ilustrados</a></li>
  </ul>
</div>`;

// ---------------------------------------------------------------- F4-02
const F4_02_C = pagina({
  titulo: "Acervo digital – Biblioteca Municipal",
  cabecalho: cabecalhoPadrao({ logo: LOGO_LINK }),
  corpo: ACERVO_DIGITAL,
});

// ---------------------------------------------------------------- F4-03
function f4_03(mainAttrs) {
  return pagina({ titulo: "Acervo digital – Biblioteca Municipal", corpo: ACERVO_DIGITAL, mainAttrs });
}

// ---------------------------------------------------------------- F4-04
const listaLivros = (livros, renovavel) =>
  `<div class="br-list lista-livros">\n${livros.map((l, i) => itemEmprestimo({ ...l, acoes: renovavel ? `<button class="br-button secondary small" type="button" id="renovar-${i + 1}">Renovar</button>` : "" })).join("\n")}\n</div>`;
const F4_04_C = pagina({
  titulo: "Renovar empréstimo – Biblioteca Municipal",
  corpo: `
<h1>Renovar empréstimo</h1>
<p>Escolha os livros que deseja renovar. Livros atrasados só podem ser renovados depois do pagamento da multa.</p>
<section class="secao">
  <h2>Seus empréstimos</h2>
  <h3>Em dia</h3>
  ${listaLivros(LIVROS.slice(0, 2), true)}
  <h3>Atrasados</h3>
  ${listaLivros([{ titulo: "Quarto de despejo", autor: "Carolina Maria de Jesus", prazo: "10/10/2026" }], false)}
</section>`,
});

// ---------------------------------------------------------------- F4-05
const CABECALHO_TOPO = cabecalhoPadrao();
const CONTEUDO_F4_05 = `<div class="container-lg">
${ACERVO_DIGITAL.trim()}
</div>`;
const F4_05_D = pagina({
  titulo: "Acervo digital – Biblioteca Municipal",
  cabecalho: "",
  rodape: "",
  mainAttrs: ' id="conteudo"',
  corpo: `${CABECALHO_TOPO}\n${CONTEUDO_F4_05}\n${RODAPE}`,
}).replace('<main id="conteudo" class="container-lg">', '<main id="conteudo">');

export const casos = [
  {
    caso: "F4-02",
    receita: [{ acao: "capturar", nome: "inicial" }, { acao: "tecla", tecla: "Tab" }, { acao: "capturar", nome: "primeiro-tab" }],
    gemeos: [
      {
        id: "F4-02-D",
        de: "F4-02-C",
        mudanca: "o salto vem depois do cabeçalho (o link do logo vem antes)",
        trocas: [
          [SALTO, ""],
          depois("</header>\n", SALTO.trimEnd() + "\n"),
        ],
        fatos: {
          inicial: [dom("!!document.querySelector('.br-skiplink a[href=\"#conteudo\"]')", "igual", true, "salto presente")],
          "primeiro-tab": [foco(".logo-inicio", "1º Tab cai no logo"), ax(".logo-inicio", "papel", "igual", "link")],
        },
      },
      {
        id: "F4-02-C",
        html: F4_02_C,
        fatos: {
          "primeiro-tab": [foco(".br-skiplink a", "1º Tab cai no salto"), dom("document.activeElement.innerText.trim()", "igual", "Ir para o conteúdo")],
        },
      },
    ],
  },
  {
    caso: "F4-03",
    receita: [
      { acao: "tecla", tecla: "Tab" },
      { acao: "capturar", nome: "primeiro-tab" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-ativar" },
    ],
    gemeos: [
      {
        id: "F4-03-D",
        axePermitido: ["skip-link"],
        html: f4_03(""),
        fatos: {
          "primeiro-tab": [foco(".br-skiplink a"), dom("document.activeElement.getAttribute('href')", "igual", "#conteudo")],
          "apos-ativar": [
            dom("document.getElementById('conteudo')", "igual", null, "alvo inexistente"),
            dom("document.getElementsByName('conteudo').length", "igual", 0),
            dom("document.querySelector(':target')", "igual", null),
          ],
        },
      },
      {
        id: "F4-03-C",
        de: "F4-03-D",
        mudanca: "acrescenta só o id no <main> (sem atributo name)",
        trocas: [['<main class="container-lg">', '<main id="conteudo" class="container-lg">']],
        fatos: {
          "primeiro-tab": [foco(".br-skiplink a")],
          "apos-ativar": [
            dom("document.querySelector(':target') === document.querySelector('main')", "igual", true, "o alvo existe e é o conteúdo"),
            dom("document.querySelector('main').hasAttribute('name')", "igual", false, "sem atributo name (Q2)"),
          ],
        },
      },
    ],
  },
  {
    caso: "F4-04",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F4-04-D",
        axePermitido: ["heading-order"],
        de: "F4-04-C",
        mudanca: "seção em h3 com subseções em h2",
        trocas: [
          ["  <h2>Seus empréstimos</h2>", "  <h3>Seus empréstimos</h3>"],
          ["  <h3>Em dia</h3>", "  <h2>Em dia</h2>"],
          ["  <h3>Atrasados</h3>", "  <h2>Atrasados</h2>"],
        ],
        fatos: { inicial: [titulos([[1, "Renovar empréstimo"], [3, "Seus empréstimos"], [2, "Em dia"], [2, "Atrasados"]])] },
      },
      {
        id: "F4-04-C",
        html: F4_04_C,
        fatos: { inicial: [titulos([[1, "Renovar empréstimo"], [2, "Seus empréstimos"], [3, "Em dia"], [3, "Atrasados"]])] },
      },
      {
        id: "F4-04-S",
        axePermitido: ["heading-order"],
        de: "F4-04-C",
        mudanca: "subseções em h4 (salto de nível)",
        trocas: [
          ["  <h3>Em dia</h3>", "  <h4>Em dia</h4>"],
          ["  <h3>Atrasados</h3>", "  <h4>Atrasados</h4>"],
        ],
        fatos: { inicial: [titulos([[1, "Renovar empréstimo"], [2, "Seus empréstimos"], [4, "Em dia"], [4, "Atrasados"]])] },
      },
      {
        id: "F4-04-H",
        axePermitido: ["page-has-heading-one"],
        de: "F4-04-C",
        mudanca: "sem h1: o primeiro título é h2",
        trocas: [["<h1>Renovar empréstimo</h1>", "<h2>Renovar empréstimo</h2>"]],
        fatos: { inicial: [titulos([[2, "Renovar empréstimo"], [2, "Seus empréstimos"], [3, "Em dia"], [3, "Atrasados"]]), dom("document.querySelectorAll('h1').length", "igual", 0)] },
      },
    ],
  },
  {
    caso: "F4-05",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F4-05-D",
        html: F4_05_D,
        fatos: {
          inicial: [
            dom("document.getElementById('topo').parentElement.tagName", "igual", "MAIN"),
            dom("document.getElementById('rodape').parentElement.tagName", "igual", "MAIN"),
            ax("#topo", "papel", "naoEm", ["banner"]),
            ax("#rodape", "papel", "naoEm", ["contentinfo"]),
            dom("document.querySelectorAll('[role=banner], [role=contentinfo]').length", "igual", 0),
          ],
        },
      },
      {
        id: "F4-05-C",
        de: "F4-05-D",
        mudanca: "move cabeçalho e rodapé para fora do <main>, como filhos de <body>, sem role",
        trocas: [
          [`<main id="conteudo">\n${CABECALHO_TOPO}\n`, `${CABECALHO_TOPO}\n<main id="conteudo">\n`],
          [`${RODAPE}\n</main>\n`, `</main>\n${RODAPE}\n`],
        ],
        fatos: {
          inicial: [
            dom("document.getElementById('topo').parentElement.tagName", "igual", "BODY"),
            dom("document.getElementById('topo').hasAttribute('role') || document.getElementById('rodape').hasAttribute('role')", "igual", false),
            ax("#topo", "papel", "igual", "banner"),
            ax("#rodape", "papel", "igual", "contentinfo"),
          ],
        },
      },
      {
        id: "F4-05-X",
        axePermitido: ["landmark-banner-is-top-level", "landmark-contentinfo-is-top-level"],
        de: "F4-05-D",
        mudanca: "acrescenta só role=banner e role=contentinfo",
        trocas: [
          ['<header class="br-header" id="topo">', '<header class="br-header" id="topo" role="banner">'],
          ['<footer class="br-footer" id="rodape">', '<footer class="br-footer" id="rodape" role="contentinfo">'],
        ],
        fatos: { inicial: [ax("#topo", "papel", "igual", "banner"), ax("#rodape", "papel", "igual", "contentinfo")] },
      },
    ],
  },
];
