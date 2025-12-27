This file provides guidance when working with code in the `@lellimecnar/expo-with-modify-gradle` package.

## Package Overview

`@lellimecnar/expo-with-modify-gradle` is an Expo config plugin that fixes Android build issues by automatically appending Expo and React Native versions to the `build.gradle` file. This resolves `.apk` build problems related to version detection.

## Tech Stack

- **Platform**: Expo Config Plugins
- **Dependencies**: @expo/config-plugins ^9

## Package Structure

```
.
├── index.js          # Expo config plugin implementation
└── package.json      # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm expo-with-modify-gradle lint
```

## Package Exports

The package exports an Expo config plugin:

```javascript
// In app.config.ts or app.json
import { defineConfig } from '@lellimecnar/expo-with-modify-gradle';

export default defineConfig({
	plugins: [
		'@lellimecnar/expo-with-modify-gradle',
		// ... other plugins
	],
});
```

## Dependencies

### Runtime Dependencies

- `@expo/config-plugins` ^9 - Expo config plugin utilities

## Problem Solved

This plugin fixes Android build issues where Expo and React Native versions are not properly detected during `.apk` builds. It modifies the `build.gradle` file to:

1. Add a `getPackageJsonVersion` function that reads package versions from `node_modules`
2. Set `reactNativeVersion` variable from React Native package version
3. Set `expoPackageVersion` variable from Expo package version

## Configuration Details

### Plugin Implementation

The plugin uses `withProjectBuildGradle` from `@expo/config-plugins` to:

- Modify the `android/app/build.gradle` file
- Add version detection functions if they don't exist
- Ensure versions are available during build time

### What It Modifies

- Adds to `buildscript` block: `ext.getPackageJsonVersion` function
- Adds to `ext` block: `reactNativeVersion` and `expoPackageVersion` variables

## Usage in Consuming Apps

### Expo App Configuration

In `app.config.ts` or `app.json`:

```typescript
import { defineConfig } from '@lellimecnar/expo-with-modify-gradle';

export default defineConfig({
	plugins: [
		'@lellimecnar/expo-with-modify-gradle',
		// ... other plugins
	],
});
```

Or in `app.json`:

```json
{
	"expo": {
		"plugins": ["@lellimecnar/expo-with-modify-gradle"]
	}
}
```

### When to Use

- Use this plugin if you encounter Android build errors related to version detection
- Required for `.apk` builds that fail with version-related errors
- Automatically applied in the `readon` mobile app

## Architecture Notes

### Expo Config Plugin Pattern

- Follows Expo's config plugin API
- Uses `withProjectBuildGradle` modifier
- Idempotent (safe to run multiple times)
- Checks if modifications already exist before applying

### Version Detection

- Uses Node.js to read package.json files from node_modules
- Executes at build time, not runtime
- Provides versions to Gradle build system

### Safety Checks

- Checks if `getPackageJsonVersion` already exists before adding
- Checks if version variables already exist before adding
- Prevents duplicate modifications

## References

This plugin addresses issues documented in:

- https://github.com/t3-oss/create-turbo-with-expo/issues/120
- https://github.com/expo/expo/issues/18129

## Modifying the Plugin

### Adding New Modifications

1. Edit `index.js`
2. Add new `withProjectBuildGradle` modifications
3. Test in consuming Expo app
4. Ensure idempotency (safe to run multiple times)

### Debugging

- Check `android/app/build.gradle` after running `expo prebuild`
- Verify version functions are present
- Check Expo and React Native versions are correctly detected

## Notes

- Package is private (not published)
- Used by the `readon` mobile app
- Required for Android builds in Expo + Turborepo monorepos
- Idempotent plugin (safe to run multiple times)
- Only modifies Android build files (not iOS)
- Works with Expo SDK 52+
