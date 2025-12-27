# @lellimecnar/tailwind-config

Shared Tailwind CSS configuration.

## Usage

In your `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';
import baseConfig from '@lellimecnar/tailwind-config';

const config: Config = {
	...baseConfig,
	content: [...baseConfig.content, './src/**/*.{ts,tsx}'],
};

export default config;
```
