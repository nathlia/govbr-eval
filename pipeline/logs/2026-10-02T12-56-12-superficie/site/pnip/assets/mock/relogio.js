/*
 * MODO MOCK — relógio congelado.
 *
 * `new Date()` e `Date.now()` passam a partir de window.__env.mock.agora (hora LOCAL,
 * padrão 2026-03-16T09:30:00) e avançam com o tempo real decorrido desde a carga da página.
 * Assim "hoje", "Última atualização", prazos e as datas relativas das fixtures ficam iguais em
 * toda carga. Datas explícitas (`new Date(2025, 0, 1)`, `new Date('2026-01-01')`) não mudam.
 * Carregado antes de qualquer bundle (index.mock.html), então todo o app vê o mesmo Date.
 */
(function () {
   var cfg = (window.__env && window.__env.mock) || {};
   if (cfg.agora === null) return; // desligado explicitamente
   var RealDate = window.Date;
   var base = RealDate.parse(cfg.agora || '2026-03-16T09:30:00');
   if (isNaN(base)) return;
   var t0 = RealDate.now();
   var agoraMs = function () { return base + (RealDate.now() - t0); };

   function MockDate() {
      var args = Array.prototype.slice.call(arguments);
      if (!(this instanceof MockDate)) return new RealDate(agoraMs()).toString(); // Date() chamado como função
      if (args.length === 0) return new RealDate(agoraMs());
      return new (Function.prototype.bind.apply(RealDate, [null].concat(args)))();
   }
   MockDate.prototype = RealDate.prototype;
   MockDate.now = agoraMs;
   MockDate.parse = RealDate.parse;
   MockDate.UTC = RealDate.UTC;
   Object.defineProperty(MockDate, Symbol.hasInstance, { value: function (v) { return v instanceof RealDate; } });
   window.Date = MockDate;
   window.__pnipMockRelogio = { agora: cfg.agora || '2026-03-16T09:30:00', RealDate: RealDate };
})();
