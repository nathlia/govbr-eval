/*
 * MODO MOCK — stub do Google Maps JS API.
 *
 * Em produção, src/index.html carrega maps.googleapis.com e o @ngui/map carrega
 * maps.google.com sob demanda. No modo mock nenhuma requisição externa é
 * permitida: este stub define window.google.maps (o @ngui/map então não injeta
 * o script) com um objeto "absorvente" — qualquer propriedade, chamada ou
 * `new` devolve outro objeto absorvente — para as telas com mapa renderizarem
 * sem erro. O contêiner do mapa recebe um aviso cinza no lugar dos tiles.
 */
(function () {
   var PASSIVAS = { then: true, toJSON: true, constructor: false };

   function absorvente(nome) {
      var alvo = function () {};
      return new Proxy(alvo, {
         get: function (_t, prop) {
            if (prop === Symbol.toPrimitive) return function () { return 0; };
            if (prop === 'toString' || prop === 'valueOf') return function () { return '[google.maps mock ' + nome + ']'; };
            if (typeof prop === 'symbol' || PASSIVAS[prop]) return undefined;
            if (prop === 'OK') return 'OK';
            return absorvente(nome + '.' + String(prop));
         },
         apply: function () { return absorvente(nome + '()'); },
         construct: function (_t, args) {
            var el = args && args[0];
            if (/\.Map$/.test(nome) && el && el.nodeType === 1) {
               el.setAttribute('data-pnip-mock', 'mapa-desativado');
               el.style.background = '#e6e6e6';
               el.style.display = el.style.display || 'block';
               el.style.minHeight = el.style.minHeight || '200px';
               var aviso = document.createElement('div');
               aviso.textContent = 'Mapa desativado (modo mock)';
               aviso.style.cssText = 'padding:16px;color:#555;font:14px sans-serif;text-align:center';
               el.appendChild(aviso);
            }
            return absorvente('new ' + nome);
         }
      });
   }

   // O namespace precisa ser `typeof 'object'`: é o que o @ngui/map (isMapsApiLoaded) confere antes
   // de decidir injetar o script do maps.google.com. Os membros continuam absorventes (construíveis).
   window.google = window.google || {};
   window.google.maps = new Proxy({}, {
      get: function (_t, prop) {
         if (typeof prop === 'symbol' || PASSIVAS[prop]) return undefined;
         return absorvente('google.maps.' + String(prop));
      }
   });
})();
