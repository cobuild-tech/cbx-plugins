var lastSeen = 0;
function poll() {
  $.getJSON('/notifications', { since: lastSeen }, function (items) {
    $.each(items, function (_, n) {
      $('#notif-list').prepend('<li data-id="' + n.id + '">' + n.html + '</li>');
      lastSeen = Math.max(lastSeen, n.id);
    });
    $('#notif-count').text($('#notif-list li').length).toggle($('#notif-list li').length > 0);
  });
}
setInterval(poll, 15000);
poll();
$('#notif-list').on('click', 'li', function () {
  $.post('/notifications/' + $(this).data('id') + '/read');
  $(this).addClass('read');
});
