// Stays Backbone: shows "N left" and a "clear done" button.
app.SidebarView = Backbone.View.extend({
  el: '#sidebar',
  initialize: function () { this.listenTo(app.todos, 'all', this.render); },
  events: { 'click .clear': function () { _.invoke(app.todos.where({ done: true }), 'destroy'); } },
  render: function () { this.$('.left').text(app.todos.remaining().length + ' left'); }
});
