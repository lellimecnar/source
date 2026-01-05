import {
	NodeType,
	type ExpressionNode,
	type QueryNode,
} from '@jsonpath/parser';

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

			// Comparison operators
			return `_compare(${left}, ${right}, ${JSON.stringify(expr.operator)})`;
		}

		case NodeType.UnaryExpr: {
			const operand = generateExpression(expr.operand);
			if (expr.operator === '!') {
				return `!_isTruthy(${operand})`;
			}
			return `(${expr.operator}${operand})`;
		}

		case NodeType.FunctionCall: {
			const args = expr.args.map(generateExpression).join(', ');
			return `getFunction(${JSON.stringify(expr.name)}).evaluate(${args})`;
		}

		case NodeType.Query: {
			// Sub-query (relative or absolute)
			const queryStr = JSON.stringify(expr);
			return `evaluate(${expr.root ? '_root' : 'current.value'}, ${queryStr}, options)`;
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
