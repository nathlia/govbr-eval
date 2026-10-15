// RESERVA (19 casos, divisão fixada no catálogo: semente nat85-nat77-catalogo-controles-2026-10-15,
// manifesto sha256 0bc712ec…). Nenhum detector roda nestas páginas antes de ser congelado (catálogo §5).
// Este arquivo só pode importar do desenvolvimento; o desenvolvimento nunca importa daqui.
import { pagina, cabecalhoPadrao, campo, modal, scriptModal, itemEmprestimo, LIVROS, GATILHO_MENU, menuPrincipal, scriptMenu, RECURSOS, SALTO } from "../../construcao/comum.mjs";
import { ax, dom, foco, depois } from "../../construcao/dsl.mjs";
import { paginaCartao, SCRIPT_CARTAO } from "../../construcao/desenvolvimento/f1.mjs";

const ENVIAR_12 = [
  { acao: "preencher", alvo: "#cartao", valor: "12" },
  { acao: "capturar", nome: "antes-de-enviar" },
  { acao: "clicar", alvo: "#form-renovacao button[type=submit]" },
  { acao: "capturar", nome: "apos-enviar" },
];
const MSG = "(document.getElementById('cartao-erro') || {}).textContent";
const aberta = (id) => dom(`(() => { const el = document.getElementById('${id}'); return !!el && el.getBoundingClientRect().height > 0; })()`, "igual", true, "diálogo aberto");
const lista = () => `<div class="br-list lista-livros">\n${LIVROS.map((l) => itemEmprestimo(l)).join("\n")}\n</div>`;

// ================================================================ F1-02
const SCRIPT_F1_02_A = SCRIPT_CARTAO.replace(
  "  caixa.classList.remove('danger');\n",
  "  caixa.classList.remove('danger');\n  campo.removeAttribute('aria-invalid');\n  campo.removeAttribute('aria-errormessage');\n",
).replace("    caixa.appendChild(mensagem);\n", "    caixa.appendChild(mensagem);\n    campo.setAttribute('aria-invalid', 'true');\n    campo.setAttribute('aria-errormessage', 'cartao-erro');\n");

// ================================================================ F1-04 / F1-05
function scriptBibCampo(modo, mensagemDentro) {
  return `(function () {
  const raizes = new WeakMap();
  class BibCampo extends HTMLElement {
    constructor() {
      super();
      const raiz = this.attachShadow({ mode: '${modo}' });
      raizes.set(this, raiz);
      raiz.innerHTML = '<link rel="stylesheet" href="${RECURSOS}/core.min.css"><link rel="stylesheet" href="${RECURSOS}/fontawesome/css/all.min.css">' +
        '<div class="br-input"><label for="campo">Número do cartão</label><input id="campo" name="cartao" type="text" inputmode="numeric" autocomplete="off"></div>';
    }
    get valor() {
      return raizes.get(this).getElementById('campo').value;
    }
    limpar() {
      const raiz = raizes.get(this);
      const anterior = ${mensagemDentro ? "raiz.getElementById('cartao-erro')" : "document.getElementById('cartao-erro')"};
      if (anterior) anterior.remove();
      raiz.querySelector('.br-input').classList.remove('danger');
      raiz.getElementById('campo').removeAttribute('aria-describedby');
    }
    mostrarErro(texto) {
      const raiz = raizes.get(this);
      const caixa = raiz.querySelector('.br-input');
      caixa.classList.add('danger');
      const mensagem = document.createElement('span');
      mensagem.className = 'feedback danger';
      mensagem.id = 'cartao-erro';
      mensagem.innerHTML = '<i class="fas fa-times-circle" aria-hidden="true"></i>' + texto;
      ${mensagemDentro ? "caixa.appendChild(mensagem);" : "this.insertAdjacentElement('afterend', mensagem);"}
      raiz.getElementById('campo').setAttribute('aria-describedby', 'cartao-erro');
    }
  }
  customElements.define('bib-campo', BibCampo);
  const formulario = document.getElementById('form-renovacao');
  const entrada = formulario.querySelector('bib-campo');
  const resultado = document.getElementById('resultado');
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    entrada.limpar();
    resultado.textContent = '';
    if (!/^\\d{8}$/.test(entrada.valor.trim())) {
      entrada.mostrarErro('Valor inválido.');
      return;
    }
    resultado.textContent = 'Cartão encontrado. Você tem 2 livros que podem ser renovados.';
  });
})();
`;
}

function paginaBibCampo({ script = "", scriptExterno = "" }) {
  return pagina({
    titulo: "Renovar empréstimos – Biblioteca Municipal",
    corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Renovar empréstimos</h1>
    <p>Informe o número do seu cartão da biblioteca para ver os livros que podem ser renovados.</p>
    <form id="form-renovacao" novalidate>
      <bib-campo class="d-block mb-3"></bib-campo>
      <button class="br-button primary" type="submit">Consultar empréstimos</button>
    </form>
    <div id="resultado" class="mt-4" role="status"></div>
  </div>
</div>`,
    script,
    scriptExterno,
  });
}

const ENVIAR_12_BIB = [
  { acao: "preencher", alvo: "bib-campo >>> #campo", valor: "12" },
  { acao: "clicar", alvo: "#form-renovacao button[type=submit]" },
  { acao: "capturar", nome: "apos-enviar" },
];

// ================================================================ F2-02
const F2_02_N = pagina({
  titulo: "Avisos – Biblioteca Municipal",
  corpo: `
<h1>Avisos</h1>
<div class="br-message info" id="info">
  <div class="content">A biblioteca estará fechada em 2 de novembro, feriado de Finados.</div>
</div>
<p>Leitores com livros em atraso têm o empréstimo bloqueado até a regularização.</p>
<button class="br-button secondary" type="button" id="ver-aviso">Ver aviso sobre multas</button>`,
  depoisDoRodape: modal({
    id: "alerta",
    titulo: "",
    fechar: false,
    nome: "Aviso sobre multas",
    corpo: `      <p>A partir de 1º de novembro, a multa por atraso passa a ser de R$ 0,60 por dia, por livro.</p>`,
    botoes: `      <button class="br-button primary" type="button">Entendi</button>`,
    tipo: "alerta",
    tamanho: "small",
  }),
  script: scriptModal({ id: "alerta", invocador: "ver-aviso", foco: ".br-modal-footer .primary", botaoFecha: ".br-modal-footer .br-button" }),
});

// ================================================================ F2-04
const resultadoBusca = [
  ["A hora da estrela", "Romance, 1977"],
  ["Laços de família", "Contos, 1960"],
  ["Perto do coração selvagem", "Romance, 1943"],
  ["A paixão segundo G.H.", "Romance, 1964"],
  ["Felicidade clandestina", "Contos, 1971"],
];
const SETA_ANTERIOR = `    <li><button class="br-button circle" type="button" data-previous-page="data-previous-page" aria-label="Página anterior" disabled><i class="fas fa-angle-left" aria-hidden="true"></i></button></li>\n`;
const SETA_PROXIMA = `    <li><button class="br-button circle" type="button" data-next-page="data-next-page" aria-label="Próxima página"><i class="fas fa-angle-right" aria-hidden="true"></i></button></li>\n`;
const IDENTIFICADORES = `    <li><a class="page active" href="#" aria-label="Página 1" aria-current="page">1</a></li>
    <li><a class="page" href="#" aria-label="Página 2">2</a></li>
    <li><a class="page" href="#" aria-label="Página 3">3</a></li>
`;
const F2_04_C = pagina({
  titulo: "Resultados da busca – Biblioteca Municipal",
  corpo: `
<h1>Resultados para "Clarice Lispector"</h1>
<p>14 títulos encontrados. Mostrando 1 a 5.</p>
<div class="br-list lista-livros">
${resultadoBusca.map(([t, d]) => `  <div class="br-item"><p class="titulo-livro mb-0">${t}</p><p class="detalhe-livro mb-0">${d}</p></div>`).join("\n")}
</div>
<nav class="br-pagination mt-3" aria-label="Paginação dos resultados" data-total="3" data-current="1">
  <ul>
${SETA_ANTERIOR}${IDENTIFICADORES}${SETA_PROXIMA}  </ul>
</nav>`,
});
const contagem = (setas, paginas) => [
  dom("document.querySelectorAll('.br-pagination [data-previous-page], .br-pagination [data-next-page]').length", "igual", setas, "setas de navegação"),
  dom("document.querySelectorAll('.br-pagination .page').length", "igual", paginas, "identificadores de páginas"),
];

// ================================================================ F2-05
const F2_05_N = pagina({
  titulo: "Início – Biblioteca Municipal",
  estilo: `.topo {
  align-items: center;
  background: var(--background);
  box-shadow: var(--surface-shadow-sm);
  display: flex;
  padding: var(--spacing-scale-2x) var(--spacing-scale-3x);
}`,
  cabecalho: `<div class="topo">
  <button class="br-button small circle" type="button" id="abrir-menu" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu-principal"><i class="fas fa-bars" aria-hidden="true"></i></button>
</div>`,
  corpo: `
<h1>Bem-vindo à Biblioteca Municipal</h1>
<p>Consulte o acervo, renove empréstimos e acompanhe suas reservas sem sair de casa.</p>
<ul>
  <li><a href="#">Renovar empréstimos</a></li>
  <li><a href="#">Minhas reservas</a></li>
</ul>`,
  depoisDoRodape: menuPrincipal(),
  script: scriptMenu(),
});

// ================================================================ F3-06
const MSG_RESULTADO = `<div class="br-message success" id="resultado" hidden>
  <div class="icon"><i class="fas fa-check-circle fa-lg" aria-hidden="true"></i></div>
  <div class="content" role="alert"><span class="message-title">Empréstimo renovado.</span><span class="message-body"> Nova data de devolução: 01/11/2026.</span></div>
  <div class="close"><button class="br-button circle small" type="button" aria-label="Fechar mensagem"><i class="fas fa-times" aria-hidden="true"></i></button></div>
</div>`;
const F3_06_D = pagina({
  titulo: "Meus empréstimos – Biblioteca Municipal",
  corpo: `
<h1>Meus empréstimos</h1>
<p>Você pode renovar cada empréstimo até duas vezes, desde que o livro não tenha reserva de outro leitor.</p>
${MSG_RESULTADO}
<div class="br-list lista-livros">
${LIVROS.map((l, i) => itemEmprestimo({ ...l, acoes: `<button class="br-button secondary small renovar" type="button" id="renovar-${i + 1}">Renovar</button>` })).join("\n")}
</div>`,
  script: `const mensagem = document.getElementById('resultado');
const fecharMsg = mensagem.querySelector('.close button');
document.querySelectorAll('.renovar').forEach((botao) => {
  botao.addEventListener('click', () => {
    mensagem.hidden = false;
  });
});
if (fecharMsg) {
  fecharMsg.addEventListener('click', () => {
    mensagem.hidden = true;
  });
}`,
});

// ================================================================ F3-08
const F3_08_N = pagina({
  titulo: "Empréstimos – Biblioteca Municipal",
  corpo: `
<h1>Empréstimos</h1>
<p>O prazo padrão de empréstimo é de 14 dias. Leitores com cartão ativo podem ter até 5 livros ao mesmo tempo.</p>
<div class="secao">
  <h2>Seus empréstimos</h2>
  ${lista()}
</div>`,
  depoisDoRodape: modal({
    id: "aviso-feriado",
    titulo: "Biblioteca fechada no feriado",
    corpo: `      <p>No dia 2 de novembro, feriado de Finados, a biblioteca não abre. Devoluções previstas para esse dia podem ser feitas até 3 de novembro, sem multa.</p>`,
    botoes: `      <button class="br-button primary" type="button">Entendi</button>`,
    tipo: "informativa",
  }),
  script: scriptModal({ id: "aviso-feriado", invocador: "-", botaoFecha: ".br-modal-footer .br-button" })
    .replace("  const abrir = document.getElementById('-');\n", "")
    .replace("  abrir.addEventListener('click', abrirJanela);\n", "  abrirJanela();\n"),
});

// ================================================================ F3-09
const LEITURA = [
  ["Vidas secas", "Graciliano Ramos"],
  ["Dom Casmurro", "Machado de Assis"],
  ["Quarto de despejo", "Carolina Maria de Jesus"],
];
const F3_09_U1 = pagina({
  titulo: "Minha lista de leitura – Biblioteca Municipal",
  corpo: `
<h1>Minha lista de leitura</h1>
<p>Livros que você guardou para pegar emprestado depois.</p>
<h2 id="titulo-lista">Clube de leitura de outubro</h2>
<ul class="br-list lista-livros" id="lista-leitura">
${LEITURA.map(
  ([t, a], i) => `  <li class="br-item">
    <div class="row align-items-center">
      <div class="col"><p class="titulo-livro mb-0">${t}</p><p class="detalhe-livro mb-0">${a}</p></div>
      <div class="col-auto"><button class="br-button secondary small remover" type="button" id="remover-${i + 1}" data-titulo="${t}">Remover da lista</button></div>
    </div>
  </li>`,
).join("\n")}
</ul>`,
  depoisDoRodape: modal({
    id: "remover-item",
    titulo: "Remover da lista?",
    corpo: `      <p id="remover-texto">O livro sairá da sua lista de leitura. Você pode adicioná-lo de novo quando quiser.</p>`,
    botoes: `      <button class="br-button secondary" type="button">Cancelar</button>
      <button class="br-button primary ml-2" type="button">Remover</button>`,
    tipo: "acao",
  }),
  script: `(function () {
  const scrim = document.getElementById('scrim-remover-item');
  const janela = document.getElementById('remover-item');
  const texto = document.getElementById('remover-texto');
  const confirmar = janela.querySelector('.br-modal-footer .primary');
  const cancelar = janela.querySelector('.br-modal-footer .secondary');
  const fechar = janela.querySelector('.br-modal-header .close');
  let origem = null;
  function abrirJanela(botao) {
    origem = botao;
    texto.textContent = botao.dataset.titulo + ' sairá da sua lista de leitura. Você pode adicioná-lo de novo quando quiser.';
    scrim.classList.add('active');
    confirmar.focus();
  }
  function fecharJanela() {
    scrim.classList.remove('active');
    origem.focus();
  }
  document.querySelectorAll('.remover').forEach((botao) => botao.addEventListener('click', () => abrirJanela(botao)));
  cancelar.addEventListener('click', fecharJanela);
  fechar.addEventListener('click', fecharJanela);
  confirmar.addEventListener('click', () => {
    origem.closest('li').remove();
    fecharJanela();
  });
  janela.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharJanela();
    if (e.key === 'Tab') {
      const lista = Array.from(janela.querySelectorAll('button'));
      if (e.shiftKey && document.activeElement === lista[0]) {
        e.preventDefault();
        lista[lista.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === lista[lista.length - 1]) {
        e.preventDefault();
        lista[0].focus();
      }
    }
  });
})();`,
});

// ================================================================ F4-01
const ACERVO_DIGITAL = `
<h1>Acervo digital</h1>
<p>Livros digitais podem ser lidos no navegador por até 21 dias, sem fila de espera para títulos de domínio público.</p>
<div class="secao">
  <h2>Coleções</h2>
  <ul>
    <li><a href="#">Literatura brasileira em domínio público</a></li>
    <li><a href="#">Literatura infantil ilustrada</a></li>
    <li><a href="#">Memória de Santa Aurora</a></li>
  </ul>
</div>`;
const F4_01_C = pagina({ titulo: "Acervo digital – Biblioteca Municipal", corpo: ACERVO_DIGITAL });

// ================================================================ F4-06
const F4_06_C = pagina({
  titulo: "Renovar empréstimo – Biblioteca Municipal",
  corpo: `
<h1>Renovar empréstimo</h1>
<p><strong>Vidas secas</strong>, de Graciliano Ramos. Devolução atual: 21/10/2026. Nova data, se renovado: 04/11/2026.</p>
<div class="acoes">
  <button class="br-button primary" type="button">Renovar</button>
  <a class="br-button secondary" href="#">Voltar</a>
</div>`,
});

// ================================================================ F5-01
const BOTAO_EXCLUIR = `<button class="br-button circle" type="button" id="excluir"><i class="fas fa-trash" aria-hidden="true"></i></button>`;
const F5_01_D = pagina({
  titulo: "Minhas reservas – Biblioteca Municipal",
  corpo: `
<h1>Minhas reservas</h1>
<p>Quando o exemplar estiver separado, você terá 3 dias para retirá-lo no balcão.</p>
<div class="br-list lista-livros">
  <div class="br-item">
    <div class="row align-items-center">
      <div class="col"><p class="titulo-livro mb-0">Torto arado</p><p class="detalhe-livro mb-0">Itamar Vieira Junior · reserva feita em 08/10/2026 · posição 3 na fila</p></div>
      <div class="col-auto">${BOTAO_EXCLUIR}</div>
    </div>
  </div>
</div>`,
});
const comNome = (attrs) => [[BOTAO_EXCLUIR, BOTAO_EXCLUIR.replace('id="excluir">', `id="excluir"${attrs}>`)]];

// ================================================================ F5-04
function f5_04(nome) {
  return pagina({
    titulo: "Empréstimos – Biblioteca Municipal",
    corpo: `
<h1>Empréstimos</h1>
<p>O prazo padrão de empréstimo é de 14 dias. Leitores com cartão ativo podem ter até 5 livros ao mesmo tempo.</p>
<button class="br-button secondary" type="button" id="ver-regras">Ver regras de empréstimo</button>`,
    depoisDoRodape: modal({
      id: "regras",
      titulo: "Regras de empréstimo",
      nome,
      corpo: `      <ul>
        <li>Prazo de 14 dias para cada livro.</li>
        <li>Até duas renovações, se não houver reserva de outro leitor.</li>
      </ul>`,
      botoes: `      <button class="br-button primary" type="button">Entendi</button>`,
      tipo: "informativa",
    }),
    script: scriptModal({ id: "regras", invocador: "ver-regras", botaoFecha: ".br-modal-footer .br-button" }),
  });
}

// ================================================================ F6-03
const F6_03_D = pagina({
  titulo: "Acervo – Biblioteca Municipal",
  estilo: `.br-header {
  height: 120px;
  left: 0;
  overflow: hidden;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 900;
}

body {
  padding-top: 120px;
}

.lista-acervo a {
  display: block;
  height: 40px;
  line-height: 40px;
}`,
  corpo: `
<h1>Acervo</h1>
<p>Títulos mais procurados nesta semana. Selecione um título para ver os exemplares disponíveis.</p>
<ul class="lista-acervo">
${[
  "Torto arado", "Capitães da areia", "A hora da estrela", "Vidas secas", "Dom Casmurro", "O cortiço", "Quarto de despejo",
  "Grande sertão: veredas", "Macunaíma", "Iracema", "O quinze", "Memórias póstumas de Brás Cubas", "Mayombe", "Ensaio sobre a cegueira",
  "Cem anos de solidão", "O avesso da pele", "Tudo é rio", "Olhos d'água", "Becos da memória", "Ponciá Vicêncio",
]
  .map((t, i) => `  <li><a href="#" id="acervo-item-${i + 1}">${t}</a></li>`)
  .join("\n")}
</ul>`,
});
const OCULTACAO =
  "(() => { const a = document.getElementById('acervo-item-1').getBoundingClientRect(); const h = document.querySelector('.br-header').getBoundingClientRect(); const ix = Math.max(0, Math.min(a.right, h.right) - Math.max(a.left, h.left)); const iy = Math.max(0, Math.min(a.bottom, h.bottom) - Math.max(a.top, h.top)); return Math.round((ix * iy) / (a.width * a.height) * 100) / 100; })()";

// ================================================================ F7-01
const RADIOS = `  <div class="br-radio"><input id="formato-impresso" type="radio" name="formato" value="impresso" checked><label for="formato-impresso">Impresso</label></div>
  <div class="br-radio"><input id="formato-digital" type="radio" name="formato" value="digital"><label for="formato-digital">Digital</label></div>
`;
const F7_01_D = pagina({
  titulo: "Reservar livro – Biblioteca Municipal",
  corpo: `
<h1>Reservar livro</h1>
<p><strong>Ensaio sobre a cegueira</strong>, de José Saramago. Disponível nos dois formatos.</p>
<form id="form-reserva" novalidate>
<p class="pergunta" id="q-formato">Formato do livro</p>
<fieldset id="formato">
${RADIOS}</fieldset>
<button class="br-button primary mt-3" type="button">Reservar</button>
</form>`,
});

// ================================================================ F8-01
const ACOES_LINHA = `<div class="acoes-linha"><button class="br-button circle" type="button" id="renovar-icone" aria-label="Renovar Vidas secas"><i class="fas fa-redo fa-xs" aria-hidden="true"></i></button><button class="br-button circle" type="button" id="detalhes-icone" aria-label="Ver detalhes de Vidas secas"><i class="fas fa-info fa-xs" aria-hidden="true"></i></button></div>`;
function f8_01(tamanho, vao, extra = "") {
  return pagina({
    titulo: "Meus empréstimos – Biblioteca Municipal",
    estilo: `.acoes-linha {
  display: flex;
  gap: ${vao};
}

.acoes-linha .br-button {
  --button-size: ${tamanho};
}`,
    corpo: `
<h1>Meus empréstimos</h1>
${extra}<div class="br-list lista-livros">
${itemEmprestimo({ titulo: "Vidas secas", autor: "Graciliano Ramos", prazo: "21/10/2026", acoes: ACOES_LINHA })}
</div>`,
  });
}
const caixa = (sel, eixo) => `Math.round(document.querySelector('${sel}').getBoundingClientRect().${eixo} * 100) / 100`;
const VAO = "Math.round((document.getElementById('detalhes-icone').getBoundingClientRect().left - document.getElementById('renovar-icone').getBoundingClientRect().right) * 100) / 100";

// ================================================================ F8-02
function f8_02(classe) {
  return pagina({
    titulo: "Minhas reservas – Biblioteca Municipal",
    corpo: `
<h1>Minhas reservas</h1>
<div class="br-list lista-livros">
  <div class="br-item">
    <div class="row align-items-center">
      <div class="col"><p class="titulo-livro mb-0">Torto arado</p><p class="detalhe-livro mb-0">posição 3 na fila</p></div>
      <div class="col-auto"><button class="br-button circle ${classe}" type="button" id="excluir-movel" aria-label="Excluir reserva de Torto arado"><i class="fas fa-trash" aria-hidden="true"></i></button></div>
    </div>
  </div>
</div>`,
  });
}

export const casos = [
  // ------------------------------------------------------------ F1
  {
    caso: "F1-02",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-02-A",
        html: paginaCartao(SCRIPT_F1_02_A),
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            ax("#cartao", "invalido", "igual", true),
            ax("#cartao", "mensagemDeErro", "igual", ["cartao-erro"], "aria-errormessage exposto"),
          ],
        },
      },
      {
        id: "F1-02-B",
        de: "F1-02-A",
        mudanca: "remove só aria-invalid",
        trocas: [
          ["  campo.removeAttribute('aria-invalid');\n", ""],
          ["    campo.setAttribute('aria-invalid', 'true');\n", ""],
        ],
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            dom("document.getElementById('cartao').getAttribute('aria-errormessage')", "igual", "cartao-erro"),
            ax("#cartao", "invalido", "igual", false),
            ax("#cartao", "mensagemDeErro", "vazio", undefined, "sem aria-invalid, aria-errormessage não é exposto"),
            ax("#cartao", "descricao", "vazio"),
            dom("getComputedStyle(document.getElementById('cartao')).borderTopColor", "diferenteDaCaptura", "antes-de-enviar"),
          ],
        },
      },
      {
        id: "F1-02-C",
        de: "F1-02-A",
        mudanca: "sem ARIA; a mensagem nomeia o campo",
        trocas: [
          ["  campo.removeAttribute('aria-invalid');\n  campo.removeAttribute('aria-errormessage');\n", ""],
          ["    campo.setAttribute('aria-invalid', 'true');\n    campo.setAttribute('aria-errormessage', 'cartao-erro');\n", ""],
          ["Valor inválido.';", "Número do cartão: informe 8 dígitos.';"],
        ],
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Número do cartão: informe 8 dígitos."),
            ax("#cartao", "invalido", "igual", false),
            dom("document.getElementById('cartao').closest('.br-input').contains(document.getElementById('cartao-erro'))", "igual", true, "logo abaixo do campo"),
          ],
        },
      },
      {
        id: "F1-02-E",
        de: "F1-02-A",
        mudanca: "aria-invalid + mensagem genérica adjacente, sem IDREF",
        trocas: [
          ["  campo.removeAttribute('aria-errormessage');\n", ""],
          ["    campo.setAttribute('aria-errormessage', 'cartao-erro');\n", ""],
        ],
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            ax("#cartao", "invalido", "igual", true),
            ax("#cartao", "descricao", "vazio"),
            ax("#cartao", "mensagemDeErro", "vazio"),
            dom("document.getElementById('cartao').nextElementSibling === document.getElementById('cartao-erro')", "igual", true, "mensagem adjacente"),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-04",
    receita: ENVIAR_12_BIB,
    gemeos: [
      {
        id: "F1-04-D",
        html: paginaBibCampo({ script: scriptBibCampo("open", false) }),
        fatos: {
          "apos-enviar": [
            dom("!!document.querySelector('bib-campo').shadowRoot", "igual", true, "raiz aberta"),
            dom(`${MSG}.trim()`, "igual", "Valor inválido.", "mensagem no light DOM, irmã do host"),
            dom("document.querySelector('bib-campo').shadowRoot.getElementById('campo').getAttribute('aria-describedby')", "igual", "cartao-erro"),
            ax("bib-campo >>> #campo", "descricao", "vazio"),
            ax("bib-campo >>> #campo", "invalido", "igual", false),
          ],
        },
      },
      {
        id: "F1-04-C",
        de: "F1-04-D",
        mudanca: "muda só o lugar da mensagem (para dentro do mesmo shadow root)",
        trocas: [
          ["      const anterior = document.getElementById('cartao-erro');\n", "      const anterior = raiz.getElementById('cartao-erro');\n"],
          ["      this.insertAdjacentElement('afterend', mensagem);\n", "      caixa.appendChild(mensagem);\n"],
        ],
        fatos: {
          "apos-enviar": [
            dom("document.getElementById('cartao-erro')", "igual", null),
            dom("document.querySelector('bib-campo').shadowRoot.getElementById('cartao-erro').textContent.trim()", "igual", "Valor inválido."),
            ax("bib-campo >>> #campo", "descricao", "igual", "Valor inválido."),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-05",
    receita: ENVIAR_12_BIB.map((p) => (p.acao === "capturar" ? { ...p, soDom: true } : p)),
    gemeos: [
      {
        id: "F1-05-D",
        html: paginaBibCampo({ scriptExterno: "__JS__" }),
        js: scriptBibCampo("closed", false),
        pacote: { tipo: "so-dom", nota: "pacote sem E-AX; input e IDREF dentro de raiz fechada" },
        fatos: {
          "apos-enviar": [
            dom("document.querySelector('bib-campo').shadowRoot", "igual", null, "raiz fechada"),
            dom("document.querySelectorAll('input').length", "igual", 0, "o DOM serializado não mostra o campo"),
            ax("bib-campo >>> #campo", "descricao", "vazio", undefined, "verdade (CDP, fora do pacote): violação"),
          ],
        },
      },
      {
        id: "F1-05-C",
        de: "F1-05-D",
        mudanca: "como F1-04-C, com raiz fechada",
        trocasJs: [
          ["      const anterior = document.getElementById('cartao-erro');\n", "      const anterior = raiz.getElementById('cartao-erro');\n"],
          ["      this.insertAdjacentElement('afterend', mensagem);\n", "      caixa.appendChild(mensagem);\n"],
        ],
        pacote: { tipo: "so-dom", nota: "pacote sem E-AX; mensagem e campo dentro de raiz fechada" },
        fatos: {
          "apos-enviar": [
            dom("document.querySelector('bib-campo').shadowRoot", "igual", null),
            dom("document.querySelectorAll('input').length", "igual", 0),
            dom("document.getElementById('cartao-erro')", "igual", null, "nada no DOM leve"),
            ax("bib-campo >>> #campo", "descricao", "igual", "Valor inválido.", "verdade (CDP, fora do pacote): conforme"),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-06",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-06-C",
        copiaDe: "F1-01-C",
        nota: "página igual a F1-01-C (bytes idênticos), publicada na ala da reserva",
        fatos: { "apos-enviar": [ax("#cartao", "invalido", "igual", true), ax("#cartao", "descricao", "igual", "Valor inválido.")] },
      },
    ],
  },
  // ------------------------------------------------------------ F2
  {
    caso: "F2-02",
    receita: [
      { acao: "capturar", nome: "inicial" },
      { acao: "focar", alvo: "#ver-aviso" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "modal-aberta" },
    ],
    gemeos: [
      {
        id: "F2-02-N",
        html: F2_02_N,
        fatos: {
          inicial: [
            dom("document.querySelector('#info .content').innerText.trim().length > 0", "igual", true, "parte obrigatória presente"),
            dom("['.message-title', '.icon', '.close'].map((s) => document.querySelector('#info ' + s)).every((x) => x === null)", "igual", true, "título, ícone e fechar (opcionais) ausentes"),
          ],
          "modal-aberta": [
            aberta("alerta"),
            dom("document.querySelector('#alerta .modal-title, #alerta .br-modal-header')", "igual", null, "sem título"),
            dom("document.querySelector('#alerta .br-modal-body').innerText.trim().length > 0", "igual", true),
            dom("Array.from(document.querySelectorAll('#alerta .br-modal-footer button')).map((b) => b.innerText.trim()).join('|')", "igual", "Entendi"),
          ],
        },
      },
    ],
  },
  {
    caso: "F2-04",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      { id: "F2-04-D", de: "F2-04-C", mudanca: "sem as setas", trocas: [[SETA_ANTERIOR, ""], [SETA_PROXIMA, ""]], fatos: { inicial: contagem(0, 3) } },
      { id: "F2-04-C", html: F2_04_C, fatos: { inicial: contagem(2, 3) } },
      { id: "F2-04-X", de: "F2-04-C", mudanca: "só as setas, sem identificadores", trocas: [[IDENTIFICADORES, ""]], fatos: { inicial: contagem(2, 0) } },
    ],
  },
  {
    caso: "F2-05",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F2-05-N",
        html: F2_05_N,
        fatos: {
          inicial: [
            dom("document.querySelector('.br-header')", "igual", null, "sem raiz .br-header"),
            dom("!!document.querySelector('div.topo #abrir-menu')", "igual", true),
            dom("document.querySelector('div.topo').innerText.trim()", "igual", "", "sem título"),
          ],
        },
      },
    ],
  },
  // ------------------------------------------------------------ F3
  {
    caso: "F3-06",
    receita: [
      { acao: "focar", alvo: "#renovar-1" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-exibir" },
      { acao: "focar", alvo: "#resultado .close button" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-fechar" },
    ],
    gemeos: [
      {
        id: "F3-06-D",
        html: F3_06_D,
        fatos: {
          "apos-exibir": [dom("document.getElementById('resultado').hidden", "igual", false), foco("#renovar-1", "o foco fica em 'Renovar'")],
          "apos-fechar": [dom("document.getElementById('resultado').hidden", "igual", true), foco("body")],
        },
      },
      {
        id: "F3-06-C",
        de: "F3-06-D",
        mudanca: "acrescenta os dois focus() (ao exibir e ao fechar)",
        trocas: [
          depois("const fecharMsg = mensagem.querySelector('.close button');\n", "let origem = null;\n"),
          ["    mensagem.hidden = false;\n", "    origem = botao;\n    mensagem.hidden = false;\n    fecharMsg.focus();\n"],
          ["    mensagem.hidden = true;\n", "    mensagem.hidden = true;\n    origem.focus();\n"],
        ],
        fatos: {
          "apos-exibir": [foco("#resultado .close button")],
          "apos-fechar": [dom("document.getElementById('resultado').hidden", "igual", true), foco("#renovar-1")],
        },
      },
      {
        id: "F3-06-N",
        de: "F3-06-D",
        mudanca: "remove o X",
        receita: [
          { acao: "focar", alvo: "#renovar-1" },
          { acao: "tecla", tecla: "Enter" },
          { acao: "capturar", nome: "apos-exibir" },
        ],
        trocas: [[`  <div class="close"><button class="br-button circle small" type="button" aria-label="Fechar mensagem"><i class="fas fa-times" aria-hidden="true"></i></button></div>\n`, ""]],
        fatos: {
          "apos-exibir": [dom("document.getElementById('resultado').hidden", "igual", false), dom("document.querySelector('#resultado .close')", "igual", null, "sem botão fechar"), foco("#renovar-1")],
        },
      },
    ],
  },
  {
    caso: "F3-08",
    receita: [
      { acao: "capturar", nome: "apos-carregar" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "apos-fechar" },
    ],
    gemeos: [
      {
        id: "F3-08-N",
        html: F3_08_N,
        fatos: {
          "apos-carregar": [
            aberta("aviso-feriado"),
            dom("window.__focos.length >= 1 && window.__focos[0] === document.querySelector('#aviso-feriado .close')", "igual", true, "nenhum elemento focado antes de abrir (o primeiro foco é o X da modal)"),
            foco("#aviso-feriado .br-modal-header .close"),
          ],
          "apos-fechar": [dom("document.getElementById('scrim-aviso-feriado').classList.contains('active')", "igual", false), foco("body")],
        },
      },
    ],
  },
  {
    caso: "F3-09",
    receita: [
      { acao: "focar", alvo: "#remover-1" },
      { acao: "capturar", nome: "antes" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-abrir" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-remover" },
    ],
    gemeos: [
      {
        id: "F3-09-U1",
        html: F3_09_U1,
        fatos: {
          "apos-abrir": [aberta("remover-item"), foco("#remover-item .br-modal-footer .primary")],
          "apos-remover": [dom("document.getElementById('remover-1')", "igual", null, "o invocador deixou de existir"), dom("document.querySelectorAll('#lista-leitura li').length", "igual", 2), foco("body")],
        },
      },
      {
        id: "F3-09-U2",
        de: "F3-09-U1",
        mudanca: "muda só o destino do foco (título da lista)",
        trocas: [
          ['<h2 id="titulo-lista">', '<h2 id="titulo-lista" tabindex="-1">'],
          ["    origem.closest('li').remove();\n    fecharJanela();\n", "    origem.closest('li').remove();\n    scrim.classList.remove('active');\n    document.getElementById('titulo-lista').focus();\n"],
        ],
        fatos: { "apos-remover": [dom("document.getElementById('remover-1')", "igual", null), foco("#titulo-lista")] },
      },
    ],
  },
  {
    caso: "F3-11",
    receita: [
      { acao: "focar", alvo: "#ver-regras" },
      { acao: "capturar", nome: "antes" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-abrir" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "apos-fechar" },
    ],
    gemeos: [{ id: "F3-11-C", copiaDe: "F3-01-C", nota: "página igual a F3-01-C (bytes idênticos), publicada na ala da reserva", fatos: { "apos-fechar": [foco("#ver-regras")] } }],
  },
  // ------------------------------------------------------------ F4
  {
    caso: "F4-01",
    receita: [{ acao: "capturar", nome: "inicial" }, { acao: "tecla", tecla: "Tab" }, { acao: "capturar", nome: "primeiro-tab" }],
    gemeos: [
      {
        id: "F4-01-D",
        de: "F4-01-C",
        mudanca: "sem o link de salto",
        trocas: [[SALTO, ""]],
        fatos: {
          inicial: [
            dom("document.querySelectorAll('a[href=\"#conteudo\"]').length", "igual", 0, "nenhuma âncora para o conteúdo"),
            ax("#topo", "papel", "igual", "banner"),
            ax("main", "papel", "igual", "main"),
            ax(".links-rodape", "papel", "igual", "navigation"),
            ax("#rodape", "papel", "igual", "contentinfo"),
          ],
          "primeiro-tab": [dom("document.activeElement.getAttribute('href') !== '#conteudo'", "igual", true)],
        },
      },
      {
        id: "F4-01-C",
        html: F4_01_C,
        fatos: { "primeiro-tab": [foco(".br-skiplink a"), dom("document.activeElement.innerText.trim()", "igual", "Ir para o conteúdo"), dom("!!document.getElementById('conteudo')", "igual", true)] },
      },
    ],
  },
  {
    caso: "F4-06",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      { id: "F4-06-D", de: "F4-06-C", axePermitido: ["document-title"], mudanca: "title vazio", trocas: [["<title>Renovar empréstimo – Biblioteca Municipal</title>", "<title></title>"]], fatos: { inicial: [dom("document.title", "igual", "")] } },
      { id: "F4-06-C", html: F4_06_C, fatos: { inicial: [dom("document.title", "igual", "Renovar empréstimo – Biblioteca Municipal")] } },
      { id: "F4-06-S", de: "F4-06-C", mudanca: "title genérico", trocas: [["<title>Renovar empréstimo – Biblioteca Municipal</title>", "<title>Página</title>"]], fatos: { inicial: [dom("document.title", "igual", "Página")] } },
    ],
  },
  // ------------------------------------------------------------ F5
  {
    caso: "F5-01",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      { id: "F5-01-D", html: F5_01_D, axePermitido: ["button-name"], fatos: { inicial: [ax("#excluir", "nome", "vazio"), ax("#excluir", "papel", "igual", "button"), dom("document.querySelector('#excluir i').getAttribute('aria-hidden')", "igual", "true")] } },
      { id: "F5-01-A", de: "F5-01-D", mudanca: "acrescenta só aria-label", trocas: comNome(' aria-label="Excluir reserva"'), fatos: { inicial: [ax("#excluir", "nome", "igual", "Excluir reserva")] } },
      { id: "F5-01-T", de: "F5-01-D", mudanca: "acrescenta só title", trocas: comNome(' title="Excluir reserva"'), fatos: { inicial: [ax("#excluir", "nome", "igual", "Excluir reserva"), dom("document.getElementById('excluir').hasAttribute('aria-label')", "igual", false)] } },
      {
        id: "F5-01-L",
        de: "F5-01-D",
        mudanca: "aria-labelledby para texto visível ao lado",
        trocas: [[`<div class="col-auto">${BOTAO_EXCLUIR}`, `<div class="col-auto"><span class="mr-2" id="rotulo-excluir">Excluir reserva</span>${BOTAO_EXCLUIR.replace('id="excluir">', 'id="excluir" aria-labelledby="rotulo-excluir">')}`]],
        fatos: { inicial: [ax("#excluir", "nome", "igual", "Excluir reserva"), dom("document.getElementById('rotulo-excluir').getBoundingClientRect().height > 0", "igual", true)] },
      },
      {
        id: "F5-01-H",
        de: "F5-01-D",
        mudanca: "texto oculto (sr-only) dentro do botão",
        trocas: [[BOTAO_EXCLUIR, BOTAO_EXCLUIR.replace("</i></button>", '</i><span class="sr-only">Excluir reserva</span></button>')]],
        fatos: { inicial: [ax("#excluir", "nome", "igual", "Excluir reserva")] },
      },
      { id: "F5-01-E", de: "F5-01-D", mudanca: "aria-label vazio + title", trocas: comNome(' aria-label="" title="Excluir reserva"'), fatos: { inicial: [ax("#excluir", "nome", "igual", "Excluir reserva", "o Chromium expõe o title")] } },
    ],
  },
  {
    caso: "F5-04",
    receita: [{ acao: "focar", alvo: "#ver-regras" }, { acao: "tecla", tecla: "Enter" }, { acao: "capturar", nome: "aberta" }],
    gemeos: [
      {
        id: "F5-04-U",
        de: "F5-04-C",
        mudanca: "sem aria-labelledby (título visual em div)",
        trocas: [[' aria-labelledby="regras-titulo"', ""]],
        fatos: { aberta: [aberta("regras"), ax("#regras", "papel", "igual", "dialog"), ax("#regras", "nome", "vazio"), dom("document.querySelector('#regras .modal-title').tagName", "igual", "DIV")] },
      },
      { id: "F5-04-C", html: f5_04("titulo"), fatos: { aberta: [aberta("regras"), ax("#regras", "nome", "igual", "Regras de empréstimo")] } },
    ],
  },
  // ------------------------------------------------------------ F6
  {
    caso: "F6-03",
    viewport: { width: 1280, height: 800 },
    receita: [
      { acao: "rolarAte", alvo: "#acervo-item-1", topo: 78 },
      { acao: "focarSemRolar", alvo: "#acervo-item-2" },
      { acao: "capturar", nome: "antes" },
      { acao: "tecla", tecla: "Shift+Tab" },
      { acao: "capturar", nome: "com-foco" },
    ],
    gemeos: [
      {
        id: "F6-03-D",
        html: F6_03_D,
        fatos: {
          antes: [dom(OCULTACAO, "igual", 1, "rolagem do leitor: o link está na janela, mas atrás do cabeçalho fixo")],
          "com-foco": [foco("#acervo-item-1"), dom("getComputedStyle(document.querySelector('.br-header')).position", "igual", "fixed"), dom(OCULTACAO, "igual", 1, "100% sob o cabeçalho fixo")],
        },
      },
      {
        id: "F6-03-C",
        de: "F6-03-D",
        mudanca: "acrescenta só scroll-padding-top: 130px",
        trocas: [["body {\n  padding-top: 120px;\n}", "html {\n  scroll-padding-top: 130px;\n}\n\nbody {\n  padding-top: 120px;\n}"]],
        fatos: { "com-foco": [foco("#acervo-item-1"), dom(OCULTACAO, "igual", 0)] },
      },
      {
        id: "F6-03-X",
        de: "F6-03-D",
        mudanca: "scroll-padding-top: 100px (metade do link visível)",
        trocas: [["body {\n  padding-top: 120px;\n}", "html {\n  scroll-padding-top: 100px;\n}\n\nbody {\n  padding-top: 120px;\n}"]],
        fatos: { "com-foco": [foco("#acervo-item-1"), dom(OCULTACAO, "entre", [0.01, 0.99], "parcialmente encoberto")] },
      },
    ],
  },
  // ------------------------------------------------------------ F7
  {
    caso: "F7-01",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F7-01-D",
        html: F7_01_D,
        fatos: {
          inicial: [
            dom("document.querySelector('#formato legend')", "igual", null, "fieldset sem legend"),
            ax("#formato", "papel", "igual", "group"),
            ax("#formato", "nome", "vazio"),
            dom("document.getElementById('q-formato').innerText.trim()", "igual", "Formato do livro"),
          ],
        },
      },
      {
        id: "F7-01-C",
        de: "F7-01-D",
        mudanca: "troca só <p> por <legend>",
        trocas: [['<p class="pergunta" id="q-formato">Formato do livro</p>\n<fieldset id="formato">\n', '<fieldset id="formato">\n<legend>Formato do livro</legend>\n']],
        fatos: { inicial: [ax("#formato", "papel", "igual", "group"), ax("#formato", "nome", "igual", "Formato do livro")] },
      },
      {
        id: "F7-01-X",
        de: "F7-01-D",
        mudanca: "div role=radiogroup com aria-labelledby",
        trocas: [
          ['<fieldset id="formato">\n', '<div id="formato" role="radiogroup" aria-labelledby="q-formato">\n'],
          [`${RADIOS}</fieldset>`, `${RADIOS}</div>`],
        ],
        fatos: { inicial: [ax("#formato", "papel", "igual", "radiogroup"), ax("#formato", "nome", "igual", "Formato do livro"), dom("document.querySelectorAll('fieldset').length", "igual", 0)] },
      },
      {
        id: "F7-01-U",
        de: "F7-01-D",
        mudanca: "radios soltos, sem agrupamento",
        trocas: [
          ['<fieldset id="formato">\n', '<div id="formato">\n'],
          [`${RADIOS}</fieldset>`, `${RADIOS}</div>`],
        ],
        fatos: { inicial: [ax("#formato", "papel", "em", ["generic", "none", "GenericContainer"]), dom("document.querySelectorAll('fieldset, [role=radiogroup], [role=group]').length", "igual", 0)] },
      },
    ],
  },
  // ------------------------------------------------------------ F8
  {
    caso: "F8-01",
    viewport: { width: 1280, height: 800 },
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F8-01-D",
        html: f8_01("16px", "0"),
        fatos: { inicial: [dom(caixa("#renovar-icone", "width"), "igual", 16), dom(caixa("#renovar-icone", "height"), "igual", 16), dom(VAO, "igual", 0, "colados")] },
      },
      {
        id: "F8-01-C",
        de: "F8-01-D",
        mudanca: "tamanho até 24×24",
        trocas: [["  --button-size: 16px;", "  --button-size: 24px;"]],
        fatos: { inicial: [dom(caixa("#renovar-icone", "width"), "igual", 24), dom(caixa("#renovar-icone", "height"), "igual", 24)] },
      },
      {
        id: "F8-01-X",
        de: "F8-01-D",
        mudanca: "20×20 com 8px entre os botões",
        trocas: [
          ["  gap: 0;", "  gap: 8px;"],
          ["  --button-size: 16px;", "  --button-size: 20px;"],
        ],
        fatos: {
          inicial: [
            dom(caixa("#renovar-icone", "width"), "igual", 20),
            dom(VAO, "igual", 8),
            dom(
              "(() => { const a = document.getElementById('renovar-icone').getBoundingClientRect(); const b = document.getElementById('detalhes-icone').getBoundingClientRect(); const d = Math.hypot((a.left + a.right) / 2 - (b.left + b.right) / 2, (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2); return d >= 24; })()",
              "igual",
              true,
              "círculos de 24px centrados não se cruzam",
            ),
          ],
        },
      },
      {
        id: "F8-01-N",
        de: "F8-01-C",
        mudanca: "acrescenta o link 'regulamento' dentro de uma frase",
        trocas: [depois("<h1>Meus empréstimos</h1>\n", '<p>Antes de renovar, confira o <a href="#" id="regulamento">regulamento</a> de empréstimos da biblioteca.</p>\n')],
        fatos: {
          inicial: [
            dom("getComputedStyle(document.getElementById('regulamento')).display", "igual", "inline", "link em linha, dentro da frase"),
            dom(caixa("#regulamento", "height"), "menorQue", 24),
          ],
        },
      },
    ],
  },
  {
    caso: "F8-02",
    gemeos: [
      {
        id: "F8-02-D",
        html: f8_02("small"),
        viewport: { width: 375, height: 812 },
        toque: true,
        receita: [{ acao: "capturar", nome: "inicial" }],
        fatos: { inicial: [dom(caixa("#excluir-movel", "width"), "igual", 32), dom(caixa("#excluir-movel", "height"), "igual", 32), dom("matchMedia('(pointer: coarse)').matches", "igual", true, "entrada por toque")] },
      },
      {
        id: "F8-02-C",
        de: "F8-02-D",
        mudanca: "48×48",
        viewport: { width: 375, height: 812 },
        toque: true,
        trocas: [['<button class="br-button circle small" type="button" id="excluir-movel"', '<button class="br-button circle large" type="button" id="excluir-movel"']],
        receita: [{ acao: "capturar", nome: "inicial" }],
        fatos: { inicial: [dom(caixa("#excluir-movel", "width"), "igual", 48), dom(caixa("#excluir-movel", "height"), "igual", 48)] },
      },
      {
        id: "F8-02-N",
        mesmaPagina: "F8-02-D",
        viewport: { width: 1280, height: 900 },
        toque: false,
        receita: [{ acao: "capturar", nome: "inicial" }],
        fatos: { inicial: [dom("matchMedia('(pointer: fine)').matches", "igual", true, "ponteiro fino, sem toque"), dom(caixa("#excluir-movel", "width"), "igual", 32)] },
      },
    ],
  },
];
