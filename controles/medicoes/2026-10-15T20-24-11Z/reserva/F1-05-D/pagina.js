(function () {
  const raizes = new WeakMap();
  class BibCampo extends HTMLElement {
    constructor() {
      super();
      const raiz = this.attachShadow({ mode: 'closed' });
      raizes.set(this, raiz);
      raiz.innerHTML = '<link rel="stylesheet" href="../recursos/core.min.css"><link rel="stylesheet" href="../recursos/fontawesome/css/all.min.css">' +
        '<div class="br-input"><label for="campo">Número do cartão</label><input id="campo" name="cartao" type="text" inputmode="numeric" autocomplete="off"></div>';
    }
    get valor() {
      return raizes.get(this).getElementById('campo').value;
    }
    limpar() {
      const raiz = raizes.get(this);
      const anterior = document.getElementById('cartao-erro');
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
      this.insertAdjacentElement('afterend', mensagem);
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
    if (!/^\d{8}$/.test(entrada.valor.trim())) {
      entrada.mostrarErro('Valor inválido.');
      return;
    }
    resultado.textContent = 'Cartão encontrado. Você tem 2 livros que podem ser renovados.';
  });
})();
