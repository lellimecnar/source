# @lellimecnar/ui-nativewind

Shared UI component library for mobile applications (React Native / Expo), built with [NativeWind](https://www.nativewind.dev/).

## Installation

```bash
pnpm add @lellimecnar/ui-nativewind
```

## Usage

Import components directly from the package:

```tsx
import { View, Stack } from '@lellimecnar/ui-nativewind';

export default function MyScreen() {
	return (
		<View className="flex-1 bg-white">
			<Stack>{/* Content */}</Stack>
		</View>
	);
}
```

### Styles

Import the global CSS file in your app's entry point (usually `_layout.tsx`):

```tsx
import '@lellimecnar/ui-nativewind/global.css';
```

## Available Components

- View
- Stack
- Tabs
- FlatList
- Icons
