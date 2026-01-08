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

### Fixed

- **@data-map/benchmarks**: Fixed benchmark methodology to exclude setup costs
  - Pre-clone input data outside of timed loops
  - Separate mutation-style adapter paths (no `cloneInitial`)
  - Ensure measurements reflect actual operation cost, not framework overhead
  - Add documentation to clarify what each benchmark measures

- **@data-map/core**: Performance optimizations
  - Verify `clone()` implementation avoids redundant cloning
  - Add `getRawData()` internal fast-path for direct data access without cloning
  - Ensure zero-subscriber fast paths skip all notification overhead
  - Verify structural sharing is used in patch building and applies operations
  - Confirm pointer-first mutation path uses `setAtPointer()` for O(depth) writes

- **docs**: Update PERFORMANCE_AUDIT_EXHAUSTIVE.md with methodology notes about benchmark harness corrections

## [0.0.0] - 2024-01-01

### Added

- Initial project setup with Turborepo
- Web workspaces (miller.pub, readon.app)
- Mobile workspace (readon)
- Shared packages (ui, ui-nativewind, utils, config-\*)
- Card stack engine (core, deck-standard)
