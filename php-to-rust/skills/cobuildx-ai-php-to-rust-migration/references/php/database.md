# Sharing the database

Read this in any unit that queries the database. Read
`references/rust/data-access.md` with it.

- Both sides use the same database while the move happens. Check **how**
  PHP talks to it, not only what it stores.
- **Character set:** a DSN with no `charset` uses the server default
  (often `latin1`). If the columns are `utf8`, PHP's UTF-8 bytes are
  stored double-encoded (`é` as `Ã©`), and reading back reverses it. A
  Rust connection as `utf8mb4` would store `é` correctly, and the two
  sides would show different text for the same row. Connect the same way:

  ```rust
  MySqlConnectOptions::from_str(url)?
      .charset("latin1")
      .collation("latin1_swedish_ci")
      // sqlx sets these on every session by default. PHP doesn't.
      .pipes_as_concat(false)
      .no_engine_substitution(false)
      .timezone(None);
  ```

- **Emulated prepares:** PDO's default for MySQL sends every value as a
  quoted string, so the database converts `"19.5"` to 20 and matches
  `"16abc"` to 16. Bind strings in compat mode.
- **Column types coming back:** strings or native types, depending on the
  PHP version and `PDO::ATTR_STRINGIFY_FETCHES`/`ATTR_EMULATE_PREPARES`.
- **ORM behavior:** Eloquent or Doctrine casts, accessors, mutators,
  timestamps (`created_at`/`updated_at`), soft deletes, observers that
  write audit rows, and cache clears after saves. The Rust side does each
  one, or PHP reads data it doesn't expect.
- Test that a row written by either side reads back the same in both.
- Fixing stored text is a data migration after PHP is gone.
