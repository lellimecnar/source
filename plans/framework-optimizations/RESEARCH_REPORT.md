# Framework Optimizations Research Report

## Executive Summary

This research report provides comprehensive findings for implementing framework optimizations across the `@lellimecnar/source` monorepo, covering Next.js web applications (miller.pub & readon.app) and the Expo mobile application (readon).

**Key Findings:**

- Next.js version: **15.2.3** (App Router)
- Expo version: **~52.0.14** (Expo Router)
- React Native version: **0.76.3**
- Both Next.js apps have identical minimal configurations requiring optimization
- Dockerfiles exist but could benefit from standalone output optimization
- No middleware, analytics, or bundle analyzer currently configured
- No security headers currently configured

---

## 1. Project-Wide Analysis

### 1.1 Project Type & Architecture

- **Type**: pnpm + Turborepo monorepo
- **Package Manager**: pnpm v9.12.2 (strictly enforced)
- **Build System**: Turborepo ^2.6.1
- **Runtime**: Node.js ^20
- **Language**: TypeScript ~5.5

### 1.2 Technology Stack Versions

#### Web Stack

- **Next.js**: ^15.2.3 (App Router, React Server Components)
- **React**: ^18.3.1
- **React DOM**: ^18.3.1
- **Tailwind CSS**: ^3.4.17
- **TypeScript**: ~5.5

#### Mobile Stack

- **Expo**: ~52.0.14
- **Expo Router**: ~4.0.11
- **React Native**: 0.76.3
- **NativeWind**: ^4.2.1
- **React Native Reanimated**: ~3.16.1

#### Shared Infrastructure

- **UI Components**: `@lellimecnar/ui` (shadcn/ui + Radix)
- **Mobile UI**: `@lellimecnar/ui-nativewind`
- **Utilities**: date-fns, lodash (in `@lellimecnar/utils`)
- **Testing**: Jest ^29

### 1.3 Monorepo Structure

```
.
├── web/*                   # Next.js applications
│   ├── miller.pub/        # Personal portfolio
│   └── readon.app/        # Reading app web interface
├── mobile/*               # Expo applications
│   └── readon/           # Mobile reading app
├── packages/*            # Shared libraries
│   ├── ui/              # Web UI (shadcn/ui)
│   ├── ui-nativewind/   # Mobile UI (NativeWind)
│   ├── utils/           # Shared utilities
│   └── config-*/        # Shared configs
└── card-stack/*         # Domain logic packages
```

### 1.4 Dependency Management

- **Internal packages**: Use `workspace:*` protocol
- **Version overrides**: Enforced at root for consistency
- **Shared configs**: Centralized in `packages/config-*`
- **Granular exports**: UI packages use specific exports for tree-shaking

### 1.5 Build & Task Configuration (turbo.json)

```json
{
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"inputs": ["$TURBO_DEFAULT$", ".env*"],
			"outputs": ["dist/**", ".next/**", "!.next/cache/**"]
		},
		"dev": {
			"cache": false,
			"persistent": true
		},
		"lint": {
			"dependsOn": ["^build"]
		},
		"test": {
			"outputs": ["coverage/**"],
			"dependsOn": []
		}
	}
}
```

### 1.6 Root Scripts

```json
{
	"scripts": {
		"miller.pub": "pnpm --filter miller.pub",
		"readon.app": "pnpm --filter readon.app",
		"readon": "pnpm --filter readon",
		"build": "turbo build",
		"dev": "turbo dev",
		"lint": "turbo lint",
		"test": "turbo test",
		"type-check": "turbo type-check",
		"clean": "turbo clean; git clean -xdf node_modules .turbo .next .expo"
	}
}
```

---

## 2. Next.js Apps Analysis

### 2.1 miller.pub

#### Current Configuration (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

**Analysis:**

- ✅ React Strict Mode enabled
- ✅ Transpiles workspace UI package
- ❌ No performance optimizations
- ❌ No security headers
- ❌ No standalone output
- ❌ No image optimization configuration
- ❌ No bundle analyzer
- ❌ No compression configured

#### Package.json Dependencies

```json
{
	"dependencies": {
		"@lellimecnar/ui": "workspace:*",
		"next": "^15.2.3",
		"react": "^18.3.1",
		"react-dom": "^18.3.1",
		"react-use": "^17.6.0"
	},
	"scripts": {
		"dev": "next dev",
		"build": "next build",
		"start": "next start",
		"lint": "eslint .",
		"type-check": "tsc --noEmit"
	}
}
```

#### Project Structure

```
miller.pub/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── globals.css        # Global styles
│   │   ├── projects/          # Project pages
│   │   └── resume/            # Resume page
│   ├── components/            # App components
│   │   ├── link/
│   │   └── site-header/
│   └── config/               # Config
│       ├── fonts.ts
│       └── site.ts
├── public/                   # Static assets
├── Dockerfile                # Existing Docker config
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

#### Tailwind Configuration

```typescript
import { resolve } from 'node:path';
import type { Config } from 'tailwindcss';
import sharedConfig from '@lellimecnar/tailwind-config';

const config: Config = {
	content: [
		resolve(__dirname, 'src/**/*.{ts,tsx}'),
		resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
	],
	presets: [sharedConfig],
	theme: {
		extend: {
			colors: {
				/* Custom Pokemon type colors */
			},
			boxShadow: {
				/* Custom shadows */
			},
			// ... project-specific extensions
		},
	},
};
```

#### TypeScript Configuration

```json
{
	"extends": "@lellimecnar/typescript-config/next.json",
	"compilerOptions": {
		"plugins": [{ "name": "next" }],
		"noEmit": true,
		"isolatedModules": true,
		"baseUrl": ".",
		"paths": {
			"@/*": ["./src/*"]
		}
	}
}
```

#### Root Layout

```tsx
import { type Metadata, type Viewport } from 'next';
import { cn } from '@lellimecnar/ui/lib';
import { ThemeProvider } from '@lellimecnar/ui/theme';
import { SiteHeader } from '@/components/site-header';
import { fontSans } from '@/config/fonts';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
	title: siteConfig.name,
	description: siteConfig.description,
};

export const viewport: Viewport = {
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: 'white' },
		{ media: '(prefers-color-scheme: dark)', color: 'black' },
	],
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body
				className={cn(
					'min-h-screen bg-sky-300 dark:bg-sky-950 font-sans antialiased',
					fontSans.variable,
				)}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="relative flex min-h-screen flex-col">
						<SiteHeader />
						{children}
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
```

**Observations:**

- ❌ No analytics scripts
- ❌ No performance monitoring
- ✅ Uses server-side metadata API
- ✅ Theme provider for dark mode
- ✅ Proper HTML structure

#### Existing Dockerfile

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm -s dlx turbo prune miller.pub --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
RUN pnpm install
COPY --from=builder /app/out/full/ .

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm build --filter=miller.pub...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Uses standard .next output (NOT standalone)
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/.next/static ./web/miller.pub/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/public ./web/miller.pub/public

CMD node web/miller.pub/server.js
```

**Docker Analysis:**

- ✅ Multi-stage build
- ✅ Turbo prune for efficient caching
- ❌ Expects standalone output but config doesn't enable it
- ❌ Could be optimized with proper standalone configuration

---

### 2.2 readon.app

#### Current Configuration (`next.config.js`)

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

**Analysis:** Identical to miller.pub - same optimizations needed

#### Package.json Dependencies

```json
{
	"dependencies": {
		"@lellimecnar/ui": "workspace:*",
		"next": "^15.2.3",
		"react": "^18.3.1",
		"react-dom": "^18.3.1",
		"react-use": "^17.6.0"
	},
	"scripts": {
		"dev": "next dev",
		"build": "next build",
		"start": "next start",
		"lint": "eslint .",
		"type-check": "tsc --noEmit"
	}
}
```

#### Project Structure

```
readon.app/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # App components
│   │   ├── link/
│   │   └── site-header/
│   └── config/               # Config
│       ├── fonts.ts
│       └── site.ts
├── public/                   # Static assets
├── Dockerfile                # Existing Docker config
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

#### Tailwind Configuration

```typescript
import { resolve } from 'node:path';
import type { Config } from 'tailwindcss';
import sharedConfig from '@lellimecnar/tailwind-config';

const config: Config = {
	content: [
		resolve(__dirname, 'src/**/*.{ts,tsx}'),
		resolve(__dirname, '../../packages/ui/src/**/*.{ts,tsx}'),
	],
	presets: [sharedConfig],
};

export default config;
```

**Observations:**

- Simpler Tailwind config than miller.pub (no custom extensions)
- Same structure and patterns as miller.pub
- Same optimization opportunities

#### Root Layout

Identical to miller.pub with same metadata and structure.

---

### 2.3 Common Next.js Patterns Across Apps

#### Configuration Pattern

Both apps follow the same minimal configuration pattern:

```javascript
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

#### Import Pattern (Granular Exports)

```typescript
// ✅ Correct - granular imports
import { Button } from '@lellimecnar/ui/button';
import { cn } from '@lellimecnar/ui/lib';
import '@lellimecnar/ui/global.css';

// ❌ Wrong - no barrel exports
import { Button } from '@lellimecnar/ui';
```

#### Directory Structure Pattern

- `src/app/` - App Router pages and layouts
- `src/components/` - App-specific components
- `src/config/` - Configuration files (fonts, site metadata)
- `public/` - Static assets

#### Path Aliases

Both apps use `@/*` alias mapping to `./src/*`

---

### 2.4 Missing Optimizations in Next.js Apps

#### Performance

- ❌ No standalone output mode for Docker
- ❌ No compression configuration
- ❌ No bundle analyzer setup
- ❌ No image optimization configuration
- ❌ No experimental features (Turbopack, etc.)
- ❌ No performance monitoring/analytics

#### Security

- ❌ No security headers (CSP, X-Frame-Options, etc.)
- ❌ No middleware for security
- ❌ No image domain restrictions

#### Developer Experience

- ❌ No bundle analyzer for debugging bundle size
- ❌ No source maps configuration
- ❌ No webpack/build customizations

---

## 3. Expo App Analysis (mobile/readon)

### 3.1 Current Configuration (`app.config.ts`)

```typescript
import { type ExpoConfig } from '@expo/config-types';

const backgroundColor = '#082f49';
const headerBackgroundColor = '#0c4a6e';

export default (): ExpoConfig => ({
	name: 'Read On',
	slug: 'readon',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/images/icon.png',
	scheme: 'readon',
	userInterfaceStyle: 'automatic',
	newArchEnabled: true,
	backgroundColor,
	splash: {
		image: './assets/images/splash-icon.png',
		resizeMode: 'contain',
		backgroundColor: headerBackgroundColor,
	},
	ios: {
		supportsTablet: true,
		bundleIdentifier: 'pub.miller.readon',
	},
	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'pub.miller.readon',
	},
	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/images/favicon.png',
	},
	plugins: ['expo-router'],
	experiments: {
		typedRoutes: true,
	},
	// Commented out status/navigation bar configs
});
```

**Analysis:**

- ✅ New Architecture enabled (`newArchEnabled: true`)
- ✅ Expo Router plugin configured
- ✅ Typed routes experiment enabled
- ❌ Only one plugin configured
- ❌ No build properties optimization
- ❌ No performance plugins
- ❌ Status bar and navigation bar configs commented out

### 3.2 Package.json Dependencies

```json
{
	"name": "readon",
	"dependencies": {
		"@lellimecnar/ui-nativewind": "workspace:*",
		"@lellimecnar/tailwind-config": "workspace:*",
		"expo": "~52.0.14",
		"expo-router": "~4.0.11",
		"expo-font": "~13.0.1",
		"expo-linking": "~7.0.3",
		"expo-splash-screen": "~0.29.12",
		"expo-status-bar": "~2.0.0",
		"expo-system-ui": "~4.0.5",
		"expo-web-browser": "~14.0.1",
		"nativewind": "^4.2.1",
		"react": "18.3.1",
		"react-native": "0.76.3",
		"react-native-reanimated": "~3.16.1",
		"react-native-safe-area-context": "4.12.0",
		"react-native-screens": "~4.18.0",
		"@expo/vector-icons": "^14.0.2",
		"@react-navigation/elements": "^2.8.3",
		"@react-navigation/native": "^7.1.21"
	},
	"devDependencies": {
		"@lellimecnar/babel-preset": "workspace:*",
		"@lellimecnar/eslint-config": "workspace:*",
		"@lellimecnar/typescript-config": "workspace:*",
		"@expo/config-types": "^52.0.1",
		"jest": "^29.2.1",
		"jest-expo": "~52.0.2",
		"tailwindcss": "^3.4.17",
		"typescript": "~5.5"
	},
	"scripts": {
		"start": "expo start",
		"dev": "expo start --android --clear",
		"dev:ios": "expo start --ios --clear",
		"dev:web": "expo start --web --clear",
		"lint": "eslint .",
		"test": "jest --watchAll",
		"android": "expo run:android",
		"ios": "expo run:ios"
	}
}
```

**Key Dependencies:**

- Expo SDK: ~52.0.14
- React Native: 0.76.3
- Expo Router: ~4.0.11 (file-based routing)
- NativeWind: ^4.2.1 (Tailwind for RN)
- Reanimated: ~3.16.1 (animations)

### 3.3 Project Structure

```
mobile/readon/
├── app/                        # Expo Router
│   ├── _layout.tsx            # Root layout
│   ├── (tabs)/                # Tab navigation
│   ├── +html.tsx              # Web HTML wrapper
│   ├── +not-found.tsx         # 404
│   ├── modal.tsx              # Modal route
│   └── global.css             # Global styles
├── components/                # React Native components
│   ├── icons.tsx
│   └── themed.tsx
├── const/                     # Constants
│   └── colors.ts
├── hooks/                     # Custom hooks
│   ├── useClientOnlyValue.ts
│   ├── useColorScheme.ts
│   └── useTheme.ts
├── assets/                    # Static assets
│   ├── fonts/
│   └── images/
├── android/                   # Android native
├── app.config.ts
├── babel.config.js
├── metro.config.js
└── package.json
```

### 3.4 Build Configuration Files

#### babel.config.js

```javascript
module.exports = function (api) {
	api.cache(true);
	return {
		presets: ['@lellimecnar/babel-preset'],
	};
};
```

#### metro.config.js

```javascript
// Standard Expo Metro configuration
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
```

### 3.5 Missing Optimizations in Expo App

#### Performance

- ❌ No build properties plugin configuration
- ❌ No performance optimization plugins
- ❌ No bundle size optimization
- ❌ No asset optimization beyond defaults
- ❌ Status/navigation bar optimization commented out

#### Developer Experience

- ❌ Limited plugin ecosystem utilization
- ❌ No analytics/monitoring setup

---

## 4. Framework Documentation Research

### 4.1 Next.js 15 Optimizations

Based on official Next.js documentation, here are the recommended optimizations:

#### 4.1.1 Output Configuration

```javascript
module.exports = {
	output: 'standalone', // Creates minimal Docker-ready output
};
```

- Automatically traces required files
- Reduces deployment size
- Ideal for Docker/container deployments

#### 4.1.2 Image Optimization

```javascript
module.exports = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.example.com',
				port: '',
				pathname: '/uploads/**',
			},
		],
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},
};
```

#### 4.1.3 Security Headers

```javascript
module.exports = {
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload',
					},
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
					{
						key: 'Referrer-Policy',
						value: 'origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
				],
			},
		];
	},
};
```

#### 4.1.4 Content Security Policy (CSP)

```javascript
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

module.exports = {
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: cspHeader.replace(/\n/g, ''),
					},
				],
			},
		];
	},
};
```

#### 4.1.5 Bundle Analyzer

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
	// ... rest of config
});
```

#### 4.1.6 Compression

```javascript
module.exports = {
	compress: true, // Enabled by default in production
	poweredByHeader: false, // Remove X-Powered-By header
};
```

#### 4.1.7 Experimental Features

```javascript
module.exports = {
	experimental: {
		// Turbopack for faster builds (Next.js 15)
		turbo: {},
		// Optimize package imports
		optimizePackageImports: ['@lellimecnar/ui'],
	},
};
```

### 4.2 Expo 52 Optimizations

Based on official Expo documentation:

#### 4.2.1 Build Properties Plugin

```typescript
export default {
	plugins: [
		[
			'expo-build-properties',
			{
				android: {
					compileSdkVersion: 35,
					targetSdkVersion: 35,
					buildToolsVersion: '35.0.0',
					enableProguardInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
				},
				ios: {
					deploymentTarget: '15.1',
					newArchEnabled: true,
				},
			},
		],
	],
};
```

#### 4.2.2 Asset Optimization

- Use Expo's built-in image optimization
- Configure proper asset resolutions
- Enable Hermes for faster JavaScript execution

#### 4.2.3 Performance Plugins

- `expo-font` for font optimization
- `expo-splash-screen` for UX
- `react-native-reanimated` for performant animations

---

## 5. Code Patterns & Best Practices

### 5.1 Next.js Configuration Pattern

Current pattern:

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
};
```

Recommended enhanced pattern:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],
	output: 'standalone',
	poweredByHeader: false,
	compress: true,
	images: {
		formats: ['image/avif', 'image/webp'],
	},
	experimental: {
		optimizePackageImports: ['@lellimecnar/ui'],
	},
};

module.exports = nextConfig;
```

### 5.2 Monorepo Script Pattern

All apps use filter pattern:

```bash
pnpm --filter <workspace-name> <script>
# or via root aliases
pnpm miller.pub dev
pnpm readon.app build
```

### 5.3 Import Pattern Enforcement

Granular imports for UI packages:

```typescript
// ✅ Correct
import { Button } from '@lellimecnar/ui/button';
import { Input } from '@lellimecnar/ui/input';

// ❌ Wrong
import { Button, Input } from '@lellimecnar/ui';
```

---

## 6. Recommended Specific Configuration Values

### 6.1 Next.js miller.pub Recommended Config

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
	// Existing
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],

	// Production Optimizations
	output: 'standalone',
	poweredByHeader: false,
	compress: true,

	// Image Optimization
	images: {
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},

	// Experimental Features
	experimental: {
		optimizePackageImports: ['@lellimecnar/ui'],
	},

	// Security Headers
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{ key: 'X-DNS-Prefetch-Control', value: 'on' },
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload',
					},
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-XSS-Protection', value: '1; mode=block' },
					{ key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
				],
			},
		];
	},
};

// Bundle Analyzer (optional, env-gated)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

**New Dependencies Required:**

- `@next/bundle-analyzer`: For bundle analysis

### 6.2 Next.js readon.app Recommended Config

Same as miller.pub (identical structure and needs).

### 6.3 Expo readon Recommended Config

```typescript
import { type ExpoConfig } from '@expo/config-types';

const backgroundColor = '#082f49';
const headerBackgroundColor = '#0c4a6e';

export default (): ExpoConfig => ({
	name: 'Read On',
	slug: 'readon',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/images/icon.png',
	scheme: 'readon',
	userInterfaceStyle: 'automatic',
	newArchEnabled: true,
	backgroundColor,

	splash: {
		image: './assets/images/splash-icon.png',
		resizeMode: 'contain',
		backgroundColor: headerBackgroundColor,
	},

	ios: {
		supportsTablet: true,
		bundleIdentifier: 'pub.miller.readon',
	},

	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'pub.miller.readon',
	},

	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/images/favicon.png',
	},

	plugins: [
		'expo-router',
		[
			'expo-build-properties',
			{
				android: {
					compileSdkVersion: 35,
					targetSdkVersion: 35,
					buildToolsVersion: '35.0.0',
					enableProguardInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
				},
				ios: {
					deploymentTarget: '15.1',
					newArchEnabled: true,
				},
			},
		],
	],

	experiments: {
		typedRoutes: true,
	},

	// Now enabled instead of commented
	androidStatusBar: {
		backgroundColor: headerBackgroundColor,
		barStyle: 'light-content',
	},
	androidNavigationBar: {
		backgroundColor: headerBackgroundColor,
		barStyle: 'light-content',
	},
});
```

**New Dependencies Required:**

- `expo-build-properties`: For build optimization

---

## 7. File Paths for Implementation

### 7.1 Files to Modify

#### Next.js Apps (miller.pub & readon.app)

```
web/miller.pub/next.config.js         # Add optimizations
web/miller.pub/package.json           # Add @next/bundle-analyzer
web/miller.pub/Dockerfile             # Update for standalone output
web/miller.pub/.dockerignore          # Create if missing

web/readon.app/next.config.js         # Add optimizations
web/readon.app/package.json           # Add @next/bundle-analyzer
web/readon.app/Dockerfile             # Update for standalone output
web/readon.app/.dockerignore          # Create if missing
```

#### Expo App (readon)

```
mobile/readon/app.config.ts           # Add build properties plugin
mobile/readon/package.json            # Add expo-build-properties
```

#### Documentation

```
web/miller.pub/AGENTS.md              # Update with optimization info
web/readon.app/AGENTS.md              # Update with optimization info
mobile/readon/AGENTS.md               # Update with optimization info
AGENTS.md                             # Update monorepo docs
```

### 7.2 Files to Create

```
web/miller.pub/.dockerignore          # If doesn't exist
web/miller.pub/middleware.ts          # Optional: for advanced CSP
web/readon.app/.dockerignore          # If doesn't exist
web/readon.app/middleware.ts          # Optional: for advanced CSP
```

---

## 8. Implementation Summary

### 8.1 Priority 1: Critical Optimizations

#### Next.js Apps (Both)

1. ✅ Enable standalone output
2. ✅ Add security headers
3. ✅ Add bundle analyzer (dev dependency)
4. ✅ Update Dockerfiles for standalone
5. ✅ Add image optimization config

#### Expo App

1. ✅ Add expo-build-properties plugin
2. ✅ Enable status/navigation bar config
3. ✅ Configure Android/iOS build properties

### 8.2 Priority 2: Developer Experience

1. Add bundle analyzer scripts to package.json
2. Document optimization features in AGENTS.md
3. Add performance monitoring guidelines

### 8.3 Priority 3: Advanced Features

1. Consider middleware for dynamic CSP with nonces
2. Evaluate Turbopack experimental features
3. Consider analytics integration (@vercel/analytics)

---

## 9. Existing Infrastructure

### 9.1 Current State

- ✅ Dockerfiles exist for both Next.js apps
- ✅ Turbo cache configuration
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Shared configuration packages
- ❌ No middleware files
- ❌ No analytics/monitoring
- ❌ No bundle analyzer
- ❌ No .dockerignore files
- ❌ No security headers

### 9.2 Configuration Patterns to Follow

1. Use shared configs from `packages/config-*`
2. Keep granular imports for tree-shaking
3. Follow workspace:\* protocol for dependencies
4. Maintain TypeScript strict mode
5. Use absolute imports with path aliases

---

## 10. Dependencies Analysis

### 10.1 Current Shared Dependencies (Root)

```json
{
	"devDependencies": {
		"eslint": "^8",
		"jest": "^29",
		"next": "^15.2.3",
		"prettier": "^3.6.2",
		"turbo": "^2.6.1",
		"typescript": "~5.5"
	}
}
```

### 10.2 New Dependencies Required

#### For Next.js Apps

```json
{
	"devDependencies": {
		"@next/bundle-analyzer": "^15.2.3"
	}
}
```

#### For Expo App

```json
{
	"devDependencies": {
		"expo-build-properties": "~0.13.2"
	}
}
```

### 10.3 Version Constraints

- Must align with existing Next.js version (^15.2.3)
- Must align with Expo SDK version (~52.0.14)
- Follow monorepo's TypeScript version (~5.5)

---

## 11. Testing & Validation Strategy

### 11.1 Pre-Implementation Checks

- ✅ All current builds passing
- ✅ No breaking changes in dependencies
- ✅ TypeScript compilation successful

### 11.2 Post-Implementation Validation

1. **Build Tests**
   - `pnpm build` succeeds for all workspaces
   - Bundle sizes are reasonable
   - Standalone output works in Docker

2. **Runtime Tests**
   - `pnpm dev` works for all apps
   - Security headers present in responses
   - Images optimize correctly

3. **Performance Tests**
   - Bundle analyzer shows expected results
   - Lighthouse scores improve
   - Docker image sizes reduced

### 11.3 Rollback Plan

- Keep original configs in git history
- Test incrementally (one app at a time)
- Document any issues encountered

---

## 12. Documentation Requirements

### 12.1 Files to Update

#### Root Documentation

- `AGENTS.md`: Add optimization section
- `Technology_Stack_Blueprint.md`: Update with new dependencies
- `Project_Workflow_Documentation.md`: Add optimization workflows

#### App-Specific Documentation

- `web/miller.pub/AGENTS.md`: Document new config options
- `web/readon.app/AGENTS.md`: Document new config options
- `mobile/readon/AGENTS.md`: Document build properties

### 12.2 Key Documentation Points

1. How to run bundle analyzer
2. Security headers explanation
3. Standalone output benefits
4. Docker deployment changes
5. Performance monitoring guidelines

---

## 13. Risk Assessment

### 13.1 Low Risk Changes

- ✅ Adding bundle analyzer (dev only)
- ✅ Adding security headers (read-only)
- ✅ Enabling compression (Next.js default)

### 13.2 Medium Risk Changes

- ⚠️ Standalone output (changes Docker deployment)
- ⚠️ Build properties (changes native builds)
- ⚠️ Experimental features (may have bugs)

### 13.3 Mitigation Strategies

1. Test standalone output locally first
2. Keep Dockerfiles backward compatible initially
3. Use feature flags for experimental features
4. Document rollback procedures

---

## 14. Timeline & Effort Estimates

### 14.1 Implementation Phases

**Phase 1: Next.js Optimizations (2-3 hours)**

- Update next.config.js files
- Add bundle analyzer
- Update Dockerfiles
- Test builds

**Phase 2: Expo Optimizations (1-2 hours)**

- Update app.config.ts
- Add build properties
- Test builds

**Phase 3: Documentation (1 hour)**

- Update AGENTS.md files
- Update root documentation
- Add examples

**Total Estimated Time: 4-6 hours**

### 14.2 Testing & Validation (2-3 hours)

- Local testing
- Docker testing
- Performance validation
- Documentation review

**Grand Total: 6-9 hours**

---

## 15. Success Criteria

### 15.1 Functional Requirements

- ✅ All apps build successfully
- ✅ All apps run in development mode
- ✅ Docker images build and run
- ✅ Security headers present
- ✅ Bundle analyzer works

### 15.2 Performance Requirements

- ✅ Docker image size reduced by >30%
- ✅ Bundle sizes optimized
- ✅ Build times maintained or improved
- ✅ Runtime performance maintained

### 15.3 Documentation Requirements

- ✅ All AGENTS.md files updated
- ✅ Configuration changes documented
- ✅ Usage examples provided
- ✅ Troubleshooting guides added

---

## 16. Appendix: Complete Configuration Examples

### 16.1 Complete next.config.js (Enhanced)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
	// Core Configuration
	reactStrictMode: true,
	transpilePackages: ['@lellimecnar/ui'],

	// Production Optimizations
	output: 'standalone',
	poweredByHeader: false,
	compress: true,

	// Image Optimization
	images: {
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},

	// Experimental Features
	experimental: {
		optimizePackageImports: ['@lellimecnar/ui'],
	},

	// Security Headers
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on',
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload',
					},
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
					{
						key: 'Referrer-Policy',
						value: 'origin-when-cross-origin',
					},
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=()',
					},
				],
			},
		];
	},
};

// Bundle Analyzer (environment-gated)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

### 16.2 Complete app.config.ts (Enhanced)

```typescript
import { type ExpoConfig } from '@expo/config-types';

const backgroundColor = '#082f49';
const headerBackgroundColor = '#0c4a6e';

export default (): ExpoConfig => ({
	name: 'Read On',
	slug: 'readon',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/images/icon.png',
	scheme: 'readon',
	userInterfaceStyle: 'automatic',
	newArchEnabled: true,
	backgroundColor,

	splash: {
		image: './assets/images/splash-icon.png',
		resizeMode: 'contain',
		backgroundColor: headerBackgroundColor,
	},

	ios: {
		supportsTablet: true,
		bundleIdentifier: 'pub.miller.readon',
	},

	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'pub.miller.readon',
	},

	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/images/favicon.png',
	},

	plugins: [
		'expo-router',
		[
			'expo-build-properties',
			{
				android: {
					compileSdkVersion: 35,
					targetSdkVersion: 35,
					buildToolsVersion: '35.0.0',
					enableProguardInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
				},
				ios: {
					deploymentTarget: '15.1',
					newArchEnabled: true,
				},
			},
		],
	],

	experiments: {
		typedRoutes: true,
	},

	androidStatusBar: {
		backgroundColor: headerBackgroundColor,
		barStyle: 'light-content',
	},

	androidNavigationBar: {
		backgroundColor: headerBackgroundColor,
		barStyle: 'light-content',
	},
});
```

### 16.3 Updated Dockerfile (Standalone)

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm -s dlx turbo prune miller.pub --docker

FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN pnpm install

COPY --from=builder /app/out/full/ .

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm build --filter=miller.pub...

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Standalone output - significantly smaller
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/.next/static ./web/miller.pub/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/web/miller.pub/public ./web/miller.pub/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["node", "web/miller.pub/server.js"]
```

---

## 17. Conclusion

This research report provides a comprehensive foundation for implementing framework optimizations across the `@lellimecnar/source` monorepo. The key findings indicate:

1. **Current State**: Minimal configurations with significant optimization opportunities
2. **Target Versions**: Next.js 15.2.3, Expo 52.0.14, React Native 0.76.3
3. **Implementation Scope**: Medium complexity, low risk, high value
4. **Expected Outcomes**:
   - Reduced Docker image sizes (30%+ reduction)
   - Enhanced security posture
   - Improved developer experience
   - Better production performance
   - Comprehensive documentation

**Next Steps:**

1. Review this report
2. Approve implementation plan
3. Execute Phase 1 (Next.js optimizations)
4. Execute Phase 2 (Expo optimizations)
5. Execute Phase 3 (Documentation)
6. Validate and test
7. Deploy

---

**Report Generated**: December 21, 2025
**For**: framework-optimizations implementation plan
**Repository**: @lellimecnar/source
