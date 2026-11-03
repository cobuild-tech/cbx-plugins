app.InboxView = Marionette.View.extend({
  template: _.template('<h2>Inbox (<span class="n"><%- unread %></span>)</h2><ul class="msgs"></ul>'),
  className: function () { return this.model.get('unread') ? 'inbox has-unread' : 'inbox'; },
  initialize: function () {
    this.channel = Backbone.Radio.channel('mail');
    this.listenTo(this.channel, 'message:new', this.onNewMessage);
    this.poll = setInterval(_.bind(this.channel.trigger, this.channel, 'mail:poll'), 30000);
  },
  onNewMessage: function (msg) { this.model.set('unread', this.model.get('unread') + 1); this.$('.msgs').prepend('<li>' + _.escape(msg.subject) + '</li>'); this.$('.n').text(this.model.get('unread')); },
  onDestroy: function () { clearInterval(this.poll); }
});
