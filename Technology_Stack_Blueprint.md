# Technology Stack Blueprint

## 1. Technology Identification Phase

This project is a **TypeScript Monorepo** utilizing a modern full-stack JavaScript/TypeScript ecosystem. It unifies web and mobile development under a single repository structure managed by **pnpm** and **Turborepo**.

### Core Stack Overview

- **Language**: TypeScript (~5.5)
- **Runtime**: Node.js (^24)
- **Package Manager**: pnpm (9.12.2)
- **Build System**: Turborepo (^2.6.1)
- **Web Framework**: Next.js (^15.2.3)
- **Mobile Framework**: Expo (~52.0.14) / React Native (0.76.3)
- **UI Styling**: Tailwind CSS (^3.4.17) / NativeWind (^4.2.1)
- **Testing**: Jest (^29)
- **Linting/Formatting**: ESLint (^8), Prettier (^3.6.2)

## 2. Core Technologies Analysis

### JavaScript/TypeScript Stack

- **TypeScript**: The primary language for all workspaces. Configured via shared `packages/config-typescript` to ensure strict type safety across the monorepo.
- **Node.js**: The execution environment for development tools, build scripts, and the Next.js server.
- **pnpm**: Used for efficient dependency management and workspace support. Enforces strict peer dependency resolution.
- **Turborepo**: Orchestrates build, lint, and test tasks, providing caching and parallel execution to speed up CI/CD and local development.

### React Stack

- **React**: Version ^18.3.1 is used across both web and mobile.
- **Next.js**: Version ^15.2.3 (App Router) powers the web applications (`miller.pub`, `readon.app`). It leverages React Server Components (RSC).
- **Expo**: Version ~52.0.14 powers the mobile application (`readon`). It uses **Expo Router** (~4.0.11) for file-based routing, mirroring the Next.js App Router pattern.
- **React Native**: Version 0.76.3 provides the native rendering capabilities for mobile.

### UI & Styling Stack

- **Tailwind CSS**: Version ^3.4.17 is the utility-first CSS framework used for web styling.
- **NativeWind**: Version ^4.2.1 brings Tailwind CSS patterns to React Native, allowing shared styling concepts between web and mobile.
- **shadcn/ui**: The web UI library (`@lellimecnar/ui`) is built using Radix UI primitives and styled with Tailwind, following the copy-paste component architecture pattern.

### Domain Logic Stack

- **ts-mixer**: Version ^6.0.4 is used in `@card-stack/core` to implement mixin patterns for complex game entity behaviors (e.g., `Mix(Card, Flippable)`).
- **Jest**: Version ^29 is the test runner for unit and integration tests, configured via `packages/config-jest`.

## 3. Implementation Patterns & Conventions

### Naming Conventions

- **Files**:
  - Components: `PascalCase.tsx` (e.g., `Button.tsx`)
  - Utilities: `camelCase.ts` (e.g., `utils.ts`)
  - Next.js/Expo Routes: `page.tsx`, `layout.tsx`, `_layout.tsx` (framework specific)
- **Directories**: `kebab-case` (e.g., `card-stack`, `ui-nativewind`)
- **Variables/Functions**: `camelCase`
- **Types/Interfaces**: `PascalCase`

### Code Organization

- **Monorepo Structure**:
  - `apps/` (or `web/`, `mobile/`): End-user applications.
  - `packages/`: Shared libraries and configurations.
  - `card-stack/`: Domain-specific business logic.
- **Workspace Dependencies**: Internal packages are referenced via `workspace:*` protocol to ensure the latest local version is always used.
- **Granular Exports**: The UI package exports components individually (e.g., `@lellimecnar/ui/button`) to enable tree-shaking and avoid circular dependencies.

### Common Patterns

- **Shared Configuration**: ESLint, TypeScript, and Tailwind configs are shared packages (`@lellimecnar/config-*`) extended by apps and libraries.
- **Transpilation**: Next.js apps use `transpilePackages` to consume local TypeScript packages (`@lellimecnar/ui`) directly without a separate build step for the package.
- **Mixin Pattern**: The card game engine uses `ts-mixer` to compose behaviors rather than deep class inheritance.

## 4. Usage Examples

### API Implementation (Next.js Route Handler)

```typescript
// web/miller.pub/src/app/api/hello/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
	return NextResponse.json({ message: 'Hello World' });
}
```

### UI Component (shadcn/ui Pattern)

```typescript
// packages/ui/src/components/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Service Layer (Card Stack Mixin)

```typescript
// card-stack/core/src/card/standard-card.ts
import { Mix } from 'ts-mixer';
import { Card } from './card';
import { Flippable } from './behaviors/flippable';
import { Rankable } from './behaviors/rankable';
import { Suitable } from './behaviors/suitable';

export class StandardCard extends Mix(Card, Flippable, Rankable, Suitable) {
	constructor(rank: string, suit: string) {
		super();
		this.rank = rank;
		this.suit = suit;
	}
}
```

## 5. Technology Stack Map

### Core Framework Usage

- **Next.js**: Used for Server-Side Rendering (SSR) and Static Site Generation (SSG). Configured with `next.config.js`.
- **Expo**: Used for cross-platform mobile development. Configured with `app.config.ts`.

### Integration Points

- **Workspace Protocol**: `pnpm` links packages locally.
- **NativeWind**: Bridges Tailwind classes to React Native stylesheets.

### Development Tooling

- **VS Code**: Recommended IDE with ESLint and Prettier extensions.
- **Turborepo**: Runs `build`, `lint`, `test` tasks.
- **Jest**: Runs tests.

### Infrastructure

- **Docker**: `Dockerfile` exists for web apps (`miller.pub`, `readon.app`) for containerized deployment.

## 6. Technology-Specific Implementation Details

### React Implementation

- **Component Structure**: Functional components with Hooks are the standard.
- **State Management**:
  - **Local**: `useState`, `useReducer`.
  - **Global**: React Context (e.g., ThemeProvider).
  - **Server State**: Next.js data fetching (Server Components).
- **Styling Approach**:
  - **Web**: Tailwind CSS classes (`className="p-4 bg-blue-500"`).
  - **Mobile**: NativeWind classes (`className="p-4 bg-blue-500"`).
  - **Utility**: `cn()` helper (clsx + tailwind-merge) is used to conditionally apply classes.

### .NET Implementation Details

_Not Detected_

## 7. Blueprint for New Code Implementation

### File/Class Templates

**New React Component:**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

interface ComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  // custom props
}

export function Component({ className, ...props }: ComponentProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {/* content */}
    </div>
  )
}
```

**New Next.js Page:**

```typescript
export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Page Title</h1>
    </main>
  )
}
```

### Implementation Checklist

1.  **Define Requirements**: Identify if the feature is web-only, mobile-only, or shared.
2.  **Create Shared Logic**: If shared, implement in `packages/utils` or a new package.
3.  **Create UI Components**: If reusable, implement in `@lellimecnar/ui` (web) or `@lellimecnar/ui-nativewind` (mobile).
4.  **Implement Feature**: Build the feature in the respective app (`web/*` or `mobile/*`).
5.  **Test**: Write unit tests (`.spec.ts`) and run them via `#tool:execute/runTests`.
6.  **Lint & Format**: Run `pnpm lint` and `pnpm format`.

## 8. Technology Relationship Diagrams

```mermaid
graph TD
    subgraph "Apps"
        Web[Web Apps (Next.js)]
        Mobile[Mobile App (Expo)]
    end

    subgraph "UI Libraries"
        WebUI[@lellimecnar/ui (shadcn/ui)]
        MobileUI[@lellimecnar/ui-nativewind]
    end

    subgraph "Core Logic"
        CardStack[Card Stack Packages]
        Utils[@lellimecnar/utils]
    end

    subgraph "Configuration"
        Configs[@lellimecnar/config-*]
    end

    Web --> WebUI
    Web --> Utils
    Web --> CardStack
    Mobile --> MobileUI
    Mobile --> Utils
    Mobile --> CardStack

    WebUI --> Configs
    MobileUI --> Configs
    CardStack --> Configs
    Utils --> Configs
    Web --> Configs
    Mobile --> Configs
```

## 9. Technology Decision Context

- **Monorepo (Turborepo + pnpm)**: Chosen to manage multiple apps and shared packages efficiently, ensuring code reuse and consistent tooling.
- **Next.js & Expo**: Selected to provide a unified React development experience across web and mobile, sharing knowledge and potentially code.
- **Tailwind CSS & NativeWind**: Chosen for a consistent styling API across platforms.
- **shadcn/ui**: Adopted for its accessibility, customization (copy-paste architecture), and modern design aesthetic.
- **ts-mixer**: Used in the card game engine to allow for flexible composition of card behaviors, avoiding the rigidity of deep inheritance hierarchies.

---

_Last Updated: December 21, 2025_
