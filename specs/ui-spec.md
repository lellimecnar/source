# UI-Spec

## A Declarative JSON-to-UI Framework for Complete Web Applications

**Version:** 1.0.0 Specification  
**Status:** Design Document  
**License:** MIT

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Philosophy](#design-philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Core Schema Specification](#core-schema-specification)
5. [Component System](#component-system)
6. [Data Layer & Reactivity](#data-layer--reactivity)
7. [Function Embedding (UIScript)](#function-embedding-uiscript)
8. [Styling System](#styling-system)
9. [Routing & Navigation](#routing--navigation)
10. [Validation System](#validation-system)
11. [Framework Bindings](#framework-bindings)
12. [TypeScript Integration](#typescript-integration)
13. [Extension System](#extension-system)
14. [Security Model](#security-model)
15. [Developer Tools](#developer-tools)
16. [Complete Examples](#complete-examples)
17. [Comparison with Existing Solutions](#comparison-with-existing-solutions)
18. [Migration Guide](#migration-guide)
19. [Appendices](#appendices)

---

## Executive Summary

**UI-Spec** is a framework-agnostic library for rendering complete web applications from JSON specifications. Unlike form-focused libraries (RJSF, JSON Forms), UI-Spec handles everything from simple embedded widgets to entire SPAs with routing (via optional add-on), state management, and complex component hierarchies.

### Key Differentiators

| Feature                 | UI-Spec       | RJSF            | JSON Forms      | Uniforms        |
| ----------------------- | ------------- | --------------- | --------------- | --------------- |
| Full SPA Support        | ✅            | ❌              | ❌              | ❌              |
| Bi-directional Binding  | ✅            | Partial         | Partial         | Partial         |
| Embedded Functions      | ✅ (UIScript) | ❌              | ❌              | ❌              |
| Framework Agnostic      | ✅            | React only      | ✅              | React only      |
| JSONPath Data Selection | ✅            | ❌              | ❌              | ❌              |
| Routing from JSON       | ✅ (add-on)   | ❌              | ❌              | ❌              |
| TailwindCSS Native      | ✅            | Theme-dependent | Theme-dependent | Theme-dependent |
| Component Composition   | ✅            | Limited         | Limited         | Limited         |
| Server-Driven UI        | ✅            | Partial         | Partial         | Partial         |

### Core Principles

1. **JSON as Truth**: The entire UI is described in JSON—portable, versionable, and API-deliverable
2. **Progressive Enhancement**: Start simple, add complexity only where needed
3. **Type Safety**: Full TypeScript inference from JSON schemas
4. **Zero Lock-in**: Framework bindings are adapters, not requirements
5. **Performance First**: Surgical reactivity, lazy loading, virtualization built-in

---

## Design Philosophy

### Why UI-Spec?

Modern applications increasingly require **server-driven UI**—the ability to push UI changes without app updates. This is critical for:

- A/B testing at scale
- Feature flags with UI changes
- Multi-tenant customization
- Rapid prototyping
- Low-code/no-code platforms
- CMS-driven experiences

Existing solutions (RJSF, JSON Forms) solve forms well but lack:

1. **Complete application structure** (routing, layouts, navigation)
2. **Rich interactivity** (embedded logic, computed values)
3. **Bidirectional data flow** (not just form → data, but data → UI)
4. **Component composition** (referencing and extending components)

### Design Decisions

#### Decision 1: JSONPath for Data Selection

**Choice**: JSONPath over custom syntax
**Rationale**: JSONPath is a well-known standard with existing tooling, parsers, and developer familiarity. It handles complex nested data selection elegantly.

**Implementation requirement**: UI-Spec MUST use the `json-p3` package to evaluate JSONPath expressions.

```json
{
	"bind": "$.users[?(@.active)].name"
}
```

#### Decision 2: TailwindCSS-Centric Styling

**Choice**: First-class Tailwind support with escape hatches  
**Rationale**: Tailwind's utility-first approach maps naturally to JSON—classes are strings, responsive prefixes are predictable, and the design token system provides consistency without CSS-in-JS complexity.

```json
{
	"class": "flex items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
}
```

#### Decision 3: UIScript for Embedded Functions

**Choice**: Safe, serializable function syntax inspired by jsonfn  
**Rationale**: Pure JSON cannot express behavior. UIScript provides a controlled subset of JavaScript that can be serialized, transmitted, and safely evaluated.

```json
{
	"onClick": {
		"$fn": "(ctx) => ctx.set('count', ctx.get('count') + 1)"
	}
}
```

#### Decision 4: Framework-Agnostic Core

**Choice**: Pure JavaScript core with binding packages  
**Rationale**: The UI ecosystem is fragmented. By keeping the core framework-free, UI-Spec can be adopted incrementally in any stack. Bindings translate the core's virtual component tree to framework-specific renderers.

#### Decision 5: Plugin Architecture for Validation

**Choice**: Pluggable validators over built-in validation  
**Rationale**: Teams have existing validation investments (Zod schemas, Yup configs, JSON Schema). UI-Spec shouldn't force migration—it should integrate.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UI-Spec Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Schema    │    │    Data     │    │  Functions  │                 │
│  │    (JSON)   │    │   Store     │    │ (UIScript)              │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            ▼                                            │
│                   ┌─────────────────┐                                   │
│                   │   UI-Spec Core  │                                   │
│                   │                 │                                   │
│                   │  • Parser       │                                   │
│                   │  • Resolver     │                                   │
│                   │  • Reconciler   │                                   │
│                   │  • Scheduler    │                                   │
│                   └────────┬────────┘                                   │
│                            │                                            │
│         ┌──────────────────┼──────────────────┐                         │
│         ▼                  ▼                  ▼                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   React     │    │    Vue      │    │   Svelte    │    ...          │
│  │   Binding   │    │   Binding   │    │   Binding   │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Plugin System                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │  Zod    │  │  Yup    │  │ JSON    │  │ Custom  │            │   │
│  │  │Validator│  │Validator│  │ Schema  │  │Validator│            │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
@ui-spec/core          # Framework-agnostic core (parser, resolver, store)

# Framework Bindings
@ui-spec/react         # React binding
@ui-spec/vue           # Vue 3 binding
@ui-spec/svelte        # Svelte binding
@ui-spec/solid         # SolidJS binding
@ui-spec/web           # Web Components binding
@ui-spec/angular       # Angular binding

# Optional Add-ons
@ui-spec/router        # SPA routing (optional)
@ui-spec/router-react  # React router integration
@ui-spec/router-vue    # Vue Router integration
@ui-spec/router-svelte # SvelteKit routing integration

# Validation Plugins
@ui-spec/validate-zod        # Zod validation plugin
@ui-spec/validate-yup        # Yup validation plugin
@ui-spec/validate-jsonschema # JSON Schema validation plugin
@ui-spec/validate-valibot    # Valibot validation plugin

# UI Component Libraries
@ui-spec/ui-tailwind   # Tailwind-styled component library
@ui-spec/ui-shadcn     # shadcn/ui component library
@ui-spec/ui-headless   # Unstyled accessible components

# Tooling
@ui-spec/devtools      # Browser extension & debugging tools
@ui-spec/cli           # Schema validation, code generation
@ui-spec/server        # Server-side rendering utilities
```

---

## Core Schema Specification

### Root Schema

Every UI-Spec application starts with a root schema defining the application structure:

```typescript
interface UISpecSchema {
	$uispec: '1.0'; // Schema version
	$id?: string; // Schema identifier

	// Application metadata
	meta?: {
		title?: string;
		description?: string;
		theme?: ThemeConfig;
		locale?: string;
	};

	// Initial data state
	data?: Record<string, unknown>;

	// Component definitions (reusable)
	components?: Record<string, ComponentSchema>;

	// Root node (required for non-routed apps, optional if using router)
	root?: NodeSchema;

	// Route definitions (requires @ui-spec/router)
	// When using routes, root becomes the app shell/layout
	routes?: RouteSchema[];

	// Global functions
	functions?: Record<string, FunctionSchema>;

	// Plugin configuration
	plugins?: PluginConfig[];
}
```

> **Note:** The `routes` property requires the `@ui-spec/router` package. Without it, UI-Spec renders static component trees from the `root` property. This makes UI-Spec suitable for embedded widgets, micro-frontends, and server-driven UI fragments without the overhead of a full router.

````

### Node Schema

The fundamental building block—every UI element is a node:

```typescript
interface NodeSchema {
  // Node identification
  $id?: string;                        // Unique identifier for refs
  $ref?: string;                       // Reference to defined component

  // Component type
  type: string;                        // Built-in or custom component

  // Props and attributes
  props?: Record<string, PropValue>;

  // Children
  children?: NodeSchema[] | string | BindingExpression;

  // Conditional rendering
  $if?: BindingExpression | FunctionSchema;
  $else?: NodeSchema;
  $switch?: SwitchSchema;

  // Iteration
  $for?: ForSchema;

  // Data binding
  $bind?: BindingSchema;

  // Event handlers
  $on?: Record<string, FunctionSchema>;

  // Styling
  class?: string | string[] | BindingExpression;
  style?: Record<string, string | BindingExpression>;

  // Slots for composition
  $slots?: Record<string, NodeSchema[]>;

  // Lifecycle hooks
  $mounted?: FunctionSchema;
  $unmounted?: FunctionSchema;
  $updated?: FunctionSchema;
}
````

### Example: Simple Counter

```json
{
	"$uispec": "1.0",
	"data": {
		"count": 0
	},
	"root": {
		"type": "div",
		"class": "flex flex-col items-center gap-4 p-8",
		"children": [
			{
				"type": "h1",
				"class": "text-4xl font-bold text-gray-900 dark:text-white",
				"children": "Counter App"
			},
			{
				"type": "div",
				"class": "text-6xl font-mono tabular-nums",
				"children": { "$path": "$.count" }
			},
			{
				"type": "div",
				"class": "flex gap-2",
				"children": [
					{
						"type": "Button",
						"props": { "variant": "outline" },
						"$on": {
							"click": {
								"$fn": "(ctx) => ctx.set('$.count', ctx.get('$.count') - 1)"
							}
						},
						"children": "−"
					},
					{
						"type": "Button",
						"props": { "variant": "primary" },
						"$on": {
							"click": {
								"$fn": "(ctx) => ctx.set('$.count', ctx.get('$.count') + 1)"
							}
						},
						"children": "+"
					}
				]
			}
		]
	}
}
```

---

## Component System

### Built-in Components

UI-Spec provides a set of primitive components that map to HTML elements and common UI patterns:

#### Primitives (HTML Mapping)

```typescript
// All HTML elements are available as primitives
type PrimitiveComponents =
	| 'div'
	| 'span'
	| 'p'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'a'
	| 'button'
	| 'input'
	| 'textarea'
	| 'select'
	| 'option'
	| 'form'
	| 'label'
	| 'fieldset'
	| 'legend'
	| 'ul'
	| 'ol'
	| 'li'
	| 'dl'
	| 'dt'
	| 'dd'
	| 'table'
	| 'thead'
	| 'tbody'
	| 'tfoot'
	| 'tr'
	| 'th'
	| 'td'
	| 'img'
	| 'video'
	| 'audio'
	| 'canvas'
	| 'svg'
	| 'header'
	| 'footer'
	| 'main'
	| 'nav'
	| 'aside'
	| 'section'
	| 'article'
	| 'dialog'
	| 'details'
	| 'summary';
// ... all standard HTML elements
```

#### Layout Components

```json
{
  "type": "Stack",
  "props": {
    "direction": "vertical",
    "gap": 4,
    "align": "center"
  },
  "children": [...]
}
```

```json
{
  "type": "Grid",
  "props": {
    "cols": { "default": 1, "md": 2, "lg": 3 },
    "gap": 6
  },
  "children": [...]
}
```

```json
{
  "type": "Container",
  "props": {
    "maxWidth": "xl",
    "padding": true
  },
  "children": [...]
}
```

#### Form Components

```json
{
	"type": "Form",
	"props": {
		"schema": { "$ref": "#/schemas/userForm" },
		"onSubmit": {
			"$fn": "async (ctx, data) => await ctx.api.post('/users', data)"
		}
	},
	"$bind": {
		"path": "$.formData",
		"mode": "two-way"
	},
	"children": [
		{
			"type": "TextField",
			"props": {
				"name": "email",
				"label": "Email Address",
				"type": "email",
				"required": true
			}
		},
		{
			"type": "TextField",
			"props": {
				"name": "password",
				"label": "Password",
				"type": "password",
				"minLength": 8
			}
		},
		{
			"type": "Button",
			"props": { "type": "submit", "variant": "primary" },
			"children": "Sign In"
		}
	]
}
```

#### Data Display Components

```json
{
	"type": "DataTable",
	"props": {
		"columns": [
			{ "key": "name", "header": "Name", "sortable": true },
			{ "key": "email", "header": "Email" },
			{ "key": "role", "header": "Role", "filterable": true }
		],
		"pageSize": 10,
		"selectable": true
	},
	"$bind": {
		"path": "$.users",
		"selected": "$.selectedUsers"
	}
}
```

#### Navigation Components

```json
{
	"type": "NavLink",
	"props": {
		"to": "/dashboard",
		"activeClass": "text-blue-600 font-semibold"
	},
	"children": "Dashboard"
}
```

### Custom Component Definition

Define reusable components in the `components` section:

```json
{
	"$uispec": "1.0",
	"components": {
		"UserCard": {
			"props": {
				"user": { "type": "object", "required": true },
				"showActions": { "type": "boolean", "default": true }
			},
			"template": {
				"type": "div",
				"class": "bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow",
				"children": [
					{
						"type": "div",
						"class": "flex items-center gap-4",
						"children": [
							{
								"type": "Avatar",
								"props": {
									"src": { "$path": "$props.user.avatar" },
									"alt": { "$path": "$props.user.name" },
									"size": "lg"
								}
							},
							{
								"type": "div",
								"children": [
									{
										"type": "h3",
										"class": "font-semibold text-gray-900",
										"children": { "$path": "$props.user.name" }
									},
									{
										"type": "p",
										"class": "text-sm text-gray-500",
										"children": { "$path": "$props.user.email" }
									}
								]
							}
						]
					},
					{
						"$if": { "$path": "$props.showActions" },
						"type": "div",
						"class": "mt-4 flex gap-2",
						"children": [
							{
								"type": "Button",
								"props": { "variant": "outline", "size": "sm" },
								"$on": {
									"click": {
										"$emit": "edit",
										"payload": { "$path": "$props.user" }
									}
								},
								"children": "Edit"
							},
							{
								"type": "Button",
								"props": { "variant": "ghost", "size": "sm" },
								"$on": {
									"click": {
										"$emit": "delete",
										"payload": { "$path": "$props.user.id" }
									}
								},
								"children": "Delete"
							}
						]
					}
				]
			}
		}
	}
}
```

### Component Usage

```json
{
	"type": "UserCard",
	"props": {
		"user": { "$path": "$.currentUser" },
		"showActions": true
	},
	"$on": {
		"edit": { "$fn": "(ctx, user) => ctx.navigate(`/users/${user.id}/edit`)" },
		"delete": { "$fn": "(ctx, id) => ctx.call('deleteUser', id)" }
	}
}
```

### Component Inheritance and Extension

```json
{
	"components": {
		"BaseCard": {
			"props": {
				"title": { "type": "string" },
				"padding": { "type": "string", "default": "p-6" }
			},
			"template": {
				"type": "div",
				"class": [
					"bg-white rounded-xl shadow-md",
					{ "$path": "$props.padding" }
				],
				"children": [
					{
						"$if": { "$path": "$props.title" },
						"type": "h2",
						"class": "text-xl font-bold mb-4",
						"children": { "$path": "$props.title" }
					},
					{
						"type": "Slot",
						"props": { "name": "default" }
					}
				]
			}
		},
		"MetricCard": {
			"$extends": "BaseCard",
			"props": {
				"value": { "type": "number", "required": true },
				"label": { "type": "string", "required": true },
				"trend": { "type": "number" },
				"format": { "type": "string", "default": "number" }
			},
			"template": {
				"type": "BaseCard",
				"props": { "padding": "p-4" },
				"$slots": {
					"default": [
						{
							"type": "div",
							"class": "text-3xl font-bold tabular-nums",
							"children": {
								"$fn": "(ctx) => ctx.format(ctx.props.value, ctx.props.format)"
							}
						},
						{
							"type": "div",
							"class": "text-sm text-gray-500 mt-1",
							"children": { "$path": "$props.label" }
						},
						{
							"$if": { "$path": "$props.trend" },
							"type": "TrendIndicator",
							"props": { "value": { "$path": "$props.trend" } }
						}
					]
				}
			}
		}
	}
}
```

---

## Data Layer & Reactivity

### Store Architecture

UI-Spec uses a reactive store based on JSONPath for data access.

**Implementation requirement**:

- JSONPath evaluation MUST be implemented via the `json-p3` package.
- All data mutations MUST be applied using JSON Patch operations (RFC 6902).

```typescript
interface UISpecStore {
	// Read operations
	get<T>(path: string): T;
	select<T>(path: string): Observable<T>; // Reactive subscription

	// Write operations
	patch(operations: JsonPatchOperation[]): void;
	set(path: string, value: unknown): void;
	update(path: string, updater: (current: unknown) => unknown): void;
	merge(path: string, partial: Record<string, unknown>): void;

	// Array operations
	push(path: string, ...items: unknown[]): void;
	remove(path: string, predicate: (item: unknown) => boolean): void;

	// Batch operations
	batch(operations: StoreOperation[]): void;
	transaction(fn: (store: UISpecStore) => void): void;

	// Computed values
	computed<T>(
		path: string,
		deps: string[],
		compute: (...values: unknown[]) => T,
	): void;
}
```

### JSONPath Binding

```json
{
	"$uispec": "1.0",
	"data": {
		"user": {
			"profile": {
				"firstName": "Jane",
				"lastName": "Doe",
				"preferences": {
					"theme": "dark",
					"notifications": true
				}
			},
			"orders": [
				{ "id": 1, "status": "delivered", "total": 99.99 },
				{ "id": 2, "status": "pending", "total": 149.99 }
			]
		}
	},
	"root": {
		"type": "div",
		"children": [
			{
				"type": "span",
				"children": { "$path": "$.user.profile.firstName" }
			},
			{
				"type": "span",
				"children": {
					"$path": "$.user.orders[?(@.status=='pending')].total",
					"$transform": {
						"$fn": "(values) => `$${values.reduce((a,b) => a+b, 0).toFixed(2)}`"
					}
				}
			}
		]
	}
}
```

### Binding Modes

```typescript
interface BindingSchema {
	path: string; // JSONPath expression
	mode?: 'read' | 'write' | 'two-way'; // Binding direction
	transform?: FunctionSchema; // Transform on read
	parse?: FunctionSchema; // Parse on write
	debounce?: number; // Debounce writes (ms)
	throttle?: number; // Throttle updates (ms)
	validate?: string | FunctionSchema; // Validation before write
}
```

#### Read-Only Binding (Default)

```json
{
	"type": "span",
	"children": { "$path": "$.user.name" }
}
```

#### Two-Way Binding

```json
{
	"type": "input",
	"$bind": {
		"path": "$.formData.email",
		"mode": "two-way",
		"debounce": 300
	}
}
```

#### Binding with Transformation

```json
{
	"type": "span",
	"$bind": {
		"path": "$.items",
		"transform": { "$fn": "(items) => items.filter(i => i.active).length" }
	},
	"children": { "$path": "$binding" }
}
```

### Computed Values

Define derived state that automatically updates:

```json
{
	"$uispec": "1.0",
	"data": {
		"cart": {
			"items": [],
			"discount": 0
		}
	},
	"computed": {
		"$.cart.subtotal": {
			"deps": ["$.cart.items"],
			"compute": {
				"$fn": "(items) => items.reduce((sum, i) => sum + i.price * i.qty, 0)"
			}
		},
		"$.cart.total": {
			"deps": ["$.cart.subtotal", "$.cart.discount"],
			"compute": { "$fn": "(subtotal, discount) => subtotal * (1 - discount)" }
		},
		"$.cart.itemCount": {
			"deps": ["$.cart.items"],
			"compute": {
				"$fn": "(items) => items.reduce((sum, i) => sum + i.qty, 0)"
			}
		}
	}
}
```

### Async Data

```json
{
	"type": "AsyncBoundary",
	"props": {
		"source": {
			"$async": {
				"url": "/api/users",
				"method": "GET",
				"cache": "5m",
				"staleWhileRevalidate": true
			}
		},
		"target": "$.users"
	},
	"$slots": {
		"loading": {
			"type": "Skeleton",
			"props": { "count": 5 }
		},
		"error": {
			"type": "ErrorMessage",
			"props": { "message": { "$path": "$error.message" } }
		},
		"default": {
			"type": "UserList",
			"props": { "users": { "$path": "$.users" } }
		}
	}
}
```

---

## Function Embedding (UIScript)

### Overview

UIScript enables embedding executable logic in JSON while maintaining serializability and security.

### Function Schema

```typescript
interface FunctionSchema {
	$fn: string; // Function body as string
	$async?: boolean; // Is async function
	$debounce?: number; // Debounce execution
	$throttle?: number; // Throttle execution
	$memo?: boolean | string[]; // Memoize with deps
}
```

### Context Object

Every function receives a context object:

```typescript
interface UISpecContext {
	// Data access
	get(path: string): unknown;
	patch(operations: JsonPatchOperation[]): void;
	set(path: string, value: unknown): void;
	update(path: string, fn: (v: unknown) => unknown): void;

	// Current scope
	props: Record<string, unknown>; // Component props
	state: Record<string, unknown>; // Local component state
	refs: Record<string, Element>; // DOM/component refs

	// Event context (in event handlers)
	event?: Event;

	// Navigation (requires @ui-spec/router)
	navigate?(path: string, options?: NavigateOptions): void;
	back?(): void;
	route?: RouteContext; // Current route info

	// Component communication
	emit(event: string, payload?: unknown): void;
	call(functionName: string, ...args: unknown[]): Promise<unknown>;

	// HTTP
	api: {
		get(url: string, config?: RequestConfig): Promise<unknown>;
		post(url: string, data: unknown, config?: RequestConfig): Promise<unknown>;
		put(url: string, data: unknown, config?: RequestConfig): Promise<unknown>;
		delete(url: string, config?: RequestConfig): Promise<unknown>;
	};

	// Utilities
	format(value: unknown, format: string): string;
	validate(value: unknown, schema: string): ValidationResult;

	// Environment
	env: Record<string, string>;
}
```

Notes:

- `set`, `update`, `merge`, `push`, and `remove` are convenience helpers that MUST be implemented by generating JSON Patch operations and applying them via `patch(...)`.
- When a write helper takes a JSONPath, it MUST resolve to exactly one target location (otherwise it MUST throw a descriptive error).

> **Note:** The `navigate`, `back`, and `route` properties are only available when `@ui-spec/router` is installed. Attempting to use them without the router will throw a descriptive error.

````

### Function Examples

#### Event Handler

```json
{
  "type": "Button",
  "$on": {
    "click": {
      "$fn": "(ctx) => { ctx.set('$.loading', true); ctx.emit('submit'); }"
    }
  }
}
````

#### Async Handler

```json
{
	"type": "Form",
	"$on": {
		"submit": {
			"$fn": "async (ctx, formData) => { const result = await ctx.api.post('/users', formData); ctx.set('$.user', result); ctx.navigate('/dashboard'); }",
			"$async": true
		}
	}
}
```

#### Computed Property

```json
{
	"type": "span",
	"children": {
		"$fn": "(ctx) => `${ctx.get('$.user.firstName')} ${ctx.get('$.user.lastName')}`",
		"$memo": ["$.user.firstName", "$.user.lastName"]
	}
}
```

#### Conditional with Function

```json
{
	"type": "AdminPanel",
	"$if": {
		"$fn": "(ctx) => ctx.get('$.user.roles').includes('admin')"
	}
}
```

### Named Functions

Define reusable functions at the schema root:

```json
{
	"$uispec": "1.0",
	"functions": {
		"formatCurrency": {
			"$fn": "(ctx, amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)"
		},
		"deleteUser": {
			"$fn": "async (ctx, userId) => { await ctx.api.delete(`/users/${userId}`); ctx.update('$.users', users => users.filter(u => u.id !== userId)); }",
			"$async": true
		},
		"toggleTheme": {
			"$fn": "(ctx) => ctx.update('$.settings.theme', t => t === 'dark' ? 'light' : 'dark')"
		}
	}
}
```

Usage:

```json
{
	"type": "span",
	"children": { "$call": ["formatCurrency", { "$path": "$.order.total" }] }
}
```

```json
{
	"type": "Button",
	"$on": {
		"click": { "$call": ["deleteUser", { "$path": "$.selectedUser.id" }] }
	}
}
```

### Expression Syntax (Short Form)

For simple expressions, use the `$expr` shorthand:

```json
{
	"type": "span",
	"class": {
		"$expr": "$.count > 10 ? 'text-green-500' : 'text-red-500'"
	}
}
```

```json
{
	"type": "div",
	"$if": { "$expr": "$.user && $.user.isAdmin" }
}
```

---

## Styling System

### Tailwind-First Approach

Classes are the primary styling mechanism:

```json
{
	"type": "div",
	"class": "flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow"
}
```

### Dynamic Classes

#### Array Syntax

```json
{
	"type": "button",
	"class": [
		"px-4 py-2 rounded-lg font-medium transition-colors",
		{
			"$path": "$props.variant",
			"$map": {
				"primary": "bg-blue-500 text-white hover:bg-blue-600",
				"secondary": "bg-gray-200 text-gray-800 hover:bg-gray-300",
				"danger": "bg-red-500 text-white hover:bg-red-600"
			}
		},
		{
			"$if": { "$path": "$props.disabled" },
			"$then": "opacity-50 cursor-not-allowed"
		}
	]
}
```

#### Conditional Classes

```json
{
	"type": "div",
	"class": {
		"$classes": {
			"bg-green-100 border-green-500": { "$expr": "$.status === 'success'" },
			"bg-red-100 border-red-500": { "$expr": "$.status === 'error'" },
			"bg-yellow-100 border-yellow-500": { "$expr": "$.status === 'warning'" },
			"border-l-4 p-4 rounded": true
		}
	}
}
```

### Responsive Design

Tailwind's responsive prefixes work naturally:

```json
{
	"type": "Grid",
	"class": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
}
```

For complex responsive props:

```json
{
	"type": "Container",
	"props": {
		"padding": { "default": 4, "md": 6, "lg": 8 }
	}
}
```

### Theme System

```json
{
	"$uispec": "1.0",
	"meta": {
		"theme": {
			"colors": {
				"primary": {
					"50": "#eff6ff",
					"500": "#3b82f6",
					"600": "#2563eb",
					"700": "#1d4ed8"
				},
				"secondary": {
					"500": "#6366f1"
				}
			},
			"fonts": {
				"sans": "Inter, system-ui, sans-serif",
				"mono": "JetBrains Mono, monospace"
			},
			"spacing": {
				"container": "1280px"
			}
		}
	}
}
```

Usage with theme tokens:

```json
{
	"type": "button",
	"class": "bg-primary-500 hover:bg-primary-600 text-white"
}
```

### Style Prop (Escape Hatch)

For dynamic inline styles:

```json
{
	"type": "div",
	"style": {
		"width": { "$fn": "(ctx) => `${ctx.get('$.progress')}%`" },
		"backgroundColor": { "$path": "$.settings.accentColor" }
	}
}
```

### CSS Modules Support

```json
{
	"type": "div",
	"class": {
		"$css": "styles.container"
	}
}
```

---

## Routing & Navigation

> **Package:** `@ui-spec/router` (optional add-on)
>
> Routing is not part of the core UI-Spec package. Install `@ui-spec/router` for SPA navigation capabilities. This keeps the core lightweight for use cases like embedded widgets, micro-frontends, and server-rendered partials.

### Installation

```bash
# Core only (no routing)
npm install @ui-spec/core @ui-spec/react

# With routing
npm install @ui-spec/core @ui-spec/react @ui-spec/router @ui-spec/router-react
```

### Usage with React

```tsx
import { UISpecProvider } from '@ui-spec/react';
import { UISpecRouter } from '@ui-spec/router-react';
import schema from './app.uispec.json';

function App() {
	return (
		<UISpecProvider schema={schema}>
			<UISpecRouter />
		</UISpecProvider>
	);
}
```

### Usage without Routing

For embedded components or widgets, use UI-Spec without the router:

```tsx
import { UISpecProvider, UISpecNode } from '@ui-spec/react';
import schema from './widget.uispec.json';

function EmbeddedWidget() {
	return (
		<UISpecProvider schema={schema}>
			<UISpecNode schema={schema.root} />
		</UISpecProvider>
	);
}
```

### Route Definition

```json
{
	"$uispec": "1.0",
	"routes": [
		{
			"path": "/",
			"component": { "$ref": "#/components/HomePage" },
			"meta": { "title": "Home" }
		},
		{
			"path": "/dashboard",
			"component": { "$ref": "#/components/DashboardLayout" },
			"meta": { "requiresAuth": true },
			"children": [
				{
					"path": "",
					"component": { "$ref": "#/components/DashboardHome" }
				},
				{
					"path": "analytics",
					"component": { "$ref": "#/components/Analytics" }
				},
				{
					"path": "settings",
					"component": { "$ref": "#/components/Settings" }
				}
			]
		},
		{
			"path": "/users/:id",
			"component": { "$ref": "#/components/UserProfile" },
			"props": true
		},
		{
			"path": "/search",
			"component": { "$ref": "#/components/SearchResults" },
			"props": {
				"query": { "$query": "q" },
				"page": { "$query": "page", "default": 1, "type": "number" }
			}
		},
		{
			"path": "*",
			"component": { "$ref": "#/components/NotFound" }
		}
	]
}
```

### Route Parameters

Access route params via special paths:

```json
{
	"type": "UserProfile",
	"props": {
		"userId": { "$route.params": "id" }
	}
}
```

### Navigation Guards

```json
{
	"routes": [
		{
			"path": "/admin",
			"component": { "$ref": "#/components/AdminPanel" },
			"beforeEnter": {
				"$fn": "(ctx, to, from) => { if (!ctx.get('$.user.isAdmin')) { return '/unauthorized'; } return true; }",
				"$async": true
			}
		}
	]
}
```

### Programmatic Navigation

```json
{
	"type": "Button",
	"$on": {
		"click": {
			"$fn": "(ctx) => ctx.navigate('/users/' + ctx.get('$.selectedUser.id'), { replace: false })"
		}
	}
}
```

### Router Components

The `@ui-spec/router` package provides these components:

- `RouterOutlet` — Renders the matched route's component
- `NavLink` — Navigation link with active state styling
- `RouterView` — Alternative name for RouterOutlet

#### Route Outlet

```json
{
	"type": "div",
	"class": "flex",
	"children": [
		{
			"type": "Sidebar",
			"props": { "menu": { "$path": "$.navigation" } }
		},
		{
			"type": "main",
			"class": "flex-1 p-6",
			"children": [{ "type": "RouterOutlet" }]
		}
	]
}
```

### Lazy Loading Routes

```json
{
	"routes": [
		{
			"path": "/reports",
			"component": {
				"$lazy": {
					"loader": "/schemas/reports.json",
					"loading": { "$ref": "#/components/PageSkeleton" }
				}
			}
		}
	]
}
```

---

## Validation System

### Plugin Architecture

UI-Spec validation is pluggable—bring your own validation library:

```typescript
interface ValidationPlugin {
	name: string;

	// Compile a schema definition into a validator
	compile(schema: unknown): CompiledValidator;

	// Validate a value
	validate(validator: CompiledValidator, value: unknown): ValidationResult;

	// Get field-level errors
	getFieldErrors(result: ValidationResult): Map<string, string[]>;
}

interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

interface ValidationError {
	path: string;
	message: string;
	code: string;
}
```

### JSON Schema Validation

```json
{
	"$uispec": "1.0",
	"plugins": [{ "name": "@ui-spec/validate-jsonschema" }],
	"schemas": {
		"userForm": {
			"type": "object",
			"required": ["email", "password"],
			"properties": {
				"email": {
					"type": "string",
					"format": "email"
				},
				"password": {
					"type": "string",
					"minLength": 8,
					"pattern": "^(?=.*[A-Z])(?=.*[0-9])"
				},
				"age": {
					"type": "integer",
					"minimum": 18
				}
			}
		}
	}
}
```

### Zod Validation

```typescript
// uispec.config.ts
import { z } from 'zod';
import { zodPlugin } from '@ui-spec/validate-zod';

export const schemas = {
	userForm: z.object({
		email: z.string().email(),
		password: z
			.string()
			.min(8)
			.regex(/^(?=.*[A-Z])(?=.*[0-9])/),
		age: z.number().int().min(18).optional(),
	}),
};

export default {
	plugins: [zodPlugin({ schemas })],
};
```

```json
{
	"type": "Form",
	"props": {
		"schema": "userForm",
		"validator": "zod"
	}
}
```

### Yup Validation

```typescript
// uispec.config.ts
import * as yup from 'yup';
import { yupPlugin } from '@ui-spec/validate-yup';

export const schemas = {
	userForm: yup.object({
		email: yup.string().email().required(),
		password: yup
			.string()
			.min(8)
			.matches(/^(?=.*[A-Z])(?=.*[0-9])/)
			.required(),
		age: yup.number().integer().min(18),
	}),
};

export default {
	plugins: [yupPlugin({ schemas })],
};
```

### Form Validation in Schema

```json
{
	"type": "Form",
	"props": {
		"schema": { "$ref": "#/schemas/userForm" },
		"mode": "onBlur",
		"revalidateMode": "onChange"
	},
	"$bind": {
		"path": "$.formData",
		"mode": "two-way"
	},
	"$on": {
		"submit": {
			"$fn": "async (ctx, data) => { await ctx.api.post('/register', data); }",
			"$async": true
		}
	},
	"children": [
		{
			"type": "TextField",
			"props": {
				"name": "email",
				"label": "Email",
				"helperText": "We'll never share your email"
			}
		},
		{
			"type": "TextField",
			"props": {
				"name": "password",
				"label": "Password",
				"type": "password"
			},
			"$slots": {
				"error": {
					"type": "ul",
					"class": "text-sm text-red-500 mt-1",
					"$for": {
						"each": { "$path": "$field.errors" },
						"as": "error",
						"template": {
							"type": "li",
							"children": { "$path": "$error" }
						}
					}
				}
			}
		}
	]
}
```

### Cross-Field Validation

```json
{
	"type": "Form",
	"props": {
		"validate": {
			"$fn": "(ctx, values) => { const errors = {}; if (values.password !== values.confirmPassword) { errors.confirmPassword = 'Passwords must match'; } return errors; }"
		}
	}
}
```

---

## Framework Bindings

### React Binding

```tsx
// Installation
npm install @ui-spec/core @ui-spec/react

// Usage
import { UISpecProvider, UISpecApp } from '@ui-spec/react';
import schema from './app.uispec.json';

function App() {
  return (
    <UISpecProvider
      schema={schema}
      plugins={[zodValidator, tailwindUI]}
      initialData={{ user: null }}
    >
      <UISpecApp />
    </UISpecProvider>
  );
}

// Or render specific nodes
import { UISpecNode } from '@ui-spec/react';

function MyComponent() {
  return (
    <UISpecNode
      schema={{
        type: "Button",
        props: { variant: "primary" },
        children: "Click me"
      }}
    />
  );
}
```

### Vue Binding

```vue
<script setup>
// Installation
npm install @ui-spec/core @ui-spec/vue

import { UISpecProvider, UISpecApp } from '@ui-spec/vue';
import schema from './app.uispec.json';
</script>

<template>
	<UISpecProvider :schema="schema" :plugins="plugins">
		<UISpecApp />
	</UISpecProvider>
</template>
```

### Svelte Binding

```svelte
<script>
// Installation
npm install @ui-spec/core @ui-spec/svelte

import { UISpecProvider, UISpecApp } from '@ui-spec/svelte';
import schema from './app.uispec.json';
</script>

<UISpecProvider {schema}>
  <UISpecApp />
</UISpecProvider>
```

### SolidJS Binding

```tsx
// Installation
npm install @ui-spec/core @ui-spec/solid

import { UISpecProvider, UISpecApp } from '@ui-spec/solid';
import schema from './app.uispec.json';

function App() {
  return (
    <UISpecProvider schema={schema}>
      <UISpecApp />
    </UISpecProvider>
  );
}
```

### Web Components Binding

```html
<!-- Installation -->
<script type="module">
	import { defineUISpecElements } from '@ui-spec/web';
	import schema from './app.uispec.json';

	defineUISpecElements();
</script>

<!-- Usage -->
<uispec-app schema="./app.uispec.json"></uispec-app>

<!-- Or inline -->
<uispec-node>
	{ "type": "Button", "props": { "variant": "primary" }, "children": "Click me"
	}
</uispec-node>
```

### Angular Binding

```typescript
// Installation
npm install @ui-spec/core @ui-spec/angular

// app.module.ts
import { UISpecModule } from '@ui-spec/angular';

@NgModule({
  imports: [UISpecModule.forRoot()],
})
export class AppModule {}

// app.component.ts
import { Component } from '@angular/core';
import schema from './app.uispec.json';

@Component({
  template: `<uispec-app [schema]="schema"></uispec-app>`
})
export class AppComponent {
  schema = schema;
}
```

### Framework Binding API

To create a custom binding:

```typescript
import { createBinding, UISpecCore } from '@ui-spec/core';

interface BindingConfig<FrameworkNode> {
	// Convert UI-Spec virtual node to framework node
	createElement(
		type: string | Component,
		props: Record<string, unknown>,
		children: FrameworkNode[],
	): FrameworkNode;

	// Mount to DOM
	mount(node: FrameworkNode, container: Element): void;

	// Update existing node
	update(node: FrameworkNode, newProps: Record<string, unknown>): void;

	// Cleanup
	unmount(node: FrameworkNode): void;

	// Hook into framework reactivity
	createEffect(fn: () => void, deps: unknown[]): () => void;
	createMemo<T>(fn: () => T, deps: unknown[]): () => T;
}

export const myBinding = createBinding<MyFrameworkNode>({
	createElement: (type, props, children) => {
		/* ... */
	},
	mount: (node, container) => {
		/* ... */
	},
	update: (node, newProps) => {
		/* ... */
	},
	unmount: (node) => {
		/* ... */
	},
	createEffect: (fn, deps) => {
		/* ... */
	},
	createMemo: (fn, deps) => {
		/* ... */
	},
});
```

---

## TypeScript Integration

### Schema Types

UI-Spec provides comprehensive TypeScript types for schema authoring:

```typescript
import type {
	UISpecSchema,
	NodeSchema,
	ComponentSchema,
	RouteSchema,
	BindingSchema,
	FunctionSchema,
} from '@ui-spec/core';

// Type-safe schema definition
const schema: UISpecSchema = {
	$uispec: '1.0',
	data: {
		count: 0,
		user: null as User | null,
	},
	root: {
		type: 'div',
		children: [
			/* ... */
		],
	},
};
```

### Type Inference from Schema

```typescript
import { inferDataType, inferPropsType } from '@ui-spec/core';

// Given a schema...
const schema = {
	$uispec: '1.0',
	data: {
		users: [] as User[],
		selectedId: null as string | null,
	},
	components: {
		UserCard: {
			props: {
				user: { type: 'object', required: true },
				onSelect: { type: 'function' },
			},
			template: {
				/* ... */
			},
		},
	},
} as const;

// Infer types
type AppData = inferDataType<typeof schema>;
// { users: User[]; selectedId: string | null }

type UserCardProps = inferPropsType<typeof schema, 'UserCard'>;
// { user: object; onSelect?: Function }
```

### Component Type Safety

```typescript
import { defineComponent } from '@ui-spec/core';

// Define component with full type safety
const UserCard = defineComponent({
	props: {
		user: { type: Object as () => User, required: true },
		showActions: { type: Boolean, default: true },
	},
	emits: {
		select: (user: User) => true,
		delete: (id: string) => true,
	},
	template: {
		type: 'div',
		// TypeScript knows $props.user is User
		children: { $path: '$props.user.name' },
	},
});
```

### Function Context Types

```typescript
import type { UISpecContext } from '@ui-spec/core';

// Define your data shape
interface AppData {
  user: User | null;
  cart: CartItem[];
  settings: Settings;
}

// Get typed context
type AppContext = UISpecContext<AppData>;

// In schema (with typed comment for IDE support)
{
  "$on": {
    "click": {
      "$fn": "(ctx: AppContext) => ctx.get('$.user')?.name"
      // TypeScript plugin provides autocomplete for ctx.get paths
    }
  }
}
```

### JSON Schema to TypeScript

UI-Spec CLI can generate TypeScript types from schemas:

```bash
npx uispec generate-types ./app.uispec.json -o ./types/app.ts
```

Output:

```typescript
// Auto-generated from app.uispec.json

export interface AppData {
	user: {
		id: string;
		name: string;
		email: string;
	} | null;
	products: Array<{
		id: string;
		name: string;
		price: number;
	}>;
}

export interface UserCardProps {
	user: AppData['user'];
	showActions?: boolean;
}

export type Routes = '/' | '/dashboard' | '/users/:id' | '/settings';
```

### IDE Support

The `@ui-spec/vscode` extension provides:

- JSON schema validation in `.uispec.json` files
- Autocomplete for component types
- JSONPath autocomplete based on data schema
- UIScript syntax highlighting and validation
- Go-to-definition for component refs
- Hover documentation

---

## Extension System

### Plugin API

```typescript
interface UISpecPlugin {
	name: string;
	version: string;

	// Lifecycle hooks
	install?(core: UISpecCore, options?: unknown): void;

	// Extend schema processing
	transformSchema?(schema: UISpecSchema): UISpecSchema;
	transformNode?(node: NodeSchema): NodeSchema;

	// Add custom components
	components?: Record<string, ComponentDefinition>;

	// Add custom directives
	directives?: Record<string, DirectiveDefinition>;

	// Add context methods
	contextExtensions?: Record<string, Function>;

	// Add validation
	validators?: Record<string, ValidatorDefinition>;
}
```

### Creating a Plugin

```typescript
// @ui-spec/plugin-analytics
import type { UISpecPlugin } from '@ui-spec/core';

export const analyticsPlugin: UISpecPlugin = {
	name: '@ui-spec/plugin-analytics',
	version: '1.0.0',

	install(uispec, options) {
		const { trackingId, debug } = options as AnalyticsOptions;

		// Initialize analytics
		analytics.init(trackingId, { debug });

		// Track page views on route change
		uispec.router.onNavigate((to, from) => {
			analytics.pageView(to.path);
		});
	},

	contextExtensions: {
		track(eventName: string, data?: Record<string, unknown>) {
			analytics.track(eventName, data);
		},
	},

	directives: {
		// $track directive for declarative tracking
		track: {
			mounted(el, binding, context) {
				el.addEventListener('click', () => {
					context.track(binding.value.event, binding.value.data);
				});
			},
		},
	},
};
```

Usage:

```json
{
	"type": "Button",
	"$track": {
		"event": "button_click",
		"data": { "buttonId": "signup-cta" }
	},
	"children": "Sign Up"
}
```

### Custom Components

```typescript
// @ui-spec/ui-charts
import type { ComponentDefinition } from '@ui-spec/core';

export const chartComponents: Record<string, ComponentDefinition> = {
	BarChart: {
		props: {
			data: { type: 'array', required: true },
			xKey: { type: 'string', required: true },
			yKey: { type: 'string', required: true },
			color: { type: 'string', default: '#3b82f6' },
		},
		render(props, context) {
			// Return framework-agnostic virtual node
			return {
				type: 'svg',
				props: { viewBox: '0 0 400 300' },
				children: generateBars(props),
			};
		},
	},

	LineChart: {
		/* ... */
	},
	PieChart: {
		/* ... */
	},
};
```

### Middleware

```typescript
// Request/response middleware
uispec.use({
	name: 'auth-middleware',

	// Intercept API calls
	async onRequest(config, context) {
		const token = context.get('$.auth.token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},

	async onResponse(response, context) {
		if (response.status === 401) {
			context.set('$.auth.token', null);
			context.navigate('/login');
		}
		return response;
	},

	async onError(error, context) {
		context.set('$.error', error.message);
		throw error;
	},
});
```

---

## Security Model

### UIScript Sandbox

UIScript functions run in a controlled sandbox with limited capabilities:

```typescript
interface SandboxConfig {
	// Allowed globals
	allowedGlobals: string[]; // Default: ['Math', 'Date', 'JSON', 'parseInt', 'parseFloat', ...]

	// Timeout for function execution
	timeout: number; // Default: 5000ms

	// Memory limit
	memoryLimit: number; // Default: 10MB

	// Allowed APIs
	allowFetch: boolean; // Default: false (use ctx.api instead)
	allowEval: boolean; // Default: false (always)
	allowDOM: boolean; // Default: false

	// Custom allowlist
	allow: string[];

	// Custom blocklist
	block: string[];
}
```

### Content Security Policy

```typescript
const uispec = createUISpec({
	security: {
		// Only allow schemas from these origins
		schemaOrigins: ['https://api.myapp.com', 'self'],

		// Sanitize HTML in text content
		sanitizeHTML: true,

		// Validate all schemas before rendering
		validateSchemas: true,

		// Log security violations
		onSecurityViolation: (violation) => {
			console.error('Security violation:', violation);
		},
	},
});
```

### Safe Defaults

```typescript
// These are BLOCKED by default in UIScript
const BLOCKED = [
	'eval',
	'Function',
	'setTimeout', // Use ctx.delay instead
	'setInterval', // Use ctx.interval instead
	'fetch', // Use ctx.api instead
	'XMLHttpRequest',
	'WebSocket',
	'importScripts',
	'document', // Use ctx.refs instead
	'window',
	'localStorage', // Use ctx.storage instead
	'sessionStorage',
	'__proto__',
	'constructor',
	'prototype',
];
```

### Schema Validation

Before rendering, schemas are validated:

```typescript
import { validateSchema } from '@ui-spec/core';

const result = validateSchema(schema, {
	strict: true, // Fail on unknown properties
	checkRefs: true, // Validate all $refs exist
	checkPaths: true, // Validate JSONPath expressions
	checkFunctions: true, // Parse and validate UIScript
	maxDepth: 50, // Maximum nesting depth
	maxNodes: 10000, // Maximum node count
});

if (!result.valid) {
	console.error('Schema errors:', result.errors);
}
```

---

## Developer Tools

### Browser Extension

The UI-Spec DevTools browser extension provides:

#### Component Tree

- Visual hierarchy of all rendered nodes
- Click to select, highlight in page
- View props, state, and bindings for each node

#### Data Inspector

- Live view of the entire data store
- JSONPath query interface
- Time-travel debugging (undo/redo state changes)
- Diff view for state changes

#### Schema Editor

- Edit schema JSON in dev mode
- Hot reload on save
- Validation errors inline

#### Performance Profiler

- Render timing for each component
- Binding update frequency
- Memory usage

#### Network Inspector

- All `ctx.api` calls with timing
- Request/response inspection
- Replay requests

### CLI Tools

```bash
# Validate schema
npx uispec validate ./app.uispec.json

# Generate TypeScript types
npx uispec generate-types ./app.uispec.json -o ./types/

# Convert from other formats
npx uispec convert --from rjsf ./form.json -o ./form.uispec.json

# Start development server with hot reload
npx uispec dev ./app.uispec.json

# Build for production (optimize, minify schema)
npx uispec build ./app.uispec.json -o ./dist/

# Analyze schema complexity
npx uispec analyze ./app.uispec.json
```

### Visual Schema Builder

Web-based tool for visual schema creation:

```typescript
import { UISpecBuilder } from '@ui-spec/builder';

// Embed in your admin interface
<UISpecBuilder
  schema={currentSchema}
  onChange={setSchema}
  components={availableComponents}
  mode="full"  // 'full' | 'simple' | 'code-only'
/>
```

---

## Complete Examples

### Example 1: Todo Application

```json
{
	"$uispec": "1.0",
	"$id": "todo-app",

	"meta": {
		"title": "UI-Spec Todo",
		"theme": {
			"colors": {
				"primary": { "500": "#6366f1" }
			}
		}
	},

	"data": {
		"todos": [],
		"newTodo": "",
		"filter": "all"
	},

	"computed": {
		"$.filteredTodos": {
			"deps": ["$.todos", "$.filter"],
			"compute": {
				"$fn": "(todos, filter) => { if (filter === 'all') return todos; if (filter === 'active') return todos.filter(t => !t.completed); return todos.filter(t => t.completed); }"
			}
		},
		"$.remaining": {
			"deps": ["$.todos"],
			"compute": { "$fn": "(todos) => todos.filter(t => !t.completed).length" }
		}
	},

	"functions": {
		"addTodo": {
			"$fn": "(ctx) => { const text = ctx.get('$.newTodo').trim(); if (!text) return; ctx.push('$.todos', { id: Date.now(), text, completed: false }); ctx.set('$.newTodo', ''); }"
		},
		"toggleTodo": {
			"$fn": "(ctx, id) => ctx.update('$.todos', todos => todos.map(t => t.id === id ? {...t, completed: !t.completed} : t))"
		},
		"deleteTodo": {
			"$fn": "(ctx, id) => ctx.update('$.todos', todos => todos.filter(t => t.id !== id))"
		},
		"clearCompleted": {
			"$fn": "(ctx) => ctx.update('$.todos', todos => todos.filter(t => !t.completed))"
		}
	},

	"root": {
		"type": "div",
		"class": "min-h-screen bg-gray-100 py-8",
		"children": [
			{
				"type": "Container",
				"props": { "maxWidth": "md" },
				"children": [
					{
						"type": "div",
						"class": "bg-white rounded-xl shadow-lg overflow-hidden",
						"children": [
							{
								"type": "header",
								"class": "bg-primary-500 text-white p-6",
								"children": [
									{
										"type": "h1",
										"class": "text-2xl font-bold",
										"children": "UI-Spec Todo"
									}
								]
							},

							{
								"type": "div",
								"class": "p-6",
								"children": [
									{
										"type": "form",
										"$on": {
											"submit": {
												"$fn": "(ctx, e) => { e.preventDefault(); ctx.call('addTodo'); }"
											}
										},
										"children": [
											{
												"type": "div",
												"class": "flex gap-2",
												"children": [
													{
														"type": "input",
														"class": "flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none",
														"props": {
															"placeholder": "What needs to be done?",
															"autofocus": true
														},
														"$bind": {
															"path": "$.newTodo",
															"mode": "two-way"
														}
													},
													{
														"type": "Button",
														"props": { "type": "submit", "variant": "primary" },
														"children": "Add"
													}
												]
											}
										]
									},

									{
										"type": "div",
										"class": "mt-4 flex gap-2",
										"children": [
											{
												"$for": {
													"each": ["all", "active", "completed"],
													"as": "filterOption",
													"template": {
														"type": "button",
														"class": {
															"$classes": {
																"px-3 py-1 rounded-full text-sm": true,
																"bg-primary-500 text-white": {
																	"$expr": "$.filter === $filterOption"
																},
																"bg-gray-200 text-gray-700 hover:bg-gray-300": {
																	"$expr": "$.filter !== $filterOption"
																}
															}
														},
														"$on": {
															"click": {
																"$fn": "(ctx) => ctx.set('$.filter', ctx.get('$filterOption'))"
															}
														},
														"children": { "$path": "$filterOption" }
													}
												}
											}
										]
									},

									{
										"type": "ul",
										"class": "mt-4 divide-y",
										"children": [
											{
												"$for": {
													"each": { "$path": "$.filteredTodos" },
													"as": "todo",
													"key": "id",
													"template": {
														"type": "li",
														"class": "flex items-center gap-3 py-3 group",
														"children": [
															{
																"type": "input",
																"props": { "type": "checkbox" },
																"class": "w-5 h-5 text-primary-500",
																"$bind": {
																	"path": "$todo.completed",
																	"mode": "read"
																},
																"$on": {
																	"change": {
																		"$call": [
																			"toggleTodo",
																			{ "$path": "$todo.id" }
																		]
																	}
																}
															},
															{
																"type": "span",
																"class": {
																	"$classes": {
																		"flex-1": true,
																		"line-through text-gray-400": {
																			"$path": "$todo.completed"
																		}
																	}
																},
																"children": { "$path": "$todo.text" }
															},
															{
																"type": "button",
																"class": "opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity",
																"$on": {
																	"click": {
																		"$call": [
																			"deleteTodo",
																			{ "$path": "$todo.id" }
																		]
																	}
																},
																"children": "×"
															}
														]
													}
												}
											}
										]
									},

									{
										"$if": { "$expr": "$.todos.length > 0" },
										"type": "footer",
										"class": "mt-4 pt-4 border-t flex justify-between text-sm text-gray-500",
										"children": [
											{
												"type": "span",
												"children": {
													"$fn": "(ctx) => `${ctx.get('$.remaining')} item${ctx.get('$.remaining') === 1 ? '' : 's'} left`"
												}
											},
											{
												"$if": { "$expr": "$.todos.some(t => t.completed)" },
												"type": "button",
												"class": "hover:underline",
												"$on": { "click": { "$call": ["clearCompleted"] } },
												"children": "Clear completed"
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

### Example 2: Dashboard with Routing

> **Requires:** `@ui-spec/router`

```json
{
	"$uispec": "1.0",
	"$id": "admin-dashboard",

	"plugins": ["@ui-spec/router"],

	"data": {
		"user": null,
		"sidebarOpen": true,
		"notifications": []
	},

	"components": {
		"DashboardLayout": {
			"template": {
				"type": "div",
				"class": "flex h-screen bg-gray-100",
				"children": [
					{
						"type": "aside",
						"class": {
							"$classes": {
								"bg-gray-900 text-white transition-all duration-300": true,
								"w-64": { "$path": "$.sidebarOpen" },
								"w-16": { "$expr": "!$.sidebarOpen" }
							}
						},
						"children": [
							{
								"type": "div",
								"class": "p-4 flex items-center justify-between",
								"children": [
									{
										"$if": { "$path": "$.sidebarOpen" },
										"type": "span",
										"class": "font-bold text-xl",
										"children": "Admin"
									},
									{
										"type": "button",
										"class": "p-2 hover:bg-gray-800 rounded",
										"$on": {
											"click": {
												"$fn": "(ctx) => ctx.update('$.sidebarOpen', v => !v)"
											}
										},
										"children": "☰"
									}
								]
							},
							{
								"type": "nav",
								"class": "mt-4",
								"children": [
									{
										"$ref": "#/components/NavItem",
										"props": {
											"to": "/dashboard",
											"icon": "home",
											"label": "Dashboard"
										}
									},
									{
										"$ref": "#/components/NavItem",
										"props": {
											"to": "/dashboard/users",
											"icon": "users",
											"label": "Users"
										}
									},
									{
										"$ref": "#/components/NavItem",
										"props": {
											"to": "/dashboard/analytics",
											"icon": "chart",
											"label": "Analytics"
										}
									},
									{
										"$ref": "#/components/NavItem",
										"props": {
											"to": "/dashboard/settings",
											"icon": "cog",
											"label": "Settings"
										}
									}
								]
							}
						]
					},
					{
						"type": "div",
						"class": "flex-1 flex flex-col overflow-hidden",
						"children": [
							{
								"type": "header",
								"class": "bg-white shadow-sm h-16 flex items-center justify-between px-6",
								"children": [
									{
										"type": "h1",
										"class": "text-xl font-semibold text-gray-800",
										"children": { "$path": "$route.meta.title" }
									},
									{
										"type": "div",
										"class": "flex items-center gap-4",
										"children": [
											{ "$ref": "#/components/NotificationBell" },
											{ "$ref": "#/components/UserMenu" }
										]
									}
								]
							},
							{
								"type": "main",
								"class": "flex-1 overflow-auto p-6",
								"children": [{ "type": "RouterOutlet" }]
							}
						]
					}
				]
			}
		},

		"NavItem": {
			"props": {
				"to": { "type": "string", "required": true },
				"icon": { "type": "string", "required": true },
				"label": { "type": "string", "required": true }
			},
			"template": {
				"type": "NavLink",
				"props": {
					"to": { "$path": "$props.to" },
					"class": "flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors",
					"activeClass": "bg-gray-800 border-l-4 border-primary-500"
				},
				"children": [
					{
						"type": "Icon",
						"props": { "name": { "$path": "$props.icon" }, "size": 20 }
					},
					{
						"$if": { "$path": "$.sidebarOpen" },
						"type": "span",
						"children": { "$path": "$props.label" }
					}
				]
			}
		},

		"MetricsGrid": {
			"props": {
				"metrics": { "type": "array", "required": true }
			},
			"template": {
				"type": "div",
				"class": "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
				"children": [
					{
						"$for": {
							"each": { "$path": "$props.metrics" },
							"as": "metric",
							"template": {
								"type": "MetricCard",
								"props": {
									"value": { "$path": "$metric.value" },
									"label": { "$path": "$metric.label" },
									"trend": { "$path": "$metric.trend" },
									"format": { "$path": "$metric.format" }
								}
							}
						}
					}
				]
			}
		},

		"DashboardHome": {
			"template": {
				"type": "div",
				"class": "space-y-6",
				"children": [
					{
						"type": "MetricsGrid",
						"props": {
							"metrics": [
								{
									"label": "Total Users",
									"value": { "$path": "$.stats.users" },
									"trend": 12,
									"format": "number"
								},
								{
									"label": "Revenue",
									"value": { "$path": "$.stats.revenue" },
									"trend": 8,
									"format": "currency"
								},
								{
									"label": "Orders",
									"value": { "$path": "$.stats.orders" },
									"trend": -3,
									"format": "number"
								},
								{
									"label": "Conversion",
									"value": { "$path": "$.stats.conversion" },
									"trend": 5,
									"format": "percent"
								}
							]
						}
					},
					{
						"type": "div",
						"class": "grid grid-cols-1 lg:grid-cols-2 gap-6",
						"children": [
							{
								"type": "Card",
								"props": { "title": "Recent Orders" },
								"children": [
									{
										"type": "DataTable",
										"props": {
											"columns": [
												{ "key": "id", "header": "Order ID" },
												{ "key": "customer", "header": "Customer" },
												{
													"key": "total",
													"header": "Total",
													"format": "currency"
												},
												{ "key": "status", "header": "Status" }
											],
											"pageSize": 5
										},
										"$bind": { "path": "$.recentOrders" }
									}
								]
							},
							{
								"type": "Card",
								"props": { "title": "Sales Overview" },
								"children": [
									{
										"type": "LineChart",
										"props": {
											"xKey": "date",
											"yKey": "sales",
											"color": "#6366f1"
										},
										"$bind": { "path": "$.salesData" }
									}
								]
							}
						]
					}
				]
			}
		}
	},

	"routes": [
		{
			"path": "/",
			"redirect": "/dashboard"
		},
		{
			"path": "/login",
			"component": { "$ref": "#/components/LoginPage" },
			"meta": { "title": "Login", "guest": true }
		},
		{
			"path": "/dashboard",
			"component": { "$ref": "#/components/DashboardLayout" },
			"meta": { "requiresAuth": true },
			"beforeEnter": {
				"$fn": "(ctx, to) => ctx.get('$.user') ? true : '/login'"
			},
			"children": [
				{
					"path": "",
					"component": { "$ref": "#/components/DashboardHome" },
					"meta": { "title": "Dashboard" }
				},
				{
					"path": "users",
					"component": { "$ref": "#/components/UsersPage" },
					"meta": { "title": "Users" }
				},
				{
					"path": "users/:id",
					"component": { "$ref": "#/components/UserDetail" },
					"props": true
				},
				{
					"path": "analytics",
					"component": { "$ref": "#/components/AnalyticsPage" },
					"meta": { "title": "Analytics" }
				},
				{
					"path": "settings",
					"component": { "$ref": "#/components/SettingsPage" },
					"meta": { "title": "Settings" }
				}
			]
		}
	]
}
```

### Example 3: E-commerce Product Page

```json
{
	"$uispec": "1.0",

	"data": {
		"product": null,
		"selectedVariant": null,
		"quantity": 1,
		"activeImage": 0,
		"reviews": [],
		"relatedProducts": []
	},

	"functions": {
		"loadProduct": {
			"$fn": "async (ctx, productId) => { const product = await ctx.api.get(`/products/${productId}`); ctx.set('$.product', product); ctx.set('$.selectedVariant', product.variants[0]); }",
			"$async": true
		},
		"addToCart": {
			"$fn": "async (ctx) => { await ctx.api.post('/cart/items', { productId: ctx.get('$.product.id'), variantId: ctx.get('$.selectedVariant.id'), quantity: ctx.get('$.quantity') }); ctx.emit('cart:updated'); ctx.set('$.addedToCart', true); setTimeout(() => ctx.set('$.addedToCart', false), 3000); }",
			"$async": true
		}
	},

	"root": {
		"type": "div",
		"$mounted": { "$call": ["loadProduct", { "$route.params": "id" }] },
		"children": [
			{
				"$if": { "$expr": "$.product === null" },
				"type": "ProductSkeleton"
			},
			{
				"$else": true,
				"type": "Container",
				"props": { "maxWidth": "7xl" },
				"class": "py-8",
				"children": [
					{
						"type": "div",
						"class": "grid grid-cols-1 lg:grid-cols-2 gap-8",
						"children": [
							{
								"type": "div",
								"class": "space-y-4",
								"children": [
									{
										"type": "div",
										"class": "aspect-square bg-gray-100 rounded-xl overflow-hidden",
										"children": [
											{
												"type": "img",
												"props": {
													"src": {
														"$fn": "(ctx) => ctx.get('$.product.images')[ctx.get('$.activeImage')]"
													},
													"alt": { "$path": "$.product.name" }
												},
												"class": "w-full h-full object-cover"
											}
										]
									},
									{
										"type": "div",
										"class": "flex gap-2 overflow-x-auto",
										"children": [
											{
												"$for": {
													"each": { "$path": "$.product.images" },
													"as": "image",
													"index": "idx",
													"template": {
														"type": "button",
														"class": {
															"$classes": {
																"w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors": true,
																"border-primary-500": {
																	"$expr": "$.activeImage === $idx"
																},
																"border-transparent hover:border-gray-300": {
																	"$expr": "$.activeImage !== $idx"
																}
															}
														},
														"$on": {
															"click": {
																"$fn": "(ctx) => ctx.set('$.activeImage', ctx.get('$idx'))"
															}
														},
														"children": [
															{
																"type": "img",
																"props": { "src": { "$path": "$image" } },
																"class": "w-full h-full object-cover"
															}
														]
													}
												}
											}
										]
									}
								]
							},

							{
								"type": "div",
								"class": "space-y-6",
								"children": [
									{
										"type": "div",
										"children": [
											{
												"type": "h1",
												"class": "text-3xl font-bold text-gray-900",
												"children": { "$path": "$.product.name" }
											},
											{
												"type": "div",
												"class": "mt-2 flex items-center gap-2",
												"children": [
													{
														"type": "StarRating",
														"props": {
															"value": { "$path": "$.product.rating" }
														}
													},
													{
														"type": "span",
														"class": "text-sm text-gray-500",
														"children": {
															"$fn": "(ctx) => `(${ctx.get('$.product.reviewCount')} reviews)`"
														}
													}
												]
											}
										]
									},

									{
										"type": "div",
										"class": "flex items-baseline gap-2",
										"children": [
											{
												"type": "span",
												"class": "text-3xl font-bold text-gray-900",
												"children": {
													"$fn": "(ctx) => ctx.format(ctx.get('$.selectedVariant.price'), 'currency')"
												}
											},
											{
												"$if": { "$path": "$.selectedVariant.compareAtPrice" },
												"type": "span",
												"class": "text-lg text-gray-500 line-through",
												"children": {
													"$fn": "(ctx) => ctx.format(ctx.get('$.selectedVariant.compareAtPrice'), 'currency')"
												}
											}
										]
									},

									{
										"type": "div",
										"class": "prose prose-gray",
										"children": { "$path": "$.product.description" }
									},

									{
										"$if": { "$expr": "$.product.variants.length > 1" },
										"type": "div",
										"class": "space-y-3",
										"children": [
											{
												"type": "label",
												"class": "block text-sm font-medium text-gray-700",
												"children": "Variant"
											},
											{
												"type": "div",
												"class": "flex flex-wrap gap-2",
												"children": [
													{
														"$for": {
															"each": { "$path": "$.product.variants" },
															"as": "variant",
															"template": {
																"type": "button",
																"class": {
																	"$classes": {
																		"px-4 py-2 rounded-lg border transition-colors": true,
																		"border-primary-500 bg-primary-50 text-primary-700": {
																			"$expr": "$.selectedVariant.id === $variant.id"
																		},
																		"border-gray-300 hover:border-gray-400": {
																			"$expr": "$.selectedVariant.id !== $variant.id"
																		},
																		"opacity-50 cursor-not-allowed": {
																			"$expr": "!$variant.available"
																		}
																	}
																},
																"props": {
																	"disabled": { "$expr": "!$variant.available" }
																},
																"$on": {
																	"click": {
																		"$fn": "(ctx) => ctx.set('$.selectedVariant', ctx.get('$variant'))"
																	}
																},
																"children": { "$path": "$variant.name" }
															}
														}
													}
												]
											}
										]
									},

									{
										"type": "div",
										"class": "flex items-center gap-4",
										"children": [
											{
												"type": "div",
												"class": "flex items-center border rounded-lg",
												"children": [
													{
														"type": "button",
														"class": "px-4 py-2 hover:bg-gray-100",
														"$on": {
															"click": {
																"$fn": "(ctx) => ctx.update('$.quantity', q => Math.max(1, q - 1))"
															}
														},
														"children": "−"
													},
													{
														"type": "span",
														"class": "px-4 py-2 font-medium tabular-nums",
														"children": { "$path": "$.quantity" }
													},
													{
														"type": "button",
														"class": "px-4 py-2 hover:bg-gray-100",
														"$on": {
															"click": {
																"$fn": "(ctx) => ctx.update('$.quantity', q => q + 1)"
															}
														},
														"children": "+"
													}
												]
											},
											{
												"type": "Button",
												"props": {
													"variant": "primary",
													"size": "lg",
													"disabled": {
														"$expr": "!$.selectedVariant.available"
													}
												},
												"class": "flex-1",
												"$on": { "click": { "$call": ["addToCart"] } },
												"children": {
													"$if": { "$path": "$.addedToCart" },
													"$then": "Added to Cart ✓",
													"$else": "Add to Cart"
												}
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	}
}
```

---

## Comparison with Existing Solutions

### Feature Matrix

| Feature                    | UI-Spec        | RJSF      | JSON Forms | Uniforms | Form.io  | Retool   |
| -------------------------- | -------------- | --------- | ---------- | -------- | -------- | -------- |
| **Full SPA Routing**       | ✅ (add-on)    | ❌        | ❌         | ❌       | ❌       | ✅       |
| **Embedded Functions**     | ✅ UIScript    | ❌        | ❌         | ❌       | Limited  | ✅ JS    |
| **Framework Agnostic**     | ✅             | React     | ✅         | React    | ✅       | Closed   |
| **Bi-directional Binding** | ✅ JSONPath    | ❌        | ❌         | ❌       | ❌       | ✅       |
| **Component Composition**  | ✅ Full        | Limited   | Limited    | Limited  | Limited  | ✅       |
| **Custom Components**      | ✅ JSON + JS   | JS only   | JS only    | JS only  | JS only  | JS only  |
| **TailwindCSS Native**     | ✅             | Theme     | Theme      | Theme    | Theme    | ❌       |
| **Async Data Loading**     | ✅ Built-in    | Manual    | Manual     | Manual   | Built-in | ✅       |
| **Validation Plugins**     | ✅ Any         | AJV       | AJV        | Multiple | Built-in | Built-in |
| **DevTools**               | ✅ Browser ext | ❌        | ❌         | ❌       | ❌       | ✅       |
| **Visual Builder**         | Optional       | ❌        | ❌         | Forminer | ✅       | ✅       |
| **Open Source**            | ✅ MIT         | ✅ Apache | ✅ MIT     | ✅ MIT   | Partial  | ❌       |
| **Server-Driven UI**       | ✅ Primary     | Partial   | Partial    | Partial  | ✅       | ❌       |
| **Bundle Size (core)**     | ~12KB          | ~45KB     | ~30KB      | ~35KB    | ~80KB    | N/A      |
| **Bundle Size (+router)**  | ~18KB          | N/A       | N/A        | N/A      | N/A      | N/A      |
| **TypeScript**             | ✅ Full        | ✅ Good   | ✅ Good    | ✅ Good  | Partial  | N/A      |

### When to Use What

| Use Case                             | Recommended                   |
| ------------------------------------ | ----------------------------- |
| **Simple form from JSON Schema**     | RJSF, JSON Forms              |
| **Multi-framework forms**            | JSON Forms, UI-Spec           |
| **GraphQL-driven forms**             | Uniforms                      |
| **Visual form building**             | Form.io, SurveyJS             |
| **Internal tools**                   | Retool, Appsmith              |
| **Complete SPA from JSON**           | **UI-Spec + @ui-spec/router** |
| **Server-driven UI**                 | **UI-Spec**, Form.io          |
| **Embedded widgets/micro-frontends** | **UI-Spec (core only)**       |
| **Maximum customization**            | **UI-Spec**, UI-Schema        |
| **Enterprise with support**          | JSON Forms, Form.io, Retool   |

### Migration Paths

#### From RJSF to UI-Spec

```json
// RJSF
{
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" }
    }
  },
  "uiSchema": {
    "name": { "ui:placeholder": "Enter name" }
  }
}

// UI-Spec equivalent
{
  "$uispec": "1.0",
  "root": {
    "type": "Form",
    "props": { "schema": { "$ref": "#/schemas/form" } },
    "children": [
      {
        "type": "TextField",
        "props": { "name": "name", "placeholder": "Enter name" }
      }
    ]
  },
  "schemas": {
    "form": {
      "type": "object",
      "properties": { "name": { "type": "string" } }
    }
  }
}
```

#### From JSON Forms to UI-Spec

```json
// JSON Forms
{
  "schema": { "type": "object", "properties": { "name": { "type": "string" } } },
  "uischema": {
    "type": "VerticalLayout",
    "elements": [{ "type": "Control", "scope": "#/properties/name" }]
  }
}

// UI-Spec equivalent
{
  "$uispec": "1.0",
  "root": {
    "type": "Stack",
    "props": { "direction": "vertical" },
    "children": [
      { "type": "TextField", "props": { "name": "name" }, "$bind": { "path": "$.name" } }
    ]
  }
}
```

---

## Appendices

### Appendix A: JSONPath Quick Reference

| Expression                       | Description             |
| -------------------------------- | ----------------------- |
| `$.book[0].title`                | First book's title      |
| `$.book[*].author`               | All authors             |
| `$..author`                      | All authors (recursive) |
| `$.book[?(@.price<10)]`          | Books under $10         |
| `$.book[?(@.author=='Tolkien')]` | Books by Tolkien        |
| `$.book[-1:]`                    | Last book               |
| `$.book[0,1]`                    | First two books         |
| `$.book[:2]`                     | First two books (slice) |

### Appendix B: Built-in Format Strings

| Format     | Example Input | Example Output        |
| ---------- | ------------- | --------------------- |
| `number`   | 1234567       | 1,234,567             |
| `currency` | 99.99         | $99.99                |
| `percent`  | 0.156         | 15.6%                 |
| `date`     | ISO string    | Dec 27, 2025          |
| `datetime` | ISO string    | Dec 27, 2025, 3:45 PM |
| `relative` | ISO string    | 2 hours ago           |
| `bytes`    | 1536000       | 1.5 MB                |

### Appendix C: Event Reference

| Event       | Payload         | Description          |
| ----------- | --------------- | -------------------- |
| `click`     | `MouseEvent`    | Element clicked      |
| `input`     | `{ value }`     | Input value changed  |
| `change`    | `{ value }`     | Input committed      |
| `submit`    | `FormData`      | Form submitted       |
| `focus`     | `FocusEvent`    | Element focused      |
| `blur`      | `FocusEvent`    | Element blurred      |
| `keydown`   | `KeyboardEvent` | Key pressed          |
| `keyup`     | `KeyboardEvent` | Key released         |
| `mounted`   | `void`          | Component mounted    |
| `unmounted` | `void`          | Component unmounting |

### Appendix D: Component Prop Types

```typescript
type PropType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'object'
	| 'array'
	| 'function'
	| { type: 'enum'; values: string[] }
	| { type: 'union'; types: PropType[] }
	| { type: 'array'; items: PropType }
	| { type: 'object'; properties: Record<string, PropType> };
```

### Appendix E: CSS Class Utilities

Common patterns for dynamic classes:

```json
// Conditional class
{ "$if": { "$path": "$.active" }, "$then": "bg-blue-500", "$else": "bg-gray-500" }

// Map value to class
{ "$path": "$.status", "$map": { "success": "text-green-500", "error": "text-red-500" } }

// Class object (like clsx/classnames)
{ "$classes": { "font-bold": true, "text-lg": { "$path": "$.large" } } }

// Template string
{ "$fn": "(ctx) => `text-${ctx.get('$.color')}-500`" }
```

---

## Glossary

| Term          | Definition                                             |
| ------------- | ------------------------------------------------------ |
| **Node**      | A single element in the UI tree                        |
| **Component** | A reusable node definition with props                  |
| **Binding**   | Connection between data and UI                         |
| **UIScript**  | Safe, serializable function syntax                     |
| **Bridge**    | Adapter connecting schemas to UI-Spec                  |
| **Renderer**  | Framework-specific component that renders nodes        |
| **Plugin**    | Extension adding components, validators, or middleware |
| **Store**     | Reactive data container with JSONPath access           |

---

## Changelog

### 1.0.0 (Specification)

- Initial specification release
- Core schema format defined
- UIScript syntax finalized
- Framework binding API specified
- Plugin architecture documented

---

_UI-Spec Specification v1.0.0 — December 2025_
