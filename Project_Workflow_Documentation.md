# Project Workflow Documentation

## 1. Workflow Overview

This document outlines three representative workflows within the **TypeScript Monorepo**:

1.  **Frontend Page Rendering**: How a Next.js page is requested and rendered.
2.  **Domain Logic Execution**: How the card game engine composes entities using mixins.
3.  **UI Component Usage**: How shared UI components are styled and rendered.
4.  **Data Querying and Patching**: How the JSONPath suite is used to manipulate data.

These workflows serve as templates for implementing new features across the Web, Mobile, and Domain layers.

---

## Workflow 1: Frontend Page Rendering (Next.js)

**Description**: Renders the landing page of the `miller.pub` web application.
**Business Purpose**: Delivers the main user interface to the visitor.
**Trigger**: HTTP GET request to `/`.
**Files Involved**:

- `web/miller.pub/src/app/page.tsx`
- `web/miller.pub/src/app/layout.tsx`

### 1. Entry Point Implementation (Frontend)

The entry point is a **React Server Component** (RSC) defined in the App Router.

```tsx
// web/miller.pub/src/app/page.tsx
export default function Page(): JSX.Element {
	return (
		<section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
			<div className="flex max-w-[980px] flex-col items-start gap-2" />
		</section>
	);
}
```

### 2. Service Layer / Data Access

_Currently, this page is static and does not fetch external data. If it did, it would likely call a utility from `@lellimecnar/utils` or an internal API._

### 3. Response Construction

Next.js compiles the JSX into HTML on the server (SSR) or at build time (SSG) and streams it to the client. Tailwind CSS classes (`container`, `grid`, etc.) are processed into a static CSS file.

---

## Workflow 2: Domain Logic Execution (Card Stack)

**Description**: Instantiation and composition of a `CardDeck` entity.
**Business Purpose**: Provides the core data structure for managing a collection of cards in a game.
**Trigger**: `new CardDeck()` call in game logic.
**Files Involved**:

- `packages/card-stack/core/src/card-deck/card-deck.ts`
- `packages/card-stack/core/src/card-set/index.ts`
- `packages/card-stack/core/src/shared/indexable.ts`
- `packages/card-stack/core/src/utils.ts`

### 1. Entry Point Implementation (Domain)

The `CardDeck` class is defined using a **Mixin Pattern** to compose behaviors (`CardSet`, `Indexable`).

```typescript
// packages/card-stack/core/src/card-deck/card-deck.ts
import { mix } from '../utils';
import { CardSet } from '../card-set';
import { Indexable } from '../shared/indexable';

// Interface merging for TypeScript support
export interface CardDeck<C extends Card> extends CardSet<C>, Indexable {}

// Class composition using decorator
@mix(CardSet, Indexable)
export class CardDeck<C extends Card> {
	static HexByte = HexByte.DeckIndex;

	init(..._args: unknown[]): void {
		// Initialization logic
	}
}
```

### 2. Service Layer Implementation (Mixin Composition)

The `mix` decorator (likely wrapping `ts-mixer` or similar logic) applies the properties and methods of `CardSet` and `Indexable` to the `CardDeck` prototype at runtime.

- **`CardSet`**: Manages the collection of cards (add, remove, shuffle).
- **`Indexable`**: Provides a unique ID or index for the entity.

### 3. Data Mapping

The `HexByte` static property suggests a binary or serialization format mapping, likely used for efficient state serialization or networking.

---

## Workflow 3: UI Component Usage (Shared Library)

**Description**: Rendering a reusable `Button` component from the shared UI library.
**Business Purpose**: Ensures consistent design and accessibility across all apps.
**Trigger**: Component usage in a React tree (e.g., `<Button variant="default">Click me</Button>`).
**Files Involved**:

- `packages/ui/src/components/button.tsx`
- `packages/ui/src/lib/utils.ts`

### 1. Component Implementation

The component uses **Radix UI Slot** for polymorphism and **class-variance-authority (cva)** for styling variants.

```tsx
// packages/ui/src/components/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const buttonVariants = cva(
	'ring-offset-background ... inline-flex items-center ...', // Base styles
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground ...',
				destructive: 'bg-destructive ...',
				// ... other variants
			},
			size: {
				default: 'h-10 px-4 py-2',
				icon: 'size-10',
				// ... other sizes
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
```

### 2. Utility Layer (`cn`)

The `cn` utility merges Tailwind classes, handling conflicts (e.g., overriding `p-4` with `p-2`).

```typescript
// packages/ui/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

---

## Workflow 4: Data Querying and Patching (JSONPath)

**Description**: Querying and updating a complex JSON document using RFC-compliant tools.
**Business Purpose**: Provides a standardized way to interact with dynamic data structures.
**Trigger**: A request to filter or modify a data set.
**Files Involved**:

- `packages/jsonpath/jsonpath/src/facade.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/patch/src/patch.ts`

### 1. Querying Data

The `query` function parses the expression (if not cached), evaluates it against the data, and returns the results.

```typescript
import { query } from '@jsonpath/jsonpath';

const data = { store: { book: [{ title: 'Sayings of the Century' }] } };
const result = query(data, '$.store.book[*].title');
// result: ["Sayings of the Century"]
```

### 2. Patching Data

The `applyPatch` function takes a sequence of RFC 6902 operations and applies them to a deep clone of the data.

```typescript
import { applyPatch } from '@jsonpath/patch';

const patch = [
	{ op: 'replace', path: '/store/book/0/title', value: 'New Title' },
];
const updatedData = applyPatch(data, patch);
```

### 3. Performance Optimization (Compilation)

For hot paths, expressions are compiled into reusable functions to skip the parsing and AST walking overhead.

```typescript
import { compileQuery } from '@jsonpath/jsonpath';

const myQuery = compileQuery('$.store.book[*].title');
const result = myQuery(data);
```

---

## Naming Conventions

- **Components**: `PascalCase` (e.g., `CardDeck`, `Button`).
- **Files**: `kebab-case` (e.g., `card-deck.ts`, `button.tsx`).
- **Interfaces**: `PascalCase`, often matching the class name for declaration merging.
- **Utilities**: `camelCase` (e.g., `cn`, `mix`).

## Implementation Guidelines

### Step-by-Step Implementation Process

1.  **Domain Logic First**: If the feature involves game rules, implement it in `packages/card-stack/core` first. Use mixins if adding a reusable behavior.
2.  **UI Components Second**: If the feature needs new UI elements, check `@lellimecnar/ui`. If missing, add a new component there following the `cva` + `Radix` pattern.
3.  **App Integration Last**: Import the domain logic and UI components into the specific App (`web` or `mobile`) and wire them up in a Page or Component.

### Common Pitfalls to Avoid

- **Direct Styling**: Avoid writing raw CSS. Use Tailwind utility classes.
- **Deep Inheritance**: Do not create deep class hierarchies in the domain layer. Use composition/mixins.
- **Prop Drilling**: Use composition (`children` prop) or Context where appropriate, but prefer simple prop passing for leaf components.

### Extension Mechanisms

- **New Card Behaviors**: Create a new class in `packages/card-stack/core/src/behaviors/` and mix it into `Card` or `Deck`.
- **New UI Variants**: Add a new key to the `variants` object in the component's `cva` definition.

---

_Generated: December 21, 2025_
