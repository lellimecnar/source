# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **@data-map/core**: Achieved ~95% specification compliance.
  - Implemented `queueMicrotask` notification batching for async stages.
  - Added fluent, chainable `batch` API.
  - Implemented `defaultValue` support in definitions.
  - Added auto-subscription for definition dependencies (`deps`).
  - Implemented computed value caching and invalidation.
  - Added `get` and `resolve` events with read interception support.
  - Implemented filter re-expansion for dynamic subscriptions.
  - Added `.toPatch()` methods for all array mutation operations.
- Comprehensive documentation structure
- Contributing guidelines
- Security policy
- Code of Conduct
- Package-level READMEs
- Architecture Decision Records (ADR) structure

### Changed

- Enhanced root README with badges and quick start guide
- Updated AGENTS.md to reference new documentation

## [0.0.0] - 2024-01-01

### Added

- Initial project setup with Turborepo
- Web workspaces (miller.pub, readon.app)
- Mobile workspace (readon)
- Shared packages (ui, ui-nativewind, utils, config-\*)
- Card stack engine (core, deck-standard)
