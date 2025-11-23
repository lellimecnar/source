This file provides guidance when working with code in the `@lellimecnar/tailwind-config` package.

## Package Overview

`@lellimecnar/tailwind-config` is a shared Tailwind CSS configuration package that provides consistent styling settings across the monorepo. It includes theme customization, plugins, and CSS variable-based theming for dark mode support.

## Tech Stack

- **CSS Framework**: Tailwind CSS ^3
- **Plugins**: 
  - @tailwindcss/typography - Typography plugin
  - tailwindcss-animate - Animation utilities
  - tailwindcss-opentype - OpenType features
- **TypeScript**: ~5.5

## Package Structure

```
.
├── tailwind.config.ts    # Tailwind CSS configuration
└── package.json          # Package configuration
```

## Development Commands

```bash
# Lint this package
pnpm config-tailwind lint
```

## Package Exports

The package exports a Tailwind configuration:

```typescript
// In tailwind.config.ts
import tailwindConfig from '@lellimecnar/tailwind-config'

export default {
  ...tailwindConfig,
  content: [
    // Your content paths
    './src/**/*.{js,ts,jsx,tsx}',
  ],
}
```

## Dependencies

### Development Dependencies
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `@tailwindcss/typography` - Typography plugin
- `tailwindcss` ^3 - Tailwind CSS framework
- `tailwindcss-animate` - Animation utilities
- `tailwindcss-opentype` - OpenType font features

### Peer Dependencies
- `tailwindcss` ^3
- `typescript` ~5.5

## Configuration Details

### Theme Configuration
- **Dark Mode**: Class-based (`darkMode: ['class']`)
- **Container**: Centered with 2rem padding, max-width 1400px at 2xl breakpoint
- **Colors**: CSS variable-based theming system:
  - `border`, `input`, `ring` - UI element colors
  - `background`, `foreground` - Base colors
  - `primary`, `secondary`, `destructive`, `muted`, `accent` - Semantic colors
  - `popover`, `card` - Component colors
  - All colors use HSL format with CSS variables
- **Border Radius**: CSS variable-based (`--radius`)
- **Font Family**: CSS variable-based (`--font-sans`)
- **Animations**: Accordion animations for collapsible components
- **Background Images**: Glow conic gradient

### Plugins
- `tailwindcss-animate` - Provides animation utilities
- `tailwindcss-opentype` - OpenType font features
- `@tailwindcss/typography` - Typography styles for prose content

### Safelist
- Width and height utilities (0-23)
- Grid columns and columns utilities (0-99)
- Ensures these classes are always available even if not detected in content

## Usage in Consuming Packages

### Tailwind Configuration
Create or update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'
import tailwindConfig from '@lellimecnar/tailwind-config'

const config: Config = {
  ...tailwindConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    // Add paths to your components
  ],
}

export default config
```

### CSS Variables Setup
In your global CSS file, define the CSS variables:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... other variables */
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}
```

## Architecture Notes

### CSS Variables Theming
- All colors use CSS variables for easy theming
- Supports dark mode via class-based switching
- Variables use HSL format for better color manipulation

### Content Paths
- Each package must specify its own `content` paths
- Config omits `content` to allow per-package customization
- Ensures proper tree-shaking of unused styles

### Plugin System
- Typography plugin for prose content
- Animation plugin for common animations
- OpenType plugin for advanced typography

### Safelist Strategy
- Safelists commonly used utilities that might be generated dynamically
- Prevents purging of classes used in JavaScript/TypeScript
- Can be extended in consuming packages if needed

## Modifying Configuration

### Adding New Theme Values
1. Edit `tailwind.config.ts`
2. Add to `theme.extend` object
3. Test in consuming packages

### Adding New Plugins
1. Install plugin in `devDependencies`
2. Add to `plugins` array in config
3. Update consuming packages if needed

### Customizing Colors
Colors are defined via CSS variables. To add new colors:
1. Add CSS variable in consuming package's global CSS
2. Add color to theme in this config (if needed)
3. Use in components via Tailwind classes

## Notes

- Package is private (not published)
- Uses workspace dependencies
- Tailwind CSS 3+ is required as peer dependency
- TypeScript 5.5 is required as peer dependency
- Designed for use across all packages in the monorepo
- Each consuming package must define its own `content` paths
- CSS variables must be defined in consuming package's global CSS
