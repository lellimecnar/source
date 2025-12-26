# polymix Package - AI Agent Instructions

## Package Overview

**polymix** is a next-generation TypeScript mixin library that solves limitations of existing libraries like `ts-mixer` and `typescript-mix`.

## Key Features

- **True `instanceof` support** via `Symbol.hasInstance`
- **No mixin limit** - variadic generics allow unlimited mixins
- **9 composition strategies** - control how methods merge
- **Decorator support** - `@mixin`, `@delegate`, `@abstract`, strategy decorators
- **Decorator metadata inheritance** - supports both `Symbol.metadata` and `reflect-metadata`

## Architecture

### Source Files

| File                | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `src/types.ts`      | Core TypeScript types (`Constructor`, `MixedClass`, etc.)                |
| `src/utils.ts`      | Registry, instance checks, metadata copying, helper functions            |
| `src/strategies.ts` | Method composition strategies (pipe, merge, parallel, etc.)              |
| `src/core.ts`       | Main `mix()` and `mixWithBase()` functions                               |
| `src/decorators.ts` | All decorators (`@mixin`, `@delegate`, `@abstract`, strategy decorators) |
| `src/index.ts`      | Public API exports                                                       |

### Key Concepts

1. **Mixin Registry**: A `WeakMap` storing which mixins were applied to each instance
2. **Symbol.hasInstance**: Installed on each mixin class to enable `instanceof` checks
3. **Strategy Symbol Keys**: `Symbol.for('polymix:strategy:methodName')` stores strategy per method
4. **MIXIN_METADATA**: `WeakMap` storing metadata like `isAbstract` and strategy mappings

## Development Commands

```bash
# Build (uses tsconfig.build.json to exclude tests)
pnpm --filter polymix build

# Run tests
pnpm --filter polymix test

# Type check (uses main tsconfig.json)
pnpm --filter polymix type-check

# Lint
pnpm --filter polymix lint
```

## Testing Strategy

- `core.spec.ts` - Tests for `mix()`, `mixWithBase()`, base class handling, edge cases
- `strategies.spec.ts` - Unit tests for `applyStrategy()` function
- `decorators.spec.ts` - Tests for all decorators and strategy decorator integration
- `__tests__/polymix.spec.ts` - Integration tests with complex real-world usage

## Important Implementation Notes

1. **Base Class Heuristic**: `mix()` treats the last class as a base if it has constructor parameters
2. **Abstract Mixins**: Marked via `@abstract`, their constructors are NOT called during instantiation
3. **Constructor Error Handling**: If a mixin constructor throws, composition continues (try/catch in core.ts)
4. **Decorator Metadata**: Supports both TypeScript 5.2+ `Symbol.metadata` and legacy `reflect-metadata`

## Not Implemented (Stretch Goals from DESIGN.md)

- `@onMix` / `@onConstruct` lifecycle hooks
- `@resolve` decorator for explicit conflict resolution
- Symbol-based mixin access (`this[Mixin].method()`)
- Compile-time conflict detection
