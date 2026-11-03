app.TooltipBehavior = Marionette.Behavior.extend({
  onRender: function () { this.$('[title]').tooltip({ placement: 'top' }); },
  onBeforeDestroy: function () { this.$('[title]').tooltip('dispose'); }
});
