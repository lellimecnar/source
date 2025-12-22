This file provides guidance when working with code in the `readon.app` package.

## Package Overview

`readon.app` is the web interface for the Readon reading app, built with Next.js 14+ using the App Router.

## Tech Stack

- **Framework**: Next.js 14.2.3+ with App Router
- **React**: 18.2.0+
- **Styling**: Tailwind CSS
- **UI Components**: `@lellimecnar/ui` (web component library)
- **TypeScript**: ~5.5
- **Utilities**: `@lellimecnar/utils` (date-fns, lodash)

## Package Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── favicon.ico        # Site favicon
├── components/            # Shared React components
│   ├── link/             # Custom link component
│   └── site-header/      # Site header/navigation
└── config/               # Configuration files
    ├── fonts.ts          # Font configuration
    └── site.ts           # Site metadata/config
```

## Development Commands

```bash
# Run development server
pnpm readon.app dev

# Build for production
pnpm readon.app build

# Start production server
pnpm readon.app start

# Lint code
pnpm readon.app lint

# Type-check
pnpm readon.app type-check
```

## Dependencies

### Runtime Dependencies

- `@lellimecnar/ui` - Web UI component library (workspace package)
- `next` - Next.js framework
- `react` & `react-dom` - React libraries
- `react-use` - React hooks utilities

### Development Dependencies

- `@lellimecnar/eslint-config` - Shared ESLint configuration
- `@lellimecnar/tailwind-config` - Shared Tailwind configuration
- `@lellimecnar/typescript-config` - Shared TypeScript configuration
- `@lellimecnar/utils` - Shared utilities (dev dependency for type-checking)
- `@next/eslint-plugin-next` - Next.js ESLint plugin
- `tailwindcss`, `postcss`, `autoprefixer` - CSS tooling

## Key Configuration Files

- `next.config.js` - Next.js configuration (transpiles `@lellimecnar/ui`)
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration (extends `@lellimecnar/typescript-config/next.json`)
- `postcss.config.js` - PostCSS configuration

## Architecture Notes

### App Router Structure

- Uses Next.js App Router with file-based routing
- `app/layout.tsx` is the root layout
- `app/page.tsx` is the home page
- Additional routes can be added in `app/` directory

### Component Organization

- Shared components in `src/components/`
- Each component has its own directory with `index.ts` and component file
- Uses `@lellimecnar/ui` for base UI components

### Styling

- Tailwind CSS for styling
- Uses shared Tailwind config from `@lellimecnar/tailwind-config`
- Global styles in `app/globals.css`

### UI Component Usage

The package uses granular imports from `@lellimecnar/ui`:

```typescript
import { Button } from '@lellimecnar/ui/button';
import { Page } from '@lellimecnar/ui/page';
import '@lellimecnar/ui/global.css';
```

## Adding New Features

### Adding a New Route

1. Create a new directory in `src/app/[route-name]/`
2. Add a `page.tsx` file for the route
3. Optionally add a `layout.tsx` for route-specific layouts

### Adding a New Component

1. Create a directory in `src/components/[component-name]/`
2. Add `index.ts` for exports
3. Add the component file (e.g., `[component-name].tsx`)

## Build & Deployment

- Build output goes to `.next/` directory
- Dockerfile is included for containerized deployment
- Public assets are in `public/` directory

## Notes

- This is a private package (not published)
- Uses workspace dependencies for shared packages
- Next.js config transpiles `@lellimecnar/ui` for compatibility
- This is the web interface for the Readon app (mobile app is in `mobile/readon`)
