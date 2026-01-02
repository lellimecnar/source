# @ui-spec/core

Framework-agnostic core runtime for UI-Spec.

## Guarantees

- JSONPath evaluation uses `json-p3` (RFC 9535 semantics).
- All mutations are applied via RFC 6902 JSON Patch operations.
- Write helpers that accept JSONPath targets require exactly one match.

## Non-goals

- No router or navigation.
- No external validation plugins.
- No embedded function strings (no UIScript). All callable behavior is supplied via a function registry.
