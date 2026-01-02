# JSONPath Engine & Plugin Audit

## Current Plugin Inventory

| Plugin ID                              | Category  | Capabilities                  | Dependencies                      |
| -------------------------------------- | --------- | ----------------------------- | --------------------------------- |
| `@jsonpath/plugin-syntax-root`         | Syntax    | `syntax:rfc9535:root`         | None                              |
| `@jsonpath/plugin-syntax-current`      | Syntax    | `syntax:rfc9535:current`      | None                              |
| `@jsonpath/plugin-syntax-child-member` | Syntax    | `syntax:rfc9535:child-member` | None                              |
| `@jsonpath/plugin-syntax-child-index`  | Syntax    | `syntax:rfc9535:child-index`  | None                              |
| `@jsonpath/plugin-syntax-wildcard`     | Syntax    | `syntax:rfc9535:wildcard`     | None                              |
| `@jsonpath/plugin-syntax-union`        | Syntax    | `syntax:rfc9535:union`        | None                              |
| `@jsonpath/plugin-syntax-descendant`   | Syntax    | `syntax:rfc9535:descendant`   | None                              |
| `@jsonpath/plugin-syntax-filter`       | Syntax    | `syntax:rfc9535:filter`       | None                              |
| `@jsonpath/plugin-filter-literals`     | Filter    | `filter:rfc9535:literals`     | None                              |
| `@jsonpath/plugin-filter-boolean`      | Filter    | `filter:rfc9535:boolean`      | None                              |
| `@jsonpath/plugin-filter-comparison`   | Filter    | `filter:rfc9535:comparison`   | None                              |
| `@jsonpath/plugin-filter-existence`    | Filter    | `filter:rfc9535:existence`    | None                              |
| `@jsonpath/plugin-filter-functions`    | Filter    | `filter:rfc9535:functions`    | `@jsonpath/plugin-functions-core` |
| `@jsonpath/plugin-filter-regex`        | Filter    | `filter:rfc9535:regex`        | `@jsonpath/plugin-iregexp`        |
| `@jsonpath/plugin-functions-core`      | Functions | `functions:rfc9535:core`      | None                              |
| `@jsonpath/plugin-iregexp`             | Utility   | `utility:iregexp`             | None                              |
| `@jsonpath/plugin-result-value`        | Result    | `result:value`                | None                              |
| `@jsonpath/plugin-result-node`         | Result    | `result:node`                 | None                              |
| `@jsonpath/plugin-result-path`         | Result    | `result:path`                 | None                              |
| `@jsonpath/plugin-result-pointer`      | Result    | `result:pointer`              | None                              |
| `@jsonpath/plugin-result-parent`       | Result    | `result:parent`               | None                              |
| `@jsonpath/plugin-result-types`        | Result    | `result:types`                | None                              |

## Hook Registration Patterns

- **Syntax Plugins**: Register rules with `scanner` and Pratt operators with `parser`.
- **Filter Plugins**: Register evaluators with `evaluators.registerSelector` or `evaluators.registerSegment`.
- **Result Plugins**: Register result mappers with `results`.
- **Lifecycle Hooks**: Use `lifecycle` to register `tokenTransforms`, `astTransforms`, or `errorEnrichers`.

## Import Dependency Graph (RFC Plugins)

- `@jsonpath/plugin-rfc-9535` imports ALL RFC plugins.
- `@jsonpath/plugin-filter-functions` -> `@jsonpath/plugin-functions-core`.
- `@jsonpath/plugin-filter-regex` -> `@jsonpath/plugin-iregexp`.
- Most plugins import `@jsonpath/core` for types.

## Consumers of `@jsonpath/complete` or RFC Plugins

- `packages/jsonpath/complete/src/index.ts` imports all RFC plugins + extensions.
- `packages/jsonpath/cli/src/run.ts` (likely) imports `@jsonpath/complete` or `@jsonpath/plugin-rfc-9535`.
- `packages/jsonpath/conformance/src/harness.ts` takes a `JsonPathEngine` which is usually created via `@jsonpath/plugin-rfc-9535`.

## Mapping to Proposed Phases

| Phase     | Plugins                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `syntax`  | `syntax-root`, `syntax-current`, `syntax-child-member`, `syntax-child-index`, `syntax-wildcard`, `syntax-union`, `syntax-descendant`, `syntax-filter` |
| `filter`  | `filter-literals`, `filter-boolean`, `filter-comparison`, `filter-existence`, `filter-functions`, `filter-regex`, `functions-core`                    |
| `runtime` | (None currently, but core evaluation logic could be moved here)                                                                                       |
| `result`  | `result-value`, `result-node`, `result-path`, `result-pointer`, `result-parent`, `result-types`                                                       |
| `utility` | `iregexp` (can be `runtime` or `filter` phase depending on usage)                                                                                     |
