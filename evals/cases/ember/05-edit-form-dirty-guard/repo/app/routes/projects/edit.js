import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
export default class EditRoute extends Route {
  @service router;
  constructor() {
    super(...arguments);
    this.router.on('routeWillChange', (t) => {
      if (t.from?.name === 'projects.edit' && this.controller?.model.hasDirtyAttributes && !t.isAborted) {
        if (!window.confirm('Discard changes?')) t.abort(); else this.controller.model.rollbackAttributes();
      }
    });
  }
  model({ id }) { return this.store.findRecord('project', id); }
}
