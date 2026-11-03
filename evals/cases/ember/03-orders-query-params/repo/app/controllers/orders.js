import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
export default class OrdersController extends Controller {
  queryParams = ['status', 'page', 'sort'];
  @tracked status = 'open'; @tracked page = 1; @tracked sort = 'date';
  get sorted() { return [...this.model].sort((a, b) => (a[this.sort] > b[this.sort] ? -1 : 1)); }
}
