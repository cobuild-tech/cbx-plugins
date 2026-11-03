// Re-initialises widgets after any AJAX partial is injected anywhere on the page.
function initWidgets(root) {
  $(root).find('input[id$="date"]').datepicker({ dateFormat: 'dd/mm/yy', minDate: 1, beforeShowDay: $.datepicker.noWeekends });
}
$(function () { initWidgets(document); });
$(document).ajaxComplete(function () { initWidgets(document); });
