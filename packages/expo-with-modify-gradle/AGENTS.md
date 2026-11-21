This file provides guidance when working with code in the `@lellimecnar/expo-with-modify-gradle` package.

## Package Overview

Expo config plugin (private; used by `mobile/readon`) that fixes `.apk` build issues by adding Expo and React Native version variables to Gradle. It modifies the **project-level `android/build.gradle`** via `withProjectBuildGradle` from `@expo/config-plugins`:

- adds `ext.getPackageJsonVersion` to the `buildscript` block
- adds `reactNativeVersion` and `expoPackageVersion` to the `ext` block

The plugin is idempotent (each edit is skipped if already present) and only touches Android. References: [create-turbo-with-expo#120](https://github.com/t3-oss/create-turbo-with-expo/issues/120), [expo#18129](https://github.com/expo/expo/issues/18129).

## Entry point

`index.js` exports the config plugin function as the module default. There is no named `defineConfig` export. Reference it by package name:

```typescript
// app.config.ts
plugins: ['@lellimecnar/expo-with-modify-gradle'],
```

## Development Commands

```bash
pnpm --filter @lellimecnar/expo-with-modify-gradle type-check
```

To debug, run `expo prebuild` in the consuming app and inspect `android/build.gradle`.

## Versions and dependencies

See `package.json`.
