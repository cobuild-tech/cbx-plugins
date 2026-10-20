# Laravel, Symfony, and other frameworks

Read this in any unit that ports a route from a framework app.

With a framework, much of a route's behavior is in configuration, not in
the controller. For each route you move, list and port:

| Framework piece | In Rust (axum / tower) |
|---|---|
| Route definition, parameters, model binding | `Router` path, `Path` extractor, a lookup that 404s the same way |
| Middleware (auth, throttle, CORS, trim strings, convert empty strings to null) | `tower` layers or `axum::middleware::from_fn`, in the same order |
| Form requests / validation rules | A validation function; same rules, same messages |
| Validation error response (Laravel: 422 with `message` and `errors`) | The same JSON shape and status |
| Eloquent casts, accessors, mutators, `$hidden`, `$appends` | Explicit conversion in the response type |
| API resources / Symfony serializer groups | A response struct per resource, same field names and order |
| Events, listeners, observers | Plain function calls after the write, or the same queue job |
| Exception handler and error pages | One error-to-response function with the same status and body |
| Config and `.env` | Env vars read at start-up; never copy secret values |
| Service container | Plain structs passed in state; don't rebuild a container |

Don't rebuild the framework. Copy what each route actually uses.
