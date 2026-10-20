# Running PHP and Rust together

Read this in the unit that sets up coexistence, and in every unit that
moves a route.

## One route, one owner

- Put the Rust service (axum) beside PHP, and let the proxy you already
  have (nginx, a load balancer, a CDN) choose per route:

  ```
  location = /api/get.php  { proxy_pass http://rust; }   # moved
  location = /api/post.php { proxy_pass http://php; }
  ```

- Each path belongs to exactly one side. Switching back is one line and a
  reload; try it once per unit.
- Move a route with **all** of its methods. If the PHP script answered
  wrong methods itself (a 200 with an error message), Rust accepts every
  method and answers the same way.
- Rust serves the same paths, `.php` included. Rewrite rules
  (`.htaccess`, `try_files`, front controllers like `index.php`) are part
  of the route; copy what they did with the path and query string.
- Headers are part of the response: `Content-Type`, CORS headers
  (including wrong ones copied between scripts), cache headers, cookies,
  and `X-Powered-By` if clients sniff it.

## Before the first route moves

Settle shared state first, each as its own unit: sessions
(`sessions-auth.md`) and the database connection (`database.md`).
