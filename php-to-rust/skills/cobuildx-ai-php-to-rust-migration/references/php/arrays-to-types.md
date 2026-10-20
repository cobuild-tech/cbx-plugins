# From arrays to types

Read this in any unit that ports request handling, models, or data
passed around as arrays.

In PHP, data is whatever `json_decode` or `$_POST` gives you. In Rust you
describe the shape once with serde and the compiler checks every use. But
a strict struct can't reproduce PHP while both sides serve clients, so do
it in two steps.

## Compat mode: write PHP's rules down

- Keep the body as `serde_json::Value` and walk it the way PHP would.
- One function per PHP operation: reading a property (with the notice
  text, file, and line), `isset`, string conversion for binding, loose
  comparison. Every handler calls these; none reimplements them.
- Values bound to SQL go through PHP's string conversion, so the database
  makes the same conversions it did for PHP.
- Notices, warnings, and fatal errors are produced with the same text,
  paths, and line numbers, HTML-escaped if `html_errors` was on.

## Fixed mode: real types

- serde structs and newtypes for ids and fields. Anything else gets a
  400 or 422.
- Each loose rule becomes a written decision. Accepting `"16"` as well as
  `16` is common: if the golden data shows clients send strings, accept
  them on purpose, with a comment saying why.
- Laravel- or Symfony-style validation errors keep their JSON shape and
  status if front ends read them.

Ship fixed-mode changes as announced releases after the move. During the
move, compat mode serves traffic.
