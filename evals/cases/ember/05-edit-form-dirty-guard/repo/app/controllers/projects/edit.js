import Controller from '@ember/controller';
import { action } from '@ember/object';
export default class EditController extends Controller {
  @action async save(e) {
    e.preventDefault();
    try { await this.model.save(); this.transitionToRoute('projects.show', this.model); }
    catch { /* 422 errors land in model.errors via the JSON:API adapter */ }
  }
  @action cancel() { this.model.rollbackAttributes(); this.transitionToRoute('projects'); }
}
