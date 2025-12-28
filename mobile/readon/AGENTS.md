This file provides guidance when working with code in the `readon` mobile app package.

## Package Overview

`readon` is a React Native mobile application built with Expo 52 and Expo Router. It provides a cross-platform reading app experience for iOS, Android, and Web.

## Tech Stack

- **Framework**: Expo ~52.0.14
- **React Native**: 0.76.3
- **Navigation**: Expo Router ~4.0.11 (file-based routing)
- **Styling**: NativeWind 4.1.23 (Tailwind CSS for React Native)
- **UI Components**: `@lellimecnar/ui-nativewind` (React Native component library)
- **TypeScript**: ~5.3.3

## Package Structure

```
app/                        # Expo Router file-based routes
├── _layout.tsx            # Root layout
├── (tabs)/                # Tab navigation routes
├── +html.tsx              # HTML wrapper for web
├── +not-found.tsx         # 404 page
├── modal.tsx              # Modal route
└── global.css             # Global styles

components/                # Shared React Native components
├── icons.tsx              # Icon components
└── themed.tsx             # Themed components

const/                     # Constants
└── colors.ts              # Color constants

hooks/                     # Custom React hooks
├── useClientOnlyValue.ts  # Client-only value hook
├── useColorScheme.ts      # Color scheme hook
└── useTheme.ts            # Theme hook

assets/                    # Static assets
├── fonts/                 # Custom fonts
└── images/                # Image assets
```

## Development Commands

```bash
# Start Expo dev server (Android)
pnpm readon dev

# Start Expo dev server (iOS)
pnpm readon dev:ios

# Start Expo dev server (Web)
pnpm readon dev:web

# Run on Android device/emulator
pnpm readon android

# Run on iOS device/simulator
pnpm readon ios

# Lint code
pnpm readon lint

# Run unit tests via #tool:execute/runTests (preferred)
```

## Dependencies

### Runtime Dependencies

- `@lellimecnar/ui-nativewind` - React Native UI component library (workspace package)
- `@lellimecnar/tailwind-config` - Shared Tailwind configuration
- `expo` - Expo SDK
- `expo-router` - File-based routing for Expo
- `expo-font` - Font loading
- `expo-linking` - Deep linking
- `expo-splash-screen` - Splash screen management
- `expo-status-bar` - Status bar control
- `expo-system-ui` - System UI configuration
- `expo-web-browser` - Web browser integration
- `nativewind` - Tailwind CSS for React Native
- `react-native-reanimated` - Animation library
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Native screen components
- `@expo/vector-icons` - Icon library
- `@react-navigation/*` - Navigation libraries (used by Expo Router)

### Development Dependencies

- `@lellimecnar/babel-preset` - Shared Babel configuration
- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `jest` & `jest-expo` - Testing framework
- `tailwindcss` - Tailwind CSS

## Key Configuration Files

- `app.config.ts` - Expo app configuration
- `babel.config.js` - Babel configuration (uses `@lellimecnar/babel-preset`)
- `metro.config.js` - Metro bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `nativewind-env.d.ts` - NativeWind TypeScript declarations

## Architecture Notes

### Expo Router Structure

- Uses file-based routing similar to Next.js
- `app/_layout.tsx` is the root layout
- `app/(tabs)/` contains tab navigation routes
- `app/modal.tsx` is a modal route
- `app/+not-found.tsx` handles 404 errors
- `app/+html.tsx` is the HTML wrapper for web platform

### Navigation

- Expo Router handles navigation automatically based on file structure
- Tab navigation is configured in `app/(tabs)/`
- Modal routes are defined with `app/modal.tsx`

### Styling with NativeWind

- Uses NativeWind 4.x (Tailwind CSS for React Native)
- Global styles in `app/global.css`
- Uses shared Tailwind config from `@lellimecnar/tailwind-config`
- Platform-specific styles can use `className` prop

### UI Component Usage

The package uses components from `@lellimecnar/ui-nativewind`:

```typescript
import { View, Stack } from '@lellimecnar/ui-nativewind';
import { Tabs } from '@lellimecnar/ui-nativewind/tabs';
```

### Platform-Specific Code

- Platform-specific files use `.web.ts` or `.ios.ts` / `.android.ts` extensions
- Example: `useClientOnlyValue.ts` and `useClientOnlyValue.web.ts`
- `useColorScheme.ts` and `useColorScheme.web.ts`

### Theming

- Custom theme hooks in `hooks/useTheme.ts`
- Color scheme support via `hooks/useColorScheme.ts`
- Themed components in `components/themed.tsx`

## Adding New Features

### Adding a New Route

1. Create a new file in `app/[route-name].tsx` or directory `app/[route-name]/page.tsx`
2. Expo Router will automatically create the route
3. Use `(group)` syntax for route groups without affecting URL

### Adding a New Component

1. Create component file in `components/`
2. Use NativeWind classes for styling
3. Import from `@lellimecnar/ui-nativewind` for base components

### Adding Platform-Specific Code

1. Create base file (e.g., `component.tsx`)
2. Create platform-specific file (e.g., `component.web.tsx`)
3. Metro bundler will automatically select the correct file

## Build & Deployment

### Android

- Native Android code in `android/` directory
- Uses Gradle for builds
- `app.config.ts` contains Android-specific configuration

### iOS

- Native iOS code in `ios/` directory (generated by Expo)
- Uses Xcode for builds
- `app.config.ts` contains iOS-specific configuration

### Web

- Can run as a web app using `expo start --web`
- Uses React Native Web for web compatibility

## Notes

- This is a private package (not published)
- Uses workspace dependencies for shared packages
- Entry point is `expo-router/entry` (defined in `package.json`)
- React Native version is 0.76.3
- Expo SDK version is ~52.0.14
- Uses `@lellimecnar/expo-with-modify-gradle` plugin for Android build fixes
