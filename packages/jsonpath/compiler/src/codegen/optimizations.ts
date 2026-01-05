import {
	NodeType,
	type QueryNode,
	type ExpressionNode,
} from '@jsonpath/parser';

export interface OptimizationFlags {
	readonly inlineSimpleSelectors?: boolean;
	readonly shortCircuitFilters?: boolean;
}

export function detectOptimizations(ast: QueryNode): OptimizationFlags {
	// Keep this deliberately conservative to avoid semantic drift.
	// Step 3 expands this with real opt passes.
	return {
		inlineSimpleSelectors: true,
		shortCircuitFilters: true,
	};
}

/**
 * Performs basic constant folding on an expression.
 */
export function foldConstants(expr: ExpressionNode): ExpressionNode {
	if (expr.type === NodeType.BinaryExpr) {
		const left = foldConstants(expr.left);
		const right = foldConstants(expr.right);

		if (left.type === NodeType.Literal && right.type === NodeType.Literal) {
			const l = left.value;
			const r = right.value;

			switch (expr.operator) {
				case '&&':
					return {
						...expr,
						type: NodeType.Literal,
						value: Boolean(l && r),
						raw: String(l && r),
					} as any;
				case '||':
					return {
						...expr,
						type: NodeType.Literal,
						value: Boolean(l || r),
						raw: String(l || r),
					} as any;
				case '==':
					return {
						...expr,
						type: NodeType.Literal,
						value: l === r,
						raw: String(l === r),
					} as any;
				case '!=':
					return {
						...expr,
						type: NodeType.Literal,
						value: l !== r,
						raw: String(l !== r),
					} as any;
				case '<':
					return {
						...expr,
						type: NodeType.Literal,
						value: (l as any) < (r as any),
						raw: String((l as any) < (r as any)),
					} as any;
				case '<=':
					return {
						...expr,
						type: NodeType.Literal,
						value: (l as any) <= (r as any),
						raw: String((l as any) <= (r as any)),
					} as any;
				case '>':
					return {
						...expr,
						type: NodeType.Literal,
						value: (l as any) > (r as any),
						raw: String((l as any) > (r as any)),
					} as any;
				case '>=':
					return {
						...expr,
						type: NodeType.Literal,
						value: (l as any) >= (r as any),
						raw: String((l as any) >= (r as any)),
					} as any;
			}
		}
		return { ...expr, left, right };
	}

	if (expr.type === NodeType.UnaryExpr) {
		const operand = foldConstants(expr.operand);
		if (operand.type === NodeType.Literal) {
			if (expr.operator === '!') {
				return {
					...expr,
					type: NodeType.Literal,
					value: !operand.value,
					raw: String(!operand.value),
				} as any;
			}
		}
		return { ...expr, operand };
	}

	return expr;
}
