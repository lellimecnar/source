This file provides guidance when working with code in the `@lellimecnar/typescript-config` package.

## Package Overview

`@lellimecnar/typescript-config` is a shared TypeScript configuration package that provides consistent TypeScript compiler settings across the monorepo. It extends Vercel's TypeScript style guide and provides presets for different environments.

## Tech Stack

- **Base**: TypeScript ~5.5
- **Style Guide**: @vercel/style-guide/typescript/node20

## Package Structure

```
.
├── base.json      # Base TypeScript config (Node.js, general)
├── next.json      # Next.js-specific TypeScript config
├── react.json     # React-specific TypeScript config
└── package.json  # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm config-typescript lint
```

## Package Exports

The package provides multiple TypeScript configuration presets:

```json
// Base configuration (Node.js)
{
  "extends": "@lellimecnar/typescript-config/base.json"
}

// Next.js configuration
{
  "extends": "@lellimecnar/typescript-config/next.json"
}

// React configuration
{
  "extends": "@lellimecnar/typescript-config/react.json"
}
```

## Dependencies

### Development Dependencies
- `@vercel/style-guide` - Vercel's TypeScript style guide

### Peer Dependencies
- `typescript` ~5.5

## Configuration Details

### Base Configuration (`base.json`)
- Extends `@vercel/style-guide/typescript/node20`
- Strict mode enabled
- Target: ESNext
- Libraries: ESNext, DOM, Decorators
- JavaScript checking enabled (`checkJs: true`)
- Allows JavaScript files (`allowJs: true`)
- JSON module resolution enabled
- ES module interop enabled
- No emit (type-checking only)

### Next.js Configuration (`next.json`)
- Extends base configuration
- Adds Next.js-specific settings
- Optimized for Next.js App Router

### React Configuration (`react.json`)
- Extends base configuration
- Adds React-specific settings
- Optimized for React applications

## Usage in Consuming Packages

### TypeScript Configuration
Create or update `tsconfig.json`:

```json
{
  "extends": "@lellimecnar/typescript-config/next.json",
  "compilerOptions": {
    // Package-specific overrides
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Package.json Script
```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

## Architecture Notes

### Strict Mode
- All configs enable strict mode by default
- Ensures type safety across the monorepo
- Can be overridden in consuming packages if needed

### Modern JavaScript
- Targets ESNext for latest JavaScript features
- Includes DOM types for browser environments
- Supports decorators for advanced patterns

### JavaScript Support
- Allows JavaScript files (`allowJs: true`)
- Checks JavaScript files (`checkJs: true`)
- Enables gradual migration from JavaScript to TypeScript

### Module Resolution
- ES module interop enabled
- JSON module resolution enabled
- Works with both CommonJS and ES modules

## Modifying Configuration

### Adding New Settings
1. Edit the appropriate config file (`base.json`, `next.json`, etc.)
2. Add settings to `compilerOptions`
3. Test in consuming packages

### Creating New Presets
1. Create new `.json` file (e.g., `react-native.json`)
2. Extend base or another preset:
   ```json
   {
     "extends": "./base.json",
     "compilerOptions": {
       // Additional settings
     }
   }
   ```
3. Add export to `package.json`:
   ```json
   {
     "exports": {
       "./react-native": "./react-native.json"
     }
   }
   ```

## Notes

- Package is private (not published, but `publishConfig.access: public` is set)
- Uses workspace dependencies
- All configs extend Vercel's style guide as base
- TypeScript 5.5 is required as peer dependency
- Designed for use across all packages in the monorepo
- Configs are JSON files (not JavaScript) for compatibility
