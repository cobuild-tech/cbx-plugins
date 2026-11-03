// Third-party help widget: asks which tab is open to pick an article.
window.HelpWidget = { context: function () { return ['profile', 'billing', 'security'][$('#tabs').tabs('option', 'active')]; } };
