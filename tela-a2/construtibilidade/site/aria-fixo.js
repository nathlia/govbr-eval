document.querySelectorAll('.br-switch input[role="switch"]').forEach(function (i) { i.addEventListener('change', function () { i.setAttribute('aria-checked', 'false'); }); });
