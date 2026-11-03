import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { task, timeout } from 'ember-concurrency';
import Ember from 'ember';
export default Component.extend({
  tagName: 'span', classNames: ['bell'], classNameBindings: ['hasUnread:bell--unread'],
  session: service(), store: service(),
  unread: 0,
  hasUnread: Ember.computed.gt('unread', 0),
  didInsertElement() { this._super(...arguments); this.poll.perform(); },
  poll: task(function* () {
    do {
      const r = yield this.store.query('notification', { user: this.get('session.currentUser.id'), unread: true });
      this.set('unread', r.get('length'));
      yield timeout(20000);
    } while (!Ember.testing); // tests run one iteration only, or settled() would never resolve
  }).drop(),
  actions: { markAllRead() { this.onRead(this.unread); this.set('unread', 0); } }
});
