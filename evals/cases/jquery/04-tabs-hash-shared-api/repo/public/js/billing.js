// Billing team; stays jQuery. Loads invoices lazily the first time the tab is shown.
var loaded = false;
$(document).on('account:tab', function (e, id) { if (id === 'billing' && !loaded) { loaded = true; $('#billing').load('/billing/partial'); } });
if (location.hash === '#billing') $('#billing').load('/billing/partial');
