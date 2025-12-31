/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 28)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'complete');

write(
	path.join(pkgDir, 'src', 'index.ts'),
	`export { createRfc9535Engine, rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';\n`,
);

write(
	path.join(pkgDir, 'src', 'index.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { createRfc9535Engine, rfc9535Plugins } from './index';\n\ndescribe('@jsonpath/complete', () => {\n\tit('re-exports RFC 9535 preset', () => {\n\t\texpect(rfc9535Plugins.length).toBeGreaterThan(5);\n\t\tconst engine = createRfc9535Engine();\n\t\texpect(engine.compile('$.x').expression).toBe('$.x');\n\t});\n});\n`,
);

console.log('Wrote @jsonpath/complete');
