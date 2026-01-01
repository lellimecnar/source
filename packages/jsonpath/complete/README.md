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

This bundle includes a wide array of plugins, such as:

- `@jsonpath/plugin-rfc-9535`: For full RFC 9535 compliance.
- `@jsonpath/plugin-filter-regex`: For regular expression matching in filters.
- `@jsonpath/plugin-script-expressions`: For using script expressions in filters.
- `@jsonpath/plugin-parent-selector`: For the `^` parent selector.
- And many more...

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
