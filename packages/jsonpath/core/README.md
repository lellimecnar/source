# @jsonpath/core

This package provides a lightweight, plugin-first framework for building custom JSONPath engines. It is designed to be highly extensible, allowing you to add features and capabilities through a simple plugin system.

## Features

- **Plugin-First Architecture**: The core engine has no built-in features. All functionality, from syntax to result types, is added via plugins.
- **Extensible**: Create your own plugins to support custom selectors, functions, and result formats.
- **Lightweight**: The core is minimal, ensuring a small footprint and fast startup.
- **TypeScript Native**: Fully written in TypeScript for a robust and type-safe development experience.

## Installation

```bash
pnpm add @jsonpath/core
```

## Usage

The main export is the `createEngine` function, which you use to build a JSONPath engine with a specific set of plugins.

### Creating an Engine

```typescript
import { createEngine } from '@jsonpath/core';
import type { JsonPathPlugin } from '@jsonpath/core';

// Define or import your plugins
const myPlugins: JsonPathPlugin[] = [
	// ... your plugins here
];

// Create the engine
const engine = createEngine({
	plugins: myPlugins,
	options: {
		maxDepth: 100, // Optional: limit recursion depth
		maxResults: 1000, // Optional: limit total results
		plugins: {
			// Optional: plugin-specific configuration
			'my-plugin-id': { someSetting: true },
		},
	},
});

// Use the engine
const compiled = engine.compile('$.store.book[*].author');

// Synchronous evaluation
const results = engine.evaluateSync(compiled, myJsonData);

// Asynchronous evaluation (for plugins that use async functions/expressions)
const asyncResults = await engine.evaluate(compiled, myJsonData);

console.log(results);
```

### API Reference

#### `createEngine(options: CreateEngineOptions): JsonPathEngine`

Creates a new engine instance.

- `plugins`: An array of `JsonPathPlugin` objects.
- `options`:
  - `maxDepth`: Maximum recursion depth for the engine (default: 100).
  - `maxResults`: Maximum number of results to return (default: Infinity).
  - `plugins`: A record of plugin-specific configurations, keyed by plugin ID.

#### `JsonPathEngine`

- `compile(expression: string): CompileResult`: Parses and compiles a JSONPath expression into an AST.
- `evaluateSync(compiled: CompileResult, data: unknown, options?: EvaluateOptions): unknown[]`: Evaluates a compiled expression against data synchronously.
- `evaluate(compiled: CompileResult, data: unknown, options?: EvaluateOptions): Promise<unknown[]>`: Evaluates a compiled expression against data asynchronously.

#### `JsonPathError`

All errors thrown by the engine are instances of `JsonPathError`. They include a `code` property for programmatic handling.

```typescript
import { JsonPathError } from '@jsonpath/core';

try {
	engine.compile('invalid path');
} catch (err) {
	if (err instanceof JsonPathError) {
		console.error(`Error [${err.code}]: ${err.message}`);
	}
}
```

### Plugins

Plugins are the heart of the `@jsonpath/core` framework. They can be used to:

- Register new token types for the lexer.
- Add new parsing rules to the parser.
- Define evaluators for custom selectors or functions.
- Provide new result types.

#### Plugin Resolution (Ordering + Validation)

When you create an engine, the plugin list is **resolved** before any hooks run:

- **Deterministic ordering**: plugins are ordered by `plugin.meta.id`.
- **Dependency-aware ordering**:
  - `dependsOn`: required dependencies must be present and will always run first.
  - `optionalDependsOn`: if present in the plugin list, they will run first; if missing, they are ignored.
- **Duplicate ids**: providing the same `plugin.meta.id` more than once throws a `JSONPATH_PLUGIN_ERROR`.
- **Capability conflicts**: if two plugins claim the same `meta.capabilities` entry, engine creation throws a `JSONPATH_PLUGIN_ERROR`.

You can also build plugin lists incrementally with `PluginRegistry`, which enforces unique plugin ids.

For a complete example of how to create and use plugins, see the `@jsonpath/complete` package, which uses this framework to build a feature-complete JSONPath engine.

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
