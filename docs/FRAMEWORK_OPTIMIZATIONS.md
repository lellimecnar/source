# Framework Optimizations

This document outlines the performance and framework optimizations implemented to improve the development experience and production build outputs.

## 1. Next.js Standalone Output

To optimize for Docker and reduce image sizes, the Next.js applications (`miller.pub`, `readon.app`) have been configured to use the `output: 'standalone'` option in `next.config.js`.

This feature automatically traces and outputs only the necessary files and `node_modules` required for a production build, significantly reducing the size of the final deployment artifact.

### Dockerfile Implementation

The `Dockerfile` for each web application has been updated to a multi-stage build process:

1.  **`base` stage**: Sets up the base image with the necessary operating system and dependencies.
2.  **`builder` stage**: Installs all dependencies and builds the Next.js application. This stage generates the standalone output in `.next/standalone`.
3.  **`runner` stage**: Copies the standalone output from the `builder` stage into a clean, minimal image. It then installs only the production dependencies and runs the Next.js server.

This approach ensures that the final Docker image is as small as possible, containing only what's needed to run the application in production.

**Example `next.config.js`:**

```javascript
const nextConfig = {
	output: 'standalone',
	// ... other configurations
};
```

## 2. Turbopack for Development

To accelerate local development, Turbopack has been enabled for the `dev` script in the Next.js applications. Turbopack is a high-performance bundler written in Rust, offering significant speed improvements over Webpack for development servers.

The `dev` script in the `package.json` for `miller.pub` and `readon.app` has been updated to include the `--turbo` flag.

**Example `package.json` script:**

```json
"scripts": {
  "dev": "next dev --turbo",
  // ... other scripts
}
```

This change provides a faster and more responsive development environment, improving developer productivity.
