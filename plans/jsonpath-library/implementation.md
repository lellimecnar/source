# @jsonpath/\* Library Suite - Implementation Guide

**Branch:** `feat/jsonpath-library-suite`

**Goal:** Build a comprehensive, tree-shakeable JSONPath/Pointer/Patch library suite with zero dependencies, full RFC compliance, and high performance (<17KB gzipped core, >5M ops/sec compiled queries).

---

## Prerequisites

**Before starting, ensure:**

- [ ] You are on branch `feat/jsonpath-library-suite`
- [ ] All existing tests pass
- [ ] You have a clean working directory

**Branch Setup:**

If not on the correct branch, create it from main:

```bash
# Check current branch
git branch --show-current

# If not on feat/jsonpath-library-suite, create it
git checkout -b feat/jsonpath-library-suite main
```

---

## Implementation Overview

This implementation consists of 11 major steps:

1. **Initialize Package Structure** - Scaffold all 10 packages with configuration
2. **Implement @jsonpath/core** - Foundation types, errors, utilities
3. **Implement @jsonpath/lexer** - Tokenization with ASCII lookup tables
4. **Implement @jsonpath/parser** - Pratt parser for AST generation
5. **Implement @jsonpath/functions** - RFC 9535 built-in functions
6. **Implement @jsonpath/evaluator** - Interpreter with RFC compliance tests
7. **Implement @jsonpath/pointer** - RFC 6901 JSON Pointer
8. **Implement @jsonpath/patch** - RFC 6902 JSON Patch
9. **Implement @jsonpath/merge-patch** - RFC 7386 JSON Merge Patch
10. **Implement @jsonpath/compiler** - JIT compilation
11. **Implement @jsonpath/jsonpath** - Main facade package

**IMPORTANT:** Due to response length limits, this implementation file contains comprehensive references and file structure. For complete code implementations of Steps 2-11, refer to the research document at `.copilot-tracking/research/20260103-jsonpath-library-suite-research.md` which contains:

- Complete file contents for all packages
- Full test suites
- Detailed RFC compliance implementations
- Integration patterns

---

## Step 1: Initialize Package Structure & Shared Infrastructure

**Objective:** Create the complete monorepo structure for all 10 @jsonpath packages with proper configuration.

### 1.1: Update Workspace Configuration

#### Update `pnpm-workspace.yaml`

- [ ] Open `pnpm-workspace.yaml`
- [ ] Add the JSONPath packages workspace:

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/card-stack/*'
  - 'packages/data-map/*'
  - 'packages/ui-spec/*'
  - 'packages/jsonpath/*' # ADD THIS LINE
```

### 1.2: Create Directory Structure

- [ ] Create all package directories:

```bash
mkdir -p packages/jsonpath/core/src/__tests__
mkdir -p packages/jsonpath/lexer/src/__tests__
mkdir -p packages/jsonpath/parser/src/__tests__
mkdir -p packages/jsonpath/functions/src/__tests__
mkdir -p packages/jsonpath/evaluator/src/__tests__
mkdir -p packages/jsonpath/compiler/src/__tests__
mkdir -p packages/jsonpath/pointer/src/__tests__
mkdir -p packages/jsonpath/patch/src/__tests__
mkdir -p packages/jsonpath/merge-patch/src/__tests__
mkdir -p packages/jsonpath/jsonpath/src/__tests__
```

### 1.3: Package Configuration Template

For each of the 10 packages, create the following files. Replace `{PACKAGE_NAME}` with the actual package name (e.g., `core`, `lexer`, etc.):

#### `packages/jsonpath/{PACKAGE_NAME}/package.json`

```json
{
	"name": "@jsonpath/{PACKAGE_NAME}",
	"version": "0.1.0",
	"description": "JSONPath {PACKAGE_NAME} implementation",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"sideEffects": false,
	"files": ["dist", "README.md"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage",
		"type-check": "tsgo --noEmit",
		"lint": "eslint ."
	},
	"dependencies": {},
	"devDependencies": {
		"@lellimecnar/config-eslint": "workspace:*",
		"@lellimecnar/config-typescript": "workspace:*",
		"@lellimecnar/config-vite": "workspace:*",
		"@lellimecnar/config-vitest": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	},
	"keywords": ["jsonpath", "json", "{PACKAGE_NAME}"],
	"license": "MIT"
}
```

### 1.3.1: Package Dependencies Matrix

Update each package's `package.json` dependencies field according to this matrix:

| Package               | Runtime Dependencies                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @jsonpath/core        | _(none - zero dependencies)_                                                                                                                                                                 |
| @jsonpath/lexer       | `@jsonpath/core`                                                                                                                                                                             |
| @jsonpath/parser      | `@jsonpath/core`, `@jsonpath/lexer`                                                                                                                                                          |
| @jsonpath/functions   | `@jsonpath/core`                                                                                                                                                                             |
| @jsonpath/evaluator   | `@jsonpath/core`, `@jsonpath/parser`, `@jsonpath/functions`                                                                                                                                  |
| @jsonpath/compiler    | `@jsonpath/core`, `@jsonpath/parser`                                                                                                                                                         |
| @jsonpath/pointer     | `@jsonpath/core`                                                                                                                                                                             |
| @jsonpath/patch       | `@jsonpath/core`, `@jsonpath/pointer`                                                                                                                                                        |
| @jsonpath/merge-patch | `@jsonpath/core`                                                                                                                                                                             |
| @jsonpath/jsonpath    | `@jsonpath/core`, `@jsonpath/lexer`, `@jsonpath/parser`, `@jsonpath/functions`, `@jsonpath/evaluator`, `@jsonpath/compiler`, `@jsonpath/pointer`, `@jsonpath/patch`, `@jsonpath/merge-patch` |

**All workspace dependencies use `workspace:*` protocol.**

#### `packages/jsonpath/{PACKAGE_NAME}/tsconfig.json`

```json
{
	"extends": "@lellimecnar/config-typescript/base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src",
		"paths": {
			"*": ["./*"]
		}
	},
	"include": ["src/**/*.ts"],
	"exclude": ["node_modules", "dist", "**/*.spec.ts", "**/__tests__"]
}
```

#### `packages/jsonpath/{PACKAGE_NAME}/vite.config.ts`

```typescript
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteNodeConfig } from '@lellimecnar/vite-config/node';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const externalDeps = [
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
];

const external = (id: string) =>
	id.startsWith('node:') ||
	externalDeps.some((dep: string) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
	mergeConfig(viteNodeConfig(), {
		plugins: [
			tsconfigPaths(),
			dts({
				entryRoot: 'src',
				tsconfigPath: 'tsconfig.json',
				outDir: 'dist',
			}),
		],
		build: {
			outDir: 'dist',
			lib: {
				entry: 'src/index.ts',
				formats: ['es'],
			},
			rollupOptions: {
				external,
				output: {
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
				},
			},
		},
	}),
);
```

#### `packages/jsonpath/{PACKAGE_NAME}/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

#### `packages/jsonpath/{PACKAGE_NAME}/.eslintrc.cjs`

```javascript
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
};
```

#### `packages/jsonpath/{PACKAGE_NAME}/src/index.ts`

```typescript
/**
 * @jsonpath/{PACKAGE_NAME}
 *
 * {Brief description of package purpose}
 *
 * @packageDocumentation
 */

// Exports will be added in subsequent steps
```

### 1.4: Install Dependencies

- [ ] Run pnpm install to install all workspace dependencies:

```bash
pnpm install
```

### 1.5: Verify Turborepo Configuration

- [ ] Check that `turbo.json` includes the correct patterns. No changes should be needed, but verify:

````json
{
  "pipeliConfigure RFC Compliance Test Suite

- [ ] Add napa configuration to root `package.json`:

```json
{
  "scripts": {
    "postinstall": "napa",
    "napa": "napa"
  },
  "devDependencies": {
    "napa": "^3.0.0"
  },
  "napa": {
    "jsonpath-compliance-test-suite": "jsonpath-standard/jsonpath-compliance-test-suite"
  }
}
````

### 1.5: Install Dependencies

- [ ] Run pnpm install to install all workspace dependencies and download compliance test suite:

```basPackage dependencies match the matrix in Step 1.3.1
- [ ] `pnpm-workspace.yaml` includes `'packages/jsonpath/*'`
- [ ] Root `package.json` has napa configuration for compliance tests
- [ ] `pnpm install` completes without errors
- [ ] jsonpath-compliance-test-suite downloaded to `node_modules/`
- [ ] All packages resolve: `pnpm list --filter '@jsonpath/*'`
- [ ] Stub build succeeds: `pnpm --filter '@jsonpath/*' build`
- [ ] Verify zero external dependencies: `pnpm list --filter '@jsonpath/*' --depth 0 | grep -v "workspace:" | grep "├──\|└──"` (should return no results)
### 1.6
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    }
  }
}
```

### Step 1 Verification Checklist

- [ ] All 10 package directories created under `packages/jsonpath/`
- [ ] Each package has: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.eslintrc.cjs`, `src/index.ts`
- [ ] `pnpm-workspace.yaml` includes `'packages/jsonpath/*'`
- [ ] `pnpm install` completes without errors
- [ ] All packages resolve: `pnpm list --filter '@jsonpath/*'`
- [ ] Stub build succeeds: `pnpm --filter '@jsonpath/*' build`

### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath): initialize package structure

Create monorepo structure for @jsonpath/* library suite:
- 10 core packages: core, lexer, parser, functions, evaluator, compiler, pointer, patch, merge-patch, jsonpath
- Shared configuration: typescript, vite, vitest, eslint
- Workspace integration: pnpm-workspace.yaml update
- Zero dependencies enforced
- Build pipeline configured with Turborepo

Packages created:
- @jsonpath/core - Foundation types, errors, utilities
- @jsonpath/lexer - Tokenization
- @jsonpath/parser - AST generation
- @jsonpath/functions - Built-in functions
- @jsonpath/evaluator - Query interpreter
- @jsonpath/compiler - JIT compilation
- @jsonpath/pointer - RFC 6901 JSON Pointer
- @jsonpath/patch - RFC 6902 JSON Patch
- @jsonpath/merge-patch - RFC 7386 JSON Merge Patch
- @jsonpath/jsonpath - Main facade

completes: step 1 of 11 for jsonpath-library-suite
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Step 2: Implement @jsonpath/core Foundation

**Package:** `packages/jsonpath/core`

**Objective:** Implement foundation types, error classes, registries, and utilities that all other packages depend on.

### 2.1: File Structure Overview

```types.spec.ts # Type tests (co-located)
│   ├── errors.ts          # Error hierarchy
│   ├── errors.spec.ts     # Error tests (co-located)
│   ├── registry.ts        # Function/selector/operator registries
│   ├── utils.ts           # Utility functions
│   ├── utils.spec.ts      # Utility tests (co-located)
│   └── index.ts           # Package exports
```

**Note:** Tests are co-located with source files following monorepo conventions, NOT in a separate `__tests__/` directory. └── **tests**/
│ ├── types.spec.ts
│ ├── errors.spec.ts
│ └── utils.spec.ts

````

### 2.2: Implementation Files

**IMPORTANT:** Due to space limitations, complete file contents are documented in the research file. Refer to `.copilot-tracking/research/20260103-jsonpath-library-suite-research.md` sections:
- "Complete @jsonpath/core Implementation"
- "Core Types and Interfaces"
- "Error Hierarchy Implementation"
- "Registry Pattern Implementation"
- "Utility Functions Implementation"

**Key Implementations Required:**

#### `src/types.ts`
- [ ] Define `JSONValue`, `JSONObject`, `JSONArray`, `JSONPrimitive` types
- [ ] Define `PathSegment` and `Path` types
- [ ] Define `QueryNode<T>` interface with value, path, parent, root
- [ ] Define `QueryResult<T>` interface with methods: values(), paths(), nodes(), first(), isEmpty(), count(), map(), filter(), forEach(), parents()
- [ ] Define `FunctionDefinition`, `SelectorDefinition`, `OperatorDefinition` interfaces
- [ ] Define `ParameterType` and `ReturnType` enums

#### `src/errors.ts`
- [ ] Implement `JSONPathError` base class with code, position, context, cause
- [ ] Implement `JSONPathSyntaxError extends JSONPathError`
- [ ] Implement `JSONPathTypeError extends JSONPathError`
- [ ] Implement `JSONPathReferenceError extends JSONPathError`
- [ ] Implement `JSONPointerError extends JSONPathError`
- [ ] Implement `JSONPatchError extends JSONPathError`
- [ ] Define `ErrorCode` type union

#### `src/registry.ts`
- [ ] Export `functionRegistry: Map<string, FunctionDefinition>`
- [ ] Export `selectorRegistry: Map<string, SelectorDefinition>`
- [ ] Export `operatorRegistry: Map<string, OperatorDefinition>`
- [ ] Implement registration helper functions

#### `src/utils.ts`
- [ ] Implement `isObject(value: unknown): value is JSONObject`
- [ ] Implement `isArray(value: unknown): value is JSONArray`
- [ ] Implement `isPrimitive(value: unknown): value is JSONPrimitive`
- [ ] Implement `deepEqual(a: unknown, b: unknown): boolean` with circular reference handling
- [ ] Implement `deepClone<T>(value: T): T` using structured clone or recursive fallback
- [ ] Implement `freeze<T>(value: T): Readonly<T>` with recursive freezing

#### `src/index.ts`
- [ ] Export all types from `./types.js`
- [ ] Export all errors from `./errors.js`
- [ ] Export all registries from `./registry.js`
- [ ] Export all utilities from `./utils.js`

### 2.3: Test Suite
**Test files are co-located with source files:**

#### `src/types.spec.ts`
- [ ] Test type guards with valid/invalid inputs
- [ ] Test QueryNode interface requirements
- [ ] Test QueryResult methods (mock implementation)

#### `src/errors.spec.ts`
- [ ] Test error class hierarchy
- [ ] Test error properties (code, message, position, context, cause)
- [ ] Test error serialization

#### `src
#### `src/__tests__/utils.spec.ts`
- [ ] Test `isObject`, `isArray`, `isPrimitive` with edge cases
- [ ] Test `deepEqual` with primitives, objects, arrays, circular references
- [ ] Test `deepClone` with nested structures, ensure independence
- [ ] Test `freeze` recursively freezes objects

### Step 2 Verification Checklist

- [ ] All exports defined in `src/index.ts`
- [ ] All types compile with TypeScript strict mode
- [ ] All tests pass: `pnpm --filter @jsonpath/core test`
- [ ] Test coverage >90%: `pnpm --filter @jsonpath/core test:coverage`
- [ ] Build succeeds: `pnpm --filter @jsonpath/core build`
- [ ] Type declarations generated in `dist/`

### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath): implement @jsonpath/core foundation

Implement core types, errors, registries, and utilities:
- JSON type system (JSONValue, JSONObject, JSONArray, JSONPrimitive)
- Query types (Path, QueryNode, QueryResult interfaces)
- Error hierarchy (6 error classes with contextual information)
- Registry system (function, selector, operator registries)
- Utility functions (deepEqual with circular handling, deepClone, freeze)

Test coverage: >90%
Zero external dependencies
Strict TypeScript compliance

completes: step 2 of 11 for jsonpath-library-suite
````

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

---

## Step 3: Implement @jsonpath/lexer Tokenization

**Package:** `packages/jsonpath/lexer`

**Objective:** Implement high-performance tokenizer using ASCII lookup tables for JSONPath query strings.

**Dependencies:** `@jsonpath/core`

### 3.1: File Structure

```
packages/jsonpath/lexer/
├── src/
│   ├── tokens.ts          # Token types and interfaces
│   ├── char-tables.ts     # ASCII lookup tables
│   ├── lexer.ts           # Lexer class
│   ├── index.ts           # Exports
│   └── __tests__/
│       ├── lexer.spec.ts
│       └── tokenize.spec.ts
```

### 3.2: Implementation Overview

**Complete implementations are in the research document.** Key requirements:

#### `src/tokens.ts`

- [ ] Define `TokenType` enum with all token types (STRUCTURAL, OPERATORS, LITERALS, IDENTIFIERS, ERROR)
- [ ] Define `Token` interface with type, value, position (line, column)

#### `src/char-tables.ts`

- [ ] Implement ASCII lookup tables for fast character classification
- [ ] Tables for: whitespace, digits, identifier start/continue, operators

#### `src/lexer.ts`

- [ ] Implement `Lexer` class with tokenization logic
- [ ] Handle all escape sequences: `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\b`, `\f`, `\uXXXX`
- [ ] Support integer, decimal, scientific notation numbers
- [ ] Implement error recovery (emit ERROR token, advance position)
- [ ] Track line and column for all tokens

#### Test Requirements

- [ ] Test all token types
- [ ] Test escape sequences
- [ ] Test malformed input (unterminated strings, invalid escapes)
- [ ] Performance benchmark: tokenize 10K queries in <100ms

### Step 3 Verification Checklist

- [ ] All token types tested
- [ ] Edge cases covered (empty input, malformed strings, unusual numbers)
- [ ] Performance benchmark passes
- [ ] Build succeeds: `pnpm --filter @jsonpath/lexer build`
- [ ] Tests pass: `pnpm --filter @jsonpath/lexer test`

### Step 3 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/lexer tokenization

High-performance tokenizer with:
- ASCII lookup tables for fast character classification
- All escape sequences supported (\\, \', \", \n, \r, \t, \b, \f, \uXXXX)
- Integer, decimal, scientific notation numbers
- Error recovery with position tracking
- Performance: 10K queries tokenized in <100ms

Test coverage: edge cases, malformed input, performance benchmarks

completes: step 3 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 4: Implement @jsonpath/parser AST Generation

**Package:** `packages/jsonpath/parser`

**Objective:** Implement Pratt parser for JSONPath expressions with correct operator precedence.

**Dependencies:** `@jsonpath/core`, `@jsonpath/lexer`

### 4.1: File Structure

```
packages/jsonpath/parser/
├── src/
│   ├── nodes.ts           # AST node types
│   ├── parser.ts          # Parser class
│   ├── pratt.ts           # Pratt algorithm for expressions
│   ├── walk.ts            # AST traversal
│   ├── transform.ts       # AST transformation
│   ├── index.ts
│   └── __tests__/
│       ├── parser.spec.ts
│       ├── expressions.spec.ts
│       └── walk.spec.ts
```

### 4.2: Implementation Overview

**Complete code in research document.** Key points:

- [ ] Implement all AST node types (RootNode, ChildNode, FilterNode, etc.)
- [ ] Pratt parser with correct precedence: `||`: 10, `&&`: 20, `==`: 30, `<`: 40, `!`: 50 prefix
- [ ] Parse all RFC 9535 selectors: name, index, wildcard, slice, filter
- [ ] Implement `walk()` for AST traversal
- [ ] Implement `transform()` for AST transformation
- [ ] Error recovery and reporting

### Step 4 Verification Checklist

- [ ] All RFC 9535 examples parse correctly
- [ ] Operator precedence correct
- [ ] Error messages clear and actionable
- [ ] AST traversal/transformation tested
- [ ] Tests pass: `pnpm --filter @jsonpath/parser test`

### Step 4 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/parser AST generation

Pratt parser for JSONPath with:
- Correct operator precedence (||: 10, &&: 20, ==: 30, <: 40, !: 50)
- All RFC 9535 segments/selectors
- Complete AST node types
- walk() and transform() utilities
- Error recovery with clear messages

All RFC 9535 examples parse successfully

completes: step 4 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 5: Implement @jsonpath/functions Built-in Functions

**Package:** `packages/jsonpath/functions`

**Objective:** Implement RFC 9535 built-in filter functions.

**Dependencies:** `@jsonpath/core`

**Complete implementation details in research document. Key functions:**

- [ ] `length()` - Returns string/array/object length
- [ ] `count()` - Returns node count
- [ ] `match()` - Regex full match
- [ ] `search()` - Regex partial match
- [ ] `value()` - Extracts single value from nodes
- [ ] Registration utilities

### Step 5 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/functions built-in functions

RFC 9535 built-in filter functions:
- length() - string/array/object length
- count() - node count
- match() - regex full match (I-Regexp)
- search() - regex partial match (I-Regexp)
- value() - single value extraction
- Registration and type metadata system

Exact RFC 9535 semantics with comprehensive tests

completes: step 5 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 6: Implement @jsonpath/evaluator Interpreter

**Package:** `packages/jsonpath/evaluator`

**Objective:** Implement AST interpreter with full RFC 9535 compliance.

**Dependencies:** `@jsonpath/core`, `@jsonpath/parser`, `@jsonpath/functions`

**Key implementations:**

- [ ] All selector implementations (name, index, wildcard, slice, filter)
- [ ] Filter expression evaluation
- [ ] QueryResult class with all methods
- [ ] RFC 9535 compliance test suite integration (via napa)

### Step 6 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/evaluator interpreter

AST interpreter with:
- All selectors: name, index, wildcard, slice (with negative indices/step), filter
- Filter expression evaluation with all operators
- Complete QueryResult implementation (values, paths, nodes, first, etc.)
- RFC 9535 compliance test suite integrated (jsonpath-compliance-test-suite)

100% compliance with RFC 9535 test cases

completes: step 6 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 7: Implement @jsonpath/pointer RFC 6901

**Package:** `packages/jsonpath/pointer`

**Objective:** Implement RFC 6901 JSON Pointer with parsing, resolution, and mutation.

**Dependencies:** `@jsonpath/core`

**Complete implementation in research document.** Key features:

- [ ] Pointer parsing with `~0` (tilde) and `~1` (slash) escapes
- [ ] `resolve()`, `get()`, `has()` for value retrieval
- [ ] `set()`, `remove()` for immutable mutations
- [ ] Conversion utilities (pointer ↔ path array)

### Step 7 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/pointer RFC 6901

RFC 6901 JSON Pointer implementation:
- Parsing with ~0 (tilde) and ~1 (slash) escape handling
- resolve(), get(), has() for value retrieval
- set(), remove() for immutable mutations (return new objects)
- Array index validation, "-" token support
- Conversion utilities (toPath, fromPath, append, parent, basename)

RFC 6901 compliance tests passing

completes: step 7 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 8: Implement @jsonpath/patch RFC 6902

**Package:** `packages/jsonpath/patch`

**Objective:** Implement RFC 6902 JSON Patch with all 6 operations.

**Dependencies:** `@jsonpath/core`, `@jsonpath/pointer`

**Operations to implement:**

- [ ] `add`, `remove`, `replace`, `move`, `copy`, `test`
- [ ] `apply()` function (atomic, rollback on error)
- [ ] `validate()` function
- [ ] `diff()` function to generate patches
- [ ] Array index `-` for append

### Step 8 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/patch RFC 6902

RFC 6902 JSON Patch implementation:
- All 6 operations: add, remove, replace, move, copy, test
- apply() with atomic failure (rollback on error)
- validate() for patch validation
- diff() to generate patches from two documents
- Array index "-" for append operations

JSON Patch Test Suite passing

completes: step 8 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 9: Implement @jsonpath/merge-patch RFC 7386

**Package:** `packages/jsonpath/merge-patch`

**Objective:** Implement RFC 7386 JSON Merge Patch.

**Dependencies:** `@jsonpath/core`

**Key features:**

- [ ] RFC 7386 merge algorithm (null deletes keys, arrays replaced, objects merged recursively)
- [ ] `merge()`, `apply()`, `applyMut()` functions
- [ ] `diff()` to generate merge patches
- [ ] `isEmpty()` utility

### Step 9 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/merge-patch RFC 7386

RFC 7386 JSON Merge Patch implementation:
- merge() algorithm (null deletes, arrays replace, objects merge)
- apply() immutable, applyMut() mutable operations
- diff() generates minimal merge patches
- isEmpty() patch validation

RFC 7386 compliance tests passing

completes: step 9 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 10: Implement @jsonpath/compiler JIT Compilation

**Package:** `packages/jsonpath/compiler`

**Objective:** Implement JIT compiler for high-performance query execution.

**Dependencies:** `@jsonpath/core`, `@jsonpath/parser`

**Key features:**

- [ ] AST → optimized JavaScript code generation
- [ ] Use `new Function()` for JIT compilation
- [ ] LRU cache for compiled queries
- [ ] Target: >5M ops/sec for compiled queries
- [ ] Verify compiled output matches interpreter semantics

### Step 10 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/compiler JIT compilation

JIT compiler with:
- AST to optimized JavaScript code generation
- new Function() for JIT compilation
- LRU cache for compiled queries (default capacity: 100)
- Performance: >5M ops/sec for typical queries
- Verified compiled output matches interpreter for all compliance tests

Performance benchmarks included

completes: step 10 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Step 11: Implement @jsonpath/jsonpath Main Facade

**Package:** `packages/jsonpath/jsonpath`

**Objective:** Create main entrypoint package that re-exports all APIs.

**Dependencies:** All previous @jsonpath packages

**Features:**

- [ ] Unified API: `query()`, `queryAll()`, `queryPaths()`
- [ ] Re-export `parse()`, `compile()`, `evaluate()`
- [ ] Fluent `JSONPath` class API
- [ ] Complete integration tests
- [ ] Comprehensive documentation

### Step 11 STOP & COMMIT

```txt
feat(jsonpath): implement @jsonpath/jsonpath main facade

Main package with unified API:
- Core functions: query(), queryAll(), queryPaths()
- Advanced API: parse(), compile(), evaluate()
- Fluent JSONPath class for chainable queries
- Complete integration test suite (basic queries, filters, recursion, unions)
- Full API documentation with examples

All packages integrated and working together

completes: step 11 of 11 for jsonpath-library-suite
```

**STOP & COMMIT**

---

## Final Integration & Documentation

### Verification

- [ ] All packages build successfully: `pnpm --filter '@jsonpath/*' build`
- [ ] RFC compliance verified for all relevant packages
- [ ] Zero external dependencies verified:

```bash
# Should show ONLY workspace dependencies, no external packages
pnpm list --filter '@jsonpath/*' --depth 0

# This should return no results (empty output)
pnpm list --filter '@jsonpath/*' --depth 0 | grep -v "workspace:" | grep "├──\|└──"
```

- [ ] Bundle size targets met: Analyze gzipped sizes

````bash
# Build all packages
pnpm --filter '@jsonpath/*' build

# Check sizes (should be <17KB total gzipped for core packages)
find packages/jsonpath/*/dist -name 'index.js' -exec sh -c 'echo "{}:"; gzip -c {} | wc -c' \;
```' type-check`
- [ ] Linting passes: `pnpm --filter '@jsonpath/*' lint`
- [ ] Bundle size targets met: run `pnpm --filter '@jsonpath/*' build` and check dist/ sizes
- [ ] RFC compliance verified for all relevant packages

### Documentation Updates

- [ ] Update root README.md to mention @jsonpath packages
- [ ] Create `packages/jsonpath/README.md` overview
- [ ] Ensure each package has comprehensive README.md
- [ ] Add API documentation to `docs/api/jsonpath.md`

### Final Commit

```txt
docs(jsonpath): complete library suite documentation

Add comprehensive documentation for @jsonpath/* library suite:
- Root README updated with package overview
- Individual package READMEs with examples and API reference
- API documentation in docs/api/
- Architecture decision records for key design choices

@jsonpath/* library suite complete:
- 10 packages implementing JSONPath, JSON Pointer, JSON Patch, JSON Merge Patch
- Zero external dependencies
- Full RFC compliance (9535, 6901, 6902, 7386)
- High performance (>5M ops/sec compiled queries)
- Bundle size: <17KB gzipped core packages

completes: jsonpath-library-suite implementation
````

---

## Troubleshooting

### Build Issues

**Problem:** Vite build fails with module resolution errors

**Solution:** Ensure all internal dependencies use `workspace:*` protocol in package.json dependencies

---

**Problem:** TypeScript cannot find type declarations

**Solution:** Run `pnpm --filter '@jsonpath/*' build` to generate .d.ts files

---

### Test Issues

**Problem:** Compliance test suite not found

**Solution:** Ensure `napa` is configured in root package.json to install `jsonpath-compliance-test-suite` from GitHub

---

**Problem:** Performance benchmarks fail

**Solution:** Performance can vary by hardware. Adjust benchmark thresholds if needed, but ensure compiled queries are significantly faster than interpreted queries.

---

## Additional Resources

- **Research Document:** `.copilot-tracking/research/20260103-jsonpath-library-suite-research.md`
  - Contains complete code implementations
  - Detailed RFC compliance notes
  - Integration patterns and examples
- **Specifications:**
  - RFC 9535: https://datatracker.ietf.org/doc/html/rfc9535
  - RFC 6901: https://datatracker.ietf.org/doc/html/rfc6901
  - RFC 6902: https://datatracker.ietf.org/doc/html/rfc6902
  - RFC 7386: https://datatracker.ietf.org/doc/html/rfc7386

- **JSONPath Compliance Test Suite:** https://github.com/jsonpath-standard/jsonpath-compliance-test-suite

---

**End of Implementation Guide**
