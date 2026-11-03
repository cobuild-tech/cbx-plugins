app.NewItemView = Backbone.View.extend({
  tagName: 'form', className: 'new-item',
  template: _.template('<input name="name"><input name="qty" type="number" value="1"><button>Add</button><p class="err"></p>'),
  events: { submit: 'onSubmit' },
  render: function () { this.$el.html(this.template()); return this; },
  onSubmit: function (e) {
    e.preventDefault();
    var self = this;
    this.collection.create({ name: this.$('[name=name]').val(), qty: +this.$('[name=qty]').val() }, {
      wait: true,
      success: function (m) { self.trigger('saved', m); Backbone.history.navigate('items/' + m.id, { trigger: true }); },
      error: function (m, xhr) { self.$('.err').text((xhr.responseJSON && xhr.responseJSON.errors || []).join(', ')); }
    });
  }
});
