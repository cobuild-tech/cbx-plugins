# Checking current library APIs

React and the libraries this migration lands on (React Router, TanStack
Query, react-hook-form, Redux Toolkit, Zustand) change between major
versions. Before writing code against one:

1. Read the version from the target project's `package.json`.
2. If the `context7` MCP server is available, call `resolve-library-id`
   for the library, then `query-docs` with the exact feature (for example
   "React Router loader redirect" or "TanStack Query useMutation
   optimistic update").
3. **Send only library names and feature questions.** Never send the
   app's source code, configuration, secrets, or business data.
4. If Context7 isn't available, read the installed package's own docs and
   type definitions in `node_modules`.
