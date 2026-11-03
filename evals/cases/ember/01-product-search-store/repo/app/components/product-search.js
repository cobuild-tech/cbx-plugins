import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { restartableTask, timeout } from 'ember-concurrency';
export default class ProductSearch extends Component {
  @service store;
  @tracked results = [];
  @restartableTask *search(q) {
    yield timeout(250);
    this.results = yield this.store.query('product', { filter: { q } });
  }
}
