# @lellimecnar/jsonpath-conformance (Internal)

This package is an internal tool used for testing and is not intended for public consumption. It contains the test corpus and helper functions for running conformance tests against the JSONPath specification.

## Purpose

The main goal of this package is to provide a standardized set of tests to ensure that the `@jsonpath` engine is compliant with the JSONPath RFC 9535 specification.

This package runs the upstream JSONPath Compliance Test Suite (CTS) from the `jsonpath-standard/jsonpath-compliance-test-suite` repository.

## Usage

This package is used internally for development and testing purposes only.

### CTS dependency

The upstream CTS repository is embedded as a git submodule at:

- `packages/jsonpath/conformance/vendor/jsonpath-compliance-test-suite`

The Vitest specs load `cts.json` from that directory (see `src/cts.ts`).

If you clone this repo without submodules, initialize them before running tests:

- `git submodule update --init --recursive`

## Contributing

This is an internal package, and contributions are not expected.

## License

[MIT](../../../LICENSE)
