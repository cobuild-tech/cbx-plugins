# What PHP does for you

Read this in any unit that reads input, converts values, or builds a
response. Most of a PHP migration is finding these rules, because clients
depend on them whether anyone meant them to or not. Find them by running
the original, not by reading it.

| PHP does | Example | In Rust |
|---|---|---|
| Converts values to strings when binding or concatenating | `true` → `"1"`, `false` → `""`, `19.5` stored as 20 in an int column, `["a"]` → `"Array"` with a notice, an object → fatal error | One conversion function, copied exactly for compat mode |
| Compares loosely (`==`, `in_array`, `switch`, and the database) | `"16abc"` finds id 16 | Each id or value check is a decision: copy or reject |
| Reads a missing property or key as `null`, with a notice | missing `age` → notice, then a `NOT NULL` failure | `Option`, and say what `None` does |
| Has its own "set" | `isset` is false for `null`, true for `0`, `""`, `false` | Write `isset`/`empty` rules out once |
| Returns DB columns as strings (before PHP 8.1, or without native types) | `"id":"15"` | Match the production version |
| Encodes JSON its own way | `\/` for `/`, `é` for `é`, `false` for invalid UTF-8, empty array as `[]` vs `{}`, floats with `serialize_precision` | A JSON writer that matches byte for byte in compat mode |
| Prints errors into the response | `display_errors=On`: HTML notices and stack traces in a JSON body, with status 200 | Errors are part of the contract until changed on purpose |
| Formats floats with `precision` (14 digits) | `1e20` → `"1.0E+20"` | PHP's float formatting, with a test |
| Coerces types for internal functions | `strlen(123)`, `"10" + "5"` | Explicit conversions, same results |
| Sorts and compares with its own rules | `sort()` mixed types, `usort` stability before PHP 8 | Same order, tested |

Check the PHP version's changelog (UPGRADING notes) for every rule that
changed between the version in production and newer ones.
