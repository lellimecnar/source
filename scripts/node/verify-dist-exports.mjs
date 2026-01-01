import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

async function verifyPackage(pkgPath) {
	const pkgJsonPath = path.join(pkgPath, 'package.json');
	if (!fs.existsSync(pkgJsonPath)) return true;

	const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
	const errors = [];

	const checkFile = (filePath, field) => {
		if (!filePath) return;
		const absolutePath = path.resolve(pkgPath, filePath);
		if (!fs.existsSync(absolutePath)) {
			errors.push(`Field "${field}" points to missing file: ${filePath}`);
		}
	};

	checkFile(pkg.main, 'main');
	checkFile(pkg.module, 'module');
	checkFile(pkg.types, 'types');
	checkFile(pkg.typings, 'typings');

	if (pkg.exports) {
		const checkExports = (exp, prefix = 'exports') => {
			if (typeof exp === 'string') {
				checkFile(exp, prefix);
			} else if (typeof exp === 'object' && exp !== null) {
				for (const [key, value] of Object.entries(exp)) {
					checkExports(value, `${prefix}.${key}`);
				}
			}
		};
		checkExports(pkg.exports);
	}

	if (errors.length > 0) {
		console.error(
			`\n❌ Errors in ${pkg.name} (${path.relative(rootDir, pkgPath)}):`,
		);
		errors.forEach((err) => console.error(`  - ${err}`));
		return false;
	}
	console.log(`✅ ${pkg.name} verified.`);
	return true;
}

async function main() {
	const workspaces = [
		'packages/*',
		'packages/jsonpath/*',
		'packages/card-stack/*',
		'packages/ui-spec/*',
	];

	let hasErrors = false;

	for (const pattern of workspaces) {
		const base = pattern.replace('/*', '');
		const dir = path.resolve(rootDir, base);
		if (!fs.existsSync(dir)) continue;

		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const pkgPath = path.join(dir, entry.name);
				console.log(`Checking ${pkgPath}...`);
				const success = await verifyPackage(pkgPath);
				if (!success) hasErrors = true;
			}
		}
	}

	if (hasErrors) {
		process.exit(1);
	} else {
		console.log('✅ All package exports verified successfully.');
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
