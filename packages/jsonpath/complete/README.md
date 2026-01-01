# @jsonpath/complete

A comprehensive JSONPath engine bundle for RFC 9535 compliance, including all standard syntax, functions, and result views.

## Features

- **RFC 9535 Compliant**: Full support for the JSONPath specification.
- **Extended Syntax**: Includes support for parent selectors (`^`), property name selectors (`~`), and more.
- **Result Views**: Support for `value`, `node`, `path`, `pointer`, and `parent` result types.
- **I-Regexp Support**: RFC 9485 compliant regular expressions.
- **JSON Patch**: Integrated support for generating JSON Patches from queries.

## Usage

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

// Simple query
const authors = engine.evaluateSync('$.store.book[*].author', data);
// ['Nigel Rees', 'Evelyn Waugh']

// Using result types
const nodes = engine.evaluateSync('$.store.book[0]', data, {
	resultType: 'node',
});
// [{ value: { ... }, location: { ... }, root: { ... } }]
```

## Included Plugins

This bundle includes:

- All RFC 9535 syntax plugins (root, current, child, descendant, wildcard, union, array slice, filter).
- All RFC 9535 function plugins (length, count, match, search, value).
- Result view plugins (value, node, path, pointer, parent).
- I-Regexp plugin.
- Type selectors and property name selectors.
