This file provides guidance when working with code in the `@lellimecnar/ui` package.

## Package Overview

`@lellimecnar/ui` is a web UI component library built on Radix UI primitives and styled with Tailwind CSS. It follows the shadcn/ui pattern and provides reusable React components for Next.js applications.

## Tech Stack

- **Base**: React 18+
- **UI Primitives**: Radix UI components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Utilities**: class-variance-authority, clsx, tailwind-merge
- **Form Handling**: react-hook-form with zod validation
- **Icons**: lucide-react, @icons-pack/react-simple-icons, devicons-react
- **Theme**: next-themes for dark mode support
- **QR Code**: qr-code-styling, react-qr-code
- **TypeScript**: ~5.5

## Package Structure

```
src/
├── components/           # React components
│   ├── button.tsx        # Button component
│   ├── checkbox.tsx      # Checkbox component
│   ├── form.tsx          # Form components
│   ├── input.tsx         # Input component
│   ├── label.tsx         # Label component
│   ├── navigation-menu.tsx # Navigation menu
│   ├── page.tsx          # Page layout component
│   ├── radio-group.tsx   # Radio group
│   ├── select.tsx        # Select dropdown
│   ├── switch.tsx        # Switch toggle
│   ├── textarea.tsx      # Textarea component
│   └── toggle.tsx        # Toggle button
├── lib/                  # Utility functions
│   ├── colors.ts         # Color utilities
│   ├── index.ts          # Lib exports
│   └── utils.ts           # cn() utility (class merging)
├── icons/                # Icon exports
│   └── index.ts          # Icon re-exports
├── qrcode/               # QR code components
│   ├── index.ts          # QR code exports
│   └── qrcode.tsx        # QR code component
├── theme/                # Theme components
│   ├── index.ts          # Theme exports
│   └── theme-provider.tsx # Theme provider (next-themes)
├── hooks/                # Custom hooks (if any)
│   └── index.ts          # Hook exports
└── global.css            # Global Tailwind styles
```

## Development Commands

```bash
# Build Tailwind CSS (compile global.css)
pnpm ui build

# Watch mode for Tailwind CSS
pnpm ui dev

# Run shadcn CLI to add new components
pnpm ui ui

# Lint code
pnpm ui lint

# Type-check
pnpm ui type-check
```

## Package Exports

The package uses **granular exports** to enable tree-shaking. Import components individually:

```typescript
// Component imports
import { Button } from '@lellimecnar/ui/button'
import { Input } from '@lellimecnar/ui/input'
import { Form } from '@lellimecnar/ui/form'

// Utility imports
import { cn } from '@lellimecnar/ui/lib/utils'
import { useTheme } from '@lellimecnar/ui/theme'

// Hook imports
import { useTheme } from '@lellimecnar/ui/hooks'

// Icon imports
import { IconName } from '@lellimecnar/ui/icons'

// QR Code imports
import { QRCode } from '@lellimecnar/ui/qrcode'

// Global CSS (required)
import '@lellimecnar/ui/global.css'
```

## Dependencies

### Runtime Dependencies
- `@radix-ui/*` - UI primitives (checkbox, label, navigation-menu, radio-group, select, slot, switch, toggle)
- `class-variance-authority` - Component variant management
- `clsx` - Conditional class names
- `tailwind-merge` - Merge Tailwind classes intelligently
- `next-themes` - Theme management (dark mode)
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Form validation resolvers
- `zod` - Schema validation
- `lucide-react` - Icon library
- `@icons-pack/react-simple-icons` - Simple Icons
- `devicons-react` - Dev icons
- `qr-code-styling` - QR code generation
- `react-qr-code` - React QR code component
- `react-use` - React hooks utilities

### Development Dependencies
- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/tailwind-config` - Shared Tailwind configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `tailwindcss`, `postcss`, `autoprefixer` - CSS tooling

## Key Configuration Files

- `components.json` - shadcn/ui configuration
- `tailwind.config.ts` - Tailwind CSS configuration (extends `@lellimecnar/tailwind-config`)
- `postcss.config.js` - PostCSS configuration
- `tsconfig.json` - TypeScript configuration

## Architecture Notes

### Component Pattern
- Components are built on Radix UI primitives for accessibility
- Styled with Tailwind CSS using CSS variables for theming
- Uses `class-variance-authority` (cva) for variant management
- Uses `cn()` utility (from `lib/utils.ts`) for class merging

### Theming
- Uses CSS variables defined in `global.css`
- Supports dark mode via `next-themes`
- Theme provider is exported from `theme/theme-provider.tsx`
- Colors are managed via CSS variables (e.g., `--background`, `--foreground`)

### Build Process
- `build` script compiles `src/global.css` to `dist/global.css`
- Components are not compiled - they're TypeScript source files
- Next.js apps transpile this package (see `next.config.js` in consuming apps)
- CSS is side-effectful (marked in `package.json`)

### Adding New Components

#### Using shadcn CLI
```bash
pnpm ui ui
# Follow prompts to add components from shadcn/ui
```

#### Manual Component Creation
1. Create component file in `src/components/[component-name].tsx`
2. Add export to `package.json` exports field:
   ```json
   "./[component-name]": "./src/components/[component-name].tsx"
   ```
3. Use Radix UI primitives when possible
4. Style with Tailwind CSS using CSS variables
5. Use `cva` for variants if needed
6. Export types for component props

### Component Guidelines
- Always use Radix UI primitives for accessibility
- Use `cn()` utility for class merging
- Support variants via `class-variance-authority`
- Export TypeScript types for props
- Follow shadcn/ui patterns and conventions
- Use CSS variables for theming (not hardcoded colors)

## Usage in Consuming Apps

### Next.js Apps
1. Import global CSS in root layout:
   ```typescript
   import '@lellimecnar/ui/global.css'
   ```
2. Wrap app with ThemeProvider if using dark mode:
   ```typescript
   import { ThemeProvider } from '@lellimecnar/ui/theme'
   ```
3. Import components as needed:
   ```typescript
   import { Button } from '@lellimecnar/ui/button'
   ```

### Next.js Configuration
Consuming Next.js apps must transpile this package:
```javascript
// next.config.js
transpilePackages: ['@lellimecnar/ui']
```

## Notes

- Package is not published (version 0.0.0)
- Uses workspace dependencies
- CSS files are marked as side-effects
- Components are TypeScript source files (not compiled)
- Follows shadcn/ui conventions and patterns
- All components should be accessible (Radix UI ensures this)
