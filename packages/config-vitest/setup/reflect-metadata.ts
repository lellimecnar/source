import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

try {
	require('reflect-metadata');
} catch {
	// Optional dependency.
}
