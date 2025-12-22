# Utilities API

This document covers shared utility functions in `@lellimecnar/utils`.

## `formatDate`

Formats a date object into a string.

### Parameters

- **`date`**: `Date` - The date to format.
- **`formatString`**: `string` - The format string (e.g., 'yyyy-MM-dd').

### Returns

- `string` - The formatted date string.

### Usage

```typescript
import { formatDate } from '@lellimecnar/utils';

const formatted = formatDate(new Date(), 'MM/dd/yyyy');
```
