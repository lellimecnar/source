This file provides guidance when working with code in the `@lellimecnar/jest-config` package.

## Package Overview

`@lellimecnar/jest-config` is a shared Jest configuration package that provides consistent testing setup across the monorepo. It includes presets for TypeScript and browser environments.

## Tech Stack

- **Testing**: Jest ^29
- **TypeScript**: ts-jest ^29
- **TypeScript**: ~5.5

## Package Structure

```
.
├── jest-preset.js           # Base Jest preset (TypeScript)
├── browser/
│   └── jest-preset.js       # Browser-specific Jest preset
└── package.json             # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm config-jest lint
```

## Package Exports

The package provides Jest preset configurations:

```javascript
// Base preset (TypeScript, Node.js)
module.exports = require('@lellimecnar/jest-config/jest-preset');

// Browser preset
module.exports = require('@lellimecnar/jest-config/browser/jest-preset');
```

## Dependencies

### Development Dependencies

- `@types/jest` - TypeScript types for Jest
- `jest` ^29 - Testing framework
- `ts-jest` ^29 - TypeScript preprocessor for Jest

### Peer Dependencies

- `jest` ^29
- `typescript` ~5.5

## Configuration Details

### Base Preset (`jest-preset.js`)

- Uses `ts-jest` preset for TypeScript support
- Transforms `.ts` and `.tsx` files
- Supports `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.node` file extensions
- Ignores test fixtures, node_modules, and dist directories
- Root directory is set to package root

### Browser Preset (`browser/jest-preset.js`)

- Extends base preset
- Adds browser-specific configuration
- Includes DOM environment setup

## Usage in Consuming Packages

### Jest Configuration

Create or update `jest.config.js`:

```javascript
module.exports = require('@lellimecnar/jest-config/jest-preset');
```

Or for browser environments:

```javascript
module.exports = require('@lellimecnar/jest-config/browser/jest-preset');
```

### Package.json Scripts

```json
{
	"scripts": {
		"test": "jest",
		"test:watch": "jest --watch"
	}
}
```

### Custom Configuration

You can extend the preset and add custom settings:

```javascript
const baseConfig = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...baseConfig,
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	// Additional custom settings
};
```

## Architecture Notes

### TypeScript Support

- Uses `ts-jest` for TypeScript compilation
- Automatically transforms `.ts` and `.tsx` files
- No need for separate TypeScript compilation step

### File Extensions

- Supports TypeScript (`.ts`, `.tsx`)
- Supports JavaScript (`.js`, `.jsx`)
- Supports JSON and Node.js native modules

### Ignore Patterns

- Test fixtures are ignored
- `node_modules` is ignored
- `dist` build output is ignored

### Preset Pattern

- Uses Jest's preset system for easy configuration
- Can be extended or overridden in consuming packages
- Provides sensible defaults for TypeScript projects

## Modifying Configuration

### Adding New Settings

1. Edit the appropriate preset file
2. Add settings to the configuration object
3. Test in consuming packages

### Creating New Presets

1. Create new directory and `jest-preset.js` file
2. Extend base preset or create new configuration:

   ```javascript
   const baseConfig = require('../jest-preset');

   module.exports = {
   	...baseConfig,
   	// Additional settings
   };
   ```

3. Update `package.json` files array if needed

## Notes

- Package is private (not published)
- Uses workspace dependencies
- Jest 29+ is required as peer dependency
- TypeScript 5.5 is required as peer dependency
- Designed for use across all packages in the monorepo
- Presets are JavaScript files for flexibility
