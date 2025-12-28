import { createRequire } from 'node:module';
import { afterEach } from 'vitest';

try {
	const require = createRequire(import.meta.url);

	// Optional dependency; only works when installed.
	require('@testing-library/jest-dom/vitest');

	// Optional dependency; only works when installed.
	const { cleanup } = require('@testing-library/react');
	afterEach(() => cleanup());
} catch {
	// no-op
}
