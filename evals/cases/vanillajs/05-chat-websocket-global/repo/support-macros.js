document.querySelectorAll('[data-macro]').forEach(function (b) { b.onclick = function () { window.Chat.send(b.dataset.macro); }; });
