This file provides guidance when working with code in the `@lellimecnar/eslint-config` package.

## Package Overview

`@lellimecnar/eslint-config` is a shared ESLint configuration package that provides consistent linting rules across the monorepo. It extends Vercel's style guide and includes TypeScript, React, Tailwind CSS, and Prettier integrations.

## Tech Stack

- **Base**: ESLint 8+
- **Style Guide**: @vercel/style-guide
- **TypeScript**: @typescript-eslint/parser, @typescript-eslint/eslint-plugin
- **React**: eslint-plugin-react, eslint-plugin-react-hooks
- **Tailwind**: eslint-plugin-tailwindcss
- **Prettier**: eslint-config-prettier, eslint-plugin-prettier
- **Other**: eslint-plugin-import, eslint-plugin-jest, eslint-plugin-only-warn, eslint-config-turbo

## Package Structure

```
.
├── base.js          # Base ESLint config (TypeScript, general rules)
├── browser.js        # Browser-specific config
├── next.js           # Next.js-specific config
├── node.js           # Node.js-specific config
└── package.json      # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm config-eslint lint
```

## Package Exports

The package provides multiple configuration presets:

```javascript
// Base configuration (TypeScript, general)
module.exports = require('@lellimecnar/eslint-config')

// Browser-specific
module.exports = require('@lellimecnar/eslint-config/browser')

// Next.js-specific
module.exports = require('@lellimecnar/eslint-config/next')

// Node.js-specific
module.exports = require('@lellimecnar/eslint-config/node')
```

## Dependencies

### Development Dependencies
- `@lellimecnar/prettier-config` - Shared Prettier configuration
- `@vercel/style-guide` - Vercel's ESLint style guide
- `@typescript-eslint/eslint-plugin` - TypeScript ESLint plugin
- `@typescript-eslint/parser` - TypeScript parser for ESLint
- `eslint-config-prettier` - Disables ESLint rules that conflict with Prettier
- `eslint-config-turbo` - Turborepo ESLint config
- `eslint-plugin-import` - Import/export linting
- `eslint-plugin-jest` - Jest testing rules
- `eslint-plugin-only-warn` - Convert errors to warnings
- `eslint-plugin-prettier` - Run Prettier as ESLint rule
- `eslint-plugin-react` - React linting rules
- `eslint-plugin-react-hooks` - React Hooks linting
- `eslint-plugin-tailwindcss` - Tailwind CSS class ordering

### Peer Dependencies
- `eslint` ^8
- `typescript` ~5.5

## Configuration Details

### Base Configuration (`base.js`)
- Extends Vercel style guide (base + TypeScript)
- Includes Tailwind CSS recommended rules
- Includes Turborepo config
- Integrates Prettier
- Custom rule overrides:
  - Allows `console.warn` and `console.error`
  - Relaxed TypeScript strict rules (warnings instead of errors)
  - Allows parameter reassignment
  - Allows bitwise operators
  - Allows `any` type (with warning)

### Browser Configuration (`browser.js`)
- Extends base configuration
- Adds browser-specific rules

### Next.js Configuration (`next.js`)
- Extends base configuration
- Adds Next.js-specific rules

### Node.js Configuration (`node.js`)
- Extends base configuration
- Adds Node.js-specific rules

## Usage in Consuming Packages

### ESLint Configuration
Create or update `.eslintrc.js`:

```javascript
module.exports = require('@lellimecnar/eslint-config/next') // for Next.js apps
// or
module.exports = require('@lellimecnar/eslint-config') // for base config
```

### Package.json Script
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

## Architecture Notes

### Rule Philosophy
- Uses `only-warn` plugin to convert errors to warnings (less strict)
- TypeScript strict rules are warnings, not errors
- Allows flexibility while maintaining code quality

### Prettier Integration
- Prettier is integrated via `eslint-plugin-prettier`
- Conflicts are resolved via `eslint-config-prettier`
- Uses shared Prettier config from `@lellimecnar/prettier-config`

### Tailwind CSS Support
- Includes `eslint-plugin-tailwindcss` for class ordering
- Helps maintain consistent Tailwind class usage

### Turborepo Integration
- Includes `eslint-config-turbo` for monorepo-specific rules
- Works seamlessly with Turborepo task pipeline

## Modifying Configuration

### Adding New Rules
1. Edit the appropriate config file (`base.js`, `browser.js`, etc.)
2. Add rules to the `rules` object
3. Test in consuming packages

### Adding New Plugins
1. Install plugin in `devDependencies`
2. Add to `plugins` array
3. Configure rules in `rules` object

### Creating New Presets
1. Create new `.js` file (e.g., `react-native.js`)
2. Export configuration extending base or another preset
3. Add export to `package.json`:
   ```json
   {
     "exports": {
       "./react-native": "./react-native.js"
     }
   }
   ```

## Notes

- Package is private (not published)
- Uses workspace dependencies
- All configs extend Vercel's style guide as base
- TypeScript is required as peer dependency
- ESLint 8+ is required as peer dependency
- Designed for use across all packages in the monorepo
