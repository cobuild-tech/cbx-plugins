$('#booking').validate({
  rules: { name: { required: true, minlength: 2 }, ship_date: { required: true } },
  messages: { ship_date: 'Pick a weekday from tomorrow onward' }
});
$('#ship-date').on('change', function () {
  $.getJSON('/slots', { date: $(this).val() }, function (slots) {
    $('#slot').empty();
    $.each(slots, function (_, s) { $('#slot').append($('<option>').val(s.id).text(s.label)); });
  });
});
