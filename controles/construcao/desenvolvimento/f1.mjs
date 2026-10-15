// F1 — associação controle↔descrição/erro (casos de desenvolvimento).
import { pagina, campo } from "../comum.mjs";
import { ax, dom, foco, depois, antes } from "../dsl.mjs";

export const SUCESSO_CARTAO =
  '<div class="br-message success"><div class="icon"><i class="fas fa-check-circle fa-lg" aria-hidden="true"></i></div><div class="content"><span class="message-title">Cartão encontrado.</span><span class="message-body"> Você tem 2 livros que podem ser renovados.</span></div></div>';

/** Formulário de um campo (número do cartão). O script vem pronto de cada caso. */
export function paginaCartao(script) {
  return pagina({
    titulo: "Renovar empréstimos – Biblioteca Municipal",
    corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Renovar empréstimos</h1>
    <p>Informe o número do seu cartão da biblioteca para ver os livros que podem ser renovados.</p>
    <form id="form-renovacao" novalidate>
${campo({ id: "cartao", rotulo: "Número do cartão", attrs: ' inputmode="numeric" autocomplete="off"' })}
      <button class="br-button primary" type="submit">Consultar empréstimos</button>
    </form>
    <div id="resultado" class="mt-4" role="status"></div>
  </div>
</div>`,
    script,
  });
}

/** Validação com mensagem genérica, sem ligação programática (base de F1-01, F1-03). */
export const SCRIPT_CARTAO = `const formulario = document.getElementById('form-renovacao');
const campo = document.getElementById('cartao');
const caixa = campo.closest('.br-input');
const resultado = document.getElementById('resultado');
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const anterior = document.getElementById('cartao-erro');
  if (anterior) anterior.remove();
  caixa.classList.remove('danger');
  resultado.innerHTML = '';
  if (!/^\\d{8}$/.test(campo.value.trim())) {
    caixa.classList.add('danger');
    const mensagem = document.createElement('span');
    mensagem.className = 'feedback danger';
    mensagem.id = 'cartao-erro';
    mensagem.innerHTML = '<i class="fas fa-times-circle" aria-hidden="true"></i>Valor inválido.';
    caixa.appendChild(mensagem);
    return;
  }
  resultado.innerHTML = '${SUCESSO_CARTAO}';
});`;

/** Trocas que acrescentam aria-invalid + aria-describedby (F1-01-C e derivados). */
export const TROCAS_ASSOCIA = [
  depois("  caixa.classList.remove('danger');\n", "  campo.removeAttribute('aria-invalid');\n  campo.removeAttribute('aria-describedby');\n"),
  depois("    caixa.appendChild(mensagem);\n", "    campo.setAttribute('aria-invalid', 'true');\n    campo.setAttribute('aria-describedby', 'cartao-erro');\n"),
];

const ENVIAR_12 = [
  { acao: "preencher", alvo: "#cartao", valor: "12" },
  { acao: "capturar", nome: "antes-de-enviar" },
  { acao: "clicar", alvo: "#form-renovacao button[type=submit]" },
  { acao: "capturar", nome: "apos-enviar" },
];

const BORDA = "getComputedStyle(document.getElementById('cartao')).borderTopColor";
const MSG = "(document.getElementById('cartao-erro') || {}).textContent";

export const casos = [
  {
    caso: "F1-01",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-01-D",
        html: paginaCartao(SCRIPT_CARTAO),
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido.", "mensagem genérica inserida após enviar"),
            dom(`/cart[aã]o/i.test(${MSG})`, "igual", false, "a mensagem não nomeia o campo"),
            ax("#cartao", "invalido", "igual", false),
            ax("#cartao", "descricao", "vazio"),
            dom(BORDA, "diferenteDaCaptura", "antes-de-enviar", "a borda muda de cor (cor como indicação)"),
          ],
        },
      },
      {
        id: "F1-01-C",
        de: "F1-01-D",
        mudanca: "acrescenta só aria-invalid e aria-describedby",
        trocas: TROCAS_ASSOCIA,
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            ax("#cartao", "invalido", "igual", true),
            ax("#cartao", "descricao", "igual", "Valor inválido."),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-03",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-03-D",
        html: paginaCartao(
          SCRIPT_CARTAO.replace(
            "    caixa.appendChild(mensagem);\n",
            "    caixa.appendChild(mensagem);\n    campo.setAttribute('aria-describedby', 'cartao-erros');\n",
          ),
        ),
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            dom("document.getElementById('cartao').getAttribute('aria-describedby')", "igual", "cartao-erros"),
            dom("document.getElementById('cartao-erros')", "igual", null, "IDREF não resolve"),
            ax("#cartao", "descricao", "vazio"),
            ax("#cartao", "invalido", "igual", false),
          ],
        },
      },
      {
        id: "F1-03-C",
        de: "F1-03-D",
        mudanca: "corrige só o IDREF",
        trocas: [["'aria-describedby', 'cartao-erros'", "'aria-describedby', 'cartao-erro'"]],
        fatos: {
          "apos-enviar": [ax("#cartao", "descricao", "igual", "Valor inválido."), ax("#cartao", "invalido", "igual", false)],
        },
      },
    ],
  },
  {
    caso: "F1-07",
    receita: [{ acao: "capturar", nome: "inicial" }],
    gemeos: [
      {
        id: "F1-07-N",
        html: paginaObservacoes(""),
        fatos: {
          inicial: [
            ax("#observacoes", "nome", "igual", "Observações para a equipe"),
            ax("#observacoes", "descricao", "vazio"),
            dom("document.body.innerText.includes('Até 200 caracteres')", "igual", false, "sem texto auxiliar"),
          ],
        },
      },
      {
        id: "F1-07-U",
        de: "F1-07-N",
        mudanca: "acrescenta só o texto auxiliar",
        trocas: [depois('<textarea id="observacoes" name="observacoes" rows="3"></textarea>', '\n  <p class="texto-auxiliar mb-0">Até 200 caracteres.</p>')],
        fatos: {
          inicial: [
            dom("document.querySelector('.texto-auxiliar').innerText.trim()", "igual", "Até 200 caracteres."),
            dom("document.querySelector('.texto-auxiliar').getBoundingClientRect().height > 0", "igual", true, "visível"),
            ax("#observacoes", "descricao", "vazio"),
            dom("document.getElementById('observacoes').hasAttribute('aria-describedby')", "igual", false),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-08",
    receita: [
      { acao: "preencher", alvo: "#cartao", valor: "12" },
      { acao: "preencher", alvo: "#email", valor: "ana@" },
      { acao: "preencher", alvo: "#telefone", valor: "123" },
      { acao: "capturar", nome: "antes-de-enviar" },
      { acao: "clicar", alvo: "#form-contato button[type=submit]" },
      { acao: "capturar", nome: "apos-enviar" },
    ],
    gemeos: [
      {
        id: "F1-08-D",
        html: paginaContato(),
        fatos: {
          "apos-enviar": [
            ax("#cartao", "invalido", "igual", true),
            ax("#cartao", "descricao", "naoVazio"),
            ax("#email", "invalido", "igual", true),
            ax("#email", "descricao", "naoVazio"),
            dom("document.getElementById('telefone-erro').textContent.trim()", "igual", "Valor inválido."),
            dom("/telefone/i.test(document.getElementById('telefone-erro').textContent)", "igual", false, "a mensagem não nomeia o campo"),
            ax("#telefone", "invalido", "igual", false),
            ax("#telefone", "descricao", "vazio"),
            dom("getComputedStyle(document.getElementById('telefone')).borderTopColor", "diferenteDaCaptura", "antes-de-enviar"),
          ],
        },
      },
      {
        id: "F1-08-C",
        de: "F1-08-D",
        mudanca: "muda só #telefone (aria-invalid + aria-describedby como nos outros)",
        trocas: [
          depois("    marcar(telefone, 'Valor inválido.');\n", "    telefone.setAttribute('aria-invalid', 'true');\n    telefone.setAttribute('aria-describedby', 'telefone-erro');\n"),
        ],
        fatos: {
          "apos-enviar": [
            ax("#cartao", "invalido", "igual", true),
            ax("#email", "invalido", "igual", true),
            ax("#telefone", "invalido", "igual", true),
            ax("#telefone", "descricao", "igual", "Valor inválido."),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-09",
    gemeos: [
      {
        id: "F1-09-A",
        mesmaPagina: "F1-01-D",
        pacote: {
          tipo: "estado-diferente",
          declarado: "apos-enviar",
          entregue: "antes-de-enviar",
          nota: "evidência do estado inicial: a mensagem ainda não existe",
        },
        receita: ENVIAR_12,
        fatos: {
          "antes-de-enviar": [dom("document.getElementById('cartao-erro')", "igual", null, "a mensagem não existe no estado entregue")],
          "apos-enviar": [dom(`${MSG}.trim()`, "igual", "Valor inválido.", "o estado declarado existe, mas não é o entregue")],
        },
      },
      {
        id: "F1-09-B",
        mesmaPagina: "F1-01-C",
        pacote: { tipo: "build-de", gemeoDaEvidencia: "F1-01-D", nota: "evidência certa de estado, mas do build de F1-01-D" },
        receita: ENVIAR_12,
        fatos: { "apos-enviar": [ax("#cartao", "invalido", "igual", true)] },
      },
    ],
  },
  {
    caso: "F1-10",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-10-N",
        html: paginaCartao(`const formulario = document.getElementById('form-renovacao');
const resultado = document.getElementById('resultado');
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  resultado.innerHTML = '${SUCESSO_CARTAO}';
});`),
        fatos: {
          "apos-enviar": [
            dom("document.getElementById('cartao-erro')", "igual", null, "nenhum erro detectado"),
            dom("document.querySelector('.br-input').classList.contains('danger')", "igual", false),
            ax("#cartao", "invalido", "igual", false),
            dom("document.getElementById('resultado').innerText.includes('Cartão encontrado')", "igual", true, "aceita '12' e mostra sucesso"),
          ],
        },
      },
      {
        id: "F1-10-C",
        de: "F1-10-N",
        mudanca: "acrescenta validação + mensagem associada",
        trocas: [
          [
            "const formulario = document.getElementById('form-renovacao');\nconst resultado",
            "const formulario = document.getElementById('form-renovacao');\nconst campo = document.getElementById('cartao');\nconst caixa = campo.closest('.br-input');\nconst resultado",
          ],
          [
            "  evento.preventDefault();\n  resultado.innerHTML",
            `  evento.preventDefault();
  const anterior = document.getElementById('cartao-erro');
  if (anterior) anterior.remove();
  caixa.classList.remove('danger');
  campo.removeAttribute('aria-invalid');
  campo.removeAttribute('aria-describedby');
  resultado.innerHTML = '';
  if (!/^\\d{8}$/.test(campo.value.trim())) {
    caixa.classList.add('danger');
    const mensagem = document.createElement('span');
    mensagem.className = 'feedback danger';
    mensagem.id = 'cartao-erro';
    mensagem.innerHTML = '<i class="fas fa-times-circle" aria-hidden="true"></i>Valor inválido.';
    caixa.appendChild(mensagem);
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', 'cartao-erro');
    return;
  }
  resultado.innerHTML`,
          ],
        ],
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Valor inválido."),
            ax("#cartao", "invalido", "igual", true),
            ax("#cartao", "descricao", "igual", "Valor inválido."),
            dom("document.getElementById('resultado').innerText.trim()", "igual", ""),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-11",
    receita: ENVIAR_12,
    gemeos: [
      {
        id: "F1-11-D",
        html: paginaCartao(`const formulario = document.getElementById('form-renovacao');
const campo = document.getElementById('cartao');
const caixa = campo.closest('.br-input');
const resultado = document.getElementById('resultado');
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  caixa.classList.remove('danger');
  resultado.innerHTML = '';
  if (!/^\\d{8}$/.test(campo.value.trim())) {
    caixa.classList.add('danger');
    return;
  }
  resultado.innerHTML = '${SUCESSO_CARTAO}';
});`),
        fatos: {
          "apos-enviar": [
            dom("document.querySelector('.br-input').innerText.trim()", "igual", "Número do cartão", "nenhum texto além do rótulo"),
            dom("document.getElementById('resultado').innerText.trim()", "igual", ""),
            dom(BORDA, "diferenteDaCaptura", "antes-de-enviar", "só a borda muda"),
            ax("#cartao", "invalido", "igual", false),
            ax("#cartao", "descricao", "vazio"),
          ],
        },
      },
      {
        id: "F1-11-C",
        de: "F1-11-D",
        mudanca: "acrescenta só a mensagem (nomeia o campo, ligada por aria-describedby)",
        trocas: [
          depois("  evento.preventDefault();\n", "  const anterior = document.getElementById('cartao-erro');\n  if (anterior) anterior.remove();\n  campo.removeAttribute('aria-describedby');\n"),
          depois(
            "    caixa.classList.add('danger');\n",
            "    const mensagem = document.createElement('span');\n    mensagem.className = 'feedback danger';\n    mensagem.id = 'cartao-erro';\n    mensagem.innerHTML = '<i class=\"fas fa-times-circle\" aria-hidden=\"true\"></i>Número do cartão: informe 8 dígitos.';\n    caixa.appendChild(mensagem);\n    campo.setAttribute('aria-describedby', 'cartao-erro');\n",
          ),
        ],
        fatos: {
          "apos-enviar": [
            dom(`${MSG}.trim()`, "igual", "Número do cartão: informe 8 dígitos."),
            ax("#cartao", "descricao", "igual", "Número do cartão: informe 8 dígitos."),
          ],
        },
      },
    ],
  },
  {
    caso: "F1-12",
    receita: [
      { acao: "preencher", alvo: "#cartao", valor: "12" },
      { acao: "preencher", alvo: "#email", valor: "ana@" },
      { acao: "focar", alvo: "#form-reserva button[type=submit]" },
      { acao: "tecla", tecla: "Enter" },
      { acao: "capturar", nome: "apos-enviar" },
    ],
    gemeos: [
      {
        id: "F1-12-D",
        html: paginaReserva(),
        fatos: {
          "apos-enviar": [
            dom("document.getElementById('resumo-erros').innerText.includes('2 campos precisam de correção')", "igual", true),
            ax("#resumo-erros", "papel", "em", ["generic", "none", "Section", "GenericContainer"]),
            ax("#resumo-erros", "live", "ausente"),
            foco("#form-reserva button[type=submit]"),
            ax("#cartao", "invalido", "igual", true),
            ax("#email", "invalido", "igual", true),
          ],
        },
      },
      {
        id: "F1-12-C",
        de: "F1-12-D",
        mudanca: "acrescenta só role=alert no contêiner",
        trocas: [['<div id="resumo-erros" class="mb-3"></div>', '<div id="resumo-erros" class="mb-3" role="alert"></div>']],
        fatos: {
          "apos-enviar": [
            ax("#resumo-erros", "papel", "igual", "alert"),
            ax("#resumo-erros", "live", "igual", "assertive"),
            foco("#form-reserva button[type=submit]"),
          ],
        },
      },
      {
        id: "F1-12-X",
        de: "F1-12-D",
        mudanca: "move o foco para o resumo (tabindex=-1) em vez de role",
        trocas: [
          ['<div id="resumo-erros" class="mb-3"></div>', '<div id="resumo-erros" class="mb-3" tabindex="-1"></div>'],
          depois("      ' de correção.</span><span class=\"message-body\"> Revise os campos marcados abaixo.</span></div></div>';\n", "    resumo.focus();\n"),
        ],
        fatos: {
          "apos-enviar": [foco("#resumo-erros"), ax("#resumo-erros", "live", "ausente"), ax("#resumo-erros", "papel", "em", ["generic", "none", "Section", "GenericContainer"])],
        },
      },
    ],
  },
];

export function paginaObservacoes(extra) {
  return pagina({
    titulo: "Reservar livro – Biblioteca Municipal",
    corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Reservar livro</h1>
    <p><strong>Quarto de despejo</strong>, de Carolina Maria de Jesus. Primeiro exemplar disponível a partir de 22/10/2026.</p>
    <form id="form-reserva" novalidate>
<div class="br-textarea mb-3">
  <label for="observacoes">Observações para a equipe</label>
  <textarea id="observacoes" name="observacoes" rows="3"></textarea>${extra}
</div>
      <button class="br-button primary" type="button">Confirmar reserva</button>
    </form>
  </div>
</div>`,
  });
}

function paginaContato() {
  return pagina({
    titulo: "Atualizar dados de contato – Biblioteca Municipal",
    corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Atualizar dados de contato</h1>
    <p>Mantenha seus dados em dia para receber os avisos de devolução e de reservas disponíveis.</p>
    <form id="form-contato" novalidate>
${campo({ id: "cartao", rotulo: "Número do cartão", attrs: ' inputmode="numeric" autocomplete="off"' })}
${campo({ id: "email", rotulo: "E-mail", tipo: "email", attrs: ' autocomplete="email"' })}
${campo({ id: "telefone", rotulo: "Telefone", tipo: "tel", attrs: ' autocomplete="tel"' })}
      <button class="br-button primary" type="submit">Salvar dados</button>
    </form>
    <div id="resultado" class="mt-4" role="status"></div>
  </div>
</div>`,
    script: `const formulario = document.getElementById('form-contato');
const cartao = document.getElementById('cartao');
const email = document.getElementById('email');
const telefone = document.getElementById('telefone');
const resultado = document.getElementById('resultado');
function marcar(campo, texto) {
  const caixa = campo.closest('.br-input');
  caixa.classList.add('danger');
  const mensagem = document.createElement('span');
  mensagem.className = 'feedback danger';
  mensagem.id = campo.id + '-erro';
  mensagem.innerHTML = '<i class="fas fa-times-circle" aria-hidden="true"></i>' + texto;
  caixa.appendChild(mensagem);
}
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  resultado.innerHTML = '';
  [cartao, email, telefone].forEach((campo) => {
    campo.closest('.br-input').classList.remove('danger');
    campo.removeAttribute('aria-invalid');
    campo.removeAttribute('aria-describedby');
    const anterior = document.getElementById(campo.id + '-erro');
    if (anterior) anterior.remove();
  });
  let erros = 0;
  if (!/^\\d{8}$/.test(cartao.value.trim())) {
    marcar(cartao, 'Informe os 8 dígitos impressos no cartão.');
    cartao.setAttribute('aria-invalid', 'true');
    cartao.setAttribute('aria-describedby', 'cartao-erro');
    erros += 1;
  }
  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email.value.trim())) {
    marcar(email, 'Use o formato nome@provedor.com.br.');
    email.setAttribute('aria-invalid', 'true');
    email.setAttribute('aria-describedby', 'email-erro');
    erros += 1;
  }
  if (!/^\\d{10,11}$/.test(telefone.value.replace(/\\D/g, ''))) {
    marcar(telefone, 'Valor inválido.');
    erros += 1;
  }
  if (erros === 0) {
    resultado.textContent = 'Dados atualizados.';
  }
});`,
  });
}

function paginaReserva() {
  return pagina({
    titulo: "Reservar livro – Biblioteca Municipal",
    corpo: `
<div class="row">
  <div class="col-md-8 col-lg-6">
    <h1>Reservar livro</h1>
    <p><strong>Vidas secas</strong>, de Graciliano Ramos. Avisaremos por e-mail quando o exemplar estiver separado.</p>
    <div id="resumo-erros" class="mb-3"></div>
    <form id="form-reserva" novalidate>
${campo({ id: "cartao", rotulo: "Número do cartão", attrs: ' inputmode="numeric" autocomplete="off"' })}
${campo({ id: "email", rotulo: "E-mail para aviso", tipo: "email", attrs: ' autocomplete="email"' })}
      <button class="br-button primary" type="submit">Reservar</button>
    </form>
    <div id="resultado" class="mt-4" role="status"></div>
  </div>
</div>`,
    script: `const formulario = document.getElementById('form-reserva');
const resumo = document.getElementById('resumo-erros');
const resultado = document.getElementById('resultado');
const campos = [
  { el: document.getElementById('cartao'), ok: (v) => /^\\d{8}$/.test(v), texto: 'Informe os 8 dígitos impressos no cartão.' },
  { el: document.getElementById('email'), ok: (v) => /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v), texto: 'Use o formato nome@provedor.com.br.' },
];
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  resumo.innerHTML = '';
  resultado.innerHTML = '';
  let erros = 0;
  campos.forEach(({ el, ok, texto }) => {
    const caixa = el.closest('.br-input');
    const anterior = document.getElementById(el.id + '-erro');
    if (anterior) anterior.remove();
    caixa.classList.remove('danger');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    if (ok(el.value.trim())) return;
    erros += 1;
    caixa.classList.add('danger');
    const mensagem = document.createElement('span');
    mensagem.className = 'feedback danger';
    mensagem.id = el.id + '-erro';
    mensagem.innerHTML = '<i class="fas fa-times-circle" aria-hidden="true"></i>' + texto;
    caixa.appendChild(mensagem);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', mensagem.id);
  });
  if (erros > 0) {
    resumo.innerHTML = '<div class="br-message danger"><div class="icon"><i class="fas fa-times-circle fa-lg" aria-hidden="true"></i></div>' +
      '<div class="content"><span class="message-title">' + erros + (erros === 1 ? ' campo precisa' : ' campos precisam') +
      ' de correção.</span><span class="message-body"> Revise os campos marcados abaixo.</span></div></div>';
    return;
  }
  resultado.textContent = 'Reserva registrada.';
});`,
  });
}
