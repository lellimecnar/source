# @lellimecnar/eslint-config

Shared ESLint configurations for the monorepo.

## Usage

In your `package.json`:

```json
{
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*"
	}
}
```

In your `.eslintrc.js`:

```javascript
module.exports = require('@lellimecnar/eslint-config/next'); // or 'node', 'react', 'base'
```
