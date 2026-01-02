# @jsonpath/mutate

Mutation utilities for JSON data, built on the `@jsonpath/core` engine and RFC 6901 JSON Pointers.

## Features

- **In-place Mutation**: Modify JSON objects directly using JSONPath queries.
- **Pointer-Based**: Uses JSON Pointers for precise and efficient updates.
- **Flexible Operations**: Support for setting values, removing properties, and more.

## Installation

```bash
pnpm add @jsonpath/mutate
```

## Usage

```typescript
import { mutate } from '@jsonpath/mutate';

const data = {
	store: {
		books: [
			{ title: 'Book 1', price: 10 },
			{ title: 'Book 2', price: 20 },
		],
	},
};

// Update the price of all books
mutate(data, '$.store.books[*].price', (price) => price * 1.1);

console.log(data.store.books[0].price); // 11
```

### `mutate(data, path, mapper)`

- `data`: The JSON object to mutate.
- `path`: The JSONPath expression targeting the elements to change.
- `mapper`: A function that receives the current value and returns the new value.

## License

[MIT](../../../LICENSE)
