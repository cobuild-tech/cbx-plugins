// Shared across editors; stays jQuery.
$(window).on('beforeunload', function () { if ($('form.dirty').length) return 'You have unsaved changes'; });
