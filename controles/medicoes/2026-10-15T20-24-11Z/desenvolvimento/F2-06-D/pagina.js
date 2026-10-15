(function () {
  class BibTexto extends HTMLElement {
    constructor() {
      super();
      const raiz = this.attachShadow({ mode: 'closed' });
      raiz.innerHTML = '<span class="message-body"></span>';
    }
  }
  customElements.define('bib-texto', BibTexto);
})();
