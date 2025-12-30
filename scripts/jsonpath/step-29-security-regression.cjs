/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 29)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath-conformance');

write(
	path.join(pkgDir, 'src', 'security.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { setByPointer } from '@jsonpath/pointer';\n\ndescribe('security regression: pointer hardening', () => {\n\tit('rejects prototype-pollution segments', () => {\n\t\texpect(() => setByPointer({}, '/__proto__/x', 1)).toThrow();\n\t\texpect(() => setByPointer({}, '/constructor/x', 1)).toThrow();\n\t\texpect(() => setByPointer({}, '/prototype/x', 1)).toThrow();\n\t});\n});\n`,
);

console.log('Added security regression tests');
