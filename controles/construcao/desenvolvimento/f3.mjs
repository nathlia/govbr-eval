// F3 — foco em diálogo/transição (casos de desenvolvimento).
import { pagina, cabecalhoPadrao, modal, scriptModal, itemEmprestimo, LIVROS, GATILHO_MENU, menuPrincipal, scriptMenu, campo } from "../comum.mjs";
import { dom, foco, depois } from "../dsl.mjs";

const lista = () => `<div class="br-list lista-livros">\n${LIVROS.map((l) => itemEmprestimo(l)).join("\n")}\n</div>`;

const REGRAS_CORPO = `      <ul>
        <li>Prazo de 14 dias para cada livro.</li>
        <li>Até duas renovações, se não houver reserva de outro leitor.</li>
        <li>Multa de R$ 0,50 por dia de atraso, por livro.</li>
      </ul>`;
const ENTENDI = `      <button class="br-button primary" type="button">Entendi</button>`;

export const MODAL_REGRAS = modal({ id: "regras", titulo: "Regras de empréstimo", corpo: REGRAS_CORPO, botoes: ENTENDI, tipo: "informativa" });

/** Página de empréstimos com o botão "Ver regras" (F3-01, F3-11, F3-12). */
export function paginaRegras(restaurar) {
  return pagina({
    titulo: "Empréstimos – Biblioteca Municipal",
    corpo: `
<h1>Empréstimos</h1>
<p>O prazo padrão de empréstimo é de 14 dias. Leitores com cartão ativo podem ter até 5 livros ao mesmo tempo.</p>
<button class="br-button secondary" type="button" id="ver-regras">Ver regras de empréstimo</button>
<div class="secao">
  <h2>Seus empréstimos</h2>
  ${lista()}
</div>`,
    depoisDoRodape: MODAL_REGRAS,
    script: scriptModal({ id: "regras", invocador: "ver-regras", restaurar, botaoFecha: ".br-modal-footer .br-button" }),
  });
}

/** Trocas que acrescentam a restauração do foco ao script de modal gerado por scriptModal. */
export const TROCAS_RESTAURA = [
  depois("  const fechar = janela.querySelector('.br-modal-header .close');\n", "  let origem = null;\n"),
  ["  function abrirJanela() {\n", "  function abrirJanela() {\n    origem = document.activeElement;\n"],
  depois("    scrim.classList.remove('active');\n", "    origem.focus();\n"),
];

/** Receita F3-01: foco no invocador, Enter, Esc. */
export const ABRIR_FECHAR_REGRAS = [
  { acao: "focar", alvo: "#ver-regras" },
  { acao: "capturar", nome: "antes" },
  { acao: "tecla", tecla: "Enter" },
  { acao: "capturar", nome: "apos-abrir" },
  { acao: "tecla", tecla: "Escape" },
  { acao: "capturar", nome: "apos-fechar" },
];

const ABRIR = (invocador) => [
  { acao: "focar", alvo: `#${invocador}` },
  { acao: "capturar", nome: "antes" },
  { acao: "tecla", tecla: "Enter" },
  { acao: "capturar", nome: "apos-abrir" },
];

const aberta = (id) => dom(`(() => { const el = document.getElementById('${id}'); return !!el && el.getBoundingClientRect().height > 0; })()`, "igual", true, "diálogo aberto");

// ---------------------------------------------------------------- F3-02 / F3-05
const LIVRO_DETALHE = `
<h1>Dom Casmurro</h1>
<p>Machado de Assis · Romance · Exemplar 2 de 3</p>
<p>Devolução atual: 18/10/2026. Se renovar agora, a nova data será 01/11/2026.</p>`;

function paginaRenovar({ corpoModal, botoes, foco: alvoFoco, laco = true, modalNoMain = false }) {
  const janela = modal({ id: "renovar", titulo: "Renovar empréstimo?", corpo: corpoModal, botoes, tipo: "acao" });
  return pagina({
    titulo: "Dom Casmurro – Biblioteca Municipal",
    corpo: `${LIVRO_DETALHE}
<div class="acoes">
  <button class="br-button primary" type="button" id="abrir-renovacao">Renovar empréstimo</button>
  <a class="br-button secondary" href="#">Voltar para meus empréstimos</a>
</div>${modalNoMain ? "\n" + janela : ""}`,
    depoisDoRodape: modalNoMain ? "" : janela,
    script: scriptModal({ id: "renovar", invocador: "abrir-renovacao", foco: alvoFoco, laco, botaoFecha: ".br-modal-footer .secondary" }),
  });
}

const CORPO_RENOVAR = `      <p>Dom Casmurro ficará com você até 01/11/2026. Você ainda poderá renovar mais uma vez.</p>`;
const BOTOES_RENOVAR_02 = `      <button class="br-button secondary" type="button">Cancelar</button>
      <button class="br-button primary ml-2" type="button">Renovar</button>`;
const BOTOES_RENOVAR_05 = `      <button class="br-button primary" type="button">Renovar</button>
      <button class="br-button secondary ml-2" type="button">Cancelar</button>`;

// ---------------------------------------------------------------- F3-03
function paginaListas(alvoFoco) {
  return pagina({
    titulo: "Minhas listas de leitura – Biblioteca Municipal",
    corpo: `
<h1>Minhas listas de leitura</h1>
<div class="br-list lista-livros">
  <div class="br-item">
    <div class="row align-items-center">
      <div class="col"><p class="titulo-livro mb-0">Férias de julho</p><p class="detalhe-livro mb-0">6 livros · atualizada em 02/07/2026</p></div>
      <div class="col-auto"><button class="br-button secondary small" type="button" id="excluir-ferias">Excluir lista</button></div>
    </div>
  </div>
  <div class="br-item">
    <div class="row align-items-center">
      <div class="col"><p class="titulo-livro mb-0">Clube de leitura</p><p class="detalhe-livro mb-0">4 livros · atualizada em 30/09/2026</p></div>
    </div>
  </div>
</div>`,
    depoisDoRodape: modal({
      id: "excluir-lista",
      titulo: "Excluir lista de leitura?",
      corpo: `      <p>A lista Férias de julho e os 6 livros dela serão excluídos. Essa ação não pode ser desfeita.</p>`,
      botoes: `      <button class="br-button secondary" type="button">Cancelar</button>
      <button class="br-button primary ml-2" type="button">Excluir</button>`,
      tipo: "destrutiva",
    }),
    script: scriptModal({ id: "excluir-lista", invocador: "excluir-ferias", foco: alvoFoco, botaoFecha: ".br-modal-footer .br-button" }),
  });
}

// ---------------------------------------------------------------- F3-04
function scriptHorario() {
  return scriptModal({ id: "horario", invocador: "ver-horario", foco: "", botaoFecha: ".br-modal-footer .br-button" })
    .replace(
      "  let origem = null;\n",
      "  let origem = null;\n  const fundo = [document.querySelector('.br-skiplink'), document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')];\n",
    )
    .replace("    origem = document.activeElement;\n", "    origem = document.activeElement;\n    fundo.forEach((el) => { el.inert = true; });\n")
    .replace("    scrim.classList.remove('active');\n", "    scrim.classList.remove('active');\n    fundo.forEach((el) => { el.inert = false; });\n");
}

const F3_04_D = pagina({
  titulo: "Visite a biblioteca – Biblioteca Municipal",
  corpo: `
<h1>Visite a biblioteca</h1>
<p>A Biblioteca Municipal fica na Rua das Acácias, 120, no Centro. O acesso é livre e não é preciso agendar.</p>
<button class="br-button secondary" type="button" id="ver-horario">Ver horário de funcionamento</button>`,
  depoisDoRodape: modal({
    id: "horario",
    titulo: "Horário de funcionamento",
    corpo: `      <p>Terça a sexta, das 9h às 18h.<br>Sábado, das 9h às 13h.<br>Fechada aos domingos, às segundas e nos feriados.</p>`,
    botoes: ENTENDI,
    tipo: "informativa",
  }),
  script: scriptHorario(),
});

// ---------------------------------------------------------------- F3-07
function paginaMenu(fecharPainel) {
  return pagina({
    titulo: "Acervo – Biblioteca Municipal",
    cabecalho: cabecalhoPadrao({ menu: GATILHO_MENU }),
    corpo: `
<h1>Acervo</h1>
<p>São mais de 18 mil títulos entre literatura, obras de referência, livros infantis e periódicos. Use o menu para navegar pelos serviços.</p>
<div class="secao">
  <h2>Mais emprestados no mês</h2>
  <ol>
    <li>Torto arado, de Itamar Vieira Junior</li>
    <li>Capitães da areia, de Jorge Amado</li>
    <li>A hora da estrela, de Clarice Lispector</li>
  </ol>
</div>`,
    depoisDoRodape: menuPrincipal({ fechar: fecharPainel }),
    script: scriptMenu({ focoAoAbrir: false }),
  });
}

// ---------------------------------------------------------------- F3-10
function paginaDuas(restauraMultas) {
  const MULTAS = modal({
    id: "multas",
    titulo: "Multas e pendências",
    corpo: `      <p>A multa é de R$ 0,50 por dia de atraso, por livro. Enquanto houver multa em aberto, novos empréstimos ficam bloqueados.</p>`,
    botoes: ENTENDI,
    tipo: "informativa",
  });
  return pagina({
    titulo: "Empréstimos – Biblioteca Municipal",
    corpo: `
<h1>Empréstimos</h1>
<p>O prazo padrão de empréstimo é de 14 dias. Leitores com cartão ativo podem ter até 5 livros ao mesmo tempo.</p>
<div class="acoes">
  <button class="br-button secondary" type="button" id="ver-regras">Ver regras de empréstimo</button>
  <button class="br-button secondary" type="button" id="ver-multas">Ver multas e pendências</button>
</div>
<div class="secao">
  <h2>Seus empréstimos</h2>
  ${lista()}
</div>`,
    depoisDoRodape: MODAL_REGRAS + "\n" + MULTAS,
    script:
      scriptModal({ id: "regras", invocador: "ver-regras", botaoFecha: ".br-modal-footer .br-button" }) +
      "\n" +
      scriptModal({ id: "multas", invocador: "ver-multas", restaurar: restauraMultas, botaoFecha: ".br-modal-footer .br-button" }),
  });
}

const naoAberto = (id) => dom(`document.getElementById('scrim-${id}').classList.contains('active')`, "igual", false, "diálogo fechado");

export const casos = [
  {
    caso: "F3-01",
    receita: ABRIR_FECHAR_REGRAS,
    gemeos: [
      {
        id: "F3-01-D",
        html: paginaRegras(false),
        fatos: {
          antes: [foco("#ver-regras")],
          "apos-abrir": [aberta("regras"), foco("#regras .br-modal-header .close")],
          "apos-fechar": [naoAberto("regras"), foco("body", "foco perdido para <body>")],
        },
      },
      {
        id: "F3-01-C",
        de: "F3-01-D",
        mudanca: "acrescenta só invocador.focus() no fechamento",
        trocas: TROCAS_RESTAURA,
        fatos: {
          antes: [foco("#ver-regras")],
          "apos-abrir": [aberta("regras"), foco("#regras .br-modal-header .close")],
          "apos-fechar": [naoAberto("regras"), foco("#ver-regras")],
        },
      },
    ],
  },
  {
    caso: "F3-02",
    receita: ABRIR("abrir-renovacao"),
    gemeos: [
      {
        id: "F3-02-D",
        html: paginaRenovar({ corpoModal: CORPO_RENOVAR, botoes: BOTOES_RENOVAR_02, foco: "" }),
        fatos: {
          "apos-abrir": [
            aberta("renovar"),
            dom("document.getElementById('renovar').dataset.tipo", "igual", "acao"),
            foco("#abrir-renovacao", "o foco fica no invocador, fora da modal"),
          ],
        },
      },
      {
        id: "F3-02-C",
        de: "F3-02-D",
        mudanca: "acrescenta só primario.focus()",
        trocas: [depois("    scrim.classList.add('active');\n", "    janela.querySelector('.br-modal-footer .primary').focus();\n")],
        fatos: { "apos-abrir": [aberta("renovar"), foco("#renovar .br-modal-footer .primary")] },
      },
      {
        id: "F3-02-Q",
        de: "F3-02-C",
        mudanca: "modal de entrada (campo 'Nova data') e foco no campo em vez do botão",
        nota: "subject do catálogo modal#renovar-data = #renovar nesta página",
        trocas: [
          [
            CORPO_RENOVAR,
            `      <p>Escolha a nova data de devolução. O prazo máximo é de 14 dias a partir de hoje.</p>\n${campo({ id: "nova-data", rotulo: "Nova data", tipo: "date", attrs: ' min="2026-10-16" max="2026-11-01"', classe: "br-input" })}`,
          ],
          ["    janela.querySelector('.br-modal-footer .primary').focus();\n", "    janela.querySelector('#nova-data').focus();\n"],
        ],
        fatos: { "apos-abrir": [aberta("renovar"), dom("!!document.querySelector('#renovar input#nova-data')", "igual", true), foco("#nova-data")] },
      },
    ],
  },
  {
    caso: "F3-03",
    receita: ABRIR("excluir-ferias"),
    gemeos: [
      {
        id: "F3-03-C",
        html: paginaListas(".br-modal-footer .secondary"),
        fatos: {
          "apos-abrir": [
            aberta("excluir-lista"),
            dom("document.getElementById('excluir-lista').dataset.tipo", "igual", "destrutiva"),
            foco("#excluir-lista .br-modal-footer .secondary"),
            dom("document.activeElement.innerText.trim()", "igual", "Cancelar"),
          ],
        },
      },
      {
        id: "F3-03-U",
        de: "F3-03-C",
        mudanca: "foco no primário (Excluir)",
        trocas: [["    janela.querySelector('.br-modal-footer .secondary').focus();\n", "    janela.querySelector('.br-modal-footer .primary').focus();\n"]],
        fatos: { "apos-abrir": [aberta("excluir-lista"), foco("#excluir-lista .br-modal-footer .primary"), dom("document.activeElement.innerText.trim()", "igual", "Excluir")] },
      },
    ],
  },
  {
    caso: "F3-04",
    receita: ABRIR("ver-horario"),
    gemeos: [
      {
        id: "F3-04-D",
        html: F3_04_D,
        fatos: {
          antes: [foco("#ver-horario")],
          "apos-abrir": [aberta("horario"), dom("document.getElementById('horario').dataset.tipo", "igual", "informativa"), foco("body", "o foco vai para <body>")],
        },
      },
      {
        id: "F3-04-C",
        de: "F3-04-D",
        mudanca: "acrescenta só fechar.focus()",
        trocas: [depois("    scrim.classList.add('active');\n", "    fechar.focus();\n")],
        fatos: { "apos-abrir": [aberta("horario"), foco("#horario .br-modal-header .close")] },
      },
    ],
  },
  {
    caso: "F3-05",
    receita: [
      { acao: "focar", alvo: "#abrir-renovacao" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-abrir" },
      { acao: "focar", alvo: "#renovar .br-modal-footer .secondary" },
      { acao: "capturar", nome: "no-ultimo" },
      { acao: "tecla", tecla: "Tab" },
      { acao: "capturar", nome: "apos-tab" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "apos-esc" },
    ],
    gemeos: [
      {
        id: "F3-05-D",
        html: paginaRenovar({ corpoModal: CORPO_RENOVAR, botoes: BOTOES_RENOVAR_05, foco: ".br-modal-footer .primary", laco: false, modalNoMain: true }),
        fatos: {
          "apos-abrir": [aberta("renovar"), foco("#renovar .br-modal-footer .primary")],
          "no-ultimo": [dom("document.activeElement.innerText.trim()", "igual", "Cancelar")],
          "apos-tab": [aberta("renovar"), foco("#rodape .links-rodape a:first-child", "Tab sai da modal para o link 'Acervo' atrás do fundo"), dom("document.activeElement.innerText.trim()", "igual", "Acervo")],
        },
      },
      {
        id: "F3-05-C",
        de: "F3-05-D",
        mudanca: "acrescenta só o laço de Tab",
        trocas: [
          depois(
            "  let origem = null;\n",
            "  function focaveis() {\n    return Array.from(janela.querySelectorAll('button, [href], input, select, textarea')).filter((el) => !el.disabled);\n  }\n",
          ),
          [
            "      fecharJanela();\n    }\n  });\n",
            "      fecharJanela();\n    }\n    if (e.key === 'Tab') {\n      const lista = focaveis();\n      const primeiro = lista[0];\n      const ultimo = lista[lista.length - 1];\n      if (e.shiftKey && document.activeElement === primeiro) {\n        e.preventDefault();\n        ultimo.focus();\n      } else if (!e.shiftKey && document.activeElement === ultimo) {\n        e.preventDefault();\n        primeiro.focus();\n      }\n    }\n  });\n",
          ],
        ],
        fatos: {
          "apos-abrir": [aberta("renovar"), foco("#renovar .br-modal-footer .primary")],
          "apos-tab": [aberta("renovar"), foco("#renovar .br-modal-header .close", "Tab volta para o X")],
          "apos-esc": [naoAberto("renovar"), foco("#abrir-renovacao", "Esc fecha: sem armadilha")],
        },
      },
    ],
  },
  {
    caso: "F3-07",
    receita: [
      { acao: "focar", alvo: "#abrir-menu" },
      { acao: "capturar", nome: "antes" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-abrir" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "apos-fechar" },
    ],
    gemeos: [
      {
        id: "F3-07-D",
        html: paginaMenu(true),
        fatos: {
          "apos-abrir": [
            dom("document.getElementById('menu-principal').classList.contains('active')", "igual", true),
            dom("!!document.querySelector('#menu-principal .menu-close button')", "igual", true, "painel com X"),
            foco("#abrir-menu", "o foco fica no botão de menu"),
          ],
          "apos-fechar": [dom("document.getElementById('menu-principal').classList.contains('active')", "igual", false)],
        },
      },
      {
        id: "F3-07-C",
        de: "F3-07-D",
        mudanca: "acrescenta só fechar.focus()",
        trocas: [depois("    botao.setAttribute('aria-expanded', 'true');\n", "    fechar.focus();\n")],
        fatos: {
          "apos-abrir": [dom("document.getElementById('menu-principal').classList.contains('active')", "igual", true), foco("#menu-principal .menu-close button")],
          "apos-fechar": [dom("document.getElementById('menu-principal').classList.contains('active')", "igual", false)],
        },
      },
      {
        id: "F3-07-N",
        de: "F3-07-D",
        mudanca: "remove o X do painel",
        trocas: [
          [
            `        <div class="menu-close">
          <button class="br-button circle" type="button" aria-label="Fechar o menu"><i class="fas fa-times" aria-hidden="true"></i></button>
        </div>
`,
            "",
          ],
        ],
        fatos: {
          "apos-abrir": [
            dom("document.getElementById('menu-principal').classList.contains('active')", "igual", true),
            dom("document.querySelector('#menu-principal .menu-close')", "igual", null, "painel sem X"),
          ],
        },
      },
    ],
  },
  {
    caso: "F3-10",
    receita: [
      { acao: "focar", alvo: "#ver-regras" },
      { acao: "capturar", nome: "antes-regras" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "regras-aberta" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "regras-fechada" },
      { acao: "focar", alvo: "#ver-multas" },
      { acao: "capturar", nome: "antes-multas" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "multas-aberta" },
      { acao: "tecla", tecla: "Escape" },
      { acao: "capturar", nome: "multas-fechada" },
    ],
    gemeos: [
      {
        id: "F3-10-D",
        html: paginaDuas(false),
        fatos: {
          "regras-aberta": [aberta("regras"), foco("#regras .br-modal-header .close")],
          "regras-fechada": [foco("#ver-regras")],
          "multas-aberta": [aberta("multas"), foco("#multas .br-modal-header .close")],
          "multas-fechada": [naoAberto("multas"), foco("body")],
        },
      },
      {
        id: "F3-10-C",
        de: "F3-10-D",
        mudanca: "muda só #multas (passa a restaurar)",
        trocas: [
          [
            "  const fechar = janela.querySelector('.br-modal-header .close');\n  function focaveis",
            "  const fechar = janela.querySelector('.br-modal-header .close');\n  let origem = null;\n  function focaveis",
          ],
          ["  function abrirJanela() {\n    scrim", "  function abrirJanela() {\n    origem = document.activeElement;\n    scrim"],
          ["    scrim.classList.remove('active');\n  }", "    scrim.classList.remove('active');\n    origem.focus();\n  }"],
        ],
        fatos: {
          "regras-fechada": [foco("#ver-regras")],
          "multas-fechada": [naoAberto("multas"), foco("#ver-multas")],
        },
      },
    ],
  },
  {
    caso: "F3-12",
    receita: ABRIR_FECHAR_REGRAS,
    gemeos: [
      {
        id: "F3-12-A",
        mesmaPagina: "F3-01-D",
        pacote: { tipo: "traco-sem-passo", passoRetirado: "antes", nota: "traço de foco começa depois de abrir" },
        fatos: { "apos-fechar": [foco("body")] },
      },
      {
        id: "F3-12-B",
        mesmaPagina: "F3-01-C",
        pacote: { tipo: "build-de", gemeoDaEvidencia: "F3-01-D", nota: "traço completo, mas do build de F3-01-D" },
        fatos: { "apos-fechar": [foco("#ver-regras")] },
      },
    ],
  },
];
