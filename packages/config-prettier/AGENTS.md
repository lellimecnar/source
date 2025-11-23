This file provides guidance when working with code in the `@lellimecnar/prettier-config` package.

## Package Overview

`@lellimecnar/prettier-config` is a shared Prettier configuration package that provides consistent code formatting rules across the monorepo. It extends Vercel's Prettier style guide and customizes it for the project's preferences.

## Tech Stack

- **Formatter**: Prettier ^3
- **Style Guide**: @vercel/style-guide/prettier
- **TypeScript**: ~5.5

## Package Structure

```
.
├── prettier-preset.js    # Prettier configuration
└── package.json          # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm config-prettier lint
```

## Package Exports

The package exports a Prettier configuration:

```javascript
// In .prettierrc.js or package.json
module.exports = require('@lellimecnar/prettier-config')
```

## Dependencies

### Development Dependencies
- `@vercel/style-guide` - Vercel's Prettier style guide
- `prettier` ^3 - Code formatter

### Peer Dependencies
- `prettier` ^3
- `typescript` ~5.5

## Configuration Details

### Base Configuration (`prettier-preset.js`)
- Extends `@vercel/style-guide/prettier`
- Uses tabs for indentation (`useTabs: true`)
- Inherits all other settings from Vercel's style guide

## Usage in Consuming Packages

### Prettier Configuration
Create or update `.prettierrc.js`:

```javascript
module.exports = require('@lellimecnar/prettier-config')
```

Or in `package.json`:

```json
{
  "prettier": "@lellimecnar/prettier-config"
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### ESLint Integration
This config is integrated with ESLint via `@lellimecnar/eslint-config`:
- `eslint-config-prettier` disables conflicting ESLint rules
- `eslint-plugin-prettier` runs Prettier as an ESLint rule

## Architecture Notes

### Tab Indentation
- Uses tabs instead of spaces
- Consistent with project preferences
- Can be overridden in consuming packages if needed

### Vercel Style Guide
- Extends Vercel's Prettier configuration
- Provides sensible defaults for modern JavaScript/TypeScript
- Includes settings for React, JSX, and other common patterns

### Integration with ESLint
- Works seamlessly with `@lellimecnar/eslint-config`
- Prettier handles formatting, ESLint handles code quality
- Conflicts are automatically resolved

## Modifying Configuration

### Adding New Settings
1. Edit `prettier-preset.js`
2. Add settings to the configuration object
3. Test in consuming packages

### Overriding in Consuming Packages
You can extend and override in consuming packages:

```javascript
const baseConfig = require('@lellimecnar/prettier-config')

module.exports = {
  ...baseConfig,
  // Override specific settings
  printWidth: 100,
}
```

## Notes

- Package is private (not published)
- Uses workspace dependencies
- Prettier 3+ is required as peer dependency
- TypeScript 5.5 is required as peer dependency
- Designed for use across all packages in the monorepo
- Uses tabs for indentation (project preference)
- Integrated with ESLint configuration
