# Project Architecture Blueprint

## 1. Architecture Detection and Analysis

This project implements a **Modular Monorepo Architecture** using **TypeScript**, **pnpm workspaces**, and **Turborepo**. It unifies web and mobile development patterns while enforcing strict boundaries between application logic, user interface components, and core domain logic.

### Key Architectural Patterns

- **Component-Based Architecture**: UI is composed of reusable, self-contained components managed in shared libraries (`@lellimecnar/ui`, `@lellimecnar/ui-nativewind`).
- **Domain-Centric Design**: Core business logic (specifically the card game engine) is isolated in pure TypeScript packages (`card-stack/*`), decoupled from any presentation framework (React/Next.js/Expo).
- **Mixin Composition**: The domain layer utilizes a mixin pattern (via `ts-mixer`) for entity composition, favoring flexibility over rigid inheritance hierarchies.
- **File-System Routing**: Both web (Next.js) and mobile (Expo) applications utilize file-system based routing patterns for consistency.

## 2. Architectural Overview

The architecture is designed to maximize code sharing and consistency between Web and Mobile platforms while keeping the core business logic framework-agnostic.

### Guiding Principles

1.  **Write Once, Share Logic**: Utility functions and domain logic are written in pure TypeScript and shared across all platforms.
2.  **Unified Styling**: Tailwind CSS (Web) and NativeWind (Mobile) provide a unified styling API, allowing for shared design tokens and mental models.
3.  **Strict Boundaries**: Applications (`web/*`, `mobile/*`) are thin consumers of the shared packages. They primarily handle routing, layout, and wiring data to components.
4.  **Configuration as Code**: Tooling configuration (ESLint, TypeScript, Jest) is centralized and shared to enforce consistent quality standards.

## 3. Architecture Visualization

### High-Level Component Interaction

```mermaid
graph TD
    subgraph "Presentation Layer (Apps)"
        WebApp[Web Apps (Next.js)]
        MobileApp[Mobile App (Expo)]
    end

    subgraph "Interface Layer (Shared UI)"
        WebUI[@lellimecnar/ui]
        MobileUI[@lellimecnar/ui-nativewind]
    end

    subgraph "Domain Layer (Business Logic)"
        CardCore[@card-stack/core]
        DeckStd[@card-stack/deck-standard]
    end

    subgraph "Infrastructure Layer (Shared)"
        Utils[@lellimecnar/utils]
        Configs[Config Packages]
    end

    WebApp --> WebUI
    WebApp --> Utils
    WebApp --> CardCore
    WebApp --> DeckStd

    MobileApp --> MobileUI
    MobileApp --> Utils
    MobileApp --> CardCore
    MobileApp --> DeckStd

    WebUI --> Utils
    MobileUI --> Utils

    CardCore --> Utils
    DeckStd --> CardCore

    %% Configuration Dependencies
    WebApp -.-> Configs
    MobileApp -.-> Configs
    WebUI -.-> Configs
    MobileUI -.-> Configs
    CardCore -.-> Configs
    Utils -.-> Configs
```

## 4. Core Architectural Components

### Presentation Layer (Applications)

- **Purpose**: Handles user interaction, routing, and platform-specific integration.
- **Components**:
  - `web/miller.pub`, `web/readon.app`: Next.js App Router applications.
  - `mobile/readon`: Expo Router application.
- **Interaction**: Consumes UI components and Domain services. Manages application state and data fetching.

### Interface Layer (UI Libraries)

- **Purpose**: Provides a consistent, branded design system.
- **Components**:
  - `packages/ui`: Web components built with Radix UI and Tailwind.
  - `packages/ui-nativewind`: Mobile components built with NativeWind.
- **Pattern**: "Copy-paste" architecture (shadcn/ui style) where components are owned by the codebase, not an external npm dependency, allowing full control.

### Domain Layer (Card Stack)

- **Purpose**: Encapsulates the rules and entities of the card game domain.
- **Components**:
  - `card-stack/core`: Defines `Card`, `Deck`, `Player` and behaviors (`Flippable`, `Rankable`).
  - `card-stack/deck-standard`: Implements specific deck types.
- **Pattern**: **Mixin Composition**. Entities are composed of behaviors.
  - _Example_: `class StandardCard extends Mix(Card, Flippable, Rankable)`

### Infrastructure Layer

- **Purpose**: Provides cross-cutting utilities and development tooling configuration.
- **Components**:
  - `packages/utils`: Shared helpers (date, string manipulation).
  - `packages/config-*`: Shared configs for ESLint, TS, Jest, Tailwind.

## 5. Architectural Layers and Dependencies

The project follows a strict dependency flow:

1.  **App Layer** (Top): Depends on everything below.
2.  **UI Layer**: Depends on Utils and Configs. Independent of Domain (mostly).
3.  **Domain Layer**: Depends on Utils and Configs. Strictly independent of UI and Apps.
4.  **Infrastructure Layer** (Bottom): No internal dependencies (except other infra).

**Enforcement**:

- `pnpm` workspace protocol ensures explicit dependency declaration.
- `tsconfig` references and `transpilePackages` (Next.js) manage build-time boundaries.

## 6. Data Architecture

- **Domain Models**: Defined in `card-stack/core` using TypeScript classes and interfaces.
- **State Management**:
  - **Apps**: React Context and Hooks (`useState`, `useReducer`) for UI state.
  - **Domain**: The `card-stack` entities encapsulate their own state (e.g., a `Deck` manages its list of `Card`s).
- **Data Flow**: Unidirectional data flow (React pattern). Apps instantiate Domain objects and pass data down to UI components.

## 7. Cross-Cutting Concerns Implementation

- **Styling**:
  - **Pattern**: Utility-first CSS.
  - **Implementation**: Tailwind CSS (Web) and NativeWind (Mobile).
  - **Sharing**: `packages/config-tailwind` exports the base configuration (colors, fonts) used by all workspaces.

- **Testing**:
  - **Pattern**: Co-located Unit Tests.
  - **Implementation**: Jest.
  - **Config**: `packages/config-jest` provides presets for Node, React, and React Native environments.

- **Linting & Formatting**:
  - **Implementation**: ESLint and Prettier.
  - **Config**: `packages/config-eslint` and `packages/config-prettier` ensure code style consistency across the monorepo.

## 8. Service Communication Patterns

- **Internal (Package-to-Package)**: Direct function calls via module imports.
  - _Example_: `import { Button } from '@lellimecnar/ui/button'`
- **Client-Server (Web)**: Next.js Route Handlers (`app/api/...`) serve as the backend-for-frontend (BFF).
- **Mobile-Server**: The mobile app consumes APIs (potentially the Next.js APIs or external services).

## 9. Technology-Specific Architectural Patterns

### React / Next.js Patterns

- **Server Components (RSC)**: Used for data fetching and layout in `web/*`.
- **Client Components**: Used for interactivity (forms, buttons) and marked with `'use client'`.
- **Granular Imports**: UI components are imported individually to enable tree-shaking.

### Expo / React Native Patterns

- **File-Based Routing**: Uses `expo-router` to mirror the Next.js routing structure (`app/(tabs)`, `app/_layout.tsx`).
- **NativeWind**: Allows using `className` props on React Native components, unifying the styling DX with web.

### TypeScript Patterns

- **Mixins**: The `ts-mixer` library is used to simulate multiple inheritance for game entities, allowing flexible composition of card capabilities.

## 10. Implementation Patterns

### Mixin Implementation (Domain)

Instead of a deep inheritance tree (e.g., `Entity -> Card -> RankCard -> SuitCard`), the project uses mixins:

```typescript
// Composition over Inheritance
export class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) { ... }
```

### UI Component Implementation

Components follow the "Headless UI + Tailwind" pattern:

1.  **Structure**: Radix UI primitives (accessible, unstyled).
2.  **Style**: Tailwind CSS classes via `class-variance-authority` (cva) for variants.
3.  **Utility**: `cn()` helper for class merging.

## 11. Testing Architecture

- **Unit Tests**: Located alongside source files (`*.spec.ts`).
  - _Focus_: Domain logic (`card-stack`), Utility functions.
- **Component Tests**: Located alongside components.
  - _Focus_: Rendering, interaction, accessibility.
- **Tooling**: Jest is the primary runner. `turbo test` runs tests across all affected packages.

## 12. Deployment Architecture

- **Web**: Dockerized Next.js applications.
  - `Dockerfile` in each web app directory.
  - Built using `turbo build` to handle workspace dependencies.
- **Mobile**: Expo Application Services (EAS) or local build.
  - Builds native binaries (APK/IPA).

## 13. Extension and Evolution Patterns

- **Adding Features**:
  1.  **Domain**: Add logic to `card-stack` if it's a core rule.
  2.  **UI**: Add reusable components to `packages/ui` if generic.
  3.  **App**: Assemble in `web` or `mobile` app.
- **New Apps**: Can be added to `web/` or `mobile/` and immediately leverage existing UI and Domain packages.

## 14. Architectural Pattern Examples

### Layer Separation (UI vs Logic)

**Domain Logic (Pure TS):**

```typescript
// card-stack/core/src/card/card.ts
export class Card {
	public id: string;
	constructor() {
		this.id = generateId();
	}
}
```

**UI Component (React + Tailwind):**

```typescript
// packages/ui/src/components/playing-card.tsx
import { Card } from "@card-stack/core";

interface PlayingCardProps {
  card: Card;
}

export function PlayingCard({ card }: PlayingCardProps) {
  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      {/* Rendering logic */}
    </div>
  );
}
```

## 15. Architecture Governance

- **Dependency Enforcement**: `pnpm` prevents phantom dependencies.
- **Linting**: `eslint` enforces import orders and best practices.
- **Type Safety**: Strict `tsconfig` settings prevent type leakage between layers.
- **CI Pipeline**: `turbo` ensures that changes in shared packages trigger tests/builds in dependent apps.

## 16. Blueprint for New Development

### Development Workflow

1.  **Identify Scope**: Does this change affect Core Logic, UI, or just one App?
2.  **Implement Lower Layers First**:
    - Update `card-stack` or `utils` first.
    - Update `ui` packages next.
3.  **Integrate in App**:
    - Update the App to use the new package versions.
4.  **Verify**: Run `pnpm test` and `pnpm lint`.

### Common Pitfalls

- **Direct Imports**: Avoid importing from `../../packages/ui/src/...`. Always use the package name `@lellimecnar/ui`.
- **Leaking UI into Domain**: Never import React or UI libraries into `card-stack/*`.
- **Circular Dependencies**: Do not have `packages/ui` depend on `web/*`.

---

_Generated: December 21, 2025_
