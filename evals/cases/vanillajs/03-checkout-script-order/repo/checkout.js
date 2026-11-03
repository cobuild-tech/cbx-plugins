(function () {
  var form = document.getElementById('checkout');
  var DRAFT = 'checkout-draft';
  function prefill(values) { Object.keys(values).forEach(function (k) { if (form[k] && !form[k].value) form[k].value = values[k]; }); }
  var draft = JSON.parse(sessionStorage.getItem(DRAFT) || '{}'); prefill(draft);
  window.addEventListener('beforeunload', function () {
    sessionStorage.setItem(DRAFT, JSON.stringify({ email: form.email.value, country: form.country.value })); // never the card number
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    form.querySelector('button').disabled = true;            // prevent double charge
    fetch('/pay', { method: 'POST', body: new FormData(form) })
      .then(function (r) { if (r.ok) { sessionStorage.removeItem(DRAFT); location = '/thanks'; } else form.querySelector('button').disabled = false; });
    document.dispatchEvent(new Event('checkout:submit'));
  });
  window.App.checkout = { prefill: prefill };
  window.App.q.forEach(function (fn) { fn(); }); window.App.q = { push: function (fn) { fn(); } };
})();
