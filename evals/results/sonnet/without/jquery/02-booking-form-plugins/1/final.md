I rewrote the booking form as a React + TypeScript component, but I couldn't install dependencies, build or typecheck it. Bash is disabled in this session, so nothing has been run.

**What changed**
- **`src/BookingForm.tsx`** is the new component. Its fields and behaviour:
  - **Fields:** name, ship date, slot select and a Book button, in a form that still posts natively to `/bookings`.
  - **Validation:** name is required with at least 2 characters. Ship date is required and must be a weekday from tomorrow onward, with the same "Pick a weekday from tomorrow onward" message. Errors show on submit and then update live as you type, like jquery-validate did.
  - **Slots:** these load from `/slots?date=…` when the date changes. The component cancels stale requests, which the old code didn't do.
- **`src/index.tsx`** mounts the component into `#booking-root`.
- **`views/booking.html`** now holds only the mount point, `#partials` and the bundle script. It no longer loads jQuery, jQuery UI, jquery-validate or `widgets.js`.
- **`package.json`** gains `build` (esbuild, output to `public/js/booking.bundle.js`) and `typecheck` scripts, plus esbuild and the React type packages as dev dependencies.
- **`tsconfig.json`** is new.
- **`public/js/widgets.js`** is untouched, so other pages keep using jQuery.

**Date handling:** `widgets.js` attached a jQuery UI datepicker to any input whose id ends in "date", and the server parses `dd/mm/YYYY`. The React version uses a native `<input type="date">` with `min` set to tomorrow, and the weekday rule is checked in code. A hidden `ship_date` input sends the value to the server as `dd/mm/YYYY`, so `bookings_controller.rb` needs no change. The native picker will look different from the jQuery UI one and can't grey out weekends.

**Still to do**
1. Run `npm install && npm run typecheck && npm run build`. The build creates the bundle that `booking.html` references.
2. Delete `public/js/booking.js` with `git rm public/js/booking.js`. I couldn't remove it, and nothing references it now.
3. Check the page in a browser, especially the slot dropdown and the error messages.