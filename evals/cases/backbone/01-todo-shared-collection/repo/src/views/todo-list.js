app.TodoListView = Backbone.View.extend({
  el: '#todo-list',
  initialize: function () {
    this.listenTo(app.todos, 'add remove reset sort change:done', this.render);
  },
  events: { 'change .toggle': 'toggle', 'click .destroy': 'destroy' },
  toggle: function (e) { app.todos.get($(e.target).closest('li').data('id')).save({ done: e.target.checked }, { patch: true }); },
  destroy: function (e) { app.todos.get($(e.target).closest('li').data('id')).destroy(); },
  render: function () {
    this.$el.html(app.todos.map(function (t) {
      return '<li data-id="' + t.id + '"><input class="toggle" type="checkbox"' + (t.get('done') ? ' checked' : '') + '>' + _.escape(t.get('title')) + '<a class="destroy">×</a></li>';
    }).join(''));
    return this;
  }
});
