This file provides guidance when working with code in the `@lellimecnar/ui-nativewind` package.

## Package Overview

`@lellimecnar/ui-nativewind` is a React Native UI component library built with NativeWind (Tailwind CSS for React Native). It provides reusable components for Expo/React Native applications.

## Tech Stack

- **Base**: React Native 0.76.2+
- **Styling**: NativeWind 4.1.23 (Tailwind CSS for React Native)
- **Navigation**: Expo Router ~4.0.7
- **Icons**: @expo/vector-icons
- **TypeScript**: ~5.5

## Package Structure

```
src/
├── components/           # React Native components
│   ├── _stack.tsx       # Internal stack component
│   ├── _tabs.tsx        # Internal tabs component
│   ├── flatlist.tsx     # FlatList component
│   ├── index.ts         # Component exports
│   ├── stack.tsx        # Stack layout component
│   ├── tabs.tsx         # Tabs component
│   └── view.tsx         # View component wrapper
├── icons/               # Icon components
│   └── index.tsx        # Icon exports
├── index.ts             # Main package exports
└── global.css           # Global Tailwind styles
```

## Development Commands

```bash
# Build Tailwind CSS (compile global.css)
pnpm ui-nativewind build

# Watch mode for Tailwind CSS
pnpm ui-nativewind dev

# Lint code
pnpm ui-nativewind lint

# Type-check
pnpm ui-nativewind type-check
```

## Package Exports

The package uses **granular exports** for tree-shaking:

```typescript
// Main export
import { View, Stack, Tabs } from '@lellimecnar/ui-nativewind'

// Individual component imports
import { View } from '@lellimecnar/ui-nativewind/view'
import { Stack } from '@lellimecnar/ui-nativewind/stack'
import { Tabs } from '@lellimecnar/ui-nativewind/tabs'
import { FlatList } from '@lellimecnar/ui-nativewind/flatlist'

// Component exports
import * from '@lellimecnar/ui-nativewind/components'

// Icon imports
import { IconName } from '@lellimecnar/ui-nativewind/icons'

// Global CSS (required)
import '@lellimecnar/ui-nativewind/global.css'
```

## Dependencies

### Runtime Dependencies

- `@lellimecnar/ui` - Web UI package (for shared utilities/icons)
- `expo-router` - File-based routing
- `nativewind` - Tailwind CSS for React Native
- `react-native` - React Native core
- `@expo/vector-icons` - Icon library
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `@react-navigation/native-stack` - Stack navigation

### Development Dependencies

- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/tailwind-config` - Shared Tailwind configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `tailwindcss`, `postcss`, `autoprefixer` - CSS tooling

## Key Configuration Files

- `tailwind.config.ts` - Tailwind CSS configuration (extends `@lellimecnar/tailwind-config`)
- `postcss.config.js` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration

## Architecture Notes

### Component Pattern

- Components wrap React Native primitives with NativeWind styling
- Uses `remapProps` from NativeWind to map `className` to `style`
- Components accept `className` prop for Tailwind classes
- Type-safe with TypeScript

### NativeWind Integration

- Uses NativeWind 4.x API
- `remapProps` is used to convert `className` to React Native `style`
- Global styles in `src/global.css`
- Uses shared Tailwind config from `@lellimecnar/tailwind-config`

### Component Examples

#### View Component

```typescript
// Uses remapProps to map className to style
export const View = remapProps(DefaultView, {
	className: 'style',
});
```

#### Stack Component

- Wraps React Native View with flexbox layout
- Supports NativeWind className prop
- Used for vertical/horizontal layouts

#### Tabs Component

- Integrates with Expo Router and React Navigation
- Uses `@react-navigation/bottom-tabs` under the hood
- Supports file-based routing from Expo Router

### Build Process

- `build` script compiles `src/global.css` to `dist/global.css`
- Components are TypeScript source files (not compiled)
- CSS is side-effectful (marked in `package.json`)

### Adding New Components

1. Create component file in `src/components/[component-name].tsx`
2. Use NativeWind's `remapProps` if wrapping React Native primitives:

   ```typescript
   import { remapProps } from 'nativewind';
   import { View as RNView } from 'react-native';

   export const MyComponent = remapProps(RNView, {
   	className: 'style',
   });
   ```

3. Add export to `package.json` exports field:
   ```json
   "./[component-name]": "./src/components/[component-name].tsx"
   ```
4. Export from `src/components/index.ts`
5. Style with Tailwind classes via `className` prop

### Component Guidelines

- Always use `remapProps` when wrapping React Native primitives
- Support `className` prop for Tailwind classes
- Export TypeScript types for props
- Follow React Native best practices
- Use NativeWind 4.x API patterns
- Ensure components work on iOS, Android, and Web

## Usage in Consuming Apps

### Expo/React Native Apps

1. Import global CSS in root layout:
   ```typescript
   import '@lellimecnar/ui-nativewind/global.css';
   ```
2. Import components as needed:
   ```typescript
   import { View, Stack } from '@lellimecnar/ui-nativewind';
   import { Tabs } from '@lellimecnar/ui-nativewind/tabs';
   ```
3. Use with NativeWind classes:
   ```typescript
   <View className="flex-1 bg-white p-4">
     <Stack className="gap-4">
       {/* content */}
     </Stack>
   </View>
   ```

### NativeWind Setup

Consuming apps must have NativeWind properly configured:

- `tailwind.config.js` should extend `@lellimecnar/tailwind-config`
- `metro.config.js` should include NativeWind transformer
- `babel.config.js` should include NativeWind plugin

## Notes

- Package is not published (version 0.0.0)
- Uses workspace dependencies
- CSS files are marked as side-effects
- Components are TypeScript source files (not compiled)
- Designed for Expo Router file-based routing
- Supports iOS, Android, and Web platforms
- Uses NativeWind 4.x (not v3 or earlier)
- Some components depend on `@lellimecnar/ui` for shared utilities
