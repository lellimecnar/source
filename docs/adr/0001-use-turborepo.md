# Use Turborepo for Monorepo Management

- Status: accepted
- Date: 2024-01-01

## Context and Problem Statement

We need a way to manage multiple applications (web, mobile) and shared packages in a single repository efficiently. We need fast build times and easy dependency management.

## Decision Outcome

Chosen option: "Turborepo", because it provides high-performance build caching, parallel execution, and excellent support for the pnpm workspace protocol.

### Positive Consequences

- Fast CI/CD pipelines due to caching.
- Consistent tooling across workspaces.
- Easy to run tasks for specific scopes.
