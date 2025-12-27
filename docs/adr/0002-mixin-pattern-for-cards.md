# Use Mixin Pattern for Card Game Engine

- Status: accepted
- Date: 2024-01-01

## Context and Problem Statement

Card games require cards to have various capabilities (flipping, ranking, suiting) that can be combined in different ways. Traditional inheritance leads to rigid hierarchies and code duplication.

## Decision Outcome

Chosen option: "TypeScript Mixins (ts-mixer)", because it allows for flexible composition of behaviors.

### Positive Consequences

- Cards can be composed of only the behaviors they need.
- Avoids "God classes" or deep inheritance trees.
- Type-safe composition.
