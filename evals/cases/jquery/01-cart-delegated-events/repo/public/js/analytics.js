// Owned by the growth team; stays on jQuery.
$(document).on('cart:updated', function (e, total) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'cart_total', value: total });
});
