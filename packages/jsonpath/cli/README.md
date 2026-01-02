# @jsonpath/cli

This package provides a command-line interface for evaluating JSONPath expressions. It is designed to be used with a JSON configuration file, allowing for a declarative approach to JSONPath queries.

## Features

- **JSON Configuration**: Define your JSONPath expression, input data, and result type in a single JSON file.
- **Powered by `@jsonpath/complete`**: Uses the powerful and complete JSONPath engine for evaluation.
- **Simple Interface**: A straightforward command-line tool for running your queries.

## Installation

```bash
pnpm add @jsonpath/cli
```

## Usage

The CLI is invoked with a single argument: the path to a JSON configuration file.

```bash
jsonpath <config.json>
```

### Configuration File

The configuration file is a JSON object with the following properties:

- `path`: The JSONPath expression to evaluate.
- `json`: The JSON data to query.
- `resultType`: (Optional) The desired result type. Can be `value`, `path`, `pointer`, etc.

**Example `config.json`:**

```json
{
	"path": "$.store.book[*].author",
	"json": {
		"store": {
			"book": [
				{
					"category": "reference",
					"author": "Nigel Rees",
					"title": "Sayings of the Century",
					"price": 8.95
				},
				{
					"category": "fiction",
					"author": "Evelyn Waugh",
					"title": "Sword of Honour",
					"price": 12.99
				}
			],
			"bicycle": {
				"color": "red",
				"price": 19.95
			}
		}
	},
	"resultType": "value"
}
```

### Running the CLI

```bash
jsonpath config.json
```

**Output:**

```json
["Nigel Rees", "Evelyn Waugh"]
```

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
