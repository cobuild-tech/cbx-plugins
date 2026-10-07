# Porting Ember Data

Read this before migrating any unit that uses `this.store`, models,
adapters, or serializers. Also read `references/react/state-data.md`.

- Models become TypeScript interfaces plus mapper functions, with the same
  field names. Relationships become ids, or nested objects if the API
  embeds them.
- Adapters (`host`, `namespace`, `headers`, `buildURL`, `urlForX`) become
  the single API client. Produce the **same URLs**.
- Serializers (`normalize`, `normalizeResponse`, `serialize`, `attrs`,
  `keyForAttribute`, JSON:API vs. REST) become plain normalize and
  serialize functions with unit tests that reuse real fixtures.
- `store.findAll`, `query`, and `findRecord` become query hooks.
  `peekRecord` and `peekAll` become reads from the query cache.
- `model.save()` and `destroyRecord()` become mutations that invalidate
  the same lists.
- **Caching:** Ember Data's identity map means the UI often shows cached
  data instantly on back-navigation, then refreshes in the background.
  Reproduce that with `staleTime`, or record the difference as a quirk.
- Don't build an ORM or identity map in React unless the app really needs
  one. If it does, record why in `decisions.md`.
