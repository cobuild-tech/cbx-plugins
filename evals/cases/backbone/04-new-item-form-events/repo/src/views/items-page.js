app.ItemsPage = Backbone.View.extend({
  initialize: function () {
    this.form = new app.NewItemView({ collection: app.items });
    this.listenTo(this.form, 'saved', function (m) { app.toast('Added ' + m.get('name')); app.stats.increment('items'); });
  },
  render: function () { this.$el.append(this.form.render().el); return this; },
  remove: function () { this.form.remove(); Backbone.View.prototype.remove.call(this); }
});
