app.ProfileForm = Backbone.View.extend({
  el: '#profile',
  events: { 'submit form': 'save' },
  initialize: function () {
    this.listenTo(this.model, 'invalid', function (m, err) { this.$('.error').text(err); });
    this.listenTo(this.model, 'sync', function () { this.$('.error').text(''); this.$('.saved').show().fadeOut(1500); });
    this.listenTo(this.model, 'change:displayName', this.renderHeader);
  },
  save: function (e) {
    e.preventDefault();
    this.model.save({ displayName: this.$('[name=displayName]').val(), website: this.$('[name=website]').val() });
  },
  renderHeader: function () { $('#header .name').text(this.model.get('displayName')); }
});
