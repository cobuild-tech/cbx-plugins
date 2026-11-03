import Model, { attr } from '@ember-data/model';
export default class Product extends Model {
  @attr name; @attr('number') priceCents; @attr('boolean', { defaultValue: false }) compare;
}
