# Same model, with and without the plugin

These transcripts show what the X-to-React plugins change in a model's output. Each run used one model and one prompt; the only difference was whether the plugin's skill was loaded.

## Method

- **Model:** Claude Sonnet, via `claude -p` (Claude Code 2.1.312), on 2026-10-28.
- **Input:** one small legacy snippet per framework (`*/input.txt`), each containing the kind of implicit behavior that real migrations break.
- **Prompt (identical in both arms, `*/prompt.txt`):** "Migrate this <framework> code to React with TypeScript. The rest of the app stays on <framework> for now and will be migrated later. Reply with the React code and a short list of anything I should know."
- **Without plugin** (`*/without-plugin.md`): run with tools disabled, so no skill could load.
- **With plugin** (`*/with-plugin.md`): the same run, with the plugin's `SKILL.md` and its framework reference files appended to the system prompt. This is what the model reads when the skill triggers.
- **Limits:** this is one run per framework, not a benchmark. It covers only the skill's single-snippet mode. The multi-session workflow, the inventory and parity-review agents, and the `.migration/` state need a real repository and are not exercised here.

## What the baseline already does well

The model is strong without help. In every run it produced working-looking React, kept the debounce timings, mapped JSON:API's `price-cents` to `priceCents`, and suggested mounting React inside the old framework. The plugin is not needed to write React.

## Where the outputs differ

The differences are in the parts of a migration that break in production: behavior the old framework provided implicitly, and changes made without being asked.

| Framework | Without the plugin | With the plugin |
|---|---|---|
| **jQuery** | Ports the cart to React but never says to remove `$(document).on('click', '.cart .remove', …)`. That delegated handler still matches the React rows, so every Remove click sends **two** `POST /cart/remove` requests. It also moves the total from jQuery's `change` event (fires on blur) to React's `onChange` (fires per keystroke) without mentioning it. | Says to delete the delegated handler in the same change because it "would also fire on React's rows". Flags the blur-vs-keystroke difference. Notes Turbolinks/Turbo mount and unmount events for Rails pages. |
| **AngularJS** | Replaces `$http` with `fetch` and a placeholder `getAuthToken()`, so the registered `authInterceptor` (and any 401 or refresh handling in it) no longer runs. Changes five behaviors in the same port: clears the list on customer change, skips fetching when the id is undefined, restarts polling, aborts requests, logs errors. | Keeps `$http` by injecting it through the AngularJS wrapper, so the interceptor still applies. Formats currency with `currencySign: 'accounting'` to match AngularJS's `($1.00)` for negatives. Keeps the old quirks, lists them, and makes one deliberate change (stale responses discarded). |
| **Ember** | Replaces Ember Data with `fetch` without mentioning that the records are no longer in the store. Adds request cancellation, a behavior change. | Warns that the Ember Data identity map is dropped, so other Ember code using `store.peekAll('product')` will stop seeing these records. Warns that mounting adds a second wrapper `div` around `.product-search`, which can break `> .product-search` CSS selectors. Keeps the original timing, including a stale-response race, and says so. |
| **Backbone / Marionette** | Moves the data into React state with `fetch`. Adds rollback on a failed PATCH, which Backbone's `save()` does not do. | Keeps the Backbone models as the source of truth during the transition, through a small bridge hook. Keeps Backbone's no-rollback optimistic save and the `parse()` response shape. Points out that Marionette evaluates a `className` function only when the element is created, so the old `done` class went stale after a toggle, and asks for confirmation before changing that. |
| **Plain JS** | Copies the theme into React state. That state goes out of sync if any other script changes `data-theme`. | Reads `data-theme` from the DOM on click, as the original did. Warns that the old globals `notes`, `render` and `save` are gone and that other scripts may still use them. |

Across the runs, the plugin version also defaults to parity: it keeps existing quirks and lists them instead of silently "improving" them, and in three of five runs (Ember, AngularJS, jQuery) it recommends tests against the old behavior before swapping the code. None of the baseline runs suggested tests.

## Why this matters

Practitioner write-ups describe the same failure points:

- Envoy, on mounting React in Ember: a React component "deeply coupled to the existing Ember components is no better than a native Ember component" ([Envoy](https://envoy.com/builders/rendering-react-inside-ember)).
- goorm, on jQuery and React coexisting: state in legacy code does not sync with the React side automatically ([goorm](https://tech.goorm.io/en/communicating-with-legacy-how-jquery-and-react-coexist/)).
- Legacy frontends hide permission checks in jQuery handlers and validation in inline scripts ([Maybe.works](https://maybe.works/blogs/how-to-migrate-to-react)).
- "The hardest step in an AngularJS-to-React migration isn't writing the React components" ([Sourcegraph](https://sourcegraph.com/blog/angularjs-to-react-migration)).
- An empirical study of LLM library migrations found models making small unrequested semantic changes, such as narrowing an exception type, that alter behavior ([arXiv 2504.13272](https://arxiv.org/abs/2504.13272)).
- Teams that shipped these migrations did it incrementally with both frameworks running side by side, for example [Gusto](https://engineering.gusto.com/evolving-javascript-part-2-hello-react) and [Close](https://making.close.com/posts/reactizing-a-complex-backbone-view) for Backbone, and [Hotjar](https://dev.to/hotjar/hotjar-s-migration-from-angularjs-to-react-our-approach-4g54) for AngularJS. The plugins encode that coexistence pattern per framework.
