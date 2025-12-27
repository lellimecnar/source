# @lellimecnar/typescript-config

Shared TypeScript configurations (tsconfig).

## Usage

In your `tsconfig.json`:

```json
{
	"extends": "@lellimecnar/typescript-config/next.json", // or 'base.json', 'react.json'
	"compilerOptions": {
		"paths": {
			"*": ["./*"],
			"@/*": ["./src/*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}
```
