# @jsonpath/compat-jsonpath-plus

This package is a compatibility adapter for the `jsonpath-plus` library. It provides a drop-in replacement that mimics the original API, but is powered by the modern, RFC 9535 compliant `@jsonpath/core` engine.

## Features

- **Drop-in Replacement**: Use the same API you are familiar with from `jsonpath-plus`.
- **Modern Engine**: Leverages the extensible and powerful `@jsonpath/core` engine.
- **RFC 9535 Compliant**: Benefits from the compliance of the underlying engine.
- **Multiple Result Types**: Supports `value`, `path`, `pointer`, `parent`, `parentProperty`, and `all` result types.

## Installation

```bash
pnpm add @jsonpath/compat-jsonpath-plus
```

## Usage

This package can be used as a direct replacement for `jsonpath-plus`.

```typescript
import { JSONPath } from '@jsonpath/compat-jsonpath-plus';

const data = {
  store: {
    book": [
      {
        category: 'reference',
        author: 'Nigel Rees',
        title: 'Sayings of the Century',
        price: 8.95
      },
    ]
  }
};

const result = JSONPath({ path: '$.store.book[*].author', json: data });
// [ 'Nigel Rees' ]
```

### Options

The `JSONPath` function accepts an options object with the following properties:

- `path`: The JSONPath expression to evaluate.
- `json`: The JSON data to query.
- `resultType`: The desired result type. Can be `value`, `path`, `pointer`, `parent`, `parentProperty`, or `all`.
- `wrap`: Whether to wrap the result in an array. Defaults to `true`.

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
