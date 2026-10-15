// F2 — anatomia obrigatória ausente (casos de desenvolvimento).
import { pagina, cabecalhoPadrao, itemEmprestimo, LIVROS, GATILHO_MENU, ACAO_BUSCA, menuPrincipal, scriptMenu, RECURSOS } from "../comum.mjs";
import { ax, dom, foco, depois } from "../dsl.mjs";

const lista = (acoes) =>
  `<div class="br-list lista-livros">\n${LIVROS.map((l, i) => itemEmprestimo({ ...l, acoes: acoes(i) })).join("\n")}\n</div>`;

// ---------------------------------------------------------------- F2-01
const MENSAGEM_VAZIA = `<div class="br-message danger" id="aviso-renovacao" hidden>
  <div class="icon"><i class="fas fa-times-circle fa-lg" aria-hidden="true"></i></div>
  <div class="content" role="alert"></div>
  <div class="close"><button class="br-button circle small" type="button" aria-label="Fechar mensagem"><i class="fas fa-times" aria-hidden="true"></i></button></div>
</div>`;

const F2_01_D = pagina({
  titulo: "Meus empréstimos – Biblioteca Municipal",
  corpo: `
<h1>Meus empréstimos</h1>
<p>Você pode renovar cada empréstimo até duas vezes, desde que o livro não tenha reserva de outro leitor.</p>
${MENSAGEM_VAZIA}
${lista((i) => `<button class="br-button secondary small renovar" type="button" id="renovar-${i + 1}">Renovar</button>`)}`,
  script: `const aviso = document.getElementById('aviso-renovacao');
const fecharAviso = aviso.querySelector('.close button');
let origem = null;
document.querySelectorAll('.renovar').forEach((botao) => {
  botao.addEventListener('click', () => {
    origem = botao;
    aviso.hidden = false;
    fecharAviso.focus();
  });
});
fecharAviso.addEventListener('click', () => {
  aviso.hidden = true;
  if (origem) origem.focus();
});`,
});

// ---------------------------------------------------------------- F2-03
const INICIO = `
<h1>Bem-vindo à Biblioteca Municipal</h1>
<p>Consulte o acervo, renove empréstimos e acompanhe suas reservas sem sair de casa.</p>
<form id="busca" class="secao" role="search" onsubmit="return false">
  <div class="br-input">
    <label for="termo">Buscar no acervo</label>
    <input id="termo" name="termo" type="search">
  </div>
  <button class="br-button primary mt-2" type="submit">Buscar</button>
</form>
<div class="secao">
  <h2>Novidades da semana</h2>
  <ul>
    <li>Torto arado, de Itamar Vieira Junior</li>
    <li>O avesso da pele, de Jeferson Tenório</li>
    <li>Tudo é rio, de Carla Madeira</li>
  </ul>
</div>`;

const F2_03_D = pagina({
  titulo: "Início – Biblioteca Municipal",
  cabecalho: cabecalhoPadrao({ logo: "", info: "", menu: GATILHO_MENU, acoes: ACAO_BUSCA }),
  corpo: INICIO,
  depoisDoRodape: menuPrincipal(),
  script: scriptMenu(),
});

const TITULO_HEADER = `        <div class="header-info">
          <div class="header-title">Biblioteca Municipal</div>
        </div>
`;

// ---------------------------------------------------------------- F2-06
const F2_06_JS_D = `(function () {
  class BibTexto extends HTMLElement {
    constructor() {
      super();
      const raiz = this.attachShadow({ mode: 'closed' });
      raiz.innerHTML = '<span class="message-body"></span>';
    }
  }
  customElements.define('bib-texto', BibTexto);
})();
`;

function f2_06(js) {
  return pagina({
    titulo: "Horários e avisos – Biblioteca Municipal",
    corpo: `
<h1>Horários e avisos</h1>
<div class="br-message info" id="aviso-horario">
  <div class="icon"><i class="fas fa-info-circle fa-lg" aria-hidden="true"></i></div>
  <div class="content"><bib-texto></bib-texto></div>
</div>
<div class="secao">
  <h2>Horário de funcionamento</h2>
  <p>Terça a sexta, das 9h às 18h. Sábado, das 9h às 13h.</p>
  <h2>Endereço</h2>
  <p>Rua das Acácias, 120 – Centro, Santa Aurora.</p>
</div>`,
    scriptExterno: js,
  });
}

// ---------------------------------------------------------------- F2-07
const F2_07_D = pagina({
  titulo: "Minha conta – Biblioteca Municipal",
  corpo: `
<h1>Minha conta</h1>
<div class="br-message info" id="m1">
  <div class="icon"><i class="fas fa-info-circle fa-lg" aria-hidden="true"></i></div>
  <div class="content"><span class="message-body">Você tem 3 empréstimos ativos.</span></div>
</div>
<div class="br-message warning" id="m2">
  <div class="icon"><i class="fas fa-exclamation-triangle fa-lg" aria-hidden="true"></i></div>
  <div class="content"><span class="message-body">A devolução de Dom Casmurro vence em 18/10/2026.</span></div>
</div>
<div class="br-message success" id="m3">
  <div class="icon"><i class="fas fa-check-circle fa-lg" aria-hidden="true"></i></div>
  <div class="content"><span class="message-body"></span></div>
</div>
<div class="secao">
  <h2>Empréstimos</h2>
  ${lista(() => "")}
</div>`,
});

// ---------------------------------------------------------------- F2-08
const ULTIMO_SPAN = `    <li class="crumb" data-active="active"><i class="icon fas fa-chevron-right" aria-hidden="true"></i><span aria-current="page">Renovar empréstimo</span></li>\n`;
const F2_08_C = pagina({
  titulo: "Renovar empréstimo – Biblioteca Municipal",
  corpo: `
<nav class="br-breadcrumb" aria-label="Você está aqui">
  <ol class="crumb-list">
    <li class="crumb home"><a class="br-button circle" href="#"><span class="sr-only">Início</span><i class="fas fa-home" aria-hidden="true"></i></a></li>
    <li class="crumb"><i class="icon fas fa-chevron-right" aria-hidden="true"></i><a href="#">Acervo</a></li>
    <li class="crumb"><i class="icon fas fa-chevron-right" aria-hidden="true"></i><a href="#">Empréstimos</a></li>
${ULTIMO_SPAN}  </ol>
</nav>
<h1>Renovar empréstimo</h1>
<p><strong>Dom Casmurro</strong>, de Machado de Assis. Devolução atual: 18/10/2026. Nova data, se renovado: 01/11/2026.</p>
<div class="acoes">
  <button class="br-button primary" type="button">Renovar</button>
  <a class="br-button secondary" href="#">Voltar</a>
</div>`,
});

// ---------------------------------------------------------------- F2-09
function f2_09(rodapeModal) {
  return pagina({
    titulo: "Empréstimos – Biblioteca Municipal",
    corpo: `
<h1>Empréstimos</h1>
<p>O prazo padrão de empréstimo é de 14 dias. Leitores com cartão ativo podem ter até 5 livros ao mesmo tempo.</p>
<button class="br-button secondary" type="button" id="ver-regras">Ver regras de empréstimo</button>
<div class="secao">
  <h2>Seus empréstimos</h2>
  ${lista(() => "")}
</div>`,
    script: `(function () {
  const abrir = document.getElementById('ver-regras');
  let origem = null;
  let scrim = null;
  function fecharJanela() {
    scrim.remove();
    scrim = null;
    origem.focus();
  }
  abrir.addEventListener('click', () => {
    origem = document.activeElement;
    scrim = document.createElement('div');
    scrim.className = 'br-scrim-util foco active';
    scrim.innerHTML = '<div class="br-modal medium" id="regras" role="dialog" aria-modal="true" aria-labelledby="regras-titulo" data-tipo="informativa">' +
      '<div class="br-modal-header"><div class="modal-title" id="regras-titulo">Regras de empréstimo</div>' +
      '<button class="br-button close circle" type="button" aria-label="Fechar"><i class="fas fa-times" aria-hidden="true"></i></button></div>' +
      '<div class="br-modal-body"><ul><li>Prazo de 14 dias para cada livro.</li><li>Até duas renovações, se não houver reserva.</li><li>Multa de R$ 0,50 por dia de atraso.</li></ul></div>' +
${rodapeModal}      '</div>';
    document.body.appendChild(scrim);
    const janela = scrim.querySelector('.br-modal');
    const fechar = janela.querySelector('.close');
    janela.querySelectorAll('.close, .br-modal-footer .br-button').forEach((b) => b.addEventListener('click', fecharJanela));
    janela.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharJanela();
      if (e.key === 'Tab') {
        const lista = Array.from(janela.querySelectorAll('button'));
        const primeiro = lista[0];
        const ultimo = lista[lista.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    });
    fechar.focus();
  });
})();`,
  });
}

const ABRIR_REGRAS = [
  { acao: "capturar", nome: "inicial" },
  { acao: "focar", alvo: "#ver-regras" },
  { acao: "tecla", tecla: "Enter" },
  { acao: "capturar", nome: "modal-aberta" },
];

const visivel = (sel) => `(() => { const el = document.querySelector('${sel}'); return !!el && el.getBoundingClientRect().height > 0; })()`;

export const casos = [
  {
    caso: "F2-01",
    receita: [{ acao: "clicar", alvo: "#renovar-1" }, { acao: "capturar", nome: "apos-renovar" }],
    gemeos: [
      {
        id: "F2-01-D",
        html: F2_01_D,
        fatos: {
          "apos-renovar": [
            dom(visivel("#aviso-renovacao"), "igual", true, "raiz .br-message exibida"),
            dom("document.querySelector('#aviso-renovacao .content').textContent.trim()", "igual", "", "parte 'Mensagem' sem texto"),
            dom("!!document.querySelector('#aviso-renovacao .icon i') && !!document.querySelector('#aviso-renovacao .close button')", "igual", true, "ícone e fechar presentes"),
            dom("document.querySelector('#aviso-renovacao .message-title')", "igual", null, "título (opcional) ausente"),
          ],
        },
      },
      {
        id: "F2-01-C",
        de: "F2-01-D",
        mudanca: "acrescenta só o texto",
        trocas: [['<div class="content" role="alert"></div>', '<div class="content" role="alert"><span class="message-body">Não foi possível renovar o empréstimo.</span></div>']],
        fatos: {
          "apos-renovar": [
            dom(visivel("#aviso-renovacao .content .message-body"), "igual", true),
            dom("document.querySelector('#aviso-renovacao .content').innerText.trim()", "igual", "Não foi possível renovar o empréstimo."),
            dom("document.querySelector('#aviso-renovacao .message-title')", "igual", null),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-03",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F2-03-D",
        html: F2_03_D,
        fatos: {
          inicial: [
            dom("!!document.querySelector('.br-header')", "igual", true),
            dom("document.querySelector('.br-header .header-title')", "igual", null, "sem título"),
            dom("document.querySelectorAll('.br-header img').length", "igual", 0, "sem logo"),
            dom("!!document.getElementById('abrir-menu') && !!document.querySelector('.br-header a[href=\"#busca\"]')", "igual", true, "só menu e busca"),
          ],
        },
      },
      {
        id: "F2-03-C",
        de: "F2-03-D",
        mudanca: "acrescenta só o título",
        trocas: [depois(GATILHO_MENU, TITULO_HEADER)],
        fatos: { inicial: [dom("document.querySelector('.br-header .header-title').innerText.trim()", "igual", "Biblioteca Municipal")] },
      },
      {
        id: "F2-03-X",
        de: "F2-03-D",
        mudanca: "logo (img com alt) no lugar do título",
        trocas: [
          [
            '    <div class="header-top">\n',
            `    <div class="header-top">\n      <div class="header-logo"><img src="${RECURSOS}/logo.svg" alt="Biblioteca Municipal" width="40" height="40"></div>\n`,
          ],
        ],
        fatos: {
          inicial: [
            dom("document.querySelector('.br-header .header-title')", "igual", null),
            dom("document.querySelector('.br-header .header-logo img').getAttribute('alt')", "igual", "Biblioteca Municipal"),
            dom(visivel(".br-header .header-logo img"), "igual", true),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-06",
    receita: [{ acao: "capturar", nome: "inicial", soDom: true }],
    gemeos: [
      {
        id: "F2-06-D",
        html: f2_06("__JS__"),
        js: F2_06_JS_D,
        pacote: { tipo: "so-dom", nota: "pacote só com E-DOM; o texto da parte 'Mensagem' fica em raiz fechada" },
        fatos: {
          inicial: [
            dom("document.querySelector('bib-texto').shadowRoot", "igual", null, "raiz fechada: o DOM serializado não alcança a parte"),
            dom("document.getElementById('aviso-horario').textContent.trim()", "igual", "", "o DOM leve não traz texto"),
            ax("bib-texto >>> .message-body", "textoProfundo", "igual", "", "verdade (CDP, fora do pacote): sem texto"),
          ],
        },
      },
      {
        id: "F2-06-C",
        de: "F2-06-D",
        mudanca: "o componente fechado passa a ter texto",
        trocasJs: [["'<span class=\"message-body\"></span>'", "'<span class=\"message-body\">Na Semana do Livro, de 20 a 24 de outubro, a biblioteca abre às 8h.</span>'"]],
        pacote: { tipo: "so-dom", nota: "pacote só com E-DOM; o texto existe, mas em raiz fechada" },
        fatos: {
          inicial: [
            dom("document.querySelector('bib-texto').shadowRoot", "igual", null),
            dom("document.getElementById('aviso-horario').textContent.trim()", "igual", ""),
            ax("bib-texto >>> .message-body", "textoProfundo", "igual", "Na Semana do Livro, de 20 a 24 de outubro, a biblioteca abre às 8h.", "verdade (CDP, fora do pacote)"),
            dom("document.querySelector('#aviso-horario .content').getBoundingClientRect().height > 0", "igual", true),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-07",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F2-07-D",
        html: F2_07_D,
        fatos: {
          inicial: [
            dom("document.querySelectorAll('.br-message').length", "igual", 3),
            dom("document.querySelector('#m1 .content').innerText.trim().length > 0", "igual", true),
            dom("document.querySelector('#m2 .content').innerText.trim().length > 0", "igual", true),
            dom("document.querySelector('#m3 .content').textContent.trim()", "igual", ""),
          ],
        },
      },
      {
        id: "F2-07-C",
        de: "F2-07-D",
        mudanca: "muda só #m3 (recebe texto)",
        trocas: [
          [
            '<div class="content"><span class="message-body"></span></div>',
            '<div class="content"><span class="message-body">Sua reserva de O cortiço está disponível para retirada até 22/10/2026.</span></div>',
          ],
        ],
        fatos: {
          inicial: [
            dom("document.querySelector('#m1 .content').innerText.trim().length > 0", "igual", true),
            dom("document.querySelector('#m2 .content').innerText.trim().length > 0", "igual", true),
            dom("document.querySelector('#m3 .content').innerText.trim().length > 0", "igual", true),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-08",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F2-08-D",
        de: "F2-08-C",
        mudanca: "sem o item da página atual",
        trocas: [[ULTIMO_SPAN, ""]],
        fatos: {
          inicial: [
            dom("document.querySelector('.br-breadcrumb li:last-child').innerText.trim()", "igual", "Empréstimos"),
            dom("Array.from(document.querySelectorAll('.br-breadcrumb li')).every((li) => !!li.querySelector('a'))", "igual", true, "todos os itens são links"),
            dom("document.querySelector('h1').innerText.trim()", "igual", "Renovar empréstimo", "a página atual é Renovar empréstimo"),
            ax(".br-breadcrumb li:last-child a", "papel", "igual", "link"),
          ],
        },
      },
      {
        id: "F2-08-L",
        de: "F2-08-C",
        mudanca: "último item como link para a própria página",
        trocas: [['<span aria-current="page">Renovar empréstimo</span>', '<a href="#">Renovar empréstimo</a>']],
        fatos: {
          inicial: [
            dom("document.querySelector('.br-breadcrumb li:last-child').innerText.trim()", "igual", "Renovar empréstimo"),
            ax(".br-breadcrumb li:last-child a", "papel", "igual", "link"),
          ],
        },
      },
      {
        id: "F2-08-C",
        html: F2_08_C,
        fatos: {
          inicial: [
            dom("document.querySelector('.br-breadcrumb li:last-child').innerText.trim()", "igual", "Renovar empréstimo"),
            dom("document.querySelector('.br-breadcrumb li:last-child a')", "igual", null, "último item não é link"),
            ax(".br-breadcrumb li:last-child span", "papel", "em", ["generic", "StaticText", "none"]),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-09",
    receita: ABRIR_REGRAS,
    gemeos: [
      {
        id: "F2-09-D",
        html: f2_09(""),
        fatos: {
          inicial: [dom("document.getElementById('regras')", "igual", null, "a modal só existe depois de abrir")],
          "modal-aberta": [
            dom(visivel("#regras"), "igual", true),
            dom("document.querySelectorAll('#regras .br-modal-footer button').length", "igual", 0, "sem botões de ação"),
            dom("document.querySelectorAll('#regras button').length", "igual", 1, "só o X"),
            dom("document.querySelector('#regras .br-modal-body').innerText.trim().length > 0", "igual", true, "conteúdo presente"),
            foco("#regras .close"),
          ],
        },
      },
      {
        id: "F2-09-C",
        de: "F2-09-D",
        mudanca: "acrescenta só o botão 'Entendi'",
        trocas: [
          depois(
            "'<div class=\"br-modal-body\"><ul><li>Prazo de 14 dias para cada livro.</li><li>Até duas renovações, se não houver reserva.</li><li>Multa de R$ 0,50 por dia de atraso.</li></ul></div>' +\n",
            "      '<div class=\"br-modal-footer justify-content-end\"><button class=\"br-button primary\" type=\"button\">Entendi</button></div>' +\n",
          ),
        ],
        fatos: {
          "modal-aberta": [
            dom("Array.from(document.querySelectorAll('#regras .br-modal-footer button')).map((b) => b.innerText.trim()).join('|')", "igual", "Entendi"),
            foco("#regras .close"),
          ],
        },
      },
      {
        id: "F2-09-V",
        mesmaPagina: "F2-09-D",
        pacote: { tipo: "estado-diferente", declarado: "modal-aberta", entregue: "inicial", nota: "evidência do estado inicial: a modal ainda não existe" },
        fatos: {
          inicial: [dom("document.getElementById('regras')", "igual", null)],
          "modal-aberta": [dom("document.querySelectorAll('#regras .br-modal-footer button').length", "igual", 0)],
        },
      },
    ],
  },
];
