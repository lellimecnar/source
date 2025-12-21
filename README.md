# @lellimecnar/source

A modular **TypeScript Monorepo** unifying web and mobile development with a shared card game engine. This repository implements a strict architectural boundary between application logic, user interface components, and core domain logic, managed by **pnpm** and **Turborepo**.

## 🚀 Technology Stack

This project utilizes a modern full-stack ecosystem:

- **Core**: TypeScript (~5.5), Node.js (^20), pnpm (9.12.2), Turborepo
- **Web**: Next.js 15+ (App Router), React 18
- **Mobile**: Expo 52 (Expo Router), React Native 0.76
- **Styling**: Tailwind CSS (Web), NativeWind (Mobile), shadcn/ui
- **Domain**: ts-mixer (Mixin Composition)
- **Testing**: Jest 29

## 🏗️ Project Architecture

The architecture is designed to maximize code sharing while keeping business logic framework-agnostic.

- **Presentation Layer**: Thin consumers (`web/*`, `mobile/*`) handling routing and layout.
- **Interface Layer**: Shared UI libraries (`packages/ui`, `packages/ui-nativewind`) providing a consistent design system.
- **Domain Layer**: Pure TypeScript packages (`card-stack/*`) encapsulating game rules and entities using mixin composition.
- **Infrastructure Layer**: Shared configurations and utilities (`packages/config-*`, `packages/utils`).

## 🏁 Getting Started

### Prerequisites
- **Node.js**: ^20
- **pnpm**: ^9 (Strictly enforced)

### Installation
```bash
# Install dependencies
pnpm install
```

### Development
Start all development servers (Web, Mobile, UI watch mode):
```bash
pnpm dev
```

### Build
Build all packages and applications:
```bash
pnpm build
```

## 📂 Project Structure

```
.
├── card-stack/                 # Domain-specific logic (Game Engine)
│   ├── core/                   # Core entities (Card, Deck, Player)
│   └── deck-standard/          # Standard 52-card deck
├── mobile/                     # Mobile applications
│   └── readon/                 # Expo/React Native app
├── packages/                   # Shared libraries and configs
│   ├── config-*/               # Shared configs (ESLint, TS, Tailwind)
│   ├── ui/                     # Web UI (shadcn/ui + Tailwind)
│   ├── ui-nativewind/          # Mobile UI (NativeWind)
│   └── utils/                  # Shared utilities
└── web/                        # Web applications
    ├── miller.pub/             # Personal site (Next.js)
    └── readon.app/             # Reading app (Next.js)
```

## ✨ Key Features

- **Unified Styling**: Shared design tokens and mental models across Web (Tailwind) and Mobile (NativeWind).
- **Domain Isolation**: Core game logic is decoupled from any UI framework, ensuring testability and portability.
- **Granular Exports**: UI libraries use granular exports to enable effective tree-shaking.
- **Mixin Composition**: Complex domain entities are composed using `ts-mixer` rather than deep inheritance chains.
- **Shared Configuration**: Centralized tooling config ensures consistent code quality across the monorepo.

## 🔄 Development Workflow

### Workspace Management
Always run commands from the root using `pnpm --filter`:
```bash
pnpm --filter miller.pub dev
pnpm --filter @card-stack/core test
```

### UI Component Development
To add a new component to the Web UI library:
```bash
pnpm ui ui add [component-name]
```

## 📏 Coding Standards

- **Imports**: Use granular imports for UI components (e.g., `import { Button } from '@lellimecnar/ui/button'`).
- **Routing**: Follow file-based routing conventions in `app/` directories for both Next.js and Expo.
- **State Management**: Prefer Server Components for data fetching in Next.js.
- **Type Safety**: Strict TypeScript mode is enabled. Avoid `any`.

## 🧪 Testing

Unit tests are co-located with source files (`*.spec.ts`) and run via Jest.

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @card-stack/core test
```

## 🤝 Contributing

Please refer to [AGENTS.md](./AGENTS.md) for detailed developer guidelines, command references, and AI agent instructions.

## 📄 License

Private Repository. All rights reserved.
