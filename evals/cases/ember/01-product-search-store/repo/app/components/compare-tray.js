// Stays in Ember. Shows every product the user has seen this session.
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
export default class CompareTray extends Component {
  @service store;
  get seen() { return this.store.peekAll('product').filter((p) => p.compare); }
}
