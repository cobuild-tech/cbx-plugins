import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
export default class OrdersRoute extends Route {
  @service store;
  queryParams = { status: { refreshModel: true }, page: { refreshModel: true }, sort: { refreshModel: false } };
  model(params) { return this.store.query('order', { status: params.status, page: params.page }); }
}
