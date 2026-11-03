import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';
export default class ToastsService extends Service {
  @tracked items = [];
  show(text, ms = 4000) {
    const t = { text, id: Math.random() };
    t.timer = later(() => this.dismiss(t), ms);
    this.items = [...this.items, t];
  }
  dismiss(t) { cancel(t.timer); this.items = this.items.filter((x) => x !== t); }
}
