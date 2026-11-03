var timer;
$('#post-form').on('input change', ':input', function () {
  $('#post-form').addClass('dirty');
  clearTimeout(timer);
  timer = setTimeout(function () {
    $.ajax({ url: '/posts/42/autosave', type: 'PATCH', data: $('#post-form').serialize() })
      .done(function () { $('#post-form').removeClass('dirty'); $('.save-status').text('Saved'); })
      .fail(function () { $('.save-status').text('Not saved'); });
  }, 1000);
});
