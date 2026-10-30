(function () {
  var c = window.core;
  document.querySelectorAll('.br-message').forEach(function (el) { new c.BRAlert('br-message', el); });
  document.querySelectorAll('.br-tooltip').forEach(function (el) { new c.BRTooltip('br-tooltip', el); });
  document.querySelectorAll('.br-step').forEach(function (el) { new c.BRStep('br-step', el); });
  document.querySelectorAll('.br-select').forEach(function (el) { new c.BRSelect('br-select', el); });
  document.querySelectorAll('.br-checkbox').forEach(function (el) { new c.BRCheckbox('br-checkbox', el); });
  document.querySelectorAll('.br-accordion').forEach(function (el) { new c.BRAccordion('br-accordion', el); });
  // switch: o core 3.7.0 não mantém o atributo aria-checked; a página o mantém (decisão de construção)
  document.querySelectorAll('.br-switch input[role="switch"]').forEach(function (i) {
    var sync = function () { i.setAttribute('aria-checked', i.checked ? 'true' : 'false'); };
    sync(); i.addEventListener('change', sync);
  });
})();
