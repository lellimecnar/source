This file provides guidance when working with code in the `@lellimecnar/babel-preset` package.

## Package Overview

Shared Babel config for the monorepo (private; used by the Expo/React Native apps). It is minimal: a Babel config function that enables caching (`api.cache(true)`) and returns `{}`, for consumers to extend. No scripts, no dependencies.

## Entry point

`babel.config.js` exports a config function, not an object. `mobile/readon` lists it as a preset:

```javascript
// mobile/readon/babel.config.js
presets: ['@lellimecnar/babel-preset', ['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
```

To extend it programmatically, call it with `api` (`baseConfig(api)`); do not spread `require('@lellimecnar/babel-preset')` directly, it is a function.

## Versions and dependencies

See `package.json`.
