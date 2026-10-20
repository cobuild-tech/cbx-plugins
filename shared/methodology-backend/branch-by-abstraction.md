# Branch by Abstraction

Swap a dependency that everything uses, such as session storage, record
I/O, or database access, while the system keeps running. Usually this is
secondary to Strangler Fig.

## Steps (each step is its own unit)

1. **Introduce the abstraction** in the old code: one place that reads a
   session, opens a file, or talks to the database. Back it with the
   **old** implementation. Behavior doesn't change.
2. **Move callers onto the abstraction**, one area per unit.
3. **Build the new implementation** behind the same interface, in a form
   both sides can use: sessions as JSON in Redis or signed tokens, records
   in the same layout, the same connection settings.
4. **Switch with a flag.** Run both implementations against the same
   golden data. Where it's safe, run them side by side and compare.
5. **Remove the old implementation** once nothing references it and the
   flag has stayed on for a while.

## Rules

- Keep the interface the minimum both sides need. Don't rebuild the old
  runtime, framework container, or ORM behind it.
- The new implementation must produce the same bytes the old one did
  until every reader of those bytes has moved.
- The abstraction is temporary. Log in `decisions.md` when it will be
  deleted.
