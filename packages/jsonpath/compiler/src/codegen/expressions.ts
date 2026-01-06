import {
	NodeType,
	type ExpressionNode,
	type QueryNode,
} from '@jsonpath/parser';

/**
 * Check if a query is a simple relative path like @.prop or @.prop1.prop2
 */
function isSimpleRelativeQuery(query: QueryNode): boolean {
	if (query.root) return false; // Must be relative (starts with @)
	if (query.segments.length === 0) return false;

	return query.segments.every(
		(seg) =>
			seg.type === NodeType.ChildSegment &&
			seg.selectors.length === 1 &&
			seg.selectors[0]!.type === NodeType.NameSelector,
	);
}

/**
 * Generate inline property access for a simple relative query
 * Returns an object with { exists: boolean, value: any } to support existence tests
 */
function generateSimpleRelativeAccess(query: QueryNode): string {
	const props = query.segments.map((seg) => {
		const sel = seg.selectors[0] as {
			type: typeof NodeType.NameSelector;
			name: string;
		};
		return sel.name;
	});

	// Generate: check if property chain exists and get value
	// Returns { __exists: true, value: X } if exists, { __exists: false } if not
	// Per RFC 9535, name selectors only select from objects, not arrays
	const checks: string[] = [];
	let access = 'current.value';
	for (const prop of props) {
		checks.push(
			`${access} && typeof ${access} === 'object' && !Array.isArray(${access}) && ${JSON.stringify(prop)} in ${access}`,
		);
		access = `${access}[${JSON.stringify(prop)}]`;
	}
	const existsCheck = checks.join(' && ');
	return `(${existsCheck} ? { __exists: true, value: ${access} } : Nothing)`;
}

/**
 * Generate JS source for an expression.
 */
export function generateExpression(expr: ExpressionNode): string {
	switch (expr.type) {
		case NodeType.Literal:
			return JSON.stringify(expr.value);

		case NodeType.BinaryExpr: {
			const left = generateExpression(expr.left);
			const right = generateExpression(expr.right);

			if (expr.operator === '&&' || expr.operator === '||') {
				// Short-circuiting logical operators
				return `(_isTruthy(${left}) ${expr.operator} _isTruthy(${right}))`;
			}

			// Arithmetic operators - inline for performance
			if (['+', '-', '*', '/', '%'].includes(expr.operator)) {
				return `_arithmetic(${left}, ${right}, ${JSON.stringify(expr.operator)})`;
			}

			// Comparison operators
			return `_compare(${left}, ${right}, ${JSON.stringify(expr.operator)})`;
		}

		case NodeType.UnaryExpr: {
			const operand = generateExpression(expr.operand);
			if (expr.operator === '!') {
				return `!_isTruthy(${operand})`;
			}
			if (expr.operator === '-') {
				// Unary minus - unwrap value first
				return `_unaryMinus(${operand})`;
			}
			return `(${expr.operator}${operand})`;
		}

		case NodeType.FunctionCall: {
			// Generate code that passes raw values; the function call wrapper handles unwrapping
			// based on the function's signature
			const fnName = JSON.stringify(expr.name);
			const args = expr.args.map(generateExpression).join(', ');
			// _callFunction handles signature-aware argument processing
			return `_callFunction(getFunction(${fnName}), ${fnName}, [${args}])`;
		}

		case NodeType.Query: {
			// Fast path for simple relative queries like @.price
			if (isSimpleRelativeQuery(expr)) {
				return generateSimpleRelativeAccess(expr);
			}
			// Full sub-query (relative or absolute)
			const queryStr = JSON.stringify(expr);
			return `evaluate(${expr.root ? '_root' : 'current.value'}, ${queryStr}, options)`;
		}

		case 'ArrayLiteral': {
			// Array literal like [1, 2, 3]
			const elements = (expr as any).elements
				.map(generateExpression)
				.join(', ');
			return `[${elements}]`;
		}

		case 'ObjectLiteral': {
			// Object literal like {"a": 1, "b": 2}
			const props = Object.entries((expr as any).properties)
				.map(
					([key, val]) =>
						`${JSON.stringify(key)}: ${generateExpression(val as any)}`,
				)
				.join(', ');
			return `{${props}}`;
		}

		default:
			throw new Error(
				`Unsupported expression node type: ${(expr as any).type}`,
			);
	}
}

/**
 * Generate JS source for a filter predicate.
 */
export function generateFilterPredicate(expr: ExpressionNode): string {
	const body = generateExpression(expr);
	return `const ok = _isTruthy(${body});`;
}
