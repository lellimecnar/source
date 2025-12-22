# Testing Infrastructure Improvements

## Goal
Establish comprehensive testing infrastructure with coverage reporting across all packages, add Jest configurations to web apps and UI libraries, and create testing standards documentation.

## Prerequisites
Make sure you are currently on the `test/infrastructure-improvements` branch before beginning implementation.
If not, switch to the correct branch. If the branch does not exist, create it from master.

```bash
# Check current branch
git branch --show-current

# If not on test/infrastructure-improvements, create and switch
git checkout -b test/infrastructure-improvements
```

---

## Step-by-Step Instructions

### Step 1: Enhance Jest Configuration with Coverage

This step adds comprehensive coverage configuration to the shared Jest presets that all packages will inherit.

- [ ] Open `packages/config-jest/jest-preset.js`
- [ ] Replace the entire file with the enhanced configuration below:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  verbose: true,
};
```

- [ ] Open `packages/config-jest/browser/jest-preset.js`
- [ ] Replace the entire file with the browser-specific configuration below:

```javascript
const baseConfig = require('../jest-preset');

module.exports = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    '!src/**/*.stories.{ts,tsx}',
  ],
};
```

#### Step 1 Verification Checklist
- [ ] Run `cat packages/config-jest/jest-preset.js` and verify coverage configuration is present
- [ ] Run `cat packages/config-jest/browser/jest-preset.js` and verify jsdom environment is set
- [ ] Verify both files have no syntax errors

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add packages/config-jest/
git commit -m "feat(config-jest): add coverage configuration to shared presets"
```

---

### Step 2: Add Jest Configuration - Web Apps

Configure both Next.js applications with Jest and React Testing Library support.

- [ ] Create `web/miller.pub/jest.config.js` with the following content:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'miller.pub',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
```

- [ ] Create `web/miller.pub/jest.setup.js` with the following content:

```javascript
import '@testing-library/jest-dom';
```

- [ ] Create `web/readon.app/jest.config.js` with the following content:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'readon.app',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
```

- [ ] Create `web/readon.app/jest.setup.js` with the following content:

```javascript
import '@testing-library/jest-dom';
```

- [ ] Add test scripts to `web/miller.pub/package.json` by adding these scripts to the "scripts" section:

```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
```

- [ ] Add test scripts to `web/readon.app/package.json` by adding these scripts to the "scripts" section:

```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
```

- [ ] Install required testing dependencies for both web apps:

```bash
cd web/miller.pub && pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
cd ../readon.app && pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
cd ../..
```

#### Step 2 Verification Checklist
- [ ] Verify jest.config.js and jest.setup.js files exist in both web apps
- [ ] Run `cd web/miller.pub && pnpm test --passWithNoTests` - should run successfully
- [ ] Run `cd web/readon.app && pnpm test --passWithNoTests` - should run successfully
- [ ] Check that no TypeScript errors appear when running the test command

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add web/miller.pub/jest.* web/miller.pub/package.json
git add web/readon.app/jest.* web/readon.app/package.json
git commit -m "feat(web): add Jest configuration to miller.pub and readon.app"
```

---

### Step 3: Add Jest Configuration - UI Packages

Configure the UI component libraries with appropriate testing setups.

- [ ] Create `packages/ui/jest.config.js` with the following content:

```javascript
module.exports = {
  displayName: '@lellimecnar/ui',
  preset: '@lellimecnar/jest-config/browser',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

- [ ] Create `packages/ui/jest.setup.js` with the following content:

```javascript
import '@testing-library/jest-dom';
```

- [ ] Create `packages/ui-nativewind/jest.config.js` with the following content:

```javascript
module.exports = {
  displayName: '@lellimecnar/ui-nativewind',
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

- [ ] Create `packages/ui-nativewind/jest.setup.js` with the following content:

```javascript
import '@testing-library/react-native/extend-expect';
```

- [ ] Add test scripts to `packages/ui/package.json` by adding these to the "scripts" section:

```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
```

- [ ] Add test scripts to `packages/ui-nativewind/package.json` by adding these to the "scripts" section:

```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
```

- [ ] Install required testing dependencies:

```bash
cd packages/ui && pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event identity-obj-proxy jest-environment-jsdom
cd ../ui-nativewind && pnpm add -D @testing-library/react-native jest-expo
cd ../..
```

#### Step 3 Verification Checklist
- [ ] Verify jest.config.js and jest.setup.js files exist in both UI packages
- [ ] Run `cd packages/ui && pnpm test --passWithNoTests` - should run successfully
- [ ] Run `cd packages/ui-nativewind && pnpm test --passWithNoTests` - should run successfully
- [ ] Check that configurations properly recognize TypeScript and JSX

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add packages/ui/jest.* packages/ui/package.json
git add packages/ui-nativewind/jest.* packages/ui-nativewind/package.json
git commit -m "feat(packages): add Jest configuration to ui and ui-nativewind packages"
```

---

### Step 4: Add Jest Configuration - Utils Package

Configure the utilities package with basic TypeScript testing support.

- [ ] Create `packages/utils/jest.config.js` with the following content:

```javascript
module.exports = {
  displayName: '@lellimecnar/utils',
  preset: '@lellimecnar/jest-config',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

- [ ] Add test scripts to `packages/utils/package.json` by adding these to the "scripts" section:

```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
```

#### Step 4 Verification Checklist
- [ ] Verify jest.config.js exists in packages/utils
- [ ] Run `cd packages/utils && pnpm test --passWithNoTests` - should run successfully
- [ ] Verify TypeScript files can be tested without React dependencies

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add packages/utils/jest.config.js packages/utils/package.json
git commit -m "feat(utils): add Jest configuration to utils package"
```

---

### Step 5: Create Testing Documentation

Create comprehensive testing documentation covering strategy, tools, and examples.

- [ ] Create the `docs` directory if it doesn't exist:

```bash
mkdir -p docs
```

- [ ] Create `docs/TESTING.md` with the following comprehensive content:

```markdown
# Testing Guide

This document outlines the testing strategy, tools, and best practices for the @lellimecnar/source monorepo.

## Testing Philosophy

We follow the **Testing Pyramid** approach:

```
        /\
       /  \     E2E Tests (Few, Critical Paths)
      /____\
     /      \
    /        \   Integration Tests (Focused, Service Boundaries)
   /__________\
  /            \
 /              \ Unit Tests (Many, Fast, Isolated)
/________________\
```

- **Unit Tests**: Test individual functions, classes, and components in isolation
- **Integration Tests**: Test interactions between components, services, and APIs
- **E2E Tests**: Test complete user journeys through the application (future work)

## Testing Tools

### Core Testing Framework
- **Jest**: JavaScript testing framework with built-in assertion library, mocking, and coverage
- **ts-jest**: TypeScript preprocessor for Jest

### React Testing
- **React Testing Library**: For testing React components by simulating user interactions
- **@testing-library/jest-dom**: Additional matchers for DOM assertions
- **@testing-library/user-event**: Simulate user interactions

### React Native Testing
- **React Native Testing Library**: For testing React Native components
- **jest-expo**: Jest preset for Expo applications

## Running Tests

### From Root
```bash
# Run all tests across all packages
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests in CI mode
pnpm test:ci
```

### From Specific Package
```bash
# Run tests in a specific package
pnpm --filter @lellimecnar/ui test

# Run with coverage
pnpm --filter @lellimecnar/ui test:coverage

# Watch mode
pnpm --filter @lellimecnar/ui test:watch
```

### From Package Directory
```bash
# Navigate to package
cd packages/ui

# Run tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

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
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
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
import { render, screen } from '@testing-library/react';
import { Navigation } from './Navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}));

describe('Navigation', () => {
  it('renders navigation links', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
  });

  it('highlights active link', () => {
    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/about');
    
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
```bash
pnpm test path/to/test.spec.ts
```

### Run Tests Matching a Pattern
```bash
pnpm test --testNamePattern="Button"
```

### Run in Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome and click "inspect" on the target.

### View Coverage for Specific File
```bash
pnpm test:coverage --collectCoverageFrom="src/components/Button/**"
```

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
```

#### Step 5 Verification Checklist
- [ ] Verify `docs/TESTING.md` file exists and contains comprehensive documentation
- [ ] Review the documentation for completeness
- [ ] Ensure all package types are covered with examples
- [ ] Verify code examples are syntactically correct

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add docs/TESTING.md
git commit -m "docs: add comprehensive testing guide"
```

---

### Step 6: Add Sample Test Files

Create example test files demonstrating testing patterns for each package type.

- [ ] Create `web/miller.pub/src/components/__tests__/example.test.tsx` with the following content:

```typescript
import { render, screen } from '@testing-library/react';

// This is a placeholder example component for testing demonstration
function ExampleComponent({ message }: { message: string }) {
  return <div role="alert">{message}</div>;
}

describe('ExampleComponent', () => {
  it('renders the message', () => {
    render(<ExampleComponent message="Hello, World!" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Hello, World!');
  });

  it('renders different messages', () => {
    const { rerender } = render(<ExampleComponent message="First message" />);
    expect(screen.getByRole('alert')).toHaveTextContent('First message');

    rerender(<ExampleComponent message="Second message" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Second message');
  });
});
```

- [ ] Create `web/readon.app/src/components/__tests__/example.test.tsx` with the following content:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// This is a placeholder example component for testing demonstration
function Counter() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

describe('Counter', () => {
  it('renders initial count', () => {
    render(<Counter />);
    expect(screen.getByText(/count: 0/i)).toBeInTheDocument();
  });

  it('increments count when button is clicked', async () => {
    const user = userEvent.setup();
    render(<Counter />);
    
    const button = screen.getByRole('button', { name: /increment/i });
    await user.click(button);
    
    expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
  });
});
```

- [ ] Create `packages/ui/src/components/__tests__/example.test.tsx` with the following content:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// This is a placeholder example component for testing demonstration
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function ExampleButton({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
    >
      {children}
    </button>
  );
}

describe('ExampleButton', () => {
  it('renders with text', () => {
    render(<ExampleButton>Click me</ExampleButton>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    
    render(<ExampleButton onClick={handleClick}>Click me</ExampleButton>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<ExampleButton disabled>Click me</ExampleButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant class correctly', () => {
    const { rerender } = render(<ExampleButton variant="primary">Primary</ExampleButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
    
    rerender(<ExampleButton variant="secondary">Secondary</ExampleButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });
});
```

- [ ] Create `packages/utils/src/__tests__/example.test.ts` with the following content:

```typescript
// This is a placeholder example utility for testing demonstration
function add(a: number, b: number): number {
  return a + b;
}

function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}

function isEven(n: number): boolean {
  return n % 2 === 0;
}

describe('Math Utilities', () => {
  describe('add', () => {
    it('adds two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('adds negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    it('adds positive and negative numbers', () => {
      expect(add(5, -3)).toBe(2);
    });
  });

  describe('divide', () => {
    it('divides two numbers', () => {
      expect(divide(10, 2)).toBe(5);
    });

    it('handles decimals', () => {
      expect(divide(7, 2)).toBe(3.5);
    });

    it('throws error when dividing by zero', () => {
      expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
    });
  });

  describe('isEven', () => {
    it('returns true for even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(4)).toBe(true);
      expect(isEven(100)).toBe(true);
    });

    it('returns false for odd numbers', () => {
      expect(isEven(1)).toBe(false);
      expect(isEven(3)).toBe(false);
      expect(isEven(99)).toBe(false);
    });

    it('returns true for zero', () => {
      expect(isEven(0)).toBe(true);
    });
  });
});
```

- [ ] Create the necessary directories:

```bash
mkdir -p web/miller.pub/src/components/__tests__
mkdir -p web/readon.app/src/components/__tests__
mkdir -p packages/ui/src/components/__tests__
mkdir -p packages/utils/src/__tests__
```

#### Step 6 Verification Checklist
- [ ] Verify all example test files were created in correct locations
- [ ] Run `cd web/miller.pub && pnpm test` - should pass (1 test suite)
- [ ] Run `cd web/readon.app && pnpm test` - should pass (1 test suite)
- [ ] Run `cd packages/ui && pnpm test` - should pass (1 test suite)
- [ ] Run `cd packages/utils && pnpm test` - should pass (3 test suites with multiple tests)
- [ ] All tests pass without errors

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add web/miller.pub/src/components/__tests__/
git add web/readon.app/src/components/__tests__/
git add packages/ui/src/components/__tests__/
git add packages/utils/src/__tests__/
git commit -m "test: add example test files for all package types"
```

---

### Step 7: Update Root Package.json with Coverage Scripts

Add convenient test scripts at the monorepo root for running tests across all workspaces.

- [ ] Open the root `package.json` file
- [ ] Add the following scripts to the "scripts" section (merge with existing scripts):

```json
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:coverage": "turbo run test:coverage",
    "test:ci": "turbo run test --force --no-cache"
```

- [ ] Verify the scripts are added correctly in the root package.json

#### Step 7 Verification Checklist
- [ ] Run `pnpm test` from root - should run tests in all packages
- [ ] Verify output shows tests from multiple packages
- [ ] Run `pnpm test:coverage` from root - should generate coverage for all packages
- [ ] Check that coverage reports are created in each package's `coverage/` directory

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add package.json
git commit -m "feat: add test scripts to root package.json for monorepo-wide testing"
```

---

### Step 8: Configure Coverage Upload for CI

Set up GitHub Actions workflow for automated test coverage reporting.

- [ ] Create `.github/workflows/test.yml` with the following content:

```yaml
name: Test & Coverage

on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main, develop]

jobs:
  test:
    name: Run Tests with Coverage
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.12.2
      
      - name: Get pnpm store directory
        id: pnpm-cache
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT
      
      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests with coverage
        run: pnpm test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: |
            ./packages/*/coverage/lcov.info
            ./web/*/coverage/lcov.info
            ./mobile/*/coverage/lcov.info
            ./card-stack/*/coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false
      
      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

- [ ] Create `codecov.yml` in the root with the following content:

```yaml
# Codecov configuration
# https://docs.codecov.com/docs/codecov-yaml

coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 70%
        threshold: 5%

comment:
  layout: "reach,diff,flags,tree,footer"
  behavior: default
  require_changes: false
  require_base: false
  require_head: true

ignore:
  - "**/*.spec.ts"
  - "**/*.test.ts"
  - "**/*.spec.tsx"
  - "**/*.test.tsx"
  - "**/__tests__/**"
  - "**/jest.config.js"
  - "**/jest.setup.js"
  - "**/*.stories.tsx"
  - "**/dist/**"
  - "**/build/**"
  - "**/coverage/**"
  - "**/.next/**"
  - "**/.expo/**"

flags:
  unittests:
    paths:
      - packages/
      - web/
      - mobile/
      - card-stack/
    carryforward: true
```

- [ ] Create the `.github/workflows` directory if it doesn't exist:

```bash
mkdir -p .github/workflows
```

- [ ] Update the root `README.md` to add a coverage badge (add this near the top after the title):

```markdown
[![codecov](https://codecov.io/gh/lellimecnar/source/branch/master/graph/badge.svg)](https://codecov.io/gh/lellimecnar/source)
```

#### Step 8 Verification Checklist
- [ ] Verify `.github/workflows/test.yml` exists with correct content
- [ ] Verify `codecov.yml` exists in root with correct configuration
- [ ] Check that the workflow file uses correct pnpm version (9.12.2)
- [ ] Verify ignore patterns in codecov.yml match your test file patterns
- [ ] Note: To fully test this, you'll need to:
  - Set up a Codecov account at https://codecov.io
  - Link your repository
  - Add `CODECOV_TOKEN` secret to GitHub repository settings
  - Push to a branch and create a PR to see it in action

#### Step 8 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

```bash
git add .github/workflows/test.yml codecov.yml README.md
git commit -m "ci: add GitHub Actions workflow for test coverage reporting"
```

---

## Final Verification

After completing all steps, run this comprehensive verification:

```bash
# From root directory
pnpm test:coverage
```

**Expected Results:**
- All example tests pass
- Coverage reports generated for all configured packages
- No TypeScript errors
- No Jest configuration errors

## Next Steps

1. **Add Real Tests**: Replace example tests with actual tests for your components and utilities
2. **Configure Codecov**: Set up Codecov account and add the `CODECOV_TOKEN` secret to GitHub
3. **Adjust Thresholds**: Start with lower coverage thresholds and gradually increase as you add more tests
4. **Write Tests for Existing Code**: Systematically add tests to existing components, starting with critical paths
5. **E2E Testing**: Consider adding Playwright for end-to-end testing of critical user journeys
6. **Visual Regression**: Explore tools like Chromatic or Percy for visual regression testing of UI components

## Troubleshooting

### Jest fails to run in Next.js apps
- Ensure `next/jest` is installed: `pnpm add -D jest @types/jest`
- Verify `next.config.js` exists in the app directory

### Tests fail with "Cannot find module" errors
- Check that `moduleNameMapper` in jest.config.js matches your tsconfig paths
- Ensure all test dependencies are installed
- Try clearing Jest cache: `pnpm test --clearCache`

### Coverage thresholds fail
- Review the coverage report HTML: `open packages/<package>/coverage/index.html`
- Lower thresholds temporarily in jest.config.js
- Focus on testing critical code paths first

### React Native tests fail
- Ensure `jest-expo` preset is installed
- Verify `transformIgnorePatterns` includes all necessary node_modules
- Check that Babel config is compatible with React Native

---

**Implementation Complete!** 

You've successfully established comprehensive testing infrastructure across the monorepo. All packages now have Jest configurations, coverage reporting, example tests, and CI integration ready to go.
