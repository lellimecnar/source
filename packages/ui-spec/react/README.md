# @ui-spec/react

React bindings for UI-Spec.

## What it provides

- `UISpecProvider`: wires store + function registry + component adapters
- `UISpecRoot` / `UISpecNode`: renders schema nodes
- `useUISpecValue(path)`: subscribes to store selections

## Component adapters

This package does not import any UI library. Provide component mappings via adapters.
