import { module, test } from 'qunit';
import { visit, click, settled, find } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
module('Acceptance | save profile', function (hooks) {
  setupApplicationTest(hooks);
  test('toast appears then disappears', async function (assert) {
    await visit('/profile');
    await click('button.save');
    assert.dom('.toasts li').hasText('Saved');
    await settled(); // waits for the run-loop timer
    assert.dom('.toasts li').doesNotExist();
  });
});
