I rewrote the booking form as a React and TypeScript component, but I couldn't install, typecheck, build or run anything. Bash is disabled in this session, so none of it has been run in a browser. `public/js/booking-react.js` doesn't exist yet, so the page won't work until you build it.

To finish, run `npm install && npm run typecheck && npm run build`.

## What changed
- **`src/BookingForm.tsx`** (new) is the form, with the same ids, names, `action="/bookings"` and `method="post"`.
  - **Submit:** a valid form posts natively, so field names, urlencoded encoding and the redirect are unchanged.
  - **Validation:** I reimplemented what `jquery-validate` did. Name is required with a minimum length of 2. Ship date is required and always shows "Pick a weekday from tomorrow onward". Errors render as `label.error` and the input gets class `error`. The first invalid field is focused on a failed submit. After a failed submit, fields re-validate on blur and keyup.
  - **Datepicker:** it is still the jQuery UI datepicker, with the same options as `widgets.js` (`dd/mm/yy`, `minDate: 1`, no weekends). It's attached from the component with a ref.
  - **Slots:** the `change` handler is still jQuery `$.getJSON('/slots')`, with the response rendered as the select's options. I kept `$.getJSON` on purpose so the headers, encoding and `ajaxComplete` behave as before.
- **`src/main.tsx`, `src/jquery.d.ts` and `tsconfig.json`** are new: the entry point, a minimal `window.jQuery` typing and the TypeScript config.
- **`package.json`** gains an esbuild `build` script, a `typecheck` script, and `@types/react`, `@types/react-dom` and `esbuild` as dev dependencies.
- **`views/booking.html`** now has a `#booking-root[data-react-root]` container and loads `/js/booking-react.js`. The `jquery-validate` script tag is gone. jQuery, jQuery UI and `widgets.js` still load, and `#partials` is untouched.
- **`public/js/widgets.js`** now has `.not('[data-react-root] *')` in `initWidgets`. Without it, the `ajaxComplete` hook re-attaches a second datepicker to the React-owned `#ship-date` after every AJAX call. Other pages are unaffected.

## Behavior differences and risks
- **Validation timing:** the `jquery-validate` timing is reproduced from memory of its source, so edge cases (for example whitespace-only values, or focus after a datepicker pick) may differ slightly.
- **Existing quirks I kept:**
  - The ship-date message promises a weekday from tomorrow, but only non-empty is enforced, so typed dates are unchecked.
  - Slot responses apply last-response-wins.
  - Slot failures are silently ignored.
- **Server format:** the server still receives `dd/mm/yyyy`, which `Date.strptime` expects.
- **`public/js/booking.js`:** I couldn't delete it without a shell. It is now unreferenced, so you can delete it. Commit `0521321` is the rollback.
- **Not covered:** the repo has no tests, so there are none to port.