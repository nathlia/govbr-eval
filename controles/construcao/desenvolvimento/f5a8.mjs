// F5 a F8 e T (casos de desenvolvimento).
import { pagina, cabecalhoPadrao, campo, itemEmprestimo, LIVROS, RECURSOS } from "../comum.mjs";
import { ax, dom, foco, recortes, depois } from "../dsl.mjs";

/** A fonte do aviso está na escala Minor Third a partir da base medida no body (tolerância 0,05px). */
const ESCALA =
  "(() => { const base = parseFloat(getComputedStyle(document.body).fontSize); const v = parseFloat(getComputedStyle(document.querySelector('p.aviso-prazo')).fontSize); const n = Math.round(Math.log(v / base) / Math.log(1.2)); return Math.abs(base * Math.pow(1.2, n) - v) <= 0.05; })()";

// ================================================================ F5-02
const F5_02_D = pagina({
  titulo: "Dom Casmurro – Biblioteca Municipal",
  corpo: `
<h1>Dom Casmurro</h1>
<p>Machado de Assis · Romance · Exemplar 2 de 3</p>
<p>Devolução atual: 18/10/2026. Se renovar agora, a nova data será 01/11/2026.</p>
<div class="acoes">
  <button class="br-button primary" type="button" id="renovar" aria-label="Confirmar operação">Renovar</button>
  <a class="br-button secondary" href="#">Voltar</a>
</div>`,
});

// ================================================================ F5-03
const F5_03_D = pagina({
  titulo: "Buscar no acervo – Biblioteca Municipal",
  corpo: `
<h1>Buscar no acervo</h1>
<p>Pesquise pelo título. Para buscar por autor ou assunto, use a busca avançada.</p>
<form id="busca" role="search" onsubmit="return false">
  <div class="br-input mb-3">
    <input id="busca-titulo" name="busca-titulo" type="search" placeholder="Título do livro">
  </div>
  <button class="br-button primary" type="submit">Buscar</button>
</form>`,
});

// ================================================================ F5-05
const logoLink = (img, depoisImg = "") => `<a id="logo" href="#">${img}${depoisImg}</a>`;
const IMG_SEM_ALT = `<img src="${RECURSOS}/logo.svg" width="40" height="40">`;
function f5_05(logo) {
  return pagina({
    titulo: "Início – Biblioteca Municipal",
    cabecalho: cabecalhoPadrao({ logo }),
    corpo: `
<h1>Bem-vindo à Biblioteca Municipal</h1>
<p>Consulte o acervo, renove empréstimos e acompanhe suas reservas sem sair de casa.</p>
<div class="secao">
  <h2>Serviços</h2>
  <ul>
    <li><a href="#">Renovar empréstimos</a></li>
    <li><a href="#">Minhas reservas</a></li>
    <li><a href="#">Acervo digital</a></li>
  </ul>
</div>`,
  });
}

// ================================================================ F6-01 / T-01
export const DETALHE_EMPRESTIMO = `
<h1>Dom Casmurro</h1>
<p>Machado de Assis · Romance · Exemplar 2 de 3</p>
<p>Devolução atual: 18/10/2026. Antes de renovar, leia o <a href="#" id="link-regulamento">regulamento de empréstimos</a>.</p>
<div class="acoes acoes-emprestimo">
  <button class="br-button primary" type="button" id="renovar">Renovar empréstimo</button>
  <a href="#" class="voltar">Voltar para meus empréstimos</a>
</div>`;

export const ESTILO_SEM_ANEL = `.acoes-emprestimo .br-button:focus {
  outline: none;
}`;

export const RECEITA_FOCO_RENOVAR = [
  { acao: "focar", alvo: "#link-regulamento" },
  { acao: "recortar", nome: "sem-foco", alvo: "#renovar", margem: 10 },
  { acao: "tecla", tecla: "Tab" },
  { acao: "recortar", nome: "com-foco", alvo: "#renovar", margem: 10 },
  { acao: "capturar", nome: "com-foco" },
];

const estiloFoco = (prop) => `getComputedStyle(document.getElementById('renovar')).${prop}`;

// ================================================================ F6-02 / F7-02
function paginaFiltros({ botaoAttrs = "", script }) {
  return pagina({
    titulo: "Resultados da busca – Biblioteca Municipal",
    corpo: `
<h1>Resultados para "Machado de Assis"</h1>
<p>12 títulos encontrados no acervo.</p>
<button class="br-button secondary" type="button" id="filtros"${botaoAttrs}><i class="fas fa-filter mr-1" aria-hidden="true"></i><span class="texto">Mostrar filtros</span></button>
<div class="painel-filtros" id="painel-filtros" hidden>
  <div class="br-checkbox"><input id="f-disponivel" name="f-disponivel" type="checkbox"><label for="f-disponivel">Disponível agora</label></div>
  <div class="br-checkbox"><input id="f-digital" name="f-digital" type="checkbox"><label for="f-digital">Livro digital</label></div>
</div>
<div class="secao">
  <div class="br-list lista-livros">
${[
  ["Dom Casmurro", "Romance, 1899"],
  ["Memórias póstumas de Brás Cubas", "Romance, 1881"],
  ["Quincas Borba", "Romance, 1891"],
]
  .map(([t, d]) => `    <div class="br-item"><p class="titulo-livro mb-0">${t}</p><p class="detalhe-livro mb-0">${d}</p></div>`)
  .join("\n")}
  </div>
</div>`,
    script,
  });
}

const SCRIPT_FILTROS = `const botao = document.getElementById('filtros');
const painel = document.getElementById('painel-filtros');
botao.addEventListener('click', () => {
  painel.hidden = !painel.hidden;
});`;

const SCRIPT_FILTROS_EXPANDIDO = SCRIPT_FILTROS.replace("  painel.hidden = !painel.hidden;\n", "  painel.hidden = !painel.hidden;\n  botao.setAttribute('aria-expanded', String(!painel.hidden));\n");

const ALTERNAR = [
  { acao: "capturar", nome: "antes" },
  { acao: "clicar", alvo: "#filtros" },
  { acao: "capturar", nome: "depois" },
];

// ================================================================ F7-03
const F7_03_D = pagina({
  titulo: "Dados de contato – Biblioteca Municipal",
  corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Dados de contato</h1>
    <p>Usamos estes dados só para avisos de devolução e de reservas disponíveis.</p>
    <form id="form-contato" novalidate>
<div class="br-input mb-3">
  <label for="email" id="rotulo-email">E-mail</label>
  <input id="email" name="email" type="email" autocomplete="email">
</div>
<div class="br-input mb-3">
  <label id="rotulo-telefone">Telefone</label>
  <input id="telefone" name="telefone" type="tel" autocomplete="tel" aria-labelledby="rotulo-email">
</div>
      <button class="br-button primary" type="button">Salvar</button>
    </form>
  </div>
</div>`,
});

// ================================================================ F8-03
function f8_03(estilo) {
  return pagina({
    titulo: "Meus empréstimos – Biblioteca Municipal",
    estilo,
    corpo: `
<h1>Meus empréstimos</h1>
<p class="aviso-prazo">Devolva ou renove até a data indicada para evitar multa de R$ 0,50 por dia de atraso.</p>
<div class="br-list lista-livros">
${LIVROS.map((l) => itemEmprestimo(l)).join("\n")}
</div>`,
  });
}

// ================================================================ F8-04
function f8_04(estilo) {
  return pagina({
    titulo: "Meus empréstimos – Biblioteca Municipal",
    estilo,
    corpo: `
<h1>Meus empréstimos</h1>
<div class="row">
${LIVROS.map(
  (l) => `  <div class="col-md-4 mb-3">
    <div class="cartao-emprestimo">
      <p class="titulo-livro mb-1">${l.titulo}</p>
      <p class="mb-0">${l.autor}<br>Devolução até ${l.prazo}</p>
    </div>
  </div>`,
).join("\n")}
</div>`,
  });
}
const CARTAO_BORDA = `.cartao-emprestimo {
  border: 1px solid var(--border-color);
  border-radius: var(--surface-rounder-md);
  height: 100%;
  padding: 13px;
}`;

// ================================================================ T-01
const T_01 = pagina({
  titulo: "Dom Casmurro – Biblioteca Municipal",
  estilo: ESTILO_SEM_ANEL,
  corpo: `${DETALHE_EMPRESTIMO}
<div class="secao">
  <h2>Sua reserva para este título</h2>
  <div class="br-list lista-livros">
    <div class="br-item">
      <div class="row align-items-center">
        <div class="col"><p class="titulo-livro mb-0">Dom Casmurro – edição ilustrada</p><p class="detalhe-livro mb-0">Reserva feita em 10/10/2026 · posição 2 na fila</p></div>
        <div class="col-auto"><button class="br-button circle" type="button" id="excluir"><i class="fas fa-trash" aria-hidden="true"></i></button></div>
      </div>
    </div>
  </div>
</div>`,
});

export const casos = [
  {
    caso: "F5-02",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F5-02-D",
        html: F5_02_D,
        fatos: {
          inicial: [
            dom("document.getElementById('renovar').innerText.trim()", "igual", "Renovar", "rótulo visível"),
            ax("#renovar", "nome", "igual", "Confirmar operação"),
            ax("#renovar", "nome", "naoContem", "Renovar"),
          ],
        },
      },
      {
        id: "F5-02-C",
        de: "F5-02-D",
        mudanca: "muda só o aria-label",
        trocas: [['aria-label="Confirmar operação"', 'aria-label="Renovar empréstimo"']],
        fatos: { inicial: [dom("document.getElementById('renovar').innerText.trim()", "igual", "Renovar"), ax("#renovar", "nome", "igual", "Renovar empréstimo")] },
      },
    ],
  },
  {
    caso: "F5-03",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F5-03-D",
        html: F5_03_D,
        fatos: {
          inicial: [
            dom("document.getElementById('busca-titulo').labels.length", "igual", 0, "sem LABEL associado"),
            dom("document.getElementById('busca-titulo').hasAttribute('aria-labelledby') || document.getElementById('busca-titulo').hasAttribute('aria-label')", "igual", false),
            ax("#busca-titulo", "nome", "igual", "Título do livro", "nome calculado vem do placeholder"),
          ],
        },
      },
      {
        id: "F5-03-C",
        de: "F5-03-D",
        mudanca: "acrescenta só o label for/id",
        trocas: [depois('  <div class="br-input mb-3">\n', '    <label for="busca-titulo">Título do livro</label>\n')],
        fatos: {
          inicial: [
            dom("document.getElementById('busca-titulo').labels.length", "igual", 1),
            dom("document.querySelector('label[for=\"busca-titulo\"]').innerText.trim()", "igual", "Título do livro"),
            ax("#busca-titulo", "nome", "igual", "Título do livro"),
          ],
        },
      },
      {
        id: "F5-03-Q",
        de: "F5-03-D",
        mudanca: "rótulo visível em span + aria-labelledby (sem LABEL)",
        trocas: [
          depois('  <div class="br-input mb-3">\n', '    <span class="rotulo" id="rotulo-busca">Título do livro</span>\n'),
          ['type="search" placeholder="Título do livro">', 'type="search" placeholder="Título do livro" aria-labelledby="rotulo-busca">'],
        ],
        fatos: {
          inicial: [
            dom("document.getElementById('busca-titulo').labels.length", "igual", 0),
            dom("document.getElementById('rotulo-busca').getBoundingClientRect().height > 0", "igual", true, "rótulo visível"),
            ax("#busca-titulo", "nome", "igual", "Título do livro"),
          ],
        },
      },
    ],
  },
  {
    caso: "F5-05",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F5-05-D",
        html: f5_05(logoLink(IMG_SEM_ALT)),
        axePermitido: ["image-alt", "link-name"],
        fatos: {
          inicial: [
            dom("document.querySelector('#logo img').hasAttribute('alt')", "igual", false),
            dom("document.getElementById('logo').innerText.trim()", "igual", "", "só a imagem dentro do link"),
            ax("#logo", "nome", "vazio"),
            ax("#logo", "papel", "igual", "link"),
          ],
        },
      },
      {
        id: "F5-05-C",
        de: "F5-05-D",
        mudanca: "acrescenta só o alt",
        trocas: [['<img src="../recursos/logo.svg" width="40" height="40">', '<img src="../recursos/logo.svg" width="40" height="40" alt="Biblioteca Municipal – página inicial">']],
        fatos: { inicial: [ax("#logo", "nome", "igual", "Biblioteca Municipal – página inicial")] },
      },
      {
        id: "F5-05-X",
        de: "F5-05-D",
        mudanca: "imagem decorativa (alt vazio) ao lado de texto no mesmo link",
        trocas: [['<img src="../recursos/logo.svg" width="40" height="40"></a>', '<img src="../recursos/logo.svg" width="40" height="40" alt=""><span class="ml-2">Biblioteca Municipal</span></a>']],
        fatos: { inicial: [dom("document.querySelector('#logo img').getAttribute('alt')", "igual", ""), ax("#logo", "nome", "igual", "Biblioteca Municipal")] },
      },
    ],
  },
  {
    caso: "F6-01",
    receita: RECEITA_FOCO_RENOVAR,
    gemeos: [
      {
        id: "F6-01-D",
        html: pagina({ titulo: "Dom Casmurro – Biblioteca Municipal", estilo: ESTILO_SEM_ANEL, corpo: DETALHE_EMPRESTIMO }),
        fatos: {
          "com-foco": [
            foco("#renovar"),
            dom("document.getElementById('renovar').matches(':focus-visible')", "igual", true, "foco de teclado"),
            dom(estiloFoco("outlineStyle"), "igual", "none"),
            dom(estiloFoco("boxShadow"), "igual", "none"),
            recortes("sem-foco", "com-foco", true, "nenhuma diferença visual no foco por teclado"),
          ],
        },
      },
      {
        id: "F6-01-C",
        de: "F6-01-D",
        mudanca: "acrescenta só o box-shadow",
        trocas: [["  outline: none;\n}", "  outline: none;\n  box-shadow: 0 0 0 4px var(--focus);\n}"]],
        fatos: {
          "com-foco": [foco("#renovar"), dom(estiloFoco("outlineStyle"), "igual", "none"), dom(estiloFoco("boxShadow"), "diferente", "none"), recortes("sem-foco", "com-foco", false)],
        },
      },
      {
        id: "F6-01-X",
        de: "F6-01-D",
        mudanca: "esconde o anel só no foco que não é de teclado",
        trocas: [[".acoes-emprestimo .br-button:focus {", ".acoes-emprestimo .br-button:focus:not(:focus-visible) {"]],
        fatos: { "com-foco": [foco("#renovar"), dom(estiloFoco("outlineStyle"), "diferente", "none"), recortes("sem-foco", "com-foco", false)] },
      },
    ],
  },
  {
    caso: "F6-02",
    receita: ALTERNAR,
    gemeos: [
      {
        id: "F6-02-D",
        html: paginaFiltros({ script: SCRIPT_FILTROS }),
        fatos: {
          antes: [ax("#filtros", "nome", "igual", "Mostrar filtros"), ax("#filtros", "expandido", "ausente"), ax("#filtros", "pressionado", "ausente"), dom("document.getElementById('painel-filtros').hidden", "igual", true)],
          depois: [ax("#filtros", "nome", "igual", "Mostrar filtros"), ax("#filtros", "expandido", "ausente"), ax("#filtros", "pressionado", "ausente"), dom("document.getElementById('painel-filtros').hidden", "igual", false, "o painel abriu")],
        },
      },
      {
        id: "F6-02-C",
        de: "F6-02-D",
        mudanca: "acrescenta só aria-expanded",
        trocas: [
          ['type="button" id="filtros">', 'type="button" id="filtros" aria-expanded="false">'],
          depois("  painel.hidden = !painel.hidden;\n", "  botao.setAttribute('aria-expanded', String(!painel.hidden));\n"),
        ],
        fatos: { antes: [ax("#filtros", "expandido", "igual", false)], depois: [ax("#filtros", "expandido", "igual", true), dom("document.getElementById('painel-filtros').hidden", "igual", false)] },
      },
      {
        id: "F6-02-X",
        de: "F6-02-D",
        mudanca: "sem ARIA; o rótulo alterna",
        trocas: [depois("  painel.hidden = !painel.hidden;\n", "  botao.querySelector('.texto').textContent = painel.hidden ? 'Mostrar filtros' : 'Ocultar filtros';\n")],
        fatos: { antes: [ax("#filtros", "nome", "igual", "Mostrar filtros")], depois: [ax("#filtros", "nome", "igual", "Ocultar filtros"), ax("#filtros", "expandido", "ausente")] },
      },
    ],
  },
  {
    caso: "F7-02",
    receita: ALTERNAR,
    gemeos: [
      {
        id: "F7-02-U",
        html: paginaFiltros({ botaoAttrs: ' aria-expanded="false" aria-controls="painel-filtro"', script: SCRIPT_FILTROS_EXPANDIDO }),
        fatos: {
          antes: [
            dom("document.getElementById(document.getElementById('filtros').getAttribute('aria-controls'))", "igual", null, "IDREF de aria-controls não resolve"),
            ax("#filtros", "expandido", "igual", false),
          ],
          depois: [
            dom("document.getElementById('painel-filtros').hidden", "igual", false, "painel aberto"),
            ax("#filtros", "controla", "vazio", undefined, "com o painel visível, a relação continua vazia"),
            ax("#filtros", "expandido", "igual", true),
          ],
        },
      },
      {
        id: "F7-02-C",
        de: "F7-02-U",
        mudanca: "corrige só o IDREF",
        trocas: [['aria-controls="painel-filtro"', 'aria-controls="painel-filtros"']],
        fatos: { antes: [ax("#filtros", "expandido", "igual", false)], depois: [ax("#filtros", "controla", "igual", ["painel-filtros"], "com o painel visível, a relação resolve"), ax("#filtros", "expandido", "igual", true)] },
      },
    ],
  },
  {
    caso: "F7-03",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F7-03-D",
        html: F7_03_D,
        fatos: {
          inicial: [
            ax("#email", "nome", "igual", "E-mail"),
            ax("#telefone", "nome", "igual", "E-mail", "o campo Telefone recebe o nome do rótulo E-mail"),
            dom("document.getElementById('telefone').labels.length", "igual", 0),
            dom("document.getElementById('telefone').closest('.br-input').querySelector('label').innerText.trim()", "igual", "Telefone", "rótulo visível junto do campo"),
          ],
        },
      },
      {
        id: "F7-03-C",
        de: "F7-03-D",
        mudanca: "corrige só a associação de #telefone",
        trocas: [
          ['<label id="rotulo-telefone">Telefone</label>', '<label for="telefone" id="rotulo-telefone">Telefone</label>'],
          [' autocomplete="tel" aria-labelledby="rotulo-email">', ' autocomplete="tel">'],
        ],
        fatos: { inicial: [ax("#email", "nome", "igual", "E-mail"), ax("#telefone", "nome", "igual", "Telefone"), dom("document.getElementById('telefone').labels.length", "igual", 1)] },
      },
    ],
  },
  {
    caso: "F8-03",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F8-03-D",
        html: f8_03(".aviso-prazo {\n  font-size: 15px;\n}"),
        fatos: {
          inicial: [
            dom("getComputedStyle(document.body).fontSize", "igual", "14px", "base"),
            dom("getComputedStyle(document.querySelector('p.aviso-prazo')).fontSize", "igual", "15px"),
            dom(ESCALA, "igual", false, "15 ≠ 14 × 1,2^n"),
          ],
        },
      },
      {
        id: "F8-03-C",
        de: "F8-03-D",
        mudanca: "troca só o valor (token da escala)",
        trocas: [["  font-size: 15px;\n", "  font-size: var(--font-size-scale-up-01);\n"]],
        fatos: { inicial: [dom("getComputedStyle(document.querySelector('p.aviso-prazo')).fontSize", "igual", "16.8px"), dom(ESCALA, "igual", true)] },
      },
      {
        id: "F8-03-X",
        de: "F8-03-D",
        mudanca: "base 15px no html/body e o aviso em 18px (15 × 1,2)",
        trocas: [[".aviso-prazo {\n  font-size: 15px;\n}", "html,\nbody {\n  font-size: 15px;\n}\n\n.aviso-prazo {\n  font-size: 18px;\n}"]],
        fatos: {
          inicial: [
            dom("getComputedStyle(document.documentElement).fontSize", "igual", "15px"),
            dom("getComputedStyle(document.body).fontSize", "igual", "15px"),
            dom("getComputedStyle(document.querySelector('p.aviso-prazo')).fontSize", "igual", "18px"),
            dom(ESCALA, "igual", true),
          ],
        },
      },
    ],
  },
  {
    caso: "F8-04",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F8-04-U",
        html: f8_04(CARTAO_BORDA),
        fatos: { inicial: [dom("getComputedStyle(document.querySelector('.cartao-emprestimo')).paddingTop", "igual", "13px")] },
      },
      {
        id: "F8-04-C",
        de: "F8-04-U",
        mudanca: "troca só o valor (token de espaçamento)",
        trocas: [["  padding: 13px;\n", "  padding: var(--spacing-scale-2x);\n"]],
        fatos: { inicial: [dom("getComputedStyle(document.querySelector('.cartao-emprestimo')).paddingTop", "igual", "16px")] },
      },
    ],
  },
  {
    caso: "T-01",
    receita: RECEITA_FOCO_RENOVAR,
    nota: "Desvio registrado: o F5-01-D é da reserva; para não expor a reserva ao desenvolvimento, T-01 usa uma página própria com os dois sujeitos (o anel removido como em F6-01-D e o botão-ícone sem nome).",
    gemeos: [
      {
        id: "T-01-P",
        html: T_01,
        axePermitido: ["button-name"],
        pacote: { tipo: "proveniencia", origem: "pagina" },
        fatos: {
          "com-foco": [foco("#renovar"), dom(estiloFoco("outlineStyle"), "igual", "none"), dom(estiloFoco("boxShadow"), "igual", "none"), recortes("sem-foco", "com-foco", true), ax("#excluir", "nome", "vazio"), ax("#excluir", "papel", "igual", "button")],
        },
      },
      {
        id: "T-01-S",
        mesmaPagina: "T-01-P",
        axePermitido: ["button-name"],
        pacote: { tipo: "proveniencia", origem: "ds-entregue", nota: "mesmo pacote de T-01-P; só o campo E-PROV muda" },
        fatos: {
          "com-foco": [foco("#renovar"), dom(estiloFoco("outlineStyle"), "igual", "none"), dom(estiloFoco("boxShadow"), "igual", "none"), recortes("sem-foco", "com-foco", true), ax("#excluir", "nome", "vazio"), ax("#excluir", "papel", "igual", "button")],
        },
      },
    ],
  },
];
