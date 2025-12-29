# @lellimecnar/source

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Monorepo](https://img.shields.io/badge/monorepo-turborepo-ef4444)

> A pnpm + Turborepo monorepo containing web applications (Next.js), mobile applications (Expo), shared UI libraries, and a card game engine.

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/lellimecnar/source.git
cd source
pnpm install
```

### 2. Start Development

```bash
pnpm dev
```

This will start all applications and packages in development mode:

- **Web:** [http://localhost:3000](http://localhost:3000) (miller.pub)
- **Web:** [http://localhost:3001](http://localhost:3001) (readon.app)
- **Mobile:** Metro bundler for Expo (readon)

## 📂 Project Structure

```
.
├── web/                 # Next.js applications
│   ├── miller.pub       # Personal portfolio
│   └── readon.app       # Reading app web interface
├── mobile/              # Mobile applications
│   └── readon           # Expo/React Native app
├── packages/            # Shared libraries
│   ├── ui               # Web UI components (shadcn/ui)
│   ├── ui-nativewind    # Mobile UI components (NativeWind)
│   ├── utils            # Shared utilities
│   └── config-*         # Shared configurations (eslint, ts, etc.)
└── packages/card-stack/ # Domain logic
    ├── core             # Card game engine
    └── deck-standard    # Standard 52-card deck
```

## 📚 Documentation

- **[Developer Guide (AGENTS.md)](./AGENTS.md):** Primary entry point for developers and AI agents.
- **[Contributing](./CONTRIBUTING.md):** Guidelines for contributing to the project.
- **[Security](./SECURITY.md):** Security policy and secret management.
- **[Changelog](./CHANGELOG.md):** Version history.
- **[Code of Conduct](./CODE_OF_CONDUCT.md):** Community standards.

### Blueprints

- [Architecture](./Project_Architecture_Blueprint.md)
- [Folder Structure](./Project_Folders_Structure_Blueprint.md)
- [Tech Stack](./Technology_Stack_Blueprint.md)
- [Workflows](./Project_Workflow_Documentation.md)

## 🛠️ Key Commands

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `pnpm dev`               | Start all apps in development mode                 |
| `pnpm build`             | Build all apps and packages                        |
| `#tool:execute/runTests` | Run unit tests (preferred VS Code tool)            |
| `pnpm lint`              | Lint all code                                      |
| `pnpm clean`             | Remove all build artifacts and node_modules        |
| `pnpm ui ui`             | Add a new shadcn/ui component to `@lellimecnar/ui` |

## 📄 License

MIT © [lellimecnar](https://github.com/lellimecnar)
