This file provides guidance when working with code in the `@lellimecnar/babel-preset` package.

## Package Overview

`@lellimecnar/babel-preset` is a shared Babel configuration package that provides consistent Babel transpilation settings across the monorepo. Currently provides a minimal base configuration that can be extended.

## Tech Stack

- **Transpiler**: Babel
- **Config Format**: JavaScript (Babel config function)

## Package Structure

```
.
├── babel.config.js    # Babel configuration
└── package.json       # Package configuration
```

## Development Commands

This package has no scripts (configuration only).

## Package Exports

The package exports a Babel configuration:

```javascript
// In babel.config.js or .babelrc.js
module.exports = require('@lellimecnar/babel-preset')
```

## Dependencies

This package has no dependencies (empty configuration).

## Configuration Details

### Base Configuration (`babel.config.js`)
- Minimal configuration
- Enables Babel cache (`api.cache(true)`)
- Returns empty configuration object
- Designed to be extended by consuming packages

## Usage in Consuming Packages

### Babel Configuration
Create or update `babel.config.js`:

```javascript
module.exports = {
  ...require('@lellimecnar/babel-preset'),
  presets: [
    // Add your presets here
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    // Add your plugins here
  ],
}
```

### Extending the Config
The base config provides caching and can be extended:

```javascript
const baseConfig = require('@lellimecnar/babel-preset')

module.exports = (api) => {
  const base = baseConfig(api)
  return {
    ...base,
    presets: ['@babel/preset-env'],
  }
}
```

## Architecture Notes

### Caching
- Enables Babel's persistent cache (`api.cache(true)`)
- Improves build performance
- Cache is stored per package

### Minimal Base
- Provides minimal configuration to avoid conflicts
- Consuming packages add their own presets and plugins
- Allows flexibility for different environments (Node.js, React Native, etc.)

### Config Function Pattern
- Uses Babel's config function API
- Receives `api` object for cache control
- Returns configuration object

## Modifying Configuration

### Adding Presets/Plugins
1. Edit `babel.config.js`
2. Add presets or plugins to the returned object
3. Test in consuming packages

### Creating Environment-Specific Configs
You can create separate configs for different environments:

```javascript
module.exports = (api) => {
  api.cache(true)
  
  return {
    env: {
      development: {
        plugins: ['react-refresh/babel'],
      },
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  }
}
```

## Notes

- Package is private (not published)
- Currently minimal - designed to be extended
- No dependencies - pure configuration
- Used primarily by Expo/React Native apps in the monorepo
- Can be extended for web apps if needed
