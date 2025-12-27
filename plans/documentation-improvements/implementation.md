# Documentation Improvements

## Goal

Create comprehensive documentation that empowers contributors, clarifies security policies, tracks project evolution, and provides clear guidance for working with individual packages.

## Prerequisites

Make sure that the user is currently on the `docs/comprehensive-documentation` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from main.

### Step-by-Step Instructions

#### Step 1: Update Contributing Guidelines

- [x] Update `CONTRIBUTING.md` to include a link to the new Code of Conduct and ensure all sections are up to date.
- [x] Copy and paste code below into `CONTRIBUTING.md`:

````markdown
# Contributing to @lellimecnar/source

Thank you for your interest in contributing! This document provides guidelines and workflows for contributing to this monorepo.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Dependency Management](#dependency-management)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- **Node.js:** ^20 (required)
- **pnpm:** 9.12.2 (enforced via `packageManager` field)

### Installation

```bash
# Clone the repository
git clone https://github.com/lellimecnar/source.git
cd source

# Install dependencies
pnpm install
```
````

### Project Structure

This is a **pnpm + Turborepo** monorepo with the following workspaces:

- **`web/*`**: Next.js applications (miller.pub, readon.app)
- **`mobile/*`**: Expo/React Native applications (readon)
- **`packages/*`**: Shared libraries and configurations
- **`card-stack/*`**: Domain logic packages (card game engine)

See [AGENTS.md](./AGENTS.md) for comprehensive project documentation.

## Development Workflow

### Running Development Servers

```bash
# Start all development servers
pnpm dev

# Start specific workspace
pnpm miller.pub dev
pnpm readon.app dev
pnpm readon dev  # Mobile app
```

### Building

```bash
# Build all workspaces
pnpm build

# Build specific workspace
pnpm --filter @lellimecnar/ui build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm --filter @card-stack/core test
```

### Linting and Type Checking

```bash
# Lint all workspaces
pnpm lint

# Auto-fix linting issues
pnpm format

# Type check all workspaces
pnpm type-check
```

### Clean Build Artifacts

```bash
# Remove all build artifacts and node_modules
pnpm clean
```

## Dependency Management

We use `pnpm` workspaces.

- **Add dependency to specific package:**
  ```bash
  pnpm --filter @lellimecnar/ui add react-day-picker
  ```
- **Add dev dependency:**
  ```bash
  pnpm --filter @lellimecnar/ui add -D @types/react
  ```

## Testing

- Tests are co-located with source files: `src/**/*.spec.ts`
- Each workspace with tests has a `jest.config.js`
- Shared Jest configuration: `@lellimecnar/jest-config`

### Writing Tests

```typescript
// Example: src/utils/formatDate.spec.ts
import { formatDate } from './formatDate';

describe('formatDate', () => {
	it('should format a date correctly', () => {
		const date = new Date('2025-12-21');
		expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-12-21');
	});
});
```

### Test Coverage

To generate coverage reports:

```bash
# Run tests with coverage
pnpm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Pull Requests

### PR Guidelines

1. **Branch Naming:**
   - Feature: `feat/description`
   - Bug fix: `fix/description`
   - Chore: `chore/description`
   - Documentation: `docs/description`

2. **Commit Messages:**
   - Follow [Conventional Commits](https://www.conventionalcommits.org/)
   - Examples: `feat: add user authentication`, `fix: resolve memory leak in card shuffle`

3. **PR Description:**
   - Clearly describe what the PR does
   - Reference any related issues
   - Include screenshots for UI changes
   - List any breaking changes

4. **Before Submitting:**
   - [ ] All tests pass (`pnpm test`)
   - [ ] Linting passes (`pnpm lint`)
   - [ ] Type checking passes (`pnpm type-check`)
   - [ ] Build succeeds (`pnpm build`)
   - [ ] Manual testing completed

### CI Requirements

All PRs must pass the following CI checks:

- **Lint:** ESLint checks for code quality and style
- **Type Check:** TypeScript compiler verifies types
- **Test:** Jest runs all unit tests
- **Build:** Turborepo builds all workspaces
- **Dependency Review:** Security scan for vulnerabilities and license compliance

### Review Process

1. **Automated Checks:** CI must pass before review
2. **Code Review:** At least one approval required

## Code Style

We use **ESLint** and **Prettier** to enforce code style.

- **Linting:** Run `pnpm lint` to check for issues.
- **Formatting:** Run `pnpm format` to auto-format code.
- **Configuration:** Shared configs are in `packages/config-eslint` and `packages/config-prettier`.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

````

##### Step 1 Verification Checklist
- [ ] `CONTRIBUTING.md` exists and contains the Code of Conduct section.
- [ ] Links in the file are valid (we will create `CODE_OF_CONDUCT.md` in a later step).

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Update Security Policy
- [x] Update `SECURITY.md` to ensure it is comprehensive. (The existing file is already excellent, but we will ensure it is consistent).
- [x] Copy and paste code below into `SECURITY.md`:

```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing [security contact email]. Do **NOT** create a public GitHub issue.

We take security seriously and will respond to vulnerability reports within 48 hours.

---

## Environment Variable Management

### ✅ Secure Practices

1. **Never commit `.env` files** - All `.env` files (except `.env.example` templates) are automatically ignored by git
2. **Use `.env.example` templates** - Document required variables without exposing secrets
3. **Rotate compromised secrets immediately** - If a secret is accidentally committed, rotate it within 1 hour
4. **Use strong, unique values** - Generate cryptographically random secrets (minimum 32 characters)
5. **Limit secret access** - Use principle of least privilege for API tokens and keys

### ❌ Dangerous Practices

- Committing `.env` files to git
- Sharing secrets via Slack, email, or other plain-text channels
- Using weak or default secret values
- Reusing secrets across environments (dev, staging, production)
- Storing secrets in code comments or documentation

---

## Secret Storage Solutions

### For Local Development

- Copy `.env.example` to `.env` and fill in your secrets
- Store sensitive `.env` files in a password manager (1Password, Bitwarden, etc.)

### For Production

- **GitHub Actions**: Use GitHub Secrets (Settings → Secrets and variables → Actions)
- **Vercel**: Use Vercel Environment Variables (Project Settings → Environment Variables)
- **Recommended**: Use a dedicated secret management service:
  - [Doppler](https://www.doppler.com/)
  - [HashiCorp Vault](https://www.vaultproject.io/)
  - [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
  - [1Password Secrets Automation](https://1password.com/products/secrets/)

---

## Secret Rotation Procedures

### When to Rotate Secrets

Rotate secrets immediately if:

- A secret is committed to git (even if removed later)
- A secret is shared via insecure channel
- A team member with access leaves the project
- You suspect unauthorized access
- As part of regular security maintenance (every 90 days)

### How to Rotate Secrets

#### TURBO_TOKEN (Vercel Turbo Remote Cache)

1. Log in to [Vercel](https://vercel.com/)
2. Navigate to Account Settings → Tokens
3. Revoke the compromised token
4. Create a new token with same permissions
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `TURBO_TOKEN`
7. Update team members

#### CONTEXT7_API_KEY

1. Log in to [Context7](https://context7.com/)
2. Navigate to Settings → API Keys
3. Revoke the compromised key
4. Generate a new API key
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `CONTEXT7_API_KEY`

#### GITHUB_TOKEN

1. Log in to [GitHub](https://github.com/)
2. Navigate to Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Delete the compromised token
4. Generate a new token with required scopes: `repo`, `workflow`
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `GITHUB_TOKEN`

---

## Pre-commit Secret Scanning

This repository uses [Gitleaks](https://github.com/gitleaks/gitleaks) for automatic secret detection.

### How It Works

- Runs automatically before every commit
````

##### Step 2 Verification Checklist

- [ ] `SECURITY.md` exists and is up to date.

#### Step 2 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: Initialize Changelog

- [x] Create `CHANGELOG.md` in the root directory.
- [x] Copy and paste code below into `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive documentation structure
- Contributing guidelines
- Security policy
- Code of Conduct
- Package-level READMEs
- Architecture Decision Records (ADR) structure

### Changed

- Enhanced root README with badges and quick start guide
- Updated AGENTS.md to reference new documentation

## [0.0.0] - 2024-01-01

### Added

- Initial project setup with Turborepo
- Web workspaces (miller.pub, readon.app)
- Mobile workspace (readon)
- Shared packages (ui, ui-nativewind, utils, config-\*)
- Card stack engine (core, deck-standard)
```

##### Step 3 Verification Checklist

- [ ] `CHANGELOG.md` exists in the root directory.

#### Step 3 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: Create Code of Conduct

- [x] Create `CODE_OF_CONDUCT.md` in the root directory.
- [x] Copy and paste code below into `CODE_OF_CONDUCT.md`:

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity and
orientation.

We pledge to act and interact in ways that contribute to an open, welcoming,
diverse, inclusive, and healthy community.

## Our Standards

Examples of behavior that contributes to a positive environment for our
community include:

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes,
  and learning from the experience
- Focusing on what is best not just for us as individuals, but for the
  overall community

Examples of unacceptable behavior include:

- The use of sexualized language or imagery, and sexual attention or
  advances of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or email
  address, without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a
  professional setting

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior that they deem inappropriate, threatening, offensive,
or harmful.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.
Examples of representing our community include using an official e-mail address,
posting via an official social media account, or acting as an appointed
representative at an online or offline event.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at [INSERT EMAIL ADDRESS].
All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the
reporter of any incident.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.1, available at
[https://www.contributor-covenant.org/version/2/1/code_of_conduct.html][v2.1].

[homepage]: https://www.contributor-covenant.org
[v2.1]: https://www.contributor-covenant.org/version/2/1/code_of_conduct.html
```

##### Step 4 Verification Checklist

- [ ] `CODE_OF_CONDUCT.md` exists in the root directory.

#### Step 4 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: Enhance Root README

- [x] Update `README.md` with badges, quick start, and better structure.
- [x] Copy and paste code below into `README.md`:

````markdown
# @lellimecnar/source

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Monorepo](https://img.shields.io/badge/monorepo-turborepo-ef4444)

> A pnpm + Turborepo monorepo containing web applications (Next.js), mobile applications (Expo), shared UI libraries, and a card game engine.

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/lellimecnar/source.git
cd source
pnpm install
```
````

### 2. Start Development

```bash
pnpm dev
```

This will start all applications and packages in development mode:

- **Web:** [http://localhost:3000](http://localhost:3000) (miller.pub)
- **Web:** [http://localhost:3001](http://localhost:3001) (readon.app)
- **Mobile:** Metro bundler for Expo (readon)

## 📂 Project Structure

```
.
├── web/                 # Next.js applications
│   ├── miller.pub       # Personal portfolio
│   └── readon.app       # Reading app web interface
├── mobile/              # Mobile applications
│   └── readon           # Expo/React Native app
├── packages/            # Shared libraries
│   ├── ui               # Web UI components (shadcn/ui)
│   ├── ui-nativewind    # Mobile UI components (NativeWind)
│   ├── utils            # Shared utilities
│   └── config-*         # Shared configurations (eslint, ts, etc.)
└── card-stack/          # Domain logic
    ├── core             # Card game engine
    └── deck-standard    # Standard 52-card deck
```

## 📚 Documentation

- **[Developer Guide (AGENTS.md)](./AGENTS.md):** Primary entry point for developers and AI agents.
- **[Contributing](./CONTRIBUTING.md):** Guidelines for contributing to the project.
- **[Security](./SECURITY.md):** Security policy and secret management.
- **[Changelog](./CHANGELOG.md):** Version history.
- **[Code of Conduct](./CODE_OF_CONDUCT.md):** Community standards.

### Blueprints

- [Architecture](./Project_Architecture_Blueprint.md)
- [Folder Structure](./Project_Folders_Structure_Blueprint.md)
- [Tech Stack](./Technology_Stack_Blueprint.md)
- [Workflows](./Project_Workflow_Documentation.md)

## 🛠️ Key Commands

| Command      | Description                                        |
| ------------ | -------------------------------------------------- |
| `pnpm dev`   | Start all apps in development mode                 |
| `pnpm build` | Build all apps and packages                        |
| `pnpm test`  | Run tests across the monorepo                      |
| `pnpm lint`  | Lint all code                                      |
| `pnpm clean` | Remove all build artifacts and node_modules        |
| `pnpm ui ui` | Add a new shadcn/ui component to `@lellimecnar/ui` |

## 📄 License

MIT © [lellimecnar](https://github.com/lellimecnar)

````

##### Step 5 Verification Checklist
- [ ] `README.md` is updated with badges and quick start.
- [ ] Links in `README.md` work.

#### Step 5 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 6: Create Package READMEs - UI Libraries
- [x] Create `packages/ui/README.md`.
- [x] Copy and paste code below into `packages/ui/README.md`:

```markdown
# @lellimecnar/ui

Shared UI component library for web applications, built with [Radix UI](https://www.radix-ui.com/) and [Tailwind CSS](https://tailwindcss.com/).

## Installation

```bash
pnpm add @lellimecnar/ui
````

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

````

- [x] Create `packages/ui-nativewind/README.md`.
- [x] Copy and paste code below into `packages/ui-nativewind/README.md`:

```markdown
# @lellimecnar/ui-nativewind

Shared UI component library for mobile applications (React Native / Expo), built with [NativeWind](https://www.nativewind.dev/).

## Installation

```bash
pnpm add @lellimecnar/ui-nativewind
````

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

````

##### Step 6 Verification Checklist
- [ ] `packages/ui/README.md` exists.
- [ ] `packages/ui-nativewind/README.md` exists.

#### Step 6 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 7: Create Package READMEs - Card Stack
- [x] Create `card-stack/core/README.md`.
- [x] Copy and paste code below into `card-stack/core/README.md`:

```markdown
# @card-stack/core

Core game engine for card games, utilizing a **Mixin pattern** for flexible card behavior composition.

## Installation

```bash
pnpm add @card-stack/core
````

## Architecture

This package uses [ts-mixer](https://github.com/tannerntannern/ts-mixer) to compose card behaviors rather than relying on deep inheritance chains.

### Key Concepts

- **Card:** The base entity.
- **Mixins:** Behaviors that can be added to a card (e.g., `Flippable`, `Rankable`, `Suitable`).

## Usage

```typescript
import { Mix } from 'ts-mixer';
import { Card, Flippable, Rankable, Suitable } from '@card-stack/core';

// Create a card type that has Rank, Suit, and can be Flipped
class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) {}

const card = new StandardCard({
	rank: 'Ace',
	suit: 'Spades',
	isFaceUp: false,
});

card.flip(); // Now face up
console.log(card.rank); // 'Ace'
```

````

- [x] Create `card-stack/deck-standard/README.md`.
- [x] Copy and paste code below into `card-stack/deck-standard/README.md`:

```markdown
# @card-stack/deck-standard

Implementation of a standard 52-card deck using `@card-stack/core`.

## Installation

```bash
pnpm add @card-stack/deck-standard
````

## Usage

```typescript
import { StandardDeck } from '@card-stack/deck-standard';

const deck = new StandardDeck();
deck.shuffle();

const hand = deck.deal(5);
console.log(hand);
```

````

##### Step 7 Verification Checklist
- [ ] `card-stack/core/README.md` exists.
- [ ] `card-stack/deck-standard/README.md` exists.

#### Step 7 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 8: Create Package READMEs - Config Packages
- [x] Create `packages/config-eslint/README.md`.
- [x] Copy and paste code below into `packages/config-eslint/README.md`:

```markdown
# @lellimecnar/eslint-config

Shared ESLint configurations for the monorepo.

## Usage

In your `package.json`:

```json
{
  "devDependencies": {
    "@lellimecnar/eslint-config": "workspace:*"
  }
}
````

In your `.eslintrc.js`:

```javascript
module.exports = require('@lellimecnar/eslint-config/next'); // or 'node', 'react', 'base'
```

- [x] Create `packages/config-typescript/README.md`.
- [x] Copy and paste code below into `packages/config-typescript/README.md`:

````markdown
# @lellimecnar/typescript-config

Shared TypeScript configurations (tsconfig).

## Usage

In your `tsconfig.json`:

```json
{
	"extends": "@lellimecnar/typescript-config/next.json", // or 'base.json', 'react.json'
	"compilerOptions": {
		"paths": {
			"paths": { "*": ["./*"] },
			"@/*": ["./src/*"]
		}
	},
	"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
	"exclude": ["node_modules"]
}
```
````

````

- [x] Create `packages/config-tailwind/README.md`.
- [x] Copy and paste code below into `packages/config-tailwind/README.md`:

```markdown
# @lellimecnar/tailwind-config

Shared Tailwind CSS configuration.

## Usage

In your `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";
import baseConfig from "@lellimecnar/tailwind-config";

const config: Config = {
  ...baseConfig,
  content: [
    ...baseConfig.content,
    "./src/**/*.{ts,tsx}",
  ],
};

export default config;
````

````

##### Step 8 Verification Checklist
- [ ] `packages/config-eslint/README.md` exists.
- [ ] `packages/config-typescript/README.md` exists.
- [ ] `packages/config-tailwind/README.md` exists.

#### Step 8 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 9: Create Package READMEs - Utilities
- [x] Create `packages/utils/README.md`.
- [x] Copy and paste code below into `packages/utils/README.md`:

```markdown
# @lellimecnar/utils

Shared utility functions for the monorepo.

## Installation

```bash
pnpm add @lellimecnar/utils
````

## Usage

```typescript
import { formatDate } from '@lellimecnar/utils';

const date = formatDate(new Date(), 'yyyy-MM-dd');
```

````

##### Step 9 Verification Checklist
- [ ] `packages/utils/README.md` exists.

#### Step 9 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 10: Create Architecture Decision Records (ADR) Directory
- [x] Create directory `docs/adr`.
- [x] Create `docs/adr/template.md`.
- [x] Copy and paste code below into `docs/adr/template.md`:

```markdown
# [Short Title]

* Status: [proposed | rejected | accepted | deprecated | … | superseded by [ADR-0005](0005-example.md)]
* Deciders: [List everyone involved in the decision]
* Date: [YYYY-MM-DD]

## Context and Problem Statement

[Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.]

## Decision Drivers

* [driver 1, e.g., a force, facing concern, …]
* [driver 2, e.g., a force, facing concern, …]
* …

## Considered Options

* [option 1]
* [option 2]
* [option 3]
* …

## Decision Outcome

Chosen option: "[option 1]", because [justification. e.g., only option, which meets k.o. criterion decision driver | which resolves force force | … | comes out best (see below)].

### Positive Consequences

* [e.g., improvement of quality attribute satisfaction, follow-up decisions required, …]
* …

### Negative Consequences

* [e.g., compromising quality attribute, follow-up decisions required, …]
* …

## Pros and Cons of the Options

### [option 1]

[example | description | pointer to more information | …]

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* …

### [option 2]

[example | description | pointer to more information | …]

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* …
````

- [x] Create `docs/adr/0001-use-turborepo.md`.
- [x] Copy and paste code below into `docs/adr/0001-use-turborepo.md`:

```markdown
# Use Turborepo for Monorepo Management

- Status: accepted
- Date: 2024-01-01

## Context and Problem Statement

We need a way to manage multiple applications (web, mobile) and shared packages in a single repository efficiently. We need fast build times and easy dependency management.

## Decision Outcome

Chosen option: "Turborepo", because it provides high-performance build caching, parallel execution, and excellent support for the pnpm workspace protocol.

### Positive Consequences

- Fast CI/CD pipelines due to caching.
- Consistent tooling across workspaces.
- Easy to run tasks for specific scopes.
```

- [x] Create `docs/adr/0002-mixin-pattern-for-cards.md`.
- [x] Copy and paste code below into `docs/adr/0002-mixin-pattern-for-cards.md`:

```markdown
# Use Mixin Pattern for Card Game Engine

- Status: accepted
- Date: 2024-01-01

## Context and Problem Statement

Card games require cards to have various capabilities (flipping, ranking, suiting) that can be combined in different ways. Traditional inheritance leads to rigid hierarchies and code duplication.

## Decision Outcome

Chosen option: "TypeScript Mixins (ts-mixer)", because it allows for flexible composition of behaviors.

### Positive Consequences

- Cards can be composed of only the behaviors they need.
- Avoids "God classes" or deep inheritance trees.
- Type-safe composition.
```

##### Step 10 Verification Checklist

- [ ] `docs/adr/template.md` exists.
- [ ] `docs/adr/0001-use-turborepo.md` exists.
- [ ] `docs/adr/0002-mixin-pattern-for-cards.md` exists.

#### Step 10 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 11: Create API Documentation Structure

- [ ] Create directory `docs/api`.
- [ ] Create `docs/api/ui-components.md`.
- [ ] Copy and paste code below into `docs/api/ui-components.md`:

```markdown
# UI Components API

This document serves as an index for the UI component library API.

## @lellimecnar/ui

See [packages/ui/README.md](../../packages/ui/README.md) for usage details.

### Components

- **Button**: Standard button component.
- **Input**: Text input field.
- **...** (See package README for full list)

## @lellimecnar/ui-nativewind

See [packages/ui-nativewind/README.md](../../packages/ui-nativewind/README.md) for usage details.
```

- [ ] Create `docs/api/card-stack.md`.
- [ ] Copy and paste code below into `docs/api/card-stack.md`:

```markdown
# Card Stack API

This document serves as an index for the Card Stack engine API.

## @card-stack/core

See [card-stack/core/README.md](../../card-stack/core/README.md) for usage details.

### Core Classes

- **Card**: Base class for all cards.
- **Deck**: Base class for card collections.

### Mixins

- **Flippable**: Adds `flip()`, `isFaceUp`.
- **Rankable**: Adds `rank`.
- **Suitable**: Adds `suit`.
```

##### Step 11 Verification Checklist

- [ ] `docs/api/ui-components.md` exists.
- [ ] `docs/api/card-stack.md` exists.

#### Step 11 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 12: Update All Documentation Cross-references

- [x] Update `AGENTS.md` to reference the new documentation structure.
- [x] Copy and paste code below into `AGENTS.md` (replacing the "Monorepo Structure" section or adding to it):

```markdown
## 2. Monorepo Structure

The repository is organized into the following workspaces:

- **`web/*`**: Next.js 14+ App Router applications.
  - `miller.pub`: Personal portfolio/website.
  - `readon.app`: Reading application web interface.
- **`mobile/*`**: Expo/React Native applications.
  - `readon`: Mobile reading app using Expo Router.
- **`packages/*`**: Shared libraries and configurations.
  - `ui`: Web UI component library (React, Radix UI, Tailwind, shadcn/ui).
  - `ui-nativewind`: Mobile UI component library (NativeWind).
  - `utils`: Shared utilities (date-fns, lodash).
  - `config-*`: Shared configs (eslint, jest, prettier, tailwind, typescript).
- **`card-stack/*`**: Domain logic packages.
  - `core`: Core card game engine using TypeScript mixins.
  - `deck-standard`: Standard 52-card deck implementation.

### Documentation Map

- **[README.md](./README.md)**: Project overview and quick start.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines.
- **[SECURITY.md](./SECURITY.md)**: Security policy.
- **[CHANGELOG.md](./CHANGELOG.md)**: Version history.
- **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)**: Community standards.
- **[docs/adr](./docs/adr)**: Architecture Decision Records.
- **[docs/api](./docs/api)**: API Documentation.
```

##### Step 12 Verification Checklist

- [ ] `AGENTS.md` contains the Documentation Map.
- [ ] All links in the Documentation Map are valid.

#### Step 12 STOP & COMMIT

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
