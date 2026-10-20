# PHP → Rust concept map

Read this in the Plan step, and when a unit hits a concept you haven't
mapped yet. In each unit file, list only the rows you actually used.

| PHP concept | Rust equivalent | Why |
|---|---|---|
| A script or controller action per route | An axum handler on the same path and methods | One route, one owner |
| `json_decode(file_get_contents('php://input'))` | `serde_json::Value` in compat mode; a serde struct in fixed mode | Copy first, type later |
| `$_GET` / `$_POST` / `$_REQUEST` | `Query` / `Form` extractors, with PHP's merge order for `$_REQUEST` | Same inputs, same precedence |
| `$data->field` on a missing field | One `prop` function: `None` plus the notice | Rules in one place |
| `isset` / `empty` / `==` | One function each | Loose rules written down |
| Associative arrays as records | Structs (fixed mode) | The compiler checks every use |
| `null` | `Option` | Say what `None` does |
| `json_encode` | A writer matching PHP's escaping in compat mode | Byte-for-byte replies |
| `echo` + `exit` / `die` | Return a response; never panic for control flow | Explicit flow |
| Notices and fatals in the body | Same text in compat mode; status codes in fixed mode | Errors are part of the contract |
| PDO with emulated prepares | `sqlx`, same SQL, values bound as strings in compat mode | Same database conversions |
| Eloquent / Doctrine model | Query functions plus response structs; casts and observers ported explicitly | No ORM magic |
| Middleware | `tower` layers in the same order | Same request pipeline |
| Validation rules | A validation function with the same messages and status | Clients read them |
| `$_SESSION` | A shared session store (JSON in Redis) or signed tokens | Both sides read it |
| Cron script / queue job | A Rust binary or worker with the same schedule and payloads | Often the first to move |
| Composer package | A crate, or a small function | Only what's used |
| `php.ini` settings | Explicit config at start-up | Nothing implicit |

Rule of thumb: clients don't see your code, they see your responses. Most
differences are in the reply, not the logic.
