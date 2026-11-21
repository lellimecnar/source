This file provides guidance when working with code in the `@lellimecnar/ui-nativewind` package.

## Package Overview

React Native UI component library built with NativeWind (Tailwind CSS for React Native), for Expo apps. Components are TypeScript source (not compiled).

## Package Structure

```
src/
├── components/   # view.tsx, stack.tsx, tabs.tsx, flatlist.tsx (+ internal _stack.tsx, _tabs.tsx); index.ts re-exports
├── icons/
├── index.ts      # main exports
└── global.css    # Tailwind entry
```

## Development Commands

```bash
pnpm ui-nativewind build
pnpm ui-nativewind dev
pnpm ui-nativewind test     # jest
pnpm ui-nativewind lint
pnpm ui-nativewind type-check
```

## Package Exports

```typescript
import { View, Stack, Tabs } from '@lellimecnar/ui-nativewind';
import { View } from '@lellimecnar/ui-nativewind/view'; // also /stack, /tabs, /flatlist
import * as Components from '@lellimecnar/ui-nativewind/components';
import { IconName } from '@lellimecnar/ui-nativewind/icons';
import '@lellimecnar/ui-nativewind/global.css'; // required
```

## Rules

- Wrap React Native primitives with NativeWind's `remapProps` so they accept `className`:

  ```typescript
  import { remapProps } from 'nativewind';
  import { View as RNView } from 'react-native';

  export const MyComponent = remapProps(RNView, { className: 'style' });
  ```

- New component: add `src/components/<name>.tsx`, export it from `src/components/index.ts`, add a `./<name>` entry to `package.json` `exports`.
- Consuming apps need NativeWind configured: Tailwind config extends `@lellimecnar/tailwind-config`, Metro uses the NativeWind transformer, Babel includes the NativeWind preset. `mobile/readon` is the working example.

## Versions and dependencies

See `package.json`.
