// Implementação independente do vínculo do switch de SMS (variante de a2-615adba6e634): o data-child do SMS
// não casa com o data-parent; este script refaz o estado do principal a partir dos DOIS switches e propaga ao
// SMS só a ação da própria pessoa no principal (clique confiável), nunca a sincronização que o core dispara.
// Registrado depois do core: roda depois do Checkgroup em cada evento.
(function () {
  var p = document.getElementById('chk-todos'), e = document.getElementById('swt-email'), s = document.getElementById('swt-sms');
  var userClick = false;
  function recompute() {
    var on = [e.checked, s.checked].filter(Boolean).length;
    if (on === 2) { p.removeAttribute('indeterminate'); p.indeterminate = false; p.checked = true; }
    else if (on === 0) { p.removeAttribute('indeterminate'); p.indeterminate = false; p.checked = false; }
    else { p.setAttribute('indeterminate', ''); p.indeterminate = true; p.checked = true; }
  }
  e.addEventListener('change', recompute);
  s.addEventListener('change', recompute);
  p.addEventListener('click', function (ev) { userClick = ev.isTrusted; });
  p.addEventListener('change', function () {
    if (!userClick) return;
    userClick = false;
    if (s.checked !== p.checked) { s.checked = p.checked; s.dispatchEvent(new Event('change')); }
    recompute();
  });
})();
