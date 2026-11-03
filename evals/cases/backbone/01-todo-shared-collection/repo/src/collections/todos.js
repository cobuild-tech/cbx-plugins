var Todos = Backbone.Collection.extend({
  url: '/api/todos', comparator: 'order',
  remaining: function () { return this.where({ done: false }); }
});
window.app = window.app || {}; app.todos = new Todos();
