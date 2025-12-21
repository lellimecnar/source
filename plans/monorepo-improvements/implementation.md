# Monorepo Improvements

## Goal
Implement tooling, performance, and developer experience improvements across the monorepo, including Changesets, Lefthook, Syncpack, Turbopack, React Compiler, Storybook, and Playwright.

## Prerequisites
Make sure that the use is currently on the `feature/monorepo-improvements` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from main.

### Step-by-Step Instructions

#### Step 1: Root Tooling (Changesets, Lefthook, Syncpack)
- [ ] Install root dependencies
- [ ] Copy and paste code below into `terminal`:

```bash
pnpm add -w -D @changesets/cli lefthook syncpack
```

- [ ] Initialize Changesets
- [ ] Copy and paste code below into `terminal`:

```bash
pnpm changeset init
```

- [ ] Configure Lefthook
- [ ] Copy and paste code below into `lefthook.yml`:

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.{js,ts,jsx,tsx}"
      run: pnpm eslint {staged_files}
    type-check:
      glob: "*.{ts,tsx}"
      run: pnpm type-check
```

- [ ] Configure Syncpack
- [ ] Copy and paste code below into `.syncpackrc`:

```json
{
  "dependencyTypes": ["dev", "prod", "peer", "overrides", "resolutions"],
  "filter": ".",
  "indent": "  ",
  "semverGroups": [
    {
      "range": "",
      "dependencies": ["**"],
      "packages": ["**"]
    }
  ],
  "sortAz": ["dependencies", "devDependencies", "peerDependencies", "scripts", "keywords"],
  "sortFirst": ["name", "description", "version", "author"],
  "versionGroups": []
}
```

##### Step 1 Verification Checklist
- [ ] Run `pnpm changeset` and verify it prompts for changes.
- [ ] Run `pnpm syncpack list-mismatches` and verify it runs.
- [ ] Verify `lefthook.yml` exists.

#### Step 1 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: Web Performance (Turbopack, React Compiler, Bundle Analyzer)
- [ ] Install Bundle Analyzer in web apps
- [ ] Copy and paste code below into `terminal`:

```bash
pnpm --filter miller.pub add -D @next/bundle-analyzer
pnpm --filter readon.app add -D @next/bundle-analyzer
```

- [ ] Update `web/miller.pub/next.config.js`
- [ ] Copy and paste code below into `web/miller.pub/next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lellimecnar/ui'],
  experimental: {
    reactCompiler: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

- [ ] Update `web/readon.app/next.config.js`
- [ ] Copy and paste code below into `web/readon.app/next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lellimecnar/ui'],
  experimental: {
    reactCompiler: true,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

- [ ] Update `web/miller.pub/package.json` scripts
- [ ] Copy and paste code below into `web/miller.pub/package.json` (update `dev` and add `analyze`):

```json
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "analyze": "ANALYZE=true next build"
  },
```

- [ ] Update `web/readon.app/package.json` scripts
- [ ] Copy and paste code below into `web/readon.app/package.json` (update `dev` and add `analyze`):

```json
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "analyze": "ANALYZE=true next build"
  },
```

##### Step 2 Verification Checklist
- [ ] Run `pnpm miller.pub dev` and verify it starts with Turbopack.
- [ ] Run `pnpm miller.pub analyze` and verify the bundle analyzer opens.

#### Step 2 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: UI Development (Storybook)
- [ ] Initialize Storybook in UI package
- [ ] Copy and paste code below into `terminal`:

```bash
cd packages/ui
pnpm dlx storybook@latest init --builder vite --type react --yes
cd ../..
```

- [ ] Configure Storybook to use Global CSS
- [ ] Copy and paste code below into `packages/ui/.storybook/preview.ts`:

```typescript
import '../src/global.css';

import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

##### Step 3 Verification Checklist
- [ ] Run `pnpm --filter @lellimecnar/ui storybook` and verify Storybook loads.

#### Step 3 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: E2E Testing (Playwright)
- [ ] Add `e2e` to workspace config
- [ ] Copy and paste code below into `pnpm-workspace.yaml`:

```yaml
packages:
  - "web/*"
  - "mobile/*"
  - "packages/*"
  - "card-stack/*"
  - "e2e"
```

- [ ] Create `e2e` directory and package.json
- [ ] Copy and paste code below into `e2e/package.json`:

```json
{
  "name": "@lellimecnar/e2e",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "codegen": "playwright codegen"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^20.0.0",
    "typescript": "~5.5"
  }
}
```

- [ ] Create Playwright Config
- [ ] Copy and paste code below into `e2e/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

- [ ] Create Example Test
- [ ] Copy and paste code below into `e2e/tests/example.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});
```

- [ ] Install Playwright Browsers
- [ ] Copy and paste code below into `terminal`:

```bash
pnpm install
pnpm --filter @lellimecnar/e2e exec playwright install --with-deps
```

##### Step 4 Verification Checklist
- [ ] Run `pnpm --filter @lellimecnar/e2e test` and verify the example test passes.

#### Step 4 STOP & COMMIT
**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
