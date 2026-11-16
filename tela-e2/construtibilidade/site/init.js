(function () {
  var c = window.core;
  document.querySelectorAll('.br-message').forEach(function (el) { new c.BRAlert('br-message', el); });
  document.querySelectorAll('.br-select').forEach(function (el) { new c.BRSelect('br-select', el); });
  var msg = document.getElementById('msg-orientacao');
  var pai = msg.parentNode, depois = msg.nextSibling;
  document.getElementById('btn-ajuda').addEventListener('click', function () { if (!document.getElementById('msg-orientacao')) pai.insertBefore(msg, depois); msg.style.display = ''; msg.focus && msg.focus(); });
  var sw = document.getElementById('swt-cert');
  var sync = function () { sw.setAttribute('aria-checked', sw.checked ? 'true' : 'false'); };
  sync(); sw.addEventListener('change', sync);
  document.getElementById('form-pais').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var erros = 0;
    var nome = document.getElementById('nome-pais');
    var okNome = nome.value.trim() !== '';
    document.getElementById('inp-nome-pais').classList.toggle('danger', !okNome); document.getElementById('nome-pais-msg').hidden = okNome; nome.setAttribute('aria-invalid', okNome ? 'false' : 'true'); if (!okNome) erros++;
    var cont = document.getElementById('continente');
    var okCont = cont.value.trim() !== '';
    document.querySelector('#sel-continente .br-input').classList.toggle('danger', !okCont); document.getElementById('continente-msg').hidden = okCont; cont.setAttribute('aria-invalid', okCont ? 'false' : 'true'); if (!okCont) erros++;
    var okSit = !!document.querySelector('input[name=situacao]:checked');
    document.getElementById('situacao-msg').hidden = okSit; if (!okSit) erros++;
    document.getElementById('msg-erro').hidden = erros === 0;
  });
})();
