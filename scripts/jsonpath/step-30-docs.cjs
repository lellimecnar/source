/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 30)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

const filePath = path.join(process.cwd(), 'docs', 'api', 'jsonpath.md');
ensureDir(path.dirname(filePath));

fs.writeFileSync(
	filePath,
	`# JSONPath API\n\nThis document provides an overview of the @jsonpath plugin-first JSONPath packages in this monorepo.\n\n## Overview\n\nThe ecosystem is split into a small framework package (@jsonpath/core) and many wiring-only plugins.\nThe initial implementation focuses on scaffolding and stable public surfaces, not full RFC 9535 semantics.\n\n## Key Packages\n\n- @jsonpath/core: Engine framework (no JSONPath semantics)\n- @jsonpath/plugin-rfc-9535: Preset wiring + createRfc9535Engine()\n- @jsonpath/complete: Convenience re-export bundle\n- @jsonpath/pointer, @jsonpath/patch, @jsonpath/mutate: Pointer/Patch/mutation utilities\n- @jsonpath/plugin-validate + @jsonpath/validator-*: Validation orchestration + adapters\n\n## Example\n\n\`\`\`ts\nimport { createRfc9535Engine } from '@jsonpath/complete';\n\nconst engine = createRfc9535Engine();\nconst compiled = engine.compile('$.a');\nconst results = engine.evaluateSync(compiled, { a: 1 });\nconsole.log(results);\n\`\`\`\n\n## Commands\n\n- Build: pnpm -w turbo build --filter=@jsonpath/*\n- Test: pnpm -w turbo test --filter @jsonpath/* -- --passWithNoTests\n- Verify exports: pnpm -w verify:exports\n`,
	'utf8',
);

console.log('Wrote docs/api/jsonpath.md');
