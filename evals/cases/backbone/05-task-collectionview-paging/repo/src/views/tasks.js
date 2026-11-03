app.TaskRow = Marionette.View.extend({
  tagName: 'li', template: _.template('<span title="<%- owner %>"><%- title %></span> <em><%- priority %></em>'),
  behaviors: [app.TooltipBehavior],           // initialises $.fn.tooltip on render, destroys on remove
  modelEvents: { 'change:priority': 'render' }
});
app.TasksView = Marionette.CollectionView.extend({
  tagName: 'ul', childView: app.TaskRow,
  emptyView: Marionette.View.extend({ template: _.template('<li class="empty">No open tasks</li>') }),
  viewFilter: function (view) { return !view.model.get('archived'); },
  viewComparator: function (m) { return -m.get('priority'); },
  onAttach: function () {
    var page = 1, self = this;
    $(window).on('scroll.tasks', _.throttle(function () {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        self.collection.fetch({ remove: false, data: { page: ++page } });
      }
    }, 250));
  },
  onDestroy: function () { $(window).off('scroll.tasks'); }
});
