## UI-Spec (MVP)

This repository includes an MVP implementation of **UI-Spec**, a declarative JSON-to-UI framework described in `specs/ui-spec.md`.

### Packages

- `@ui-spec/core`: schema types, parsing/validation, store, and JSONPath bindings
- `@ui-spec/react`: React binding that renders schema nodes to intrinsic React elements

### MVP schema subset

A UI-Spec schema is a JSON object with:

- `$uispec`: must be `"1.0"`
- `root`: the root node

Each node supports:

- `type` (string): intrinsic element name (`div`, `span`, `button`, ...)
- `class` (string, optional): mapped to `className`
- `props` (object, optional): literals or `{ "$path": "..." }` bindings
- `children` (string | node | array, optional): may contain `{ "$path": "..." }` bindings

### Data binding

Bindings use JSONPath:

- `{ "$path": "$.user.name" }`
- Filters like `$.users[?(@.active)].name` are supported via the JSONPath engine.

### Not supported in MVP

- UIScript (`$fn`)
- Routing
- Validators/plugins
- Async boundaries
- Devtools

### Test commands

From repo root:

- Use `#tool:execute/runTests` (preferred) and target `*.spec.*` files under the relevant `@ui-spec/*` package.
- `pnpm -w type-check`
