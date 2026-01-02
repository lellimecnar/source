# @jsonpath/compat-jsonpath

This package is a compatibility adapter for the popular `dchester/jsonpath` library. It provides a drop-in replacement that mimics the original API, but is powered by the modern, RFC 9535 compliant `@jsonpath/core` engine.

## Features

- **Drop-in Replacement**: Use the same API you are familiar with from `dchester/jsonpath`.
- **Modern Engine**: Leverages the extensible and powerful `@jsonpath/core` engine.
- **RFC 9535 Compliant**: Benefits from the compliance of the underlying engine.

## Installation

```bash
pnpm add @jsonpath/compat-jsonpath
```

## Usage

This package can be used as a direct replacement for `dchester/jsonpath`.

```typescript
import jp from '@jsonpath/compat-jsonpath';

const data = {
  store: {
    book: [
      {
        category: 'reference',
        author: 'Nigel Rees',
        title: 'Sayings of the Century',
        price": 8.95
      },
    ]
  }
};

// Get values
const authors = jp.query(data, '$.store.book[*].author');
// [ 'Nigel Rees' ]

// Get paths
const paths = jp.paths(data, '$.store.book[0].price');
// [ [ '$', 'store', 'book', 0, 'price' ] ]
```

## API

This package implements the following methods from the `dchester/jsonpath` API:

- `query(obj, path, count)`
- `paths(obj, path, count)`
- `nodes(obj, path, count)`
- `value(obj, path, newValue)`
- `parent(obj, path)`
- `apply(obj, path, fn)`

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
