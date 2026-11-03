$('#tabs').tabs({
  active: Math.max(0, $('#tabs a[href="' + location.hash + '"]').parent().index()),
  activate: function (e, ui) {
    history.replaceState(null, '', ui.newTab.find('a').attr('href'));
    $(document).trigger('account:tab', [ui.newPanel.attr('id')]);
  }
});
