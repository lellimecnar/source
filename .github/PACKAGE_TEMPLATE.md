# Package Template

This document defines the required structure and conventions for creating new packages in the `@lellimecnar/source` monorepo.

## Package Structure

```
packages/<package-name>/
├── AGENTS.md              # AI agent instructions (required)
├── package.json           # Package manifest (required)
├── tsconfig.json          # TypeScript configuration (required for TS packages)
├── README.md              # Package documentation (recommended)
├── src/                   # Source files
│   └── index.ts           # Main entry point
└── dist/                  # Compiled output (gitignored)
```

## Required package.json Fields

### Basic Metadata

```json
{
	"name": "@lellimecnar/<package-name>",
	"version": "0.1.0",
	"description": "Brief description of package purpose",
	"main": "./dist/index.js",
	"types": "./dist/index.d.ts"
}
```

### Required Scripts

All packages MUST include these scripts:

```json
{
	"scripts": {
		"lint": "eslint .",
		"type-check": "tsc --noEmit"
	}
}
```

### Additional Scripts by Package Type

**Library/Utility Packages:**

```json
{
	"scripts": {
		"build": "tsc",
		"test": "jest",
		"test:watch": "jest --watch"
	}
}
```

**UI Component Libraries:**

```json
{
	"scripts": {
		"build": "tailwindcss -i ./src/global.css -o ./dist/global.css",
		"dev": "tailwindcss -i ./src/global.css -o ./dist/global.css --watch"
	}
}
```

**Configuration Packages:**

```json
{
	"scripts": {
		"lint": "eslint .",
		"type-check": "tsc --noEmit"
	}
}
```

### Required Dependencies

**TypeScript Packages:**

```json
{
	"devDependencies": {
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"eslint": "^8.57.1",
		"typescript": "~5.5"
	}
}
```

**Packages with Tests:**

```json
{
	"devDependencies": {
		"@lellimecnar/jest-config": "workspace:*",
		"@types/jest": "^29.5.14",
		"jest": "^29.7.0"
	}
}
```

## TypeScript Configuration

### Base Configuration (tsconfig.json)

**For Node.js Libraries:**

```json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"paths": {
			"*": [
				"./*"
			]
		}
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"outDir": "./dist"
	},
	"include": ["src/**/*.ts"],
	"exclude": ["dist", "node_modules"]
}
```

**For React Libraries:**

```json
{
	"extends": "@lellimecnar/typescript-config/react.json",
	"compilerOptions": {
		"paths": {
			"*": ["./*"],
			"@/*": ["./src/*"]
		},
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"outDir": "./dist"
	},
	"include": ["src/**/*.ts", "src/**/*.tsx"],
	"exclude": ["dist", "node_modules"]
}
```

**For Configuration Packages:**

```json
{
	"extends": "@lellimecnar/typescript-config",
	"compilerOptions": {
		"paths": {
			"*": ["./*"]
		},
		"module": "NodeNext",
		"moduleResolution": "NodeNext"
	},
	"include": ["**/*.ts", "*.js", ".*.js"],
	"exclude": ["node_modules"]
}
```

## AGENTS.md Template

Every package MUST include an `AGENTS.md` file for AI context:

```markdown
# AGENTS.md - <Package Name>

## Package Overview

**Name:** `@lellimecnar/<package-name>`
**Type:** [Library | Config | Utility | UI Component]
**Purpose:** [One-sentence description]

## Key Files

- `src/index.ts` - Main entry point
- [List other important files]

## Development Commands

\`\`\`bash

# Type check

pnpm --filter @lellimecnar/<package-name> type-check

# Lint

pnpm --filter @lellimecnar/<package-name> lint

# Test (if applicable)

# Run unit tests via #tool:execute/runTests (preferred)

# Build (if applicable)

pnpm --filter @lellimecnar/<package-name> build
\`\`\`

## Dependencies

### Internal Dependencies

- [List workspace dependencies]

### External Dependencies

- [List major external dependencies with purpose]

## Architecture Notes

[Brief description of package architecture, patterns used, or important implementation details]

## Testing Strategy

[If applicable, describe testing approach and coverage expectations]
```

## Workspace Configuration

Add new package to `pnpm-workspace.yaml` if creating a new workspace category:

```yaml
packages:
	- 'packages/card-stack/*'
  - 'packages/*'
  - 'web/*'
  - 'mobile/*'
  - 'your-new-category/*' # Add this line if creating new category
```

## Checklist for New Packages

- [ ] Package follows directory structure template
- [ ] `package.json` includes all required fields and scripts
- [ ] `tsconfig.json` extends appropriate base configuration
- [ ] `AGENTS.md` provides comprehensive package documentation
- [ ] Package name follows `@lellimecnar/<name>` convention
- [ ] All workspace dependencies use `workspace:*` protocol
- [ ] Scripts `lint` and `type-check` are present
- [ ] Package is added to appropriate workspace in `pnpm-workspace.yaml`
- [ ] Package builds without errors: `pnpm --filter <package> build`
- [ ] Package passes type checking: `pnpm --filter <package> type-check`
- [ ] Package passes linting: `pnpm --filter <package> lint`
- [ ] Package is documented in root `AGENTS.md` if necessary

## Integration Testing

After creating a new package:

```bash
# Install dependencies
pnpm install

# Type check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Test the specific package works in isolation
pnpm --filter @lellimecnar/<package-name> type-check
pnpm --filter @lellimecnar/<package-name> lint
```

## Notes

- Use `workspace:*` protocol for all internal dependencies
- Version all packages as `0.1.0` initially
- Mark packages as `"private": true` if not intended for npm publishing
- Follow existing naming conventions for consistency
- Update root `AGENTS.md` if package introduces new patterns or conventions
