/*
 * MODO MOCK — substitui assets/static-js/env.js no build `mock`.
 * Todos os endereços apontam para a PRÓPRIA origem, sob o base href, em
 * caminhos /__mock/... que o MockApiInterceptor atende sem rede. Nada aqui
 * aponta para pnip.mpa.gov.br, treinamento, Keycloak ou gov.br.
 */
(function (window) {
   window.__env = window.__env || {};
   var base = document.baseURI; // ex.: http://localhost:3000/pnip/
   var em = function (caminho) { return new URL(caminho, base).href.replace(/\/$/, ''); };

   window.__env.profile = 'mock';
   window.__env.url = {
      api: em('__mock/api'),
      apiOleoDiesel: em('__mock/oleo-diesel'),
      documentos: em('__mock/documentos'),
      home: base
   };
   window.__env.keycloak = {
      url: em('__mock/keycloak'),
      realm: 'pnip-mock',
      clientId: 'pnip-web-mock'
   };
   window.__env.signGov = {
      url: em('__mock/signgov/assinatura'),
      clientId: 'pnip-mock',
      certificado: em('__mock/signgov/sso'),
      confiabilidade: em('__mock/signgov/confiabilidades'),
      confiabilidadeAcesso: em('__mock/signgov/contas'),
      logout: em('__mock/signgov/logout')
   };

   // Configuração exclusiva do modo mock (ver src/mock/sessao/sessao-fake.ts)
   window.__env.mock = {
      perfilPadrao: 'anonimo',   // sessão quando nada foi escolhido via ?mock-perfil=
      perfilAoEntrar: 'cidadao', // perfil usado pelo botão "Entrar com gov.br"
      latenciaMs: 50,            // atraso simulado de cada resposta
      agora: '2026-03-16T09:30:00' // relógio congelado (hora local; assets/mock/relogio.js). null desliga
   };
}(this));
