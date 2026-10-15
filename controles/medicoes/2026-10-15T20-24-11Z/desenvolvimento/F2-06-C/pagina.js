(function () {
  class BibTexto extends HTMLElement {
    constructor() {
      super();
      const raiz = this.attachShadow({ mode: 'closed' });
      raiz.innerHTML = '<span class="message-body">Na Semana do Livro, de 20 a 24 de outubro, a biblioteca abre às 8h.</span>';
    }
  }
  customElements.define('bib-texto', BibTexto);
})();
