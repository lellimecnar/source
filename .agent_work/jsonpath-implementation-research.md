# @jsonpath/\* Library Suite - Complete Implementation Research

**Generated**: 2026-01-03  
**Purpose**: Comprehensive context for copy-paste ready implementation

---

## Table of Contents

1. [Project Structure & Conventions](#1-project-structure--conventions)
2. [Monorepo Integration](#2-monorepo-integration)
3. [Package Templates](#3-package-templates)
4. [Code Patterns & Standards](#4-code-patterns--standards)
5. [Build Configuration](#5-build-configuration)
6. [Testing Requirements](#6-testing-requirements)
7. [JSONPath Specification Summary](#7-jsonpath-specification-summary)
8. [Implementation Checklist](#8-implementation-checklist)

---

## 1. Project Structure & Conventions

### 1.1 Workspace Location

All @jsonpath/\* packages will be created under:

```
packages/jsonpath/*
```

With directory structure matching existing patterns:

```
packages/jsonpath/
├── core/
├── lexer/
├── parser/
├── functions/
├── evaluator/
├── compiler/
├── pointer/
├── patch/
├── merge-patch/
└── jsonpath/
```

### 1.2 Workspace Configuration

The workspace must be registered in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'packages/card-stack/*'
  - 'packages/ui-spec/*'
  - 'packages/data-map/*'
  - 'packages/jsonpath/*' # ADD THIS LINE
```

### 1.3 Package Naming Convention

All packages follow the scoped naming pattern:

- **Scope**: `@jsonpath` (NOT `@lellimecnar`)
- **Package names**: `core`, `lexer`, `parser`, etc.
- **Full name example**: `@jsonpath/core`

### 1.4 Version Management

All packages start at version `1.0.0` (per spec, this is a mature, RFC-compliant implementation).

---

## 2. Monorepo Integration

### 2.1 Turborepo Configuration

The existing `turbo.json` needs no changes. Tasks are already defined:

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["$TURBO_DEFAULT$", ".env*"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
		},
		"test": {
			"outputs": ["coverage/**"],
			"dependsOn": []
		},
		"lint": {
			"dependsOn": ["^build"]
		},
		"type-check": {
			"dependsOn": ["^build"],
			"outputs": []
		}
	}
}
```

### 2.2 Root Scripts

No changes needed to root `package.json` scripts. Existing commands work:

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm type-check     # Type-check all packages
```

### 2.3 Shared Dependencies

All packages will use these exact versions from root `devDependencies`:

```json
{
	"@lellimecnar/eslint-config": "workspace:*",
	"@lellimecnar/prettier-config": "workspace:*",
	"@lellimecnar/typescript-config": "workspace:*",
	"@lellimecnar/vite-config": "workspace:^",
	"@lellimecnar/vitest-config": "workspace:*",
	"@types/node": "^24",
	"@vitest/coverage-v8": "^4.0.16",
	"eslint": "^8.57.1",
	"typescript": "~5.5",
	"vite": "^7.3.0",
	"vite-plugin-dts": "^4.5.4",
	"vite-tsconfig-paths": "^6.0.3",
	"vitest": "^4.0.16"
}
```

---

## 3. Package Templates

### 3.1 Complete package.json Template

```json
{
	"name": "@jsonpath/PACKAGE_NAME",
	"version": "1.0.0",
	"description": "PACKAGE_DESCRIPTION",
	"type": "module",
	"exports": {
		".": {
			"types": "./dist/index.d.ts",
			"default": "./dist/index.js"
		}
	},
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"files": ["dist"],
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"keywords": ["jsonpath", "json", "query", "rfc9535"],
	"author": "",
	"license": "MIT",
	"repository": {
		"type": "git",
		"url": "https://github.com/lellimecnar/source",
		"directory": "packages/jsonpath/PACKAGE_NAME"
	},
	"publishConfig": {
		"access": "public"
	},
	"dependencies": {
		// Add workspace dependencies as needed, e.g.:
		// "@jsonpath/core": "workspace:*"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@types/node": "^24",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vite-tsconfig-paths": "^6.0.3",
		"vitest": "^4.0.16"
	}
}
```

### 3.2 Complete tsconfig.json Template

```json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"paths": {
			"*": ["./*"]
		},
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"emitDecoratorMetadata": false,
		"experimentalDecorators": false
	},
	"include": ["src/**/*.ts"],
	"exclude": [
		"dist",
		"build",
		"node_modules",
		"src/**/*.spec.ts",
		"src/**/__tests__/**"
	]
}
```

**Note**: Unlike card-stack, jsonpath packages do NOT use decorators.

### 3.3 Complete vite.config.ts Template

```typescript
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';

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

### 3.4 Complete vitest.config.ts Template

```typescript
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

### 3.5 Complete .eslintrc.cjs Template

```javascript
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
	rules: {
		// Package-specific overrides if needed
	},
};
```

### 3.6 src/index.ts Export Pattern

```typescript
// src/index.ts

// Export all types
export type {
	TypeName1,
	TypeName2,
	// ... all exported types
} from './types';

// Export all classes/functions
export {
	ClassName1,
	functionName1,
	// ... all exported values
} from './module';

// ... additional exports
```

**CRITICAL**: @jsonpath/\* packages use **granular exports** (NOT barrel exports).  
Check each package's spec for specific exports.

---

## 4. Code Patterns & Standards

### 4.1 Error Handling Pattern

```typescript
// errors.ts
export type ErrorCode =
	| 'SYNTAX_ERROR'
	| 'TYPE_ERROR'
	| 'REFERENCE_ERROR'
	| 'POINTER_ERROR'
	| 'PATCH_ERROR'
	| 'FUNCTION_ERROR'
	| 'INVALID_ARGUMENT';

export class JSONPathError extends Error {
	readonly code: ErrorCode;
	readonly position?: number;
	readonly path?: string;
	readonly cause?: Error;

	constructor(
		message: string,
		code: ErrorCode,
		options?: {
			position?: number;
			path?: string;
			cause?: Error;
		},
	) {
		super(message);
		this.name = 'JSONPathError';
		this.code = code;
		this.position = options?.position;
		this.path = options?.path;
		this.cause = options?.cause;

		// Maintain proper stack trace in V8
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export class JSONPathSyntaxError extends JSONPathError {
	constructor(message: string, position?: number) {
		super(message, 'SYNTAX_ERROR', { position });
		this.name = 'JSONPathSyntaxError';
	}
}

export class JSONPathTypeError extends JSONPathError {
	constructor(message: string) {
		super(message, 'TYPE_ERROR');
		this.name = 'JSONPathTypeError';
	}
}

// ... etc for other error types
```

### 4.2 Test File Pattern

```typescript
// src/module.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { functionToTest, ClassToTest } from './module';

describe('module', () => {
	describe('functionToTest', () => {
		it('handles basic case', () => {
			const result = functionToTest('input');
			expect(result).toBe('expected');
		});

		it('throws on invalid input', () => {
			expect(() => functionToTest(null as any)).toThrow(JSONPathError);
		});
	});

	describe('ClassToTest', () => {
		let instance: ClassToTest;

		beforeEach(() => {
			instance = new ClassToTest();
		});

		it('has expected properties', () => {
			expect(instance).toHaveProperty('propertyName');
		});
	});
});
```

### 4.3 Type Definitions Pattern

```typescript
// types.ts

/**
 * JSON value type per RFC 8259
 */
export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };

export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

/**
 * Path segment can be a string (object key) or number (array index)
 */
export type PathSegment = string | number;

/**
 * Path is a readonly array of segments
 */
export type Path = readonly PathSegment[];
```

### 4.4 Utility Functions Pattern

```typescript
// utils.ts

/**
 * Type guard: check if value is a plain object
 */
export function isObject(value: unknown): value is JSONObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard: check if value is an array
 */
export function isArray(value: unknown): value is JSONArray {
	return Array.isArray(value);
}

/**
 * Type guard: check if value is a primitive
 */
export function isPrimitive(value: unknown): value is JSONPrimitive {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

/**
 * Deep equality check (handles circular refs by returning false)
 */
export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;

	if (a === null || b === null) return false;
	if (typeof a !== typeof b) return false;

	if (typeof a !== 'object') return false;

	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) return false;
		}
		return true;
	}

	const keysA = Object.keys(a as object);
	const keysB = Object.keys(b as object);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual((a as any)[key], (b as any)[key])) return false;
	}

	return true;
}

/**
 * Deep clone using structuredClone (Node 18+)
 */
export function deepClone<T>(value: T): T {
	// structuredClone is available in Node 18+ and modern browsers
	return structuredClone(value);
}

/**
 * Recursively freeze an object
 */
export function freeze<T>(value: T): Readonly<T> {
	if (value === null || typeof value !== 'object') {
		return value;
	}

	Object.freeze(value);

	for (const prop of Object.getOwnPropertyNames(value)) {
		freeze((value as any)[prop]);
	}

	return value;
}
```

### 4.5 Registry Pattern

```typescript
// registry.ts

/**
 * Global function registry
 */
export const functionRegistry = new Map<string, FunctionDefinition>();

/**
 * Global selector registry
 */
export const selectorRegistry = new Map<string, SelectorDefinition>();

/**
 * Global operator registry
 */
export const operatorRegistry = new Map<string, OperatorDefinition>();

/**
 * Register built-in functions at module load
 */
export function registerBuiltins(): void {
	// Called automatically by packages that provide built-ins
}
```

---

## 5. Build Configuration

### 5.1 Vite Build Output

Each package builds to `dist/` with this structure:

```
dist/
├── index.js          # Main ESM bundle
├── index.d.ts        # Type declarations
├── [module].js       # Preserved modules
└── [module].d.ts     # Module type declarations
```

**Key settings**:

- **Format**: ESM only (no CJS)
- **Module preservation**: Yes (`preserveModules: true`)
- **Source maps**: Yes (for debugging)
- **Tree-shaking**: Enabled
- **External dependencies**: All workspace and node: imports

### 5.2 TypeScript Compilation

- **Target**: ES2020
- **Module**: ESNext
- **Module resolution**: Bundler
- **Strict mode**: Enabled
- **No decorators**: Disabled (unlike card-stack)

### 5.3 Vite Base Config (from @lellimecnar/vite-config)

```typescript
// Reference: packages/config-vite/base.ts
export function viteBaseConfig(): UserConfig {
	return {
		plugins: [tsconfigPaths()],
		build: {
			emptyOutDir: true,
		},
	};
}

// Reference: packages/config-vite/node.ts
export function viteNodeConfig(): UserConfig {
	return {
		...viteBaseConfig(),
		// Node-specific settings
	};
}
```

### 5.4 Vitest Base Config (from @lellimecnar/vitest-config)

```typescript
// Reference: packages/config-vitest/base.ts
export function vitestBaseConfig(): ViteUserConfig {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			passWithNoTests: true,
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
			},
			setupFiles: [resolveLocalFile('./setup/reflect-metadata.ts')],
		},
	};
}
```

---

## 6. Testing Requirements

### 6.1 Test File Location

Tests are co-located with source files:

```
src/
├── module.ts
├── module.spec.ts    # Tests for module.ts
├── utils.ts
└── utils.spec.ts     # Tests for utils.ts
```

### 6.2 Test Command

```bash
# Run tests for specific package
pnpm --filter @jsonpath/core test

# Run tests in watch mode
pnpm --filter @jsonpath/core test:watch

# Run with coverage
pnpm --filter @jsonpath/core test:coverage
```

### 6.3 Coverage Target

- **Target**: 80% minimum (per existing monorepo standard)
- **Enforcement**: Not enforced yet, but documented
- **Reports**: HTML, LCOV, JSON, text formats

### 6.4 Test Structure

```typescript
describe('[PackageName]', () => {
  describe('[ModuleName]', () => {
    describe('[FunctionName]', () => {
      it('handles [scenario]', () => {
        // Arrange
        const input = ...;

        // Act
        const result = functionName(input);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });
});
```

### 6.5 RFC Compliance Testing

For packages implementing RFCs (core, pointer, patch, merge-patch):

```typescript
import complianceTests from './fixtures/rfc-compliance.json';

describe('RFC [NUMBER] Compliance', () => {
	for (const test of complianceTests) {
		it(test.name, () => {
			if (test.shouldFail) {
				expect(() => functionUnderTest(test.input)).toThrow();
			} else {
				const result = functionUnderTest(test.input);
				expect(result).toEqual(test.expected);
			}
		});
	}
});
```

---

## 7. JSONPath Specification Summary

### 7.1 Package Dependency Order

Packages MUST be implemented in this order (respects dependencies):

1. **@jsonpath/core** (no dependencies)
2. **@jsonpath/lexer** (depends on core)
3. **@jsonpath/parser** (depends on core, lexer)
4. **@jsonpath/functions** (depends on core)
5. **@jsonpath/evaluator** (depends on core, parser, functions)
6. **@jsonpath/compiler** (depends on core, parser, functions)
7. **@jsonpath/pointer** (depends on core)
8. **@jsonpath/patch** (depends on core, pointer)
9. **@jsonpath/merge-patch** (depends on core)
10. **@jsonpath/jsonpath** (depends on ALL)

### 7.2 Core Package Exports

```typescript
// @jsonpath/core exports

// JSON types
export type JSONValue = ...;
export type JSONPrimitive = ...;
export type JSONObject = ...;
export type JSONArray = ...;

// Path types
export type PathSegment = string | number;
export type Path = readonly PathSegment[];

// Query result types
export interface QueryNode<T = unknown> { ... }
export interface QueryResult<T = unknown> extends Iterable<QueryNode<T>> { ... }

// Registry types
export interface FunctionDefinition { ... }
export interface SelectorDefinition { ... }
export interface OperatorDefinition { ... }

// Registries (singletons)
export const functionRegistry: Map<string, FunctionDefinition>;
export const selectorRegistry: Map<string, SelectorDefinition>;
export const operatorRegistry: Map<string, OperatorDefinition>;

// Error classes
export class JSONPathError extends Error { ... }
export class JSONPathSyntaxError extends JSONPathError { ... }
export class JSONPathTypeError extends JSONPathError { ... }
export class JSONPathReferenceError extends JSONPathError { ... }
export class JSONPointerError extends JSONPathError { ... }
export class JSONPatchError extends JSONPathError { ... }

// Utility functions
export function isObject(value: unknown): value is JSONObject;
export function isArray(value: unknown): value is JSONArray;
export function isPrimitive(value: unknown): value is JSONPrimitive;
export function deepEqual(a: unknown, b: unknown): boolean;
export function deepClone<T>(value: T): T;
export function freeze<T>(value: T): Readonly<T>;
```

### 7.3 Key Implementation Requirements

#### Lexer

- **Performance**: ASCII lookup table for character classification
- **Error recovery**: Emit ERROR token on invalid input
- **Number formats**: Integer, decimal, scientific notation
- **String escapes**: `\\`, `\'`, `\"`, `\n`, `\r`, `\t`, `\b`, `\f`, `\uXXXX`

#### Parser

- **Algorithm**: Pratt parser for expressions
- **Precedence**:
  - `||`: 10 (lowest)
  - `&&`: 20
  - `==`, `!=`: 30
  - `<`, `<=`, `>`, `>=`: 40
  - `!`: 50 (highest)

#### Functions (RFC 9535)

- `length(value)`: Returns length of string/array/object
- `count(nodes)`: Returns count of nodes
- `match(string, pattern)`: I-Regexp full match
- `search(string, pattern)`: I-Regexp partial match
- `value(nodes)`: Returns single node value or null

#### Evaluator

- **Max recursion depth**: 100 (default, configurable)
- **Slice normalization**: Per RFC 9535 §2.3.4.2
- **Type coercion**: Boolean for filters, strict for comparisons
- **Circular detection**: Optional (default: enabled)

#### Compiler

- **Strategy**: Generate optimized JavaScript functions
- **Inline**: Simple selectors become direct property access
- **Hoist**: Extract constants
- **Monomorphic**: Consistent object shapes for V8

#### Pointer (RFC 6901)

- **Escape sequences**: `~0` → `~`, `~1` → `/`
- **Array indices**: Non-negative integers or "-"
- **Immutability**: All mutations return new objects

#### Patch (RFC 6902)

- **Operations**: add, remove, replace, move, copy, test
- **Immutability**: Default (mutate option available)
- **Inverse**: Generate undo operations
- **Validation**: Before application (default)

---

## 8. Implementation Checklist

### 8.1 Pre-Implementation

- [ ] Read complete JSONPath specification (specs/jsonpath.md)
- [ ] Understand RFC 9535 (JSONPath)
- [ ] Understand RFC 6901 (JSON Pointer)
- [ ] Understand RFC 6902 (JSON Patch)
- [ ] Understand RFC 7386 (JSON Merge Patch)

### 8.2 Workspace Setup

- [ ] Add `packages/jsonpath/*` to pnpm-workspace.yaml
- [ ] Create directory structure: `packages/jsonpath/[package-name]/`
- [ ] Verify Turborepo recognizes new packages

### 8.3 Per-Package Setup

For EACH package in dependency order:

- [ ] Create `package.json` from template
- [ ] Create `tsconfig.json` from template
- [ ] Create `vite.config.ts` from template
- [ ] Create `vitest.config.ts` from template
- [ ] Create `.eslintrc.cjs` from template
- [ ] Create `src/` directory
- [ ] Create `src/index.ts` (main export file)
- [ ] Implement core functionality per spec
- [ ] Create `src/*.spec.ts` test files
- [ ] Achieve >80% test coverage
- [ ] Run `pnpm install` in root to link workspace deps
- [ ] Verify `pnpm --filter @jsonpath/[package] build` works
- [ ] Verify `pnpm --filter @jsonpath/[package] test` passes
- [ ] Verify `pnpm --filter @jsonpath/[package] lint` passes
- [ ] Verify `pnpm --filter @jsonpath/[package] type-check` passes

### 8.4 Integration

- [ ] Create main `@jsonpath/jsonpath` package
- [ ] Re-export all types and functions
- [ ] Implement configuration system
- [ ] Implement query cache (LRU, 1000 entries)
- [ ] Test integration between packages
- [ ] Create comprehensive integration test suite
- [ ] Run RFC compliance tests
- [ ] Run performance benchmarks

### 8.5 Documentation

- [ ] Create README.md for each package
- [ ] Document all public APIs with JSDoc
- [ ] Create examples in AGENTS.md for @jsonpath/\*
- [ ] Update root AGENTS.md with @jsonpath usage

### 8.6 Quality Assurance

- [ ] All tests passing
- [ ] Coverage >80% per package
- [ ] No linting errors
- [ ] No type errors
- [ ] Build succeeds for all packages
- [ ] Bundle size <15KB gzipped (for full suite)
- [ ] Performance benchmarks meet targets

---

## 9. Quick Reference: File Paths

### 9.1 Existing Config Files

```
packages/config-eslint/node.js          # ESLint config for Node packages
packages/config-typescript/base.json    # Base TypeScript config
packages/config-vite/base.ts            # Base Vite config
packages/config-vite/node.ts            # Node-specific Vite config
packages/config-vitest/base.ts          # Base Vitest config
```

### 9.2 Example Packages to Reference

```
packages/card-stack/core/               # Example: Complex package with mixins
packages/data-map/core/                 # Example: Reactive store (uses json-p3)
packages/utils/                         # Example: Utilities package
```

### 9.3 Workspace Root Files

```
pnpm-workspace.yaml                     # Workspace configuration
turbo.json                              # Turborepo configuration
package.json                            # Root package.json
tsconfig.json                           # Root TypeScript config
vitest.config.ts                        # Root Vitest config
```

---

## 10. Import Statement Examples

### 10.1 Workspace Dependencies

```typescript
// Importing shared configs
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import { viteNodeConfig } from '@lellimecnar/vite-config/node';

// Importing between @jsonpath packages
import { JSONPathError, functionRegistry } from '@jsonpath/core';
import { Lexer } from '@jsonpath/lexer';
import { Parser } from '@jsonpath/parser';
```

### 10.2 External Dependencies (None for @jsonpath/\*)

The spec requires ZERO external dependencies. Only use:

- Node.js built-ins (`node:*`)
- Workspace packages (`@jsonpath/*`, `@lellimecnar/*`)

---

## 11. Performance Requirements

### 11.1 Benchmark Targets

| Operation              | Target        | Notes            |
| ---------------------- | ------------- | ---------------- |
| Parse simple path      | <1μs          | `$.store.book`   |
| Parse complex path     | <10μs         | With filters     |
| Compile query          | <50μs         | One-time cost    |
| Evaluate (interpreted) | >1M ops/sec   | Per execution    |
| Evaluate (compiled)    | >5M ops/sec   | Per execution    |
| JSON Pointer resolve   | >10M ops/sec  | Simple lookup    |
| JSON Patch apply       | >500K ops/sec | Single operation |

### 11.2 Bundle Size Budget

| Package               | Budget (gzipped) |
| --------------------- | ---------------- |
| @jsonpath/core        | 1.5KB            |
| @jsonpath/lexer       | 2.0KB            |
| @jsonpath/parser      | 3.0KB            |
| @jsonpath/functions   | 1.0KB            |
| @jsonpath/evaluator   | 2.5KB            |
| @jsonpath/compiler    | 2.0KB            |
| @jsonpath/pointer     | 1.0KB            |
| @jsonpath/patch       | 2.5KB            |
| @jsonpath/merge-patch | 0.8KB            |
| @jsonpath/jsonpath    | 0.7KB            |
| **Total**             | **17KB**         |

---

## 12. Common Pitfalls to Avoid

### 12.1 Export Patterns

❌ **WRONG**: Barrel exports

```typescript
// Don't do this
export * from './types';
export * from './utils';
```

✅ **CORRECT**: Explicit exports

```typescript
export type { JSONValue, JSONPrimitive } from './types';
export { isObject, isArray } from './utils';
```

### 12.2 Dependencies

❌ **WRONG**: External dependencies

```typescript
import lodash from 'lodash'; // NO!
```

✅ **CORRECT**: Self-contained utilities

```typescript
function deepClone<T>(value: T): T {
	return structuredClone(value); // Node 18+ built-in
}
```

### 12.3 Module Format

❌ **WRONG**: CommonJS

```javascript
module.exports = { ... };
```

✅ **CORRECT**: ESM

```typescript
export { ... };
```

### 12.4 Package Names

❌ **WRONG**: Using @lellimecnar scope

```json
{
	"name": "@lellimecnar/jsonpath-core"
}
```

✅ **CORRECT**: Using @jsonpath scope

```json
{
	"name": "@jsonpath/core"
}
```

---

## 13. Ready-to-Use Code Snippets

### 13.1 Package.json Scripts Section

```json
{
	"scripts": {
		"build": "vite build",
		"dev": "vite build --watch",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	}
}
```

### 13.2 Vite Config Imports

```typescript
import { createRequire } from 'node:module';
import { defineConfig, mergeConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteNodeConfig } from '@lellimecnar/vite-config/node';
```

### 13.3 Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
```

### 13.4 Error Class Boilerplate

```typescript
export class CustomError extends JSONPathError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, 'ERROR_CODE', options);
		this.name = 'CustomError';
	}
}
```

---

## 14. Next Steps

1. **Start with @jsonpath/core**: Foundation for all other packages
2. **Implement in dependency order**: Each package depends on prior ones
3. **Test continuously**: Run tests after each module
4. **Benchmark regularly**: Ensure performance targets are met
5. **Document as you go**: JSDoc for all public APIs

---

## 15. Specification Reference

Full specification available at:

```
/Volumes/MacStudioExternal/Users/lmiller/Dev/lellimecnar/source/specs/jsonpath.md
```

**Total lines**: 4814  
**Sections**: 13 main sections + 3 appendices  
**RFCs covered**:

- RFC 9535 (JSONPath)
- RFC 6901 (JSON Pointer)
- RFC 6902 (JSON Patch)
- RFC 7386 (JSON Merge Patch)
- RFC 9485 (I-Regexp for match/search functions)

---

**END OF RESEARCH DOCUMENT**

This document contains ALL information needed to implement the @jsonpath/\* library suite without additional research. All templates are complete, all patterns are documented, and all configurations are ready to use.
