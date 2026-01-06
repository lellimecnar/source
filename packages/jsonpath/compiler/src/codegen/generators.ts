import {
	NodeType,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	isSingularQuery,
} from '@jsonpath/parser';

import { generateFilterPredicate } from './expressions.js';
import { foldConstants } from './optimizations.js';

const RUNTIME_HELPERS = `
  const _isTruthy = (val) => {
    if (val === Nothing) return false;
    if (typeof val === 'boolean') return val;
    if (val && typeof val === 'object' && '__isLogicalType' in val) return val.value;
    if (val instanceof QueryResult) return val.nodes.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return !!val;
  };
  
  const _slice = (len, start, end, step) => {
    const s = step === null ? 1 : step;
    if (s === 0) return [];
    const n = (i, l) => i < 0 ? Math.max(l + i, 0) : Math.min(i, l);
    const st = start === null ? (s > 0 ? 0 : len - 1) : n(start, len);
    const en = end === null ? (s > 0 ? len : -1) : n(end, len);
    const res = [];
    if (s > 0) {
      for (let i = st; i < en; i += s) res.push(i);
    } else {
      for (let i = st; i > en; i += s) res.push(i);
    }
    return res;
  };

  const _descend = function* (node) {
    const val = node.value;
    if (val !== null && typeof val === 'object') {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const child = { value: val[i], path: [...node.path, i], root: node.root, parent: val, parentKey: i };
          yield child;
          yield* _descend(child);
        }
      } else {
        for (const k of Object.keys(val)) {
          const child = { value: val[k], path: [...node.path, k], root: node.root, parent: val, parentKey: k };
          yield child;
          yield* _descend(child);
        }
      }
    }
  };

  const _compare = (left, right, operator) => {
    const unwrap = (val) => {
      if (val instanceof QueryResult) {
        return val.nodes.length === 1 ? val.nodes[0].value : Nothing;
      }
      return val;
    };
    const l = unwrap(left);
    const r = unwrap(right);
    if (l === Nothing && r === Nothing) return operator === '==' || operator === '<=' || operator === '>=';
    if (l === Nothing || r === Nothing) return operator === '!=';
    
    if (operator === '==') return JSON.stringify(l) === JSON.stringify(r);
    if (operator === '!=') return JSON.stringify(l) !== JSON.stringify(r);
    
    if (typeof l === typeof r && (typeof l === 'number' || typeof l === 'string')) {
      switch (operator) {
        case '<': return l < r;
        case '<=': return l <= r;
        case '>': return l > r;
        case '>=': return l >= r;
      }
    }
    return false;
  };
`;

/**
 * Generate JS source for a function `(root, options) => QueryResult`.
 *
 * Runtime dependencies are injected by the closure-based executor:
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

	const lines: string[] = [];
	lines.push(RUNTIME_HELPERS);
	lines.push('return (root, options) => {');
	lines.push('  const _root = root;');

	// Fast path for simple queries like $.name or $.name.age
	const isSimple = ast.segments.every(
		(seg) =>
			seg.type === NodeType.ChildSegment &&
			seg.selectors.length === 1 &&
			((seg.selectors[0] as any).type === NodeType.NameSelector ||
				(seg.selectors[0] as any).type === NodeType.IndexSelector),
	);

	if (isSimple && ast.segments.length > 0) {
		lines.push('  let v = _root;');
		lines.push('  let p = [];');
		lines.push('  let parent = null;');
		lines.push('  let parentKey = null;');

		for (let i = 0; i < ast.segments.length; i++) {
			const sel = ast.segments[i]!.selectors[0] as any;
			if (sel.type === NodeType.NameSelector) {
				const name = JSON.stringify(sel.name);
				lines.push(
					`  if (v !== null && typeof v === 'object' && !Array.isArray(v) && (${name} in v)) {`,
				);
				lines.push(
					`    parent = v; parentKey = ${name}; v = v[${name}]; p.push(${name});`,
				);
				lines.push('  } else { return new QueryResult([]); }');
			} else {
				const idx = sel.index;
				if (idx >= 0) {
					lines.push(
						`  if (Array.isArray(v) && ${idx} >= 0 && ${idx} < v.length) {`,
					);
					lines.push(
						`    parent = v; parentKey = ${idx}; v = v[${idx}]; p.push(${idx});`,
					);
					lines.push('  } else { return new QueryResult([]); }');
				} else {
					lines.push(`  if (Array.isArray(v)) {`);
					lines.push(`    const i = v.length + (${idx});`);
					lines.push(`    if (i >= 0 && i < v.length) {`);
					lines.push(`      parent = v; parentKey = i; v = v[i]; p.push(i);`);
					lines.push('    } else { return new QueryResult([]); }');
					lines.push('  } else { return new QueryResult([]); }');
				}
			}
		}
		lines.push(
			'  return new QueryResult([{ value: v, path: p, root: _root, parent, parentKey }]);',
		);
		lines.push('};');
		return lines.join('\n');
	}

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
			const expr = foldConstants(sel.expression);
			return [
				`    if (Array.isArray(${valueVar})) {`,
				`      for (let i = 0; i < ${valueVar}.length; i++) {`,
				`        const current = { value: ${valueVar}[i], path: [...${nodeVar}.path, i], root: _root, parent: ${valueVar}, parentKey: i };`,
				`        ${generateFilterPredicate(expr)}`,
				`        if (ok) {`,
				`          next.push(current);`,
				`        }`,
				'      }',
				'    }',
			];
		}
		case NodeType.ParentSelector: {
			return [
				`    if (${nodeVar}.path.length > 0) {`,
				`      const parentPath = ${nodeVar}.path.slice(0, -1);`,
				`      let parentValue = _root;`,
				`      let grandParent = null;`,
				`      let parentKey = null;`,
				`      for (let i = 0; i < parentPath.length; i++) {`,
				`        grandParent = parentValue;`,
				`        parentKey = parentPath[i];`,
				`        parentValue = parentValue[parentKey];`,
				`      }`,
				`      next.push({ value: parentValue, path: parentPath, root: _root, parent: grandParent, parentKey });`,
				'    }',
			];
		}
		case NodeType.PropertySelector: {
			return [
				`    if (${nodeVar}.parentKey !== undefined) {`,
				`      next.push({ value: ${nodeVar}.parentKey, path: ${nodeVar}.path, root: _root, parent: ${nodeVar}.parent, parentKey: ${nodeVar}.parentKey });`,
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
