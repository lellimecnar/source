# @lellimecnar/ui

Shared UI component library for web applications, built with [Radix UI](https://www.radix-ui.com/) and [Tailwind CSS](https://tailwindcss.com/).

## Installation

```bash
pnpm add @lellimecnar/ui
```

## Usage

This package uses **granular exports**. You must import components from their specific paths.

```tsx
import { Button } from '@lellimecnar/ui/button';
import { Input } from '@lellimecnar/ui/input';

export default function MyComponent() {
	return (
		<div>
			<Input placeholder="Email" />
			<Button>Submit</Button>
		</div>
	);
}
```

### Styles

You must import the global CSS file in your application's root layout:

```tsx
import '@lellimecnar/ui/global.css';
```

## Adding Components

To add a new component from [shadcn/ui](https://ui.shadcn.com/):

```bash
pnpm ui ui
# Select the component you want to add
```

This will add the component to `src/components` and you must then export it in `package.json`.

## Available Components

- Button
- Input
- Label
- Checkbox
- Radio Group
- Select
- Switch
- Textarea
- Toggle
- Navigation Menu
- Form
