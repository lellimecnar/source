# UI Components API

This document provides an overview of the props and usage for components in `@lellimecnar/ui`.

## Button

### Props

| Prop      | Type      | Default   | Description                 |
| --------- | --------- | --------- | --------------------------- |
| `variant` | `string`  | `default` | Style variant of the button |
| `size`    | `string`  | `default` | Size of the button          |
| `asChild` | `boolean` | `false`   | Render as a child component |

### Usage

```tsx
import { Button } from '@lellimecnar/ui/button';

<Button variant="destructive" size="lg">
	Delete
</Button>;
```

## Input

### Props

| Prop          | Type      | Default | Description       |
| ------------- | --------- | ------- | ----------------- |
| `type`        | `string`  | `text`  | Input type        |
| `placeholder` | `string`  | `''`    | Placeholder text  |
| `disabled`    | `boolean` | `false` | Disable the input |

### Usage

```tsx
import { Input } from '@lellimecnar/ui/input';

<Input type="email" placeholder="user@example.com" />;
```
