# RFC 6902 Compliance (JSON Patch)

This package (`@jsonpath/patch`) includes a test harness that executes the official RFC 6902 JSON Patch test suite maintained at https://github.com/json-patch/json-patch-tests.

## Test Suite Source

The suite is consumed via the `json-patch-test-suite` npm package, which vendors the upstream `tests.json` and `spec_tests.json` fixture files.

## Running Compliance Tests

From the repo root:

```bash
pnpm --filter @jsonpath/patch test
```

## Counting Tests

To count the total number of upstream test cases per file:

```bash
node -e "const fs=require('fs'); const p=require.resolve('json-patch-test-suite/spec_tests.json'); const s=JSON.parse(fs.readFileSync(p,'utf8')); console.log('spec_tests.json:', s.length);"
node -e "const fs=require('fs'); const p=require.resolve('json-patch-test-suite/tests.json'); const s=JSON.parse(fs.readFileSync(p,'utf8')); console.log('tests.json:', s.length);"
```

## Known Deviations (Baseline)

The compliance runner is intended to surface any RFC 6902 gaps as failing tests. If failures are observed, document them here with:

- The failing upstream test name/comment
- The RFC section
- The observed behavior vs expected behavior
- A rationale (if intentional)
- A remediation plan (if unintentional)

Suggested areas to watch (common RFC 6902 pitfalls):

- Leading zeros in array indices
- Missing required fields (`path`, `value`, `from`)
- Invalid JSON Pointer syntax
- Unrecognized operations
