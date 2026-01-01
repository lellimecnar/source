# @jsonpath/complete

This package is a convenience bundle that provides a feature-complete JSONPath engine, built on the `@jsonpath/core` framework. It includes a comprehensive set of plugins to support RFC 9535 and many common extensions.

## Features

- **Batteries Included**: A single package to get a fully-featured JSONPath engine.
- **RFC 9535 Compliant**: Includes all syntax, functions, and features from the JSONPath RFC.
- **Extended Functionality**: Comes with plugins for regular expression matching, script expressions, parent selectors, and more.
- **Multiple Result Types**: Supports various result formats like values, paths, and pointers.

## Installation

```bash
pnpm add @jsonpath/complete
```

## Usage

The primary export is `createCompleteEngine`, which returns a pre-configured JSONPath engine.

```typescript
import { createCompleteEngine } from '@jsonpath/complete';

const engine = createCompleteEngine();

const data = {
  store: {
    book: [
      {
        category: 'reference',
        author: 'Nigel Rees',
        title: 'Sayings of the Century',
        price": 8.95
      },
      {
        category: 'fiction',
        author: 'Evelyn Waugh',
        title: 'Sword of Honour',
        price: 12.99
      }
    ]
  }
};

const authors = engine.evaluateSync('$.store.book[*].author', data);
console.log(authors);
// Output: [ 'Nigel Rees', 'Evelyn Waugh' ]
```

## Included Plugins

This bundle includes a wide array of plugins, providing a comprehensive JSONPath environment:

- **RFC 9535 Compliance**:
  - `@jsonpath/plugin-rfc-9535`: Full support for the JSONPath RFC, including all standard selectors and functions.
- **Extended Selectors**:
  - `@jsonpath/plugin-parent-selector`: Support for the `^` parent selector.
  - `@jsonpath/plugin-property-name-selector`: Support for the `~` property name selector.
  - `@jsonpath/plugin-type-selectors`: Support for type-based selectors (e.g., `$.store.book[?(@.price is number)]`).
- **Advanced Filters**:
  - `@jsonpath/plugin-filter-regex`: Support for regular expression matching in filters using the `=~` operator.
  - `@jsonpath/plugin-script-expressions`: Support for script expressions in filters (e.g., `$[?(@.price > 10)]`).
  - `@jsonpath/plugin-iregexp`: Support for I-RegExp (RFC 9485) matching.
- **Result Customization**:
  - `@jsonpath/plugin-result-types`: Support for multiple result formats: `value`, `path`, `pointer`, `node`, `parent`.
- **Validation & Functions**:
  - `@jsonpath/plugin-validate`: Integration with schema validators (Zod, Yup, JSON Schema).
  - `@jsonpath/plugin-functions-core`: A collection of core utility functions for use in expressions.

## API Reference

### `createCompleteEngine()`

Creates a new JSONPath engine pre-configured with all the plugins listed above.

```typescript
const engine = createCompleteEngine();
```

### `completePlugins`

An array of all the plugin instances included in the complete bundle. Useful if you want to create a custom engine that includes most but not all of the standard features.

```typescript
import { createEngine } from '@jsonpath/core';
import { completePlugins } from '@jsonpath/complete';

const engine = createEngine({
	plugins: [
		...completePlugins,
		// add your custom plugins here
	],
});
```
