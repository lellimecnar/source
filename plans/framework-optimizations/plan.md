# Framework Optimizations

**Branch:** `perf/framework-optimizations`
**Description:** Optimize Next.js and Expo configurations for production performance, security, and developer experience

## Goal

Enhance framework configurations to leverage modern performance optimizations, improve build outputs, strengthen security headers, and enable advanced features for better user and developer experience.

## Implementation Steps

### Step 1: Optimize Next.js Configuration - Miller.pub

**Files:** `web/miller.pub/next.config.js`
**What:** Add comprehensive Next.js optimizations including image optimization, compiler options, security headers, bundle analyzer integration, and experimental features (optimizePackageImports, turbo).
**Testing:** Run `pnpm miller.pub build`; verify build succeeds with smaller bundle sizes; run `ANALYZE=true pnpm miller.pub build` to inspect bundle composition

### Step 2: Optimize Next.js Configuration - Readon.app

**Files:** `web/readon.app/next.config.js`
**What:** Apply same optimization patterns as miller.pub with any app-specific adjustments for features like API routes or specific image domains.
**Testing:** Run `pnpm readon.app build`; compare bundle sizes before/after; test production build locally with `pnpm readon.app start`

### Step 3: Add Bundle Analyzer Dependencies

**Files:** `web/miller.pub/package.json`, `web/readon.app/package.json`, `package.json` (root - add analyze script)
**What:** Install `@next/bundle-analyzer` as dev dependency in both web apps; add `analyze` script to root package.json for convenient bundle analysis.
**Testing:** Run `pnpm analyze miller.pub`; verify bundle analyzer opens in browser with interactive visualization

### Step 4: Enhance Expo Configuration

**Files:** `mobile/readon/app.config.ts`
**What:** Add missing Expo config plugins (`expo-build-properties`, `@lellimecnar/expo-with-modify-gradle`); configure Android/iOS build properties; add splash screen and icon configs.
**Testing:** Run `pnpm readon dev` and `pnpm readon dev:ios`; verify app builds with new configurations on both platforms

### Step 5: Add Security Headers Configuration

**Files:** `web/miller.pub/next.config.js`, `web/readon.app/next.config.js`, `web/*/src/middleware.ts` (create)
**What:** Configure security headers in Next.js (CSP, X-Frame-Options, HSTS, etc.); optionally create middleware for advanced security rules.
**Testing:** Build and run apps; inspect response headers using browser DevTools; verify security headers are present

### Step 6: Enable Turbopack for Development (Optional)

**Files:** `web/miller.pub/next.config.js`, `web/readon.app/next.config.js`, `web/*/package.json` scripts
**What:** Enable Turbopack experimental support for faster development builds; update dev scripts with `--turbo` flag.
**Testing:** Run `pnpm miller.pub dev`; measure cold start time and HMR speed compared to Webpack; ensure no build errors

### Step 7: Configure Output Optimization

**Files:** `web/miller.pub/next.config.js`, `web/readon.app/next.config.js`, `web/*/Dockerfile` (update)
**What:** Set `output: 'standalone'` for optimized Docker builds; update Dockerfiles to use standalone output structure.
**Testing:** Build Docker images; verify significantly smaller image sizes; test containers start and run correctly

### Step 8: Add Performance Monitoring Setup

**Files:** `web/miller.pub/src/app/layout.tsx`, `web/readon.app/src/app/layout.tsx`, `package.json` (add @vercel/analytics or similar)
**What:** Integrate performance monitoring (Vercel Analytics, Google Analytics 4, or Web Vitals reporting) to track real user metrics.
**Testing:** Deploy to staging; verify performance metrics are being collected; check dashboards for Core Web Vitals data

## Optimization Checklist

### Next.js Optimizations

- [x] Image optimization configuration (AVIF, WebP)
- [x] Compiler options (remove console in production, minification)
- [x] Output mode (standalone for Docker)
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Bundle analyzer integration
- [x] Experimental optimizePackageImports
- [x] Optional Turbopack for dev

### Expo Optimizations

- [x] Build properties plugin (SDK versions)
- [x] Native Gradle modification plugin
- [x] Splash screen configuration
- [x] App icon configuration
- [x] EAS Build configuration (future)

## Expected Performance Improvements

**Next.js Build Times:**

- Bundle size reduction: 15-30% (via tree-shaking, minification)
- Dev server startup: 40-80% faster (with Turbopack)
- HMR: 60-90% faster (with Turbopack)

**Next.js Runtime:**

- First Contentful Paint (FCP): 10-20% improvement
- Largest Contentful Paint (LCP): 15-25% improvement
- Image loading: 30-50% faster (modern formats)

**Docker Images:**

- Image size reduction: 40-60% (standalone output)
- Container startup: 30-50% faster

## Notes

- Test thoroughly on staging before production deployment
- Monitor Core Web Vitals after deployment
- Turbopack is still experimental - have fallback plan
- Security headers may require adjustments for third-party scripts
- Document any CSP violations and required adjustments
