This file provides guidance when working with code in the `@lellimecnar/utils` package.

## Package Overview

`@lellimecnar/utils` is a shared utility package that provides common helper functions and utilities used across the monorepo. It primarily re-exports and wraps functionality from `lodash` and `date-fns`.

## Tech Stack

- **Utilities**: lodash 4.x, date-fns 4.x
- **TypeScript**: ~5.5

## Package Structure

```
src/
├── dates.ts              # date-fns utilities and configuration
├── lodash.ts             # lodash utilities and custom helpers
└── index.ts              # Main package exports
```

## Development Commands

```bash
# Lint code
pnpm utils lint
```

## Package Exports

The package exports utilities from a single entry point:

```typescript
import {
	// date-fns functions
	format,
	parseISO,
	// lodash functions
	chunk,
	groupBy,
	shuffle,
	// custom utilities
	pascalCase,
	randomIndexes,
} from '@lellimecnar/utils';
```

## Dependencies

### Runtime Dependencies

- `date-fns` ^4 - Date manipulation library
- `lodash` ^4 - Utility library

### Development Dependencies

- `@types/lodash` - TypeScript types for lodash
- `@types/lodash-es` - Additional lodash types
- `typescript` ~5.5

## Key Features

### Date Utilities (`dates.ts`)

- Re-exports all functions from `date-fns`
- Sets default locale to `enUS` (English US)
- All date-fns functions are available:
  ```typescript
  import { format, parseISO, addDays, subMonths } from '@lellimecnar/utils';
  ```

### Lodash Utilities (`lodash.ts`)

- Re-exports commonly used lodash functions
- Provides custom utility functions
- Exports TypeScript types from lodash

#### Available Lodash Functions

- `camelCase` - Convert to camelCase
- `chunk` - Split array into chunks
- `find`, `findIndex` - Find elements
- `findLast`, `findLastIndex` - Find from end
- `flatten` - Flatten nested arrays
- `flow` - Function composition
- `forEachRight` - Iterate in reverse
- `groupBy` - Group by key
- `nth` - Get nth element
- `orderBy` - Sort with multiple criteria
- `pull`, `pullAt` - Remove elements
- `reduceRight` - Reduce from right
- `remove` - Remove matching elements
- `sampleSize` - Random sample
- `shuffle` - Shuffle array
- `take`, `takeRight` - Take elements
- `upperFirst` - Capitalize first letter
- `memoize` - Memoization utility

#### Custom Utilities

- `pascalCase` - Convert to PascalCase (uses `flow(camelCase, upperFirst)`)
- `randomIndexes` - Get random array indexes
  ```typescript
  randomIndexes([1, 2, 3, 4, 5], 2); // Returns random 2 indexes
  ```

### TypeScript Types

The package exports lodash types:

```typescript
import type { Dictionary, List, ListIteratee } from '@lellimecnar/utils';
```

## Usage Examples

### Date Manipulation

```typescript
import { format, parseISO, addDays } from '@lellimecnar/utils';

const date = parseISO('2024-01-01');
const formatted = format(date, 'yyyy-MM-dd');
const future = addDays(date, 7);
```

### Array Utilities

```typescript
import { chunk, groupBy, shuffle, pascalCase } from '@lellimecnar/utils';

// Chunk array
const chunks = chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Group by property
const grouped = groupBy(users, 'role');

// Shuffle array
const shuffled = shuffle([1, 2, 3, 4, 5]);

// Convert to PascalCase
const pascal = pascalCase('hello world'); // 'HelloWorld'
```

## Architecture Notes

### Tree-Shaking

- Functions are imported individually from lodash (e.g., `import chunk from 'lodash/chunk'`)
- This enables better tree-shaking in consuming applications
- Only used functions are included in the final bundle

### Locale Configuration

- `date-fns` default locale is set to `enUS` in `dates.ts`
- This ensures consistent date formatting across the monorepo
- Can be overridden in consuming applications if needed

### Custom Utilities

- Custom utilities are kept minimal and focused
- `pascalCase` is a composition of existing lodash functions
- `randomIndexes` provides a convenient wrapper for random sampling

## Adding New Utilities

1. Determine if it should go in `dates.ts` or `lodash.ts` (or create new file)
2. Import the function/library you need
3. Re-export it from the appropriate file
4. Export from `src/index.ts`:
   ```typescript
   export * from './dates';
   export * from './lodash';
   export * from './new-file'; // if creating new file
   ```

### Guidelines

- Prefer re-exporting from established libraries (lodash, date-fns) over custom implementations
- Keep custom utilities simple and well-documented
- Ensure TypeScript types are properly exported
- Consider tree-shaking when adding new exports

## Notes

- Package is private (not published)
- Uses workspace dependencies
- All functions maintain their original API from source libraries
- TypeScript types are properly exported
- Designed for use across all packages in the monorepo
