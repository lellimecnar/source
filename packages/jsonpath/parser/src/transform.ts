/**
 * @jsonpath/parser
 *
 * AST transformation utilities.
 *
 * @packageDocumentation
 */

import {
	NodeType,
	type ASTNode,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	type SingularQueryNode,
	type BinaryExprNode,
	type UnaryExprNode,
	type FunctionCallNode,
} from './nodes.js';

export type Transformer = {
	[K in NodeType]?: (node: any) => ASTNode | null;
};

export function transform(
	node: ASTNode,
	transformer: Transformer,
): ASTNode | null {
	const transformNode = transformer[node.type];
	let newNode: any = transformNode ? transformNode(node) : { ...node };

	if (!newNode) return null;

	switch (newNode.type) {
		case NodeType.Query:
			newNode.segments = newNode.segments
				.map((s: any) => transform(s, transformer))
				.filter(Boolean);
			break;
		case NodeType.ChildSegment:
		case NodeType.DescendantSegment:
			newNode.selectors = newNode.selectors
				.map((s: any) => transform(s, transformer))
				.filter(Boolean);
			break;
		case NodeType.FilterSelector:
			newNode.expression = transform(newNode.expression, transformer);
			break;
		case NodeType.BinaryExpr:
			newNode.left = transform(newNode.left, transformer);
			newNode.right = transform(newNode.right, transformer);
			break;
		case NodeType.UnaryExpr:
			newNode.operand = transform(newNode.operand, transformer);
			break;
		case NodeType.FunctionCall:
			newNode.args = newNode.args
				.map((a: any) => transform(a, transformer))
				.filter(Boolean);
			break;
		case NodeType.SingularQuery:
			newNode.segments = newNode.segments
				.map((s: any) => transform(s, transformer))
				.filter(Boolean);
			break;
	}

	return newNode;
}
