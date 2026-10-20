# Identifying the PHP setup

Read this in the Assess step. Record in `state.json` and `assessment.md`:

- **PHP version in production**, not the newest one. Behavior changes
  between versions (PHP 8.1 PDO returns native ints and floats with
  emulated prepares; PHP 8 changed string-to-number comparison). Record
  `"flavor"` as, for example, `"php7.3-plain"`, `"php8.2-laravel"`, or
  `"php8.1-symfony"`.
- **Framework:** none (scripts as routes), Laravel, Symfony, Slim, or
  another. Frameworks put much of the logic in configuration: middleware,
  validation rules, casts, events, listeners.
- **Server setup:** Apache with `mod_php`, or nginx with PHP-FPM.
  `.htaccess` rewrites are routes too.
- **`php.ini` settings that change behavior:** `display_errors`,
  `html_errors`, `error_reporting`, `date.timezone`, `precision`,
  `serialize_precision`, memory and time limits, `default_charset`.
- **Database and connection:** driver, DSN (charset or none), emulated
  prepares, `PDO::ATTR_*` options, `SET` statements at connect.
- **Sessions and auth:** storage (files, Redis, database), format, cookie
  names and encryption.
- **Background work:** cron jobs, queue workers, long-running scripts.
- **Composer packages** and what each would become in Rust.
- **Why move?** "PHP is slow" isn't enough. Name the routes, workers, or
  bugs that justify it, and move only those.
