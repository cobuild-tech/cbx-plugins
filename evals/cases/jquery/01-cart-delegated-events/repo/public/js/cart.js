$(document).on('click', '.cart .remove', function (e) {
  e.preventDefault();
  var $row = $(this).closest('tr');
  $.post('/cart/remove', { id: $row.data('id') }).done(function () {
    $row.fadeOut(200, function () { $row.remove(); updateTotal(); });
  });
});

function updateTotal() {
  var t = 0;
  $('.cart tr').each(function () { t += +$(this).data('price') * +$(this).find('.qty').val(); });
  $('#total').text(t.toFixed(2));
  $('#checkout').prop('disabled', t === 0);
  $(document).trigger('cart:updated', [t]);
}

$('.cart .qty').on('change', updateTotal);
updateTotal();
