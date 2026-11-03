// Router swaps the main region between InboxView and SettingsView.
app.layout.getRegion('main').show(new app.InboxView({ model: app.mailbox }));
app.router.on('route:settings', function () { app.layout.getRegion('main').show(new app.SettingsView()); });
app.router.on('route:inbox', function () { app.layout.getRegion('main').show(new app.InboxView({ model: app.mailbox })); });
