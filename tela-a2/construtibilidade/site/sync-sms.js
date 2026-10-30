// Implementação independente do vínculo do switch de SMS (variante de a2-615adba6e634): o data-child do SMS
// não casa com o data-parent; este script refaz o estado do principal a partir dos DOIS switches e propaga ao
// SMS só a ação da própria pessoa no principal (clique confiável: mouse, rótulo ou Espaço), nunca a
// sincronização que o core dispara. Registrado depois do core: roda depois do Checkgroup em cada evento.
// Revisão Codex 3: durante a propagação do clique no principal o core muda o e-mail e dispara 'change' nele;
// esse recálculo intermediário não pode decidir o estado do principal (era o que deixava o principal
// intermediário e o SMS ligado ao desmarcar tudo).
(function () {
  var p = document.getElementById('chk-todos'), e = document.getElementById('swt-email'), s = document.getElementById('swt-sms');
  var userClick = false;
  function recompute() {
    var on = [e.checked, s.checked].filter(Boolean).length;
    if (on === 2) { p.removeAttribute('indeterminate'); p.indeterminate = false; p.checked = true; }
    else if (on === 0) { p.removeAttribute('indeterminate'); p.indeterminate = false; p.checked = false; }
    else { p.setAttribute('indeterminate', ''); p.indeterminate = true; p.checked = true; }
  }
  e.addEventListener('change', function () { if (!userClick) recompute(); });
  s.addEventListener('change', function () { if (!userClick) recompute(); });
  p.addEventListener('click', function (ev) { userClick = ev.isTrusted; });
  p.addEventListener('change', function () {
    if (!userClick) return;
    var target = p.checked;
    if (s.checked !== target) { s.checked = target; s.dispatchEvent(new Event('change')); }
    userClick = false;
    recompute();
  });
})();
