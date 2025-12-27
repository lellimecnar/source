# Testing Infrastructure Research Report

**Date:** December 21, 2025  
**Monorepo:** @lellimecnar/source  
**Purpose:** Comprehensive analysis for implementing testing infrastructure across all packages

---

## Executive Summary

The monorepo has **partial testing infrastructure** with Jest configured and actively used in the `card-stack/*` packages (58 test files), but **no testing setup** in web apps, UI packages, or utility packages. The existing setup provides a solid foundation with shared Jest configuration that can be extended to other packages.

### Current Testing Status by Package Type

| Package Type               | Testing Status            | Test Files          | Jest Config    |
| -------------------------- | ------------------------- | ------------------- | -------------- |
| `card-stack/core`          | ✅ Active                 | 54 `.spec.ts` files | ✅ Yes         |
| `card-stack/deck-standard` | ✅ Active                 | 4 `.spec.ts` files  | ✅ Yes         |
| `web/miller.pub`           | ❌ None                   | 0                   | ❌ No          |
| `web/readon.app`           | ❌ None                   | 0                   | ❌ No          |
| `mobile/readon`            | ⚠️ Configured (jest-expo) | 0                   | ⚠️ Basic setup |
| `packages/ui`              | ❌ None                   | 0                   | ❌ No          |
| `packages/ui-nativewind`   | ❌ None                   | 0                   | ❌ No          |
| `packages/utils`           | ❌ None                   | 0                   | ❌ No          |

---

## 1. Project-Wide Configuration

### Root `package.json`

**Location:** `/package.json`

```json
{
	"name": "@lellimecnar/source",
	"private": true,
	"scripts": {
		"test": "turbo test",
		"test:watch": "turbo test:watch"
	},
	"devDependencies": {
		"jest": "^29"
	},
	"overrides": {
		"jest": "^29"
	}
}
```

**Key Observations:**

- Root has `test` and `test:watch` scripts that delegate to Turborepo
- Jest version 29 is enforced via overrides
- No root-level jest.config.js (individual packages manage their own)

### Turborepo Configuration

**Location:** `/turbo.json`

```json
{
	"tasks": {
		"test": {
			"outputs": ["coverage/**"],
			"dependsOn": []
		},
		"test:watch": {
			"cache": false,
			"persistent": true
		}
	}
}
```

**Key Observations:**

- `test` task outputs to `coverage/**` (anticipating coverage reports)
- `test:watch` is persistent and never cached (correct for watch mode)
- No dependencies on `build` task (tests can run without building)

### Workspace Configuration

**Location:** `/pnpm-workspace.yaml`

```yaml
packages:
  - 'web/*'
  - 'mobile/*'
  - 'packages/*'
  - 'card-stack/*'
```

---

## 2. Existing Jest Configuration

### Shared Jest Configuration Package

**Package:** `@lellimecnar/jest-config`  
**Location:** `/packages/config-jest/`

#### Base Preset (`jest-preset.js`)

```javascript
/** @type {import('jest').Config} */
module.exports = {
	roots: ['<rootDir>'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	modulePathIgnorePatterns: [
		'<rootDir>/test/__fixtures__',
		'<rootDir>/node_modules',
		'<rootDir>/dist',
	],
	preset: 'ts-jest',
};
```

**Features:**

- Uses `ts-jest` for TypeScript transformation
- Supports `.ts`, `.tsx`, `.js`, `.jsx` files
- Ignores `test/__fixtures__`, `node_modules`, and `dist` directories
- Minimal configuration, suitable for Node.js/TypeScript packages

#### Browser Preset (`browser/jest-preset.js`)

```javascript
/** @type {import('jest').Config} */
module.exports = {
	roots: ['<rootDir>'],
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	modulePathIgnorePatterns: [
		'<rootDir>/test/__fixtures__',
		'<rootDir>/node_modules',
		'<rootDir>/dist',
	],
	preset: 'ts-jest',
};
```

**Features:**

- Identical to base preset but adds `testEnvironment: 'jsdom'`
- Suitable for testing React components and browser APIs
- **Currently unused** in the monorepo

#### Package Configuration (`package.json`)

```json
{
	"name": "@lellimecnar/jest-config",
	"version": "0.0.0",
	"private": true,
	"files": ["./jest-preset.js", "./browser/jest-preset.js"],
	"devDependencies": {
		"@types/jest": "^29.5.14",
		"jest": "^29",
		"ts-jest": "^29",
		"typescript": "~5.5"
	},
	"peerDependencies": {
		"jest": "^29",
		"typescript": "~5.5"
	}
}
```

**Missing Features:**

- No coverage configuration (thresholds, reporters)
- No module name mappers for TypeScript paths or assets
- No setup files for global test utilities
- No React Testing Library integration

---

## 3. Existing Test Implementations

### Card Stack Packages (Active Testing)

#### `@card-stack/core`

**Location:** `/card-stack/core/`

**Jest Configuration:**

```javascript
/** @type {import('jest').Config} */
module.exports = {
	preset: '@lellimecnar/jest-config',
};
```

**Package.json:**

```json
{
	"scripts": {
		"test": "jest",
		"test:watch": "jest --watch"
	},
	"devDependencies": {
		"@faker-js/faker": "^9.2.0",
		"@lellimecnar/jest-config": "workspace:*",
		"@types/jest": "^29.5.14",
		"jest": "^29"
	}
}
```

**Test Files:** 54 `.spec.ts` files co-located with source code

**Test Pattern Examples:**

**Simple Unit Test** (`card-deck/card-deck.spec.ts`):

```typescript
import { Card, CardDeck, isCardDeck, isCardSet, isIndexable, Mix } from '..';

describe('cardDeck', () => {
	class TestCard extends Mix(Card) {}
	class TestCardDeck extends Mix(CardDeck<TestCard>) {}

	it('is CardDeck', () => {
		const deck = new TestCardDeck();
		expect(isCardDeck(deck)).toBe(true);
	});

	it('is CardSet', () => {
		const deck = new TestCardDeck();
		expect(isCardSet(deck)).toBe(true);
	});

	it('is Indexable', () => {
		const deck = new TestCardDeck();
		expect(isIndexable(deck)).toBe(true);
	});
});
```

**Test with Setup/Teardown** (`card/card.spec.ts`):

```typescript
import { Card, CardSet, isIndexable, isParentable, Mix } from '..';

describe('card', () => {
	class TestCard extends Mix(Card) {
		static __reset(): void {
			this.instances.clear();
		}
	}

	beforeEach(() => {
		TestCard.__reset();
	});

	afterEach(() => {
		TestCard.__reset();
	});

	it('is Indexable', () => {
		const card = new TestCard();
		expect(isIndexable(card)).toBe(true);
	});

	it('takes parent', () => {
		class TestCardSet extends Mix(CardSet) {}

		const cardSet = new TestCardSet();
		const card = new TestCard(cardSet);
		expect(card.parent).toBe(cardSet);
	});

	describe('.id', () => {
		it('contains index', () => {
			const card = new TestCard();
			const id = card.id;

			expect(card).toHaveProperty('id');
			expect(id).toBeDefined();
			expect(typeof id).toBe('number');
			expect(id).toBeGreaterThan(0);
			expect(id).toBe(card.index);
		});
	});
});
```

**Test with Test Data Factory** (`card-set/groupable.spec.ts`):

```typescript
import {
	Card,
	CardSet,
	createRankEnum,
	createSuitEnum,
	Groupable,
	isGroupable,
	Mix,
	Rankable,
	Suitable,
} from '..';

describe('groupable', () => {
	class TestCard extends Mix(Card, Rankable, Suitable) {
		static RANK = createRankEnum(['ACE', 'TWO', 'THREE']);
		static SUIT = createSuitEnum(['HEARTS', 'DIAMONDS']);
	}
	class TestGroupable extends Mix(CardSet<TestCard>, Groupable<TestCard>) {}

	const createGroupable = () => {
		const card1 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.ACE);
		const card2 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.TWO);
		const card3 = new TestCard(TestCard.SUIT.HEARTS, TestCard.RANK.THREE);
		const card4 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.ACE);
		const card5 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.TWO);
		const card6 = new TestCard(TestCard.SUIT.DIAMONDS, TestCard.RANK.THREE);
		const cardSet = new TestGroupable([
			card1,
			card2,
			card3,
			card4,
			card5,
			card6,
		]);

		return { card1, card2, card3, card4, card5, card6, cardSet };
	};

	it('is Groupable', () => {
		const cardSet = new TestGroupable();
		expect(isGroupable(cardSet)).toBe(true);
	});

	describe('groupBy', () => {
		it('groups cards by rank with function', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createGroupable();
			const groups = cardSet.groupBy((card) => card.rank);
			expect(groups).toStrictEqual({
				[TestCard.RANK.ACE]: [card1, card4],
				[TestCard.RANK.TWO]: [card2, card5],
				[TestCard.RANK.THREE]: [card3, card6],
			});
		});

		it('groups cards by rank with key', () => {
			const { card1, card2, card3, card4, card5, card6, cardSet } =
				createGroupable();
			const groups = cardSet.groupBy('rank');
			expect(groups).toStrictEqual({
				[TestCard.RANK.ACE]: [card1, card4],
				[TestCard.RANK.TWO]: [card2, card5],
				[TestCard.RANK.THREE]: [card3, card6],
			});
		});
	});
});
```

**Test with Snapshots** (`standard-deck.spec.ts`):

```typescript
import { isStandardDeck, StandardDeck } from '.';

describe('standardDeck', () => {
	it('is StandardDeck', () => {
		expect(isStandardDeck(new StandardDeck())).toBe(true);
	});

	it('has cards', () => {
		const deck = new StandardDeck();
		expect(deck.size).toBe(52);
		expect(
			[...deck].map((card) => [card.rankName, card.suitName].join(' of ')),
		).toMatchSnapshot();
	});
});
```

**Snapshot File** (`__snapshots__/standard-deck.spec.ts.snap`):

```jest-snapshot
// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`standardDeck has cards 1`] = `
[
  "Ace of Hearts",
  "Two of Hearts",
  "Three of Hearts",
  ...
  "King of Clubs",
]
`;
```

#### `@card-stack/deck-standard`

**Jest Configuration:** Same as core (extends `@lellimecnar/jest-config`)

**Test Files:** 4 `.spec.ts` files

**Observation:** Uses same patterns as core package

---

### Mobile App (Basic Setup, No Tests)

**Package:** `readon`  
**Location:** `/mobile/readon/`

**Jest Configuration in `package.json`:**

```json
{
	"jest": {
		"preset": "jest-expo"
	},
	"scripts": {
		"test": "jest --watchAll"
	},
	"devDependencies": {
		"jest": "^29.2.1",
		"jest-expo": "~52.0.2",
		"react-test-renderer": "18.3.1"
	}
}
```

**Observations:**

- Uses `jest-expo` preset (appropriate for Expo/React Native)
- Has `react-test-renderer` for component testing
- No test files exist yet
- Script uses `--watchAll` by default (should have separate watch command)

---

## 4. Package Structure Analysis

### Web Apps (Next.js 15)

Both `web/miller.pub` and `web/readon.app` have identical setups:

**Package Structure:**

```
web/miller.pub/
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # React components
│   └── config/       # Configuration files
├── public/           # Static assets
├── package.json
├── next.config.js
└── tsconfig.json
```

**Dependencies (`package.json`):**

```json
{
	"dependencies": {
		"@lellimecnar/ui": "workspace:*",
		"next": "^15.2.3",
		"react": "^18.3.1",
		"react-dom": "^18.3.1",
		"react-use": "^17.6.0"
	},
	"devDependencies": {
		"@lellimecnar/typescript-config": "workspace:*",
		"@types/react": "^18.3.12",
		"typescript": "~5.5"
	}
}
```

**Next.js Config (`next.config.js`):**

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

**TypeScript Config (`tsconfig.json`):**

```jsonc
{
	"extends": "@lellimecnar/typescript-config/next.json",
	"compilerOptions": {
		"paths": {
			"*": ["./*"],
			"@/*": ["./src/*"],
		},
	},
}
```

**Key Testing Requirements:**

- Must transpile `@lellimecnar/ui` in Jest config
- Need to handle Next.js-specific imports (Image, Link, etc.)
- Path aliases (`@/*`) must be mapped in Jest
- React Testing Library for component tests
- May need MSW for API mocking

### UI Package (React + Tailwind)

**Package:** `@lellimecnar/ui`  
**Location:** `/packages/ui/`

**Structure:**

```
packages/ui/
├── src/
│   ├── components/    # Radix UI + shadcn/ui components
│   ├── icons/         # Icon components
│   ├── lib/           # Utilities (cn, colors)
│   ├── qrcode/        # QR code components
│   └── theme/         # Theme provider
├── dist/              # Built CSS
├── package.json
└── components.json    # shadcn/ui config
```

**Component Example (`button.tsx`):**

```tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

const buttonVariants = cva(
	'ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center ...',
	{
		variants: {
			variant: { default: '...', destructive: '...' /* ... */ },
			size: { default: 'h-10 px-4 py-2', sm: '...' /* ... */ },
		},
		defaultVariants: { variant: 'default', size: 'default' },
	},
);

export interface ButtonProps
	extends
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

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
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Dependencies (`package.json`):**

```json
{
	"dependencies": {
		"@hookform/resolvers": "^3.9.1",
		"@radix-ui/react-checkbox": "^1.3.3",
		"@radix-ui/react-label": "^2.1.0",
		"class-variance-authority": "^0.7.1",
		"clsx": "^2.1.1",
		"lucide-react": "^0.468.0",
		"react-hook-form": "^7.66.1",
		"zod": "^3.24.1"
	},
	"devDependencies": {
		"@types/react": "^18",
		"typescript": "~5.5"
	}
}
```

**Exports (Granular, Tree-Shakeable):**

```json
{
	"exports": {
		"./global.css": "./dist/global.css",
		"./lib": "./src/lib/index.ts",
		"./lib/utils": "./src/lib/utils.ts",
		"./button": "./src/components/button.tsx",
		"./checkbox": "./src/components/checkbox.tsx"
		// ... one export per component
	}
}
```

**Key Testing Requirements:**

- jsdom environment for React components
- React Testing Library
- Mock Radix UI components (if needed)
- Handle CSS imports (mock or ignore)
- Test variants and props
- Accessibility testing (aria attributes, keyboard navigation)

**Utility Functions to Test (`lib/utils.ts`):**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export const TW_W_1 = 0.25; // rem
const w = (units: number, includeUnit?: boolean): string | number => {
	const val = units * TW_W_1;
	return includeUnit ? `${String(val)}rem` : val;
};

export const tw = { w } as const;
```

### UI NativeWind Package (React Native)

**Package:** `@lellimecnar/ui-nativewind`  
**Location:** `/packages/ui-nativewind/`

**Structure:**

```
packages/ui-nativewind/
├── src/
│   ├── components/    # React Native components with NativeWind
│   │   ├── flatlist.tsx
│   │   ├── stack.tsx
│   │   ├── tabs.tsx
│   │   └── view.tsx
│   ├── icons/         # Icon components
│   └── global.css     # Tailwind CSS
└── package.json
```

**Dependencies:**

```json
{
	"dependencies": {
		"@expo/vector-icons": "^14.0.2",
		"@lellimecnar/ui": "workspace:*",
		"expo-router": "~4.0.11",
		"nativewind": "^4.2.1",
		"react-native": "0.76.3"
	}
}
```

**Key Testing Requirements:**

- React Native testing environment (`@testing-library/react-native`)
- Mock React Native modules (Animated, Platform, etc.)
- NativeWind may need mocking
- Expo Router may need mocking

### Utils Package

**Package:** `@lellimecnar/utils`  
**Location:** `/packages/utils/`

**Structure:**

```
packages/utils/
├── src/
│   ├── index.ts       # Re-exports
│   ├── lodash.ts      # Lodash utilities
│   └── dates.ts       # date-fns utilities
└── package.json
```

**Code to Test (`lodash.ts`):**

```typescript
import camelCase from 'lodash/camelCase';
import flow from 'lodash/flow';
import upperFirst from 'lodash/upperFirst';
import sampleSize from 'lodash/sampleSize';

export { default as memoize } from 'lodash/memoize';

export const pascalCase = flow(camelCase, upperFirst);

export const randomIndexes = (array: Iterable<any>, count = 1) =>
	sampleSize(Array.from([...array].keys()), count);

export {
	camelCase,
	chunk,
	find,
	// ... other lodash exports
};
```

**Code to Test (`dates.ts`):**

```typescript
import { setDefaultOptions } from 'date-fns';
import { enUS } from 'date-fns/locale';

setDefaultOptions({
	locale: enUS,
});

export * from 'date-fns';
```

**Dependencies:**

```json
{
	"dependencies": {
		"date-fns": "^4.1.0",
		"lodash": "^4.17.21"
	},
	"devDependencies": {
		"@types/lodash": "^4.17.21"
	}
}
```

**Key Testing Requirements:**

- Simple unit tests for utility functions
- No special environment needed (Node.js default)
- Test `pascalCase` and `randomIndexes` custom utilities
- Mock or integration test date-fns behavior

---

## 5. Framework Documentation Requirements

### Jest Configuration Options

#### Coverage Configuration

**Recommended Settings:**

```javascript
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html'],
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.stories.tsx',
],
coverageThresholds: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
},
```

#### Next.js Testing Environment

**Required Setup:**

- `next/jest` configuration helper (Next.js 12+)
- Automatic mocking of Next.js features (Image, Link, Router, etc.)
- SWC transformation (faster than Babel)

**Example Configuration:**

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
	dir: './',
});

const customJestConfig = {
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	testEnvironment: 'jest-environment-jsdom',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
};

module.exports = createJestConfig(customJestConfig);
```

#### React Testing Library Setup

**Required Packages:**

- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

**Setup File (`jest.setup.js`):**

```javascript
import '@testing-library/jest-dom';
```

#### React Native Testing Environment

**Required Packages:**

- `@testing-library/react-native`
- `jest-expo` (already installed in mobile app)
- `react-test-renderer`

**Configuration:**

```javascript
module.exports = {
	preset: 'jest-expo',
	transformIgnorePatterns: [
		'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
	],
};
```

### TypeScript Path Mapping in Jest

**Current Path Aliases:**

- Web apps: `@/*` → `./src/*`
- No other aliases currently used

**Jest Configuration:**

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@lellimecnar/ui/(.*)$': '<rootDir>/../../packages/ui/src/$1',
},
```

**Alternative (use ts-jest paths):**

```javascript
globals: {
  'ts-jest': {
    tsconfig: {
      paths: {
        '@/*': ['./src/*'],
      },
    },
  },
},
```

---

## 6. Dependencies Analysis

### Current Testing Dependencies

| Package               | Version  | Used In                     | Purpose                |
| --------------------- | -------- | --------------------------- | ---------------------- |
| `jest`                | ^29      | Root, card-stack/\*, mobile | Test runner            |
| `@types/jest`         | ^29.5.14 | card-stack/\*               | Jest TypeScript types  |
| `ts-jest`             | ^29      | config-jest                 | TypeScript transformer |
| `jest-expo`           | ~52.0.2  | mobile/readon               | Expo preset            |
| `react-test-renderer` | 18.3.1   | mobile/readon               | React Native testing   |
| `@faker-js/faker`     | ^9.2.0   | card-stack/core             | Test data generation   |

### Missing Testing Dependencies

**For React Testing (Web Apps + UI Package):**

```json
{
	"@testing-library/react": "^14.x",
	"@testing-library/jest-dom": "^6.x",
	"@testing-library/user-event": "^14.x"
}
```

**For Next.js Testing:**

```json
{
	"@testing-library/react": "^14.x",
	"@testing-library/jest-dom": "^6.x"
}
```

_Note: Next.js 15 has built-in jest support via `next/jest`_

**For React Native Testing:**

```json
{
	"@testing-library/react-native": "^12.x"
}
```

**For All Browser Environments:**

```json
{
	"jest-environment-jsdom": "^29.x"
}
```

### Version Compatibility Matrix

| Framework          | React  | Jest | Testing Library                   | Other                  |
| ------------------ | ------ | ---- | --------------------------------- | ---------------------- |
| Next.js 15         | 18.3.1 | ^29  | @testing-library/react ^14        | next/jest built-in     |
| Expo 52            | 18.3.1 | ^29  | @testing-library/react-native ^12 | jest-expo ~52.0.2      |
| React (standalone) | 18.3.1 | ^29  | @testing-library/react ^14        | jest-environment-jsdom |

---

## 7. Test Patterns & Best Practices

### Observed Patterns from Existing Tests

1. **Co-location:** Test files are in the same directory as source files (`.spec.ts` next to `.ts`)
2. **Naming:** `<filename>.spec.ts` convention
3. **Structure:** `describe` blocks for grouping, `it` for individual tests
4. **Assertions:** Using native Jest matchers (`expect`, `toBe`, `toStrictEqual`, etc.)
5. **Setup/Teardown:** `beforeEach` and `afterEach` for test isolation
6. **Test Data Factories:** Helper functions that create test objects (e.g., `createGroupable()`)
7. **Snapshot Testing:** For output validation (e.g., card names)

### Test Structure Template

```typescript
import { SomeClass, isSomeClass } from '..';

describe('SomeClass', () => {
	// Test data factory
	const createTestData = () => {
		const instance = new SomeClass();
		return { instance };
	};

	// Setup/teardown
	beforeEach(() => {
		// Reset state
	});

	afterEach(() => {
		// Cleanup
	});

	// Type guard tests
	it('is SomeClass', () => {
		const { instance } = createTestData();
		expect(isSomeClass(instance)).toBe(true);
	});

	// Feature tests
	describe('someMethod', () => {
		it('does something', () => {
			const { instance } = createTestData();
			const result = instance.someMethod();
			expect(result).toBe(expectedValue);
		});
	});
});
```

---

## 8. Recommended Implementation Plan

### Phase 1: Enhance Shared Configuration

**Goal:** Update `@lellimecnar/jest-config` to support all package types

**Tasks:**

1. Add coverage configuration
2. Create Next.js preset (`next/jest-preset.js`)
3. Create React Native preset (`react-native/jest-preset.js`)
4. Add setup files for Testing Library
5. Document all presets

### Phase 2: Utils Package Testing

**Goal:** Add tests to `@lellimecnar/utils` (simplest package)

**Tasks:**

1. Create `jest.config.js` extending base preset
2. Add test scripts to `package.json`
3. Write tests for `pascalCase` and `randomIndexes`
4. Test date-fns configuration
5. Achieve 80%+ coverage

### Phase 3: UI Package Testing

**Goal:** Add comprehensive component and utility tests

**Tasks:**

1. Create `jest.config.js` extending browser preset
2. Install React Testing Library
3. Write tests for `cn` and `tw` utilities
4. Write component tests (Button, Input, etc.)
5. Add accessibility tests
6. Achieve 70%+ coverage

### Phase 4: Web Apps Testing

**Goal:** Enable testing in Next.js apps

**Tasks:**

1. Create `jest.config.js` using `next/jest`
2. Install React Testing Library
3. Create example component tests
4. Create example page/route tests
5. Add MSW for API mocking (if needed)
6. Document patterns

### Phase 5: UI NativeWind Package Testing

**Goal:** Add React Native component tests

**Tasks:**

1. Create `jest.config.js` extending React Native preset
2. Install React Native Testing Library
3. Write component tests
4. Handle NativeWind mocking
5. Achieve 70%+ coverage

### Phase 6: Mobile App Testing

**Goal:** Add integration tests to Expo app

**Tasks:**

1. Update `jest.config.js` to match new presets
2. Add screen/navigation tests
3. Document mobile testing patterns

---

## 9. File Paths Reference

### Configuration Files

| Package                  | Jest Config                                | Package.json                             |
| ------------------------ | ------------------------------------------ | ---------------------------------------- |
| Root                     | N/A (uses Turborepo)                       | `/package.json`                          |
| config-jest              | `/packages/config-jest/jest-preset.js`     | `/packages/config-jest/package.json`     |
| card-stack/core          | `/card-stack/core/jest.config.js`          | `/card-stack/core/package.json`          |
| card-stack/deck-standard | `/card-stack/deck-standard/jest.config.js` | `/card-stack/deck-standard/package.json` |
| web/miller.pub           | N/A (needs creation)                       | `/web/miller.pub/package.json`           |
| web/readon.app           | N/A (needs creation)                       | `/web/readon.app/package.json`           |
| mobile/readon            | Inline in package.json                     | `/mobile/readon/package.json`            |
| packages/ui              | N/A (needs creation)                       | `/packages/ui/package.json`              |
| packages/ui-nativewind   | N/A (needs creation)                       | `/packages/ui-nativewind/package.json`   |
| packages/utils           | N/A (needs creation)                       | `/packages/utils/package.json`           |

### TypeScript Configs

| Package  | Location                                 |
| -------- | ---------------------------------------- |
| Root     | `/tsconfig.json`                         |
| Base     | `/packages/config-typescript/base.json`  |
| React    | `/packages/config-typescript/react.json` |
| Next.js  | `/packages/config-typescript/next.json`  |
| Web apps | `/web/{app}/tsconfig.json`               |
| Mobile   | `/mobile/readon/tsconfig.json`           |

---

## 10. Specific Configuration Needs

### Next.js (Web Apps)

**Required:**

- `next/jest` configuration helper
- `testEnvironment: 'jsdom'`
- Path alias mapping for `@/*`
- Transpile `@lellimecnar/ui` package
- Setup file for Testing Library

**Example Configuration:**

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
	dir: './',
});

const customJestConfig = {
	displayName: 'miller.pub',
	testEnvironment: 'jest-environment-jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/app/**/layout.tsx',
		'!src/app/**/not-found.tsx',
	],
	coverageThresholds: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
};

module.exports = createJestConfig(customJestConfig);
```

### React (UI Package)

**Required:**

- `testEnvironment: 'jsdom'`
- React Testing Library
- Mock CSS imports
- Handle Radix UI imports

**Example Configuration:**

```javascript
/** @type {import('jest').Config} */
module.exports = {
	displayName: '@lellimecnar/ui',
	preset: '@lellimecnar/jest-config/browser',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	moduleNameMapper: {
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.stories.tsx',
	],
	coverageThresholds: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
};
```

### React Native (UI NativeWind Package)

**Required:**

- React Native Testing Library
- Mock React Native modules
- Handle NativeWind imports
- Expo Router mocking

**Example Configuration:**

```javascript
/** @type {import('jest').Config} */
module.exports = {
	displayName: '@lellimecnar/ui-nativewind',
	preset: '@lellimecnar/jest-config/react-native',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|expo-router|nativewind)/)',
	],
	collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
	coverageThresholds: {
		global: {
			branches: 60,
			functions: 60,
			lines: 60,
			statements: 60,
		},
	},
};
```

---

## 11. Documentation Needs

### Files to Create

1. **`/docs/testing.md`** - Comprehensive testing guide
2. **`/packages/config-jest/README.md`** - Preset documentation
3. **Test examples in each package** - Demonstrate patterns

### Documentation Structure

```markdown
# Testing Guide

## Overview

- Why we test
- What to test
- How to run tests

## Getting Started

- Running tests locally
- Running tests in CI
- Debugging tests

## Writing Tests

- Unit tests
- Component tests
- Integration tests
- Snapshot tests

## Test Patterns

- Test data factories
- Setup/teardown
- Mocking
- Async testing

## Package-Specific Guides

- Testing Next.js apps
- Testing React components
- Testing React Native components
- Testing utility functions

## Best Practices

- Coverage requirements
- Test organization
- Naming conventions
- Performance tips

## Troubleshooting

- Common errors
- Debugging tips
- FAQ
```

---

## 12. Summary & Next Steps

### Current State

✅ **Working:**

- Jest configuration shared package
- Card stack packages fully tested (58 test files)
- Turbo tasks for test and test:watch
- Good test patterns established

❌ **Missing:**

- Tests for web apps, UI packages, utils
- React Testing Library setup
- Coverage configuration
- Next.js test configuration
- Testing documentation

### Immediate Actions

1. **Update `@lellimecnar/jest-config`:**
   - Add coverage defaults
   - Create Next.js preset
   - Create React Native preset
   - Add setup file templates

2. **Install Dependencies:**
   - `@testing-library/react` (root devDependencies)
   - `@testing-library/jest-dom` (root devDependencies)
   - `@testing-library/react-native` (root devDependencies)
   - `jest-environment-jsdom` (root devDependencies)

3. **Start with Utils Package:**
   - Simplest to implement
   - Demonstrates patterns
   - Quick win

4. **Document Everything:**
   - Create testing guide
   - Document presets
   - Add examples to each package

### Success Metrics

- ✅ All packages have `test` and `test:watch` scripts
- ✅ Coverage reports in `coverage/` directories
- ✅ Minimum 70% coverage for new code
- ✅ CI pipeline runs all tests
- ✅ Documentation complete and examples provided

---

## Appendix A: Complete Dependencies List

### Root `package.json` Additions Needed

```json
{
	"devDependencies": {
		"@testing-library/jest-dom": "^6.0.0",
		"@testing-library/react": "^14.0.0",
		"@testing-library/react-native": "^12.0.0",
		"@testing-library/user-event": "^14.0.0",
		"identity-obj-proxy": "^3.0.0",
		"jest-environment-jsdom": "^29.0.0"
	}
}
```

### Per-Package Additions

**Web Apps (Next.js):**

```json
{
	"devDependencies": {
		"@testing-library/jest-dom": "workspace:*",
		"@testing-library/react": "workspace:*"
	}
}
```

**UI Package:**

```json
{
	"devDependencies": {
		"@lellimecnar/jest-config": "workspace:*",
		"@testing-library/jest-dom": "workspace:*",
		"@testing-library/react": "workspace:*",
		"@types/jest": "^29.0.0",
		"identity-obj-proxy": "^3.0.0",
		"jest": "^29",
		"jest-environment-jsdom": "^29.0.0"
	}
}
```

**Utils Package:**

```json
{
	"devDependencies": {
		"@lellimecnar/jest-config": "workspace:*",
		"@types/jest": "^29.0.0",
		"jest": "^29"
	}
}
```

---

## Appendix B: Example Test Files

### Utility Function Test

**File:** `packages/utils/src/lodash.spec.ts`

```typescript
import { pascalCase, randomIndexes } from './lodash';

describe('lodash utilities', () => {
	describe('pascalCase', () => {
		it('converts string to PascalCase', () => {
			expect(pascalCase('hello world')).toBe('HelloWorld');
			expect(pascalCase('hello-world')).toBe('HelloWorld');
			expect(pascalCase('hello_world')).toBe('HelloWorld');
		});
	});

	describe('randomIndexes', () => {
		it('returns array of random indexes', () => {
			const array = [1, 2, 3, 4, 5];
			const indexes = randomIndexes(array, 3);

			expect(indexes).toHaveLength(3);
			indexes.forEach((index) => {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(array.length);
			});
		});

		it('defaults to 1 index', () => {
			const array = [1, 2, 3];
			const indexes = randomIndexes(array);
			expect(indexes).toHaveLength(1);
		});
	});
});
```

### React Component Test

**File:** `packages/ui/src/lib/utils.spec.ts`

```typescript
import { cn, tw } from './utils';

describe('utils', () => {
	describe('cn', () => {
		it('merges classnames', () => {
			expect(cn('foo', 'bar')).toBe('foo bar');
		});

		it('handles conditional classnames', () => {
			expect(cn('foo', false && 'bar')).toBe('foo');
		});

		it('merges Tailwind classes', () => {
			expect(cn('p-4', 'p-2')).toBe('p-2');
		});
	});

	describe('tw', () => {
		it('converts units to rem', () => {
			expect(tw.w(4)).toBe(1);
			expect(tw.w(8)).toBe(2);
		});

		it('includes unit when requested', () => {
			expect(tw.w(4, true)).toBe('1rem');
		});
	});
});
```

**File:** `packages/ui/src/components/button.spec.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
	it('renders with text', () => {
		render(<Button>Click me</Button>);
		expect(
			screen.getByRole('button', { name: 'Click me' }),
		).toBeInTheDocument();
	});

	it('applies variant classes', () => {
		render(<Button variant="destructive">Delete</Button>);
		const button = screen.getByRole('button');
		expect(button).toHaveClass('bg-destructive');
	});

	it('renders as child component when asChild is true', () => {
		render(
			<Button asChild>
				<a href="/test">Link</a>
			</Button>,
		);
		expect(screen.getByRole('link')).toBeInTheDocument();
	});
});
```

### Next.js Page Test

**File:** `web/miller.pub/src/app/page.spec.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home Page', () => {
	it('renders heading', () => {
		render(<Home />);
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});
});
```

---

**End of Research Report**
