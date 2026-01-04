# Task Research Notes: @jsonpath/\* Library Suite Implementation

## Research Executed

### File Analysis

- [specs/jsonpath.md](../../specs/jsonpath.md)
  - **4814 lines** comprehensive specification covering 10 core packages and 5 plugin packages
  - Full RFC compliance matrices for RFC 9535, RFC 6901, RFC 6902, RFC 7386
  - Detailed API specifications for each package with TypeScript interfaces
  - Performance targets: >5M ops/sec (compiled), >10M ops/sec (pointer)
  - Bundle size budget: <17KB gzipped for core packages, <20KB with all plugins

- [Project_Architecture_Blueprint.md](../../Project_Architecture_Blueprint.md)
  - **Modular Monorepo Architecture** using pnpm + Turborepo
  - Strict layered dependencies: Apps → UI → Domain → Infrastructure
  - Domain-Centric Design with pure TypeScript packages decoupled from frameworks

- [Technology_Stack_Blueprint.md](../../Technology_Stack_Blueprint.md)
  - **TypeScript ~5.5**, **Node.js ^24**, **pnpm 9.12.2**
  - **Vite** for library builds, **Vitest** for testing
  - **tsgo** (`@typescript/native-preview`) for type-checking

- [turbo.json](../../turbo.json)
  - `build` depends on `^build` (upstream first)
  - `test` outputs `coverage/**`
  - Persistent tasks: `dev`, `test:watch`

- [pnpm-workspace.yaml](../../pnpm-workspace.yaml)
  - Multi-package structures supported: `packages/card-stack/*`, `packages/data-map/*`, `packages/ui-spec/*`
  - **Pattern established**: `packages/jsonpath/*` would follow same convention

### Code Search Results

- **Existing JSONPath/JSON Pointer/Patch implementations**:
  - `@data-map/core` uses `json-p3` (v2.2.2) for all JSON operations
  - [packages/data-map/core/src/patch/apply.ts](../../packages/data-map/core/src/patch/apply.ts) imports `jsonpatch` from `json-p3`
  - Existing code uses `json-p3` for JSONPath evaluation, JSON Pointer resolution, JSON Patch application
- **Plan documents referencing JSONPath**:
  - [plan/architecture-ui-spec-core-1.md](../../plan/architecture-ui-spec-core-1.md) mandates `json-p3` usage
  - Mentions `ALT-001`: "Use existing internal JSONPath tooling from `packages/jsonpath/*`" (not chosen)
  - Indicates future `@jsonpath/*` packages were anticipated

- **Package structure patterns** (from `@card-stack/core`):
  - `package.json`: `type: "module"`, exports with types/default
  - `vite.config.ts`: Uses `@lellimecnar/vite-config/node`, `vite-plugin-dts`
  - `vitest.config.ts`: Uses `@lellimecnar/vitest-config` base config
  - `tsconfig.json`: Extends `@lellimecnar/typescript-config`

### External Research

- **Context7 - Python JSONPath (RFC 9535 reference)**:
  - RFC 9535 JSONPath implementation patterns
  - JSONPointer class with `resolve`, `exists`, `resolve_parent`, `join` methods
  - JSONPatch with `apply`, fluent builder pattern (`.add()`, `.replace()`, etc.)
  - Relative JSON Pointer support
  - Deviations from RFC 9535 documented (useful for implementation decisions)

### Project Conventions

- Standards referenced: `@lellimecnar/vite-config`, `@lellimecnar/vitest-config`, `@lellimecnar/typescript-config`, `@lellimecnar/eslint-config`
- Build tool: Vite with `vite-plugin-dts` for type declarations
- Test framework: Vitest with coverage via `@vitest/coverage-v8`
- Type checking: `tsgo --noEmit`
- Scripts: `build`, `test`, `test:coverage`, `test:watch`, `lint`, `type-check`

---

## Key Discoveries

### Project Structure

The monorepo already supports multi-package workspaces under `packages/`. The established pattern from `@card-stack/*` and `@data-map/*` provides a clear template:

```
packages/jsonpath/
├── core/           # @jsonpath/core - Foundation types, errors, utilities
├── lexer/          # @jsonpath/lexer - Tokenization
├── parser/         # @jsonpath/parser - AST generation
├── functions/      # @jsonpath/functions - Built-in filter functions
├── evaluator/      # @jsonpath/evaluator - Interpreter
├── compiler/       # @jsonpath/compiler - JIT compilation
├── pointer/        # @jsonpath/pointer - RFC 6901
├── patch/          # @jsonpath/patch - RFC 6902
├── merge-patch/    # @jsonpath/merge-patch - RFC 7386
├── jsonpath/       # @jsonpath/jsonpath - Main facade
└── plugins/
    ├── extended/   # @jsonpath/plugin-extended
    ├── types/      # @jsonpath/plugin-types
    ├── arithmetic/ # @jsonpath/plugin-arithmetic
    ├── extras/     # @jsonpath/plugin-extras
    └── path-builder/ # @jsonpath/plugin-path-builder
```

**Note**: The spec shows packages at `packages/jsonpath/*` structure. Update `pnpm-workspace.yaml` to include `'packages/jsonpath/*'`.

### Implementation Patterns

**1. Package Configuration Pattern (from existing packages):**

```typescript
// vite.config.ts pattern
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
	externalDeps.some((dep) => id === dep || id.startsWith(`${dep}/`));

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

**2. Package.json Pattern:**

```json
{
	"name": "@jsonpath/core",
	"version": "0.1.0",
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
	"sideEffects": false,
	"scripts": {
		"build": "vite build",
		"lint": "eslint .",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest",
		"type-check": "tsgo --noEmit"
	},
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@lellimecnar/vite-config": "workspace:^",
		"@lellimecnar/vitest-config": "workspace:*",
		"@vitest/coverage-v8": "^4.0.16",
		"eslint": "^8.57.1",
		"typescript": "~5.5",
		"vite": "^7.3.0",
		"vite-plugin-dts": "^4.5.4",
		"vitest": "^4.0.16"
	},
	"publishConfig": {
		"access": "public"
	}
}
```

**3. Vitest Config Pattern:**

```typescript
import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default defineConfig(vitestBaseConfig());
```

### Complete Examples

**RFC 9535 JSONPath Core Types (from spec):**

```typescript
// @jsonpath/core types
export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };

export type PathSegment = string | number;
export type Path = readonly PathSegment[];

export interface QueryNode<T = unknown> {
	readonly value: T;
	readonly path: Path;
	readonly root: unknown;
	readonly parent?: unknown;
	readonly parentKey?: PathSegment;
}

export interface QueryResult<T = unknown> extends Iterable<QueryNode<T>> {
	values(): T[];
	paths(): PathSegment[][];
	pointers(): string[];
	normalizedPaths(): string[];
	nodes(): QueryNode<T>[];
	first(): QueryNode<T> | undefined;
	last(): QueryNode<T> | undefined;
	isEmpty(): boolean;
	readonly length: number;
}
```

**RFC 6901 JSON Pointer Key Functions:**

```typescript
// @jsonpath/pointer exports
export function parse(pointer: string): PathSegment[];
export function stringify(path: readonly PathSegment[]): string;
export function resolve<T = unknown>(
	pointer: string,
	data: unknown,
): T | undefined;
export function set<T>(pointer: string, data: T, value: unknown): T;
export function remove<T>(pointer: string, data: T): T;
```

**RFC 6902 JSON Patch Operations:**

```typescript
export interface PatchOperation {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	value?: unknown;
	from?: string;
}

export function apply<T>(operations: PatchDocument, data: T): T;
export function diff(source: unknown, target: unknown): PatchOperation[];

export class PatchBuilder {
	add(path: string, value: unknown): this;
	remove(path: string): this;
	replace(path: string, value: unknown): this;
	move(from: string, to: string): this;
	copy(from: string, to: string): this;
	test(path: string, value: unknown): this;
	apply<T>(data: T): T;
}
```

### API and Schema Documentation

**Package Dependency Graph (from spec):**

```
@jsonpath/jsonpath (facade)
├── @jsonpath/evaluator
│   ├── @jsonpath/parser
│   │   ├── @jsonpath/lexer
│   │   │   └── @jsonpath/core
│   │   ├── @jsonpath/functions
│   │   │   └── @jsonpath/core
│   │   └── @jsonpath/core
│   └── @jsonpath/functions
├── @jsonpath/compiler
│   ├── @jsonpath/parser
│   └── @jsonpath/functions
├── @jsonpath/patch
│   └── @jsonpath/pointer
│       └── @jsonpath/core
└── @jsonpath/merge-patch
    └── @jsonpath/core
```

**Bundle Size Budget:**

| Package               | Budget (gzipped) | Priority |
| --------------------- | ---------------- | -------- |
| @jsonpath/core        | 1.5KB            | P0       |
| @jsonpath/lexer       | 2.0KB            | P0       |
| @jsonpath/parser      | 3.0KB            | P0       |
| @jsonpath/functions   | 1.0KB            | P0       |
| @jsonpath/evaluator   | 2.5KB            | P0       |
| @jsonpath/compiler    | 2.0KB            | P1       |
| @jsonpath/pointer     | 1.0KB            | P0       |
| @jsonpath/patch       | 2.5KB            | P1       |
| @jsonpath/merge-patch | 0.8KB            | P1       |
| @jsonpath/jsonpath    | 0.7KB            | P0       |
| **Total (core)**      | **17KB**         | —        |

### Configuration Examples

**tsconfig.json for packages:**

```json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"paths": {
			"*": ["./*"]
		},
		"module": "ESNext",
		"moduleResolution": "Bundler"
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules", "src/**/*.spec.ts"]
}
```

**pnpm-workspace.yaml update needed:**

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

### Technical Requirements

**RFC Compliance Requirements:**

1. **RFC 9535 (JSONPath)**: Full compliance with all selectors, operators, and built-in functions
2. **RFC 6901 (JSON Pointer)**: Complete pointer syntax, evaluation, escape sequences
3. **RFC 6902 (JSON Patch)**: All 6 operations (add, remove, replace, move, copy, test)
4. **RFC 7386 (JSON Merge Patch)**: Object merge, null deletion, array replacement

**Performance Targets:**

| Operation              | Target        |
| ---------------------- | ------------- |
| Parse simple path      | <1μs          |
| Parse complex path     | <10μs         |
| Compile simple path    | <50μs         |
| Evaluate (interpreted) | >1M ops/sec   |
| Evaluate (compiled)    | >5M ops/sec   |
| JSON Pointer resolve   | >10M ops/sec  |
| JSON Patch apply       | >500K ops/sec |

**Zero Dependencies Goal:**

- Core packages MUST have **zero external dependencies**
- Only workspace dependencies allowed (e.g., `@jsonpath/core`)

---

## Recommended Approach

### Implementation Strategy

**Phase 1: Foundation (Priority 0)**

1. Create `packages/jsonpath/` directory structure
2. Implement `@jsonpath/core` - types, errors, utilities
3. Implement `@jsonpath/pointer` - RFC 6901 complete
4. Set up testing infrastructure with Vitest

**Phase 2: JSONPath Engine (Priority 0)**

1. Implement `@jsonpath/lexer` - tokenization with ASCII lookup tables
2. Implement `@jsonpath/parser` - Pratt parser for expressions
3. Implement `@jsonpath/functions` - RFC 9535 built-in functions
4. Implement `@jsonpath/evaluator` - interpreter

**Phase 3: Advanced Features (Priority 1)**

1. Implement `@jsonpath/compiler` - JIT compilation
2. Implement `@jsonpath/patch` - RFC 6902
3. Implement `@jsonpath/merge-patch` - RFC 7386
4. Implement `@jsonpath/jsonpath` - facade package

**Phase 4: Plugins (Priority 2)**

1. Implement plugin packages as needed

### Key Decisions

1. **Build System**: Use Vite (matches existing monorepo pattern), not tsup as spec suggests
2. **Testing**: Vitest (matches existing pattern)
3. **Type Checking**: tsgo (matches existing pattern)
4. **ESM Only**: Focus on ESM-only output initially (matches existing packages)
5. **Zero Dependencies**: Critical for bundle size goals

### Integration with @data-map/core

The `@data-map/core` package currently uses `json-p3`. Migration path:

1. Implement `@jsonpath/*` packages
2. Create compatibility layer or direct replacement
3. Gradually migrate `@data-map/core` from `json-p3` to `@jsonpath/*`
4. Remove `json-p3` dependency

---

## Implementation Guidance

- **Objectives**:
  - Create zero-dependency JSONPath/Pointer/Patch library suite
  - Full RFC compliance (9535, 6901, 6902, 7386)
  - High performance (>5M ops/sec compiled)
  - Small bundle size (<17KB gzipped core)

- **Key Tasks**:
  1. Add `'packages/jsonpath/*'` to `pnpm-workspace.yaml`
  2. Create package scaffolding for all 10 core packages
  3. Implement packages in dependency order (core → lexer → parser → ...)
  4. Set up RFC compliance test suites
  5. Add performance benchmarks

- **Dependencies**:
  - Existing config packages: `@lellimecnar/vite-config`, `@lellimecnar/vitest-config`, `@lellimecnar/typescript-config`, `@lellimecnar/eslint-config`
  - Dev dependencies: `vite`, `vitest`, `vite-plugin-dts`, `@vitest/coverage-v8`

- **Success Criteria**:
  - All packages build successfully
  - > 90% test coverage per package
  - Pass RFC compliance test suites
  - Meet performance targets in benchmarks
  - Bundle size within budget

---

## Risks and Concerns

1. **Complexity**: 10 core packages + 5 plugins is substantial scope
2. **RFC Compliance**: Full compliance requires extensive test coverage
3. **Performance Optimization**: Meeting >5M ops/sec requires careful implementation
4. **Migration Risk**: Replacing `json-p3` in `@data-map/core` may introduce regressions
5. **Maintenance Burden**: Many packages to maintain long-term

---

## References

- [RFC 9535 - JSONPath](https://www.rfc-editor.org/rfc/rfc9535)
- [RFC 6901 - JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901)
- [RFC 6902 - JSON Patch](https://www.rfc-editor.org/rfc/rfc6902)
- [RFC 7386 - JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7386)
- [JSONPath Compliance Test Suite](https://github.com/jsonpath-standard/jsonpath-compliance-test-suite)
- [JSON Patch Test Suite](https://github.com/json-patch/json-patch-tests)
