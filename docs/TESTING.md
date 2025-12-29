# Testing Guide

This document outlines the testing strategy, tools, and best practices for the @lellimecnar/source monorepo.

## Testing Philosophy

We follow the **Testing Pyramid** approach:

```
        /\\
       /  \\     E2E Tests (Few, Critical Paths)
      /____\\
     /      \\
    /        \\   Integration Tests (Focused, Service Boundaries)
   /__________\\
  /            \\
 /              \\ Unit Tests (Many, Fast, Isolated)
/________________\\
```

- **Unit Tests**: Test individual functions, classes, and components in isolation
- **Integration Tests**: Test interactions between components, services, and APIs
- **E2E Tests**: Test complete user journeys through the application (future work)

## Testing Tools

### Core Testing Framework

- **Vitest**: JavaScript/TypeScript test runner with fast watch mode, mocking (`vi`), and coverage
- **@vitest/coverage-v8**: Coverage provider for Vitest

### React Testing

- **React Testing Library**: For testing React components by simulating user interactions
- **@testing-library/jest-dom**: Additional matchers for DOM assertions (via Vitest integration)
- **@testing-library/user-event**: Simulate user interactions

### React Native Testing

- **React Native Testing Library**: For testing React Native components
- **jest-expo**: Jest preset for Expo applications (Expo/RN keeps Jest)

## Running Tests

- Use `#tool:execute/runTests` (preferred) to execute unit tests.
- Run everything by omitting `files`.
- Run a subset by passing absolute paths to specific `*.spec.*` files.
- Collect coverage by using `mode="coverage"` (and optionally `coverageFiles` for focused reporting).

## Coverage Requirements

### Global Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Package-Specific Thresholds

- **Web Apps** (miller.pub, readon.app): 70% (lower due to UI-heavy nature)
- **UI Packages** (ui, ui-nativewind): 75%
- **Utils Package**: 80%
- **Card Stack Packages**: 80%

### Coverage Reports

Coverage reports are generated in the `coverage/` directory of each package:

- **HTML Report**: Open `coverage/index.html` in a browser for interactive exploration
- **LCOV Report**: Used for CI integration and coverage tracking tools
- **Text Summary**: Displayed in terminal after test run

## Test File Organization

### Co-located Tests (Preferred)

Tests should be co-located with the source code they test:

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── Button.spec.tsx
│   └── Card/
│       ├── Card.tsx
│       └── Card.spec.tsx
└── utils/
    ├── formatDate.ts
    └── formatDate.spec.ts
```

### Test Directories (Alternative)

For larger components or integration tests:

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── __tests__/
│           ├── Button.test.tsx
│           └── Button.integration.test.tsx
```

## Testing Patterns by Package Type

### 1. Utils Package (@lellimecnar/utils)

**Focus**: Pure functions, edge cases, type guards

```typescript
// src/utils/formatDate.spec.ts
import { formatDate } from './formatDate';

describe('formatDate', () => {
	it('formats a date in ISO format', () => {
		const date = new Date('2024-01-15T10:30:00Z');
		expect(formatDate(date)).toBe('2024-01-15');
	});

	it('handles invalid dates', () => {
		expect(() => formatDate(new Date('invalid'))).toThrow();
	});

	it('formats date with custom format string', () => {
		const date = new Date('2024-01-15');
		expect(formatDate(date, 'MM/dd/yyyy')).toBe('01/15/2024');
	});
});
```

### 2. UI Package (@lellimecnar/ui)

**Focus**: Component behavior, user interactions, accessibility

```typescript
// src/components/Button/Button.spec.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
  });
});
```

### 3. React Native UI Package (@lellimecnar/ui-nativewind)

**Focus**: Component rendering, native interactions

```typescript
// src/components/Button/Button.spec.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button (React Native)', () => {
  it('renders with text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <Button onPress={handlePress}>Click me</Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <Button disabled onPress={handlePress}>
        Click me
      </Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(handlePress).not.toHaveBeenCalled();
  });
});
```

### 4. Next.js Web Apps (miller.pub, readon.app)

**Focus**: Page components, client components, API routes

```typescript
// src/components/Navigation/Navigation.spec.tsx
import * as nextNavigation from 'next/navigation';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Navigation } from './Navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('Navigation', () => {
  it('renders navigation links', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
  });

  it('highlights active link', () => {
    vi.mocked(nextNavigation.usePathname).mockReturnValue('/about');

    render(<Navigation />);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveClass('active');
  });
});
```

### 5. Card Stack Packages

**Focus**: Game logic, state transitions, validation

```typescript
// src/Card.spec.ts
import { Card } from './Card';
import { Rank } from './Rank';
import { Suit } from './Suit';

describe('Card', () => {
	it('creates a card with rank and suit', () => {
		const card = new Card(Rank.Ace, Suit.Spades);
		expect(card.rank).toBe(Rank.Ace);
		expect(card.suit).toBe(Suit.Spades);
	});

	it('flips the card', () => {
		const card = new Card(Rank.King, Suit.Hearts);
		expect(card.isFaceUp).toBe(false);

		card.flip();
		expect(card.isFaceUp).toBe(true);

		card.flip();
		expect(card.isFaceUp).toBe(false);
	});

	it('compares cards by rank', () => {
		const aceOfSpades = new Card(Rank.Ace, Suit.Spades);
		const kingOfHearts = new Card(Rank.King, Suit.Hearts);

		expect(aceOfSpades.isHigherThan(kingOfHearts)).toBe(true);
		expect(kingOfHearts.isHigherThan(aceOfSpades)).toBe(false);
	});
});
```

## Best Practices

### DO

- ✅ Write tests for all new features and bug fixes
- ✅ Test behavior, not implementation details
- ✅ Use descriptive test names that explain what is being tested
- ✅ Follow the Arrange-Act-Assert pattern
- ✅ Mock external dependencies (APIs, databases, third-party services)
- ✅ Test edge cases and error conditions
- ✅ Keep tests isolated and independent
- ✅ Use test data factories for complex object creation
- ✅ Write integration tests for critical user paths
- ✅ Maintain test coverage above the threshold

### DON'T

- ❌ Test internal implementation details
- ❌ Write tests that depend on other tests
- ❌ Use production data or real external services
- ❌ Ignore flaky tests (fix them or remove them)
- ❌ Skip error handling in tests
- ❌ Write tests without assertions
- ❌ Mock everything (only mock external dependencies)
- ❌ Test trivial code (simple getters/setters)
- ❌ Duplicate test coverage (test once at the right level)

## Common Testing Scenarios

### Testing Async Code

```typescript
it('fetches user data', async () => {
	const user = await fetchUser('123');
	expect(user.name).toBe('John Doe');
});
```

### Testing Promises

```typescript
it('rejects when user not found', async () => {
	await expect(fetchUser('invalid-id')).rejects.toThrow('User not found');
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from './useUser';

it('fetches user data', async () => {
	const { result } = renderHook(() => useUser('123'));

	await waitFor(() => {
		expect(result.current.user).toBeDefined();
	});

	expect(result.current.user.name).toBe('John Doe');
});
```

### Testing with Context

```typescript
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { ThemedButton } from './ThemedButton';

it('uses theme from context', () => {
  render(
    <ThemeProvider theme="dark">
      <ThemedButton>Click me</ThemedButton>
    </ThemeProvider>
  );

  expect(screen.getByRole('button')).toHaveClass('dark-theme');
});
```

### Mocking Modules

```typescript
// Mock an entire module
jest.mock('./apiClient', () => ({
	fetchData: jest.fn(() => Promise.resolve({ data: 'mocked' })),
}));

// Mock a specific function
import { fetchData } from './apiClient';
jest.spyOn(apiClient, 'fetchData').mockResolvedValue({ data: 'mocked' });
```

## Debugging Tests

### Run a Single Test File

- Use `#tool:execute/runTests` and pass the absolute path to the test file in `files`.

### Run Tests Matching a Pattern

- Use `#tool:execute/runTests` and pass `testNames` to target a specific test name.

### Run in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and click "inspect" on the target.

### View Coverage for Specific File

- Use `#tool:execute/runTests` with `mode="coverage"` and set `coverageFiles` to the absolute path(s) you want detailed coverage for.

## CI Integration

Tests run automatically in CI on every push and pull request. The CI pipeline:

1. Installs dependencies with `pnpm install --frozen-lockfile`
2. Runs all tests with `pnpm test:ci`
3. Generates coverage reports
4. Uploads coverage to Codecov (optional)
5. Fails the build if tests fail or coverage drops below threshold

## Future Improvements

- [ ] Add E2E testing with Playwright
- [ ] Visual regression testing with Chromatic or Percy
- [ ] Mutation testing with Stryker
- [ ] Performance testing for critical paths
- [ ] Accessibility testing automation
- [ ] Contract testing for APIs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
