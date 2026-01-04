# Configuration Management Examples

Manage application configuration with JSONPath, Pointer, and Patch.

## Setup

```typescript
import { query, value, exists, configure } from '@jsonpath/jsonpath';
import { resolve, set, remove } from '@jsonpath/pointer';
import { applyPatch, diff, PatchBuilder } from '@jsonpath/patch';
import { applyMergePatch } from '@jsonpath/merge-patch';
```

---

## Hierarchical Configuration

### Define Configuration Layers

```typescript
// Default configuration
const defaults = {
	app: {
		name: 'MyApp',
		port: 3000,
		host: 'localhost',
	},
	database: {
		host: 'localhost',
		port: 5432,
		name: 'myapp',
		pool: { min: 2, max: 10 },
	},
	logging: {
		level: 'info',
		format: 'json',
		outputs: ['console'],
	},
	features: {
		darkMode: false,
		analytics: true,
		experimental: false,
	},
};

// Environment-specific overrides
const production = {
	app: { host: '0.0.0.0' },
	database: {
		host: 'db.production.example.com',
		pool: { min: 5, max: 50 },
	},
	logging: {
		level: 'warn',
		outputs: ['console', 'file', 'sentry'],
	},
};

const development = {
	logging: { level: 'debug' },
	features: { experimental: true },
};
```

### Merge Configuration Layers

```typescript
function loadConfig(env: 'production' | 'development' | 'test') {
	const envConfig = env === 'production' ? production : development;

	// Merge environment over defaults
	let config = applyMergePatch(defaults, envConfig);

	// Apply any runtime overrides from environment variables
	const overrides = loadEnvOverrides();
	config = applyMergePatch(config, overrides);

	return config;
}

function loadEnvOverrides(): any {
	const overrides: any = {};

	if (process.env.DATABASE_HOST) {
		overrides.database = { host: process.env.DATABASE_HOST };
	}
	if (process.env.LOG_LEVEL) {
		overrides.logging = { level: process.env.LOG_LEVEL };
	}
	if (process.env.PORT) {
		overrides.app = { port: parseInt(process.env.PORT) };
	}

	return overrides;
}
```

---

## Configuration Validation

### Validate Required Fields

```typescript
interface ConfigValidation {
	valid: boolean;
	errors: string[];
}

function validateConfig(config: any): ConfigValidation {
	const errors: string[] = [];

	// Required fields
	const required = [
		'$.app.name',
		'$.app.port',
		'$.database.host',
		'$.database.name',
	];

	for (const path of required) {
		if (!exists(config, path)) {
			errors.push(`Missing required field: ${path}`);
		}
	}

	// Type validations
	const port = value(config, '$.app.port');
	if (typeof port !== 'number' || port < 1 || port > 65535) {
		errors.push('app.port must be a valid port number (1-65535)');
	}

	const logLevel = value(config, '$.logging.level');
	const validLevels = ['debug', 'info', 'warn', 'error'];
	if (!validLevels.includes(logLevel)) {
		errors.push(`logging.level must be one of: ${validLevels.join(', ')}`);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
```

### Schema-like Validation

```typescript
interface FieldSchema {
	path: string;
	type: 'string' | 'number' | 'boolean' | 'array' | 'object';
	required?: boolean;
	min?: number;
	max?: number;
	enum?: any[];
}

const configSchema: FieldSchema[] = [
	{ path: '$.app.name', type: 'string', required: true },
	{ path: '$.app.port', type: 'number', required: true, min: 1, max: 65535 },
	{ path: '$.database.pool.min', type: 'number', min: 1 },
	{ path: '$.database.pool.max', type: 'number', min: 1 },
	{
		path: '$.logging.level',
		type: 'string',
		enum: ['debug', 'info', 'warn', 'error'],
	},
	{ path: '$.logging.outputs', type: 'array', required: true },
];

function validateSchema(config: any, schema: FieldSchema[]): string[] {
	const errors: string[] = [];

	for (const field of schema) {
		const val = value(config, field.path);

		if (val === undefined) {
			if (field.required) {
				errors.push(`${field.path} is required`);
			}
			continue;
		}

		// Type check
		if (field.type === 'array' && !Array.isArray(val)) {
			errors.push(`${field.path} must be an array`);
		} else if (field.type !== 'array' && typeof val !== field.type) {
			errors.push(`${field.path} must be a ${field.type}`);
		}

		// Range check
		if (typeof val === 'number') {
			if (field.min !== undefined && val < field.min) {
				errors.push(`${field.path} must be >= ${field.min}`);
			}
			if (field.max !== undefined && val > field.max) {
				errors.push(`${field.path} must be <= ${field.max}`);
			}
		}

		// Enum check
		if (field.enum && !field.enum.includes(val)) {
			errors.push(`${field.path} must be one of: ${field.enum.join(', ')}`);
		}
	}

	return errors;
}
```

---

## Dynamic Configuration

### Runtime Updates

```typescript
class ConfigManager<T> {
	private config: T;
	private listeners: Set<(config: T) => void> = new Set();

	constructor(initial: T) {
		this.config = initial;
	}

	get<V>(path: string): V {
		return resolve(this.config, path) as V;
	}

	set(path: string, newValue: any): void {
		this.config = set(this.config, path, newValue) as T;
		this.notify();
	}

	update(patch: any): void {
		this.config = applyMergePatch(this.config, patch) as T;
		this.notify();
	}

	subscribe(listener: (config: T) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener(this.config);
		}
	}

	getAll(): T {
		return this.config;
	}
}

// Usage
const config = new ConfigManager(loadConfig('development'));

// Subscribe to changes
config.subscribe((newConfig) => {
	console.log('Config updated:', newConfig);
});

// Update at runtime
config.set('/logging/level', 'debug');
config.update({ features: { darkMode: true } });
```

### Feature Flags

```typescript
class FeatureFlags {
	private flags: Record<string, boolean>;
	private overrides: Record<string, boolean> = {};

	constructor(flags: Record<string, boolean>) {
		this.flags = flags;
	}

	isEnabled(flag: string): boolean {
		if (flag in this.overrides) {
			return this.overrides[flag];
		}
		return this.flags[flag] ?? false;
	}

	enable(flag: string): void {
		this.overrides[flag] = true;
	}

	disable(flag: string): void {
		this.overrides[flag] = false;
	}

	reset(flag: string): void {
		delete this.overrides[flag];
	}

	all(): Record<string, boolean> {
		return { ...this.flags, ...this.overrides };
	}
}

// Load from config
const features = new FeatureFlags(
	value(config.getAll(), '$.features') as Record<string, boolean>,
);

// Check features
if (features.isEnabled('darkMode')) {
	applyDarkTheme();
}

// Runtime override
features.enable('experimental');
```

---

## Configuration Diffing

### Compare Configurations

```typescript
function compareConfigs(
	a: any,
	b: any,
): { path: string; before: any; after: any }[] {
	const patch = diff(a, b);

	return patch.map((op) => ({
		path: op.path,
		before: resolve(a, op.path),
		after: op.op === 'remove' ? undefined : op.value,
	}));
}

// Example
const oldConfig = loadConfig('development');
const newConfig = applyMergePatch(oldConfig, {
	app: { port: 8080 },
	logging: { level: 'warn' },
});

const changes = compareConfigs(oldConfig, newConfig);
// [
//   { path: '/app/port', before: 3000, after: 8080 },
//   { path: '/logging/level', before: 'debug', after: 'warn' }
// ]
```

### Audit Configuration Changes

```typescript
interface ConfigChange {
	timestamp: Date;
	user: string;
	changes: { path: string; before: any; after: any }[];
}

class AuditedConfig<T> {
	private config: T;
	private audit: ConfigChange[] = [];

	constructor(initial: T) {
		this.config = initial;
	}

	update(patch: any, user: string): void {
		const newConfig = applyMergePatch(this.config, patch) as T;
		const changes = compareConfigs(this.config, newConfig);

		if (changes.length > 0) {
			this.audit.push({
				timestamp: new Date(),
				user,
				changes,
			});
			this.config = newConfig;
		}
	}

	getAuditLog(): ConfigChange[] {
		return [...this.audit];
	}

	get(): T {
		return this.config;
	}
}
```

---

## Environment-Specific Secrets

```typescript
interface SecretConfig {
	database: {
		password: string;
	};
	api: {
		keys: Record<string, string>;
	};
	jwt: {
		secret: string;
	};
}

function loadSecrets(): SecretConfig {
	return {
		database: {
			password: process.env.DB_PASSWORD ?? '',
		},
		api: {
			keys: {
				stripe: process.env.STRIPE_API_KEY ?? '',
				sendgrid: process.env.SENDGRID_API_KEY ?? '',
			},
		},
		jwt: {
			secret: process.env.JWT_SECRET ?? '',
		},
	};
}

function validateSecrets(secrets: SecretConfig): string[] {
	const errors: string[] = [];
	const required = ['$.database.password', '$.jwt.secret'];

	for (const path of required) {
		const val = value(secrets, path);
		if (!val || val === '') {
			errors.push(`Missing required secret: ${path}`);
		}
	}

	return errors;
}
```

---

## Configuration File Management

### Load from Multiple Sources

```typescript
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';

function loadConfigFile(path: string): any {
	if (!existsSync(path)) return {};

	const content = readFileSync(path, 'utf-8');

	if (path.endsWith('.json')) {
		return JSON.parse(content);
	}
	if (path.endsWith('.yaml') || path.endsWith('.yml')) {
		return parseYaml(content);
	}

	return {};
}

function loadAllConfigs(env: string): any {
	const configs = [
		loadConfigFile('config/default.yaml'),
		loadConfigFile(`config/${env}.yaml`),
		loadConfigFile('config/local.yaml'), // Gitignored overrides
	];

	return configs.reduce((acc, cfg) => applyMergePatch(acc, cfg), {});
}
```

### Safe Config Access

```typescript
class TypedConfig<T> {
	constructor(private config: T) {}

	get<V>(path: string, defaultValue: V): V {
		const val = resolve(this.config, path);
		return val !== undefined ? (val as V) : defaultValue;
	}

	require<V>(path: string): V {
		const val = resolve(this.config, path);
		if (val === undefined) {
			throw new Error(`Required config missing: ${path}`);
		}
		return val as V;
	}

	has(path: string): boolean {
		return exists(this.config, path);
	}
}

// Usage
const cfg = new TypedConfig(loadAllConfigs('production'));

const port = cfg.get('/app/port', 3000);
const dbHost = cfg.require<string>('/database/host');
const hasAnalytics = cfg.has('/features/analytics');
```
