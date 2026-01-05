# @jsonpath/evaluator

RFC 9535 compliant JSONPath evaluator.

## Features

- **RFC 9535 Compliant**: Passes 100% of the official compliance tests.
- **Extensible**: Supports custom functions and plugins.
- **Strict Mode**: Optional strict mode for validation.
- **High Performance**: Optimized for speed and memory efficiency.

## Installation

```bash
pnpm add @jsonpath/evaluator
```

## Usage

```typescript
import { evaluate } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';

const data = {
	store: {
		book: [
			{
				category: 'reference',
				author: 'Nigel Rees',
				title: 'Sayings of the Century',
				price: 8.95,
			},
			{
				category: 'fiction',
				author: 'Evelyn Waugh',
				title: 'Sword of Honour',
				price: 12.99,
			},
		],
	},
};

const ast = parse('$.store.book[*].author');
const results = evaluate(ast, data);
// ['Nigel Rees', 'Evelyn Waugh']
```

## License

MIT
