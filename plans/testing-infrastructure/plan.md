# Testing Infrastructure Improvements

**Branch:** `test/infrastructure-improvements`
**Description:** Add test coverage reporting, create test configurations for untested packages, and establish testing standards

## Goal

Establish comprehensive testing infrastructure with coverage reporting, add testing capabilities to packages that currently lack them, and create testing standards to maintain high code quality.

## Implementation Steps

### Step 1: Enhance Jest Configuration with Coverage

**Files:** `packages/config-jest/jest-preset.js`, `packages/config-jest/browser/jest-preset.js`
**What:** Add coverage configuration to shared Jest presets including coverage thresholds (80% branches, lines, functions), reporters (text, html, lcov), and coverage directory setup.
**Testing:** Use `#tool:execute/runTests` with `mode="coverage"`; verify a coverage report is generated with appropriate thresholds

### Step 2: Add Jest Configuration - Web Apps

**Files:** `web/miller.pub/jest.config.js`, `web/readon.app/jest.config.js`, `web/miller.pub/package.json`, `web/readon.app/package.json`
**What:** Create Jest configuration files for both Next.js apps using `@lellimecnar/jest-config/browser` preset; add test scripts to package.json; configure for Next.js environment.
**Testing:** Create sample test file in each app; run tests to verify configuration works with React Testing Library

### Step 3: Add Jest Configuration - UI Packages

**Files:** `packages/ui/jest.config.js`, `packages/ui-nativewind/jest.config.js`, `packages/ui/package.json`, `packages/ui-nativewind/package.json`
**What:** Create Jest configurations for UI component libraries with appropriate presets (browser for ui, react-native for ui-nativewind); add test scripts.
**Testing:** Create sample component test; verify React components can be tested with appropriate rendering utilities

### Step 4: Add Jest Configuration - Utils Package

**Files:** `packages/utils/jest.config.js`, `packages/utils/package.json`
**What:** Create Jest configuration for utils package using base preset; add test and test:watch scripts.
**Testing:** Create sample utility function test; run to verify pure TypeScript testing works correctly

### Step 5: Create Testing Documentation

**Files:** `docs/TESTING.md`
**What:** Document testing strategy (unit/integration/e2e pyramid), testing tools (Jest, React Testing Library), coverage requirements, how to run tests, and examples for each package type.
**Testing:** Review documentation with team; ensure all common scenarios are covered with examples

### Step 6: Add Sample Test Files

**Files:** `web/miller.pub/src/__tests__/example.test.tsx`, `packages/ui/src/components/__tests__/button.test.tsx`, `packages/utils/src/__tests__/example.test.ts`
**What:** Create example test files demonstrating testing patterns for each package type; these serve as templates for future tests.
**Testing:** Run all sample tests; verify they pass and demonstrate best practices

### Step 7: Update Root Package.json with Coverage Scripts

**Files:** `package.json` (root)
**What:** Add `test:coverage` and `test:ci` scripts to root package.json that run tests with coverage across all workspaces.
**Testing:** Use `#tool:execute/runTests` with `mode="coverage"`; verify coverage reports are generated for all tested packages

### Step 8: Configure Coverage Upload for CI

**Files:** `.github/workflows/coverage.yml` (update), `codecov.yml` (create)
**What:** Configure Codecov or Coveralls integration for coverage tracking over time; add badge to README; set up PR coverage comments.
**Testing:** Push to PR; verify coverage report uploads successfully and appears as PR comment

## Testing Standards to Document

### Unit Tests

- **Location:** Co-located with source in `__tests__/` directories or `*.spec.ts` files
- **Naming:** `ComponentName.test.tsx` or `functionName.spec.ts`
- **Coverage Target:** 80% minimum for branches, lines, and functions
- **Focus:** Pure functions, component logic, edge cases

### Integration Tests

- **Location:** `src/integration-tests/` or `tests/integration/`
- **Focus:** Component interactions, API integrations, data flow
- **Coverage Target:** Critical user paths must be covered

### E2E Tests (Future)

- **Tool:** Playwright or Cypress
- **Location:** `tests/e2e/`
- **Focus:** Critical user journeys across full application

## Coverage Thresholds

```javascript
// Recommended coverage thresholds
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Notes

- Start with lower thresholds (60-70%) and increase over time
- Not all packages need the same coverage requirements
- Config packages may have minimal testing needs
- Focus on testing business logic over implementation details
- Consider visual regression testing for UI packages (Chromatic, Percy)
