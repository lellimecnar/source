import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listWorkspacePackageJsons() {
	const candidates = [
		path.join(repoRoot, 'packages'),
		// Workspace groups under packages/ that contain multiple packages.
		path.join(repoRoot, 'packages', 'card-stack'),
		path.join(repoRoot, 'packages', 'ui-spec'),
	];

	const results = [];
	for (const baseDir of candidates) {
		if (!fs.existsSync(baseDir)) continue;
		for (const entry of fs.readdirSync(baseDir)) {
			const pkgDir = path.join(baseDir, entry);
			const pkgJson = path.join(pkgDir, 'package.json');
			if (fs.existsSync(pkgJson)) results.push(pkgJson);
		}
	}
	return results;
}

function assertFileExists(relativeToRepoRoot) {
	const abs = path.join(repoRoot, relativeToRepoRoot);
	if (!fs.existsSync(abs)) {
		throw new Error(`Missing file: ${relativeToRepoRoot}`);
	}
}

function collectExportTargets(exportsField, targets = new Set()) {
	if (!exportsField) return targets;
	if (typeof exportsField === 'string') {
		targets.add(exportsField);
		return targets;
	}
	if (Array.isArray(exportsField)) {
		for (const item of exportsField) collectExportTargets(item, targets);
		return targets;
	}
	if (typeof exportsField === 'object') {
		for (const value of Object.values(exportsField)) {
			collectExportTargets(value, targets);
		}
		return targets;
	}
	return targets;
}

const packageJsonPaths = listWorkspacePackageJsons();

const problems = [];

for (const pkgJsonPath of packageJsonPaths) {
	const pkgDir = path.dirname(pkgJsonPath);
	const pkg = readJson(pkgJsonPath);

	// Only validate packages that claim to ship dist output.
	const distLike =
		String(pkg.main ?? '').startsWith('./dist/') ||
		String(pkg.types ?? '').startsWith('./dist/') ||
		JSON.stringify(pkg.exports ?? '').includes('./dist/');

	if (!distLike) continue;

	try {
		const relPkgDir = path.relative(repoRoot, pkgDir);

		if (pkg.main) assertFileExists(path.join(relPkgDir, pkg.main));
		if (pkg.types) assertFileExists(path.join(relPkgDir, pkg.types));

		const exportTargets = [...collectExportTargets(pkg.exports)];
		for (const t of exportTargets) {
			if (typeof t === 'string' && t.startsWith('./dist/')) {
				assertFileExists(path.join(relPkgDir, t));
			}
		}
	} catch (err) {
		problems.push({
			package: pkg.name ?? pkgJsonPath,
			error: err.message,
		});
	}
}

if (problems.length) {
	console.error('Export verification failed:');
	for (const p of problems) console.error(`- ${p.package}: ${p.error}`);
	process.exit(1);
}

console.log('Export verification passed.');
