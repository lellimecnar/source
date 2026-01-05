import {
	NodeType,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	isSingularQuery,
} from '@jsonpath/parser';

/**
 * Generate JS source for a function `(root, options) => QueryResult`.
 *
 * Runtime dependencies are injected by the compiler via `new Function(...)`:
 * - QueryResult (class)
 * - evaluate (fallback interpreter)
 * - getFunction (builtin function resolver)
 * - Nothing (sentinel)
 */
export function generateQueryFunctionSource(ast: QueryNode): string {
	// Conservative fast-path: if AST is not supported by the generator yet,
	// emit a fallback call to the interpreter to keep correctness.
	//
	// As we add generators, we expand supported node coverage.
	if (ast.type !== NodeType.Query) {
		return `return (root, options) => evaluate(root, ast, options);`;
	}

	// For now, generate a small set of segment/selector types that cover the
	// majority of CTS queries: child/descendant segments and name/index/wildcard/slice/filter selectors.
	// Anything else falls back per-segment.

	const lines: string[] = [];
	lines.push('return (root, options) => {');
	lines.push('  const _root = root;');
	lines.push('  let nodes = [{ value: root, path: [], root: _root }];');
	lines.push('  let next = [];');
	lines.push('');

	for (let i = 0; i < ast.segments.length; i++) {
		const seg = ast.segments[i]!;
		lines.push(...generateSegment(seg, i));
		lines.push('');
	}

	lines.push('  return new QueryResult(nodes);');
	lines.push('};');
	return lines.join('\n');
}

function generateSegment(segment: SegmentNode, index: number): string[] {
	const lines: string[] = [];
	lines.push(`  // segment ${index + 1}`);
	lines.push('  next = [];');

	const isDesc = segment.type === NodeType.DescendantSegment;
	if (isDesc) {
		lines.push('  for (const node of nodes) {');
		lines.push('    for (const desc of _descend(node)) {');
		lines.push('      const v = desc.value;');
		for (const sel of segment.selectors) {
			lines.push(...generateSelector(sel, 'desc', 'v'));
		}
		lines.push('    }');
		lines.push('  }');
	} else {
		lines.push('  for (const node of nodes) {');
		lines.push('    const v = node.value;');
		for (const sel of segment.selectors) {
			lines.push(...generateSelector(sel, 'node', 'v'));
		}
		lines.push('  }');
	}

	lines.push('  nodes = next;');
	return lines;
}

function generateSelector(
	sel: SelectorNode,
	nodeVar: string,
	valueVar: string,
): string[] {
	switch (sel.type) {
		case NodeType.NameSelector: {
			const name = JSON.stringify(sel.name);
			return [
				`    if (${valueVar} !== null && typeof ${valueVar} === 'object' && !Array.isArray(${valueVar}) && (${name} in ${valueVar})) {`,
				`      next.push({ value: ${valueVar}[${name}], path: [...${nodeVar}.path, ${name}], root: _root, parent: ${valueVar}, parentKey: ${name} });`,
				'    }',
			];
		}
		case NodeType.IndexSelector: {
			const idx = sel.index;
			if (idx < 0) {
				return [
					`    if (Array.isArray(${valueVar})) {`,
					`      const i = ${valueVar}.length + (${idx});`,
					`      if (i >= 0 && i < ${valueVar}.length) {`,
					`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
					'      }',
					'    }',
				];
			}
			return [
				`    if (Array.isArray(${valueVar}) && ${idx} >= 0 && ${idx} < ${valueVar}.length) {`,
				`      next.push({ value: ${valueVar}[${idx}], path: [...${nodeVar}.path, ${idx}], root: _root, parent: ${valueVar}, parentKey: ${idx} });`,
				'    }',
			];
		}
		case NodeType.WildcardSelector: {
			return [
				`    if (Array.isArray(${valueVar})) {`,
				`      for (let i = 0; i < ${valueVar}.length; i++) {`,
				`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
				'      }',
				`    } else if (${valueVar} !== null && typeof ${valueVar} === 'object') {`,
				`      for (const k of Object.keys(${valueVar})) {`,
				`        next.push({ value: ${valueVar}[k], path: [...${nodeVar}.path, k], root: _root, parent: ${valueVar}, parentKey: k });`,
				'      }',
				'    }',
			];
		}
		case NodeType.SliceSelector: {
			// Delegate to helper to keep generated source small.
			const start = sel.start === null ? 'null' : String(sel.start);
			const end = sel.end === null ? 'null' : String(sel.end);
			const step = sel.step === null ? 'null' : String(sel.step);
			return [
				`    if (Array.isArray(${valueVar})) {`,
				`      for (const i of _slice(${valueVar}.length, ${start}, ${end}, ${step})) {`,
				`        next.push({ value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
				'      }',
				'    }',
			];
		}
		case NodeType.FilterSelector: {
			// For now: compile filter via interpreter per-element to keep semantics correct.
			// Step 3 adds a real expression compiler and short-circuiting.
			if (isSingularQuery(sel.expression as any)) {
				// no-op; keep TS satisfied
			}
			return [
				`    if (Array.isArray(${valueVar})) {`,
				`      for (let i = 0; i < ${valueVar}.length; i++) {`,
				`        const current = ${valueVar}[i];`,
				`        // fallback filter predicate: evaluate the filter expression by running a tiny query against @`,
				`        // NOTE: evaluator handles LogicalType + Nothing semantics.`,
				`        const ok = _evalFilter(current, ${JSON.stringify(sel.expression)});`,
				`        if (ok) {`,
				`          next.push({ value: current, path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i });`,
				`        }`,
				'      }',
				'    }',
			];
		}
		default:
			return [
				`    // unsupported selector (${(sel as any).type}); fallback to interpreter`,
				`    return evaluate(_root, ast, options);`,
			];
	}
}
