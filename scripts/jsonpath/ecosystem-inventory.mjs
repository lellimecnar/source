import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagesDir = path.join(root, 'packages', 'jsonpath');

function listDirs(p) {
	return fs
		.readdirSync(p, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
}

function walkFiles(dir, exts) {
	const out = [];
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			out.push(...walkFiles(full, exts));
		} else if (ent.isFile()) {
			if (exts.some((e) => ent.name.endsWith(e))) out.push(full);
		}
	}
	return out;
}

const placeholderPatterns = [
	/Framework-only stable placeholder/i,
	/pragmatic placeholder/i,
	/Unsupported JSON Patch operation/i,
	/placeholder path/i,
];

const rows = [];
for (const pkg of listDirs(packagesDir)) {
	const pkgDir = path.join(packagesDir, pkg);
	const pkgJsonPath = path.join(pkgDir, 'package.json');
	if (!fs.existsSync(pkgJsonPath)) continue;
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
	const name = pkgJson.name ?? `(missing name) ${pkg}`;

	const srcDir = path.join(pkgDir, 'src');
	const files = fs.existsSync(srcDir)
		? walkFiles(srcDir, ['.ts', '.tsx', '.js', '.mjs'])
		: [];
	let placeholders = 0;
	for (const f of files) {
		const text = fs.readFileSync(f, 'utf8');
		if (placeholderPatterns.some((re) => re.test(text))) placeholders += 1;
	}

	rows.push({
		name,
		pkg,
		placeholders,
		hasSrc: fs.existsSync(srcDir),
		fileCount: files.length,
	});
}

rows.sort((a, b) => a.name.localeCompare(b.name));

process.stdout.write('JSONPath ecosystem inventory\n');
process.stdout.write('==========================\n\n');
for (const r of rows) {
	process.stdout.write(
		`${r.name}\n  folder: packages/jsonpath/${r.pkg}\n  src: ${r.hasSrc ? 'yes' : 'no'} (${r.fileCount} files)\n  placeholder-matches: ${r.placeholders}\n\n`,
	);
}

const total = rows.reduce((n, r) => n + r.placeholders, 0);
process.stdout.write(`TOTAL placeholder-matches: ${total}\n`);
