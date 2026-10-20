# Checking current crate APIs

The crates this migration lands on (`rust_decimal`, `sqlx`, `axum`,
`tower`, `serde`, `tokio`, `proptest`) change between versions. Before
writing code against one:

1. Read the version from the target workspace's `Cargo.toml` or
   `Cargo.lock`.
2. If the `context7` MCP server is available, call `resolve-library-id`
   for the crate, then `query-docs` with the exact feature (for example
   "sqlx MySqlConnectOptions charset" or "rust_decimal RoundingStrategy").
3. **Send only crate names and feature questions.** Never send the app's
   source code, record layouts, configuration, secrets, or business data.
4. If Context7 isn't available, read the crate's docs on docs.rs or its
   source in `~/.cargo/registry`.
