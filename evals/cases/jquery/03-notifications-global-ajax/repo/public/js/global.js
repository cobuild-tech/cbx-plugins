// Included on every page before page scripts.
$.ajaxSetup({ headers: { 'X-CSRF-Token': $('meta[name=csrf-token]').attr('content') }, cache: false });
$(document).ajaxStart(function () { $('#spinner').show(); });
$(document).ajaxStop(function () { $('#spinner').hide(); });
$(document).ajaxError(function (e, xhr) {
  if (xhr.status === 401) { window.location = '/login?next=' + encodeURIComponent(location.pathname); }
});
