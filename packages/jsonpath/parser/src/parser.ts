/**
 * @jsonpath/parser
 *
 * Pratt parser for JSONPath expressions.
 *
 * @packageDocumentation
 */

import { JSONPathSyntaxError } from '@jsonpath/core';
import { Lexer, TokenType, type Token } from '@jsonpath/lexer';

import {
	NodeType,
	type QueryNode,
	type SegmentNode,
	type SelectorNode,
	type ExpressionNode,
	type ASTNode,
	type SingularQueryNode,
} from './nodes.js';

const PRECEDENCE: Record<string, number> = {
	'||': 10,
	'&&': 20,
	'==': 30,
	'!=': 30,
	'<': 40,
	'<=': 40,
	'>': 40,
	'>=': 40,
};

export class Parser {
	private lexer: Lexer;

	constructor(input: string | Lexer) {
		this.lexer = typeof input === 'string' ? new Lexer(input) : input;
	}

	public parse(): QueryNode {
		const start = this.lexer.peek().start;
		this.expect(TokenType.ROOT);

		const segments: SegmentNode[] = [];
		while (this.lexer.peek().type !== TokenType.EOF) {
			segments.push(this.parseSegment());
		}

		return {
			type: NodeType.Query,
			start,
			end: this.lexer.peek().end,
			segments,
		};
	}

	private parseSegment(): SegmentNode {
		const token = this.lexer.peek();
		const start = token.start;
		let isDescendant = false;

		if (token.type === TokenType.DOT_DOT) {
			isDescendant = true;
			this.lexer.next();
		} else if (token.type === TokenType.DOT) {
			this.lexer.next();
		}

		const next = this.lexer.peek();
		const selectors: SelectorNode[] = [];

		if (next.type === TokenType.LBRACKET) {
			this.lexer.next();
			while (true) {
				selectors.push(this.parseSelector());
				if (this.lexer.peek().type === TokenType.COMMA) {
					this.lexer.next();
				} else {
					break;
				}
			}
			this.expect(TokenType.RBRACKET);
		} else if (next.type === TokenType.IDENT) {
			selectors.push({
				type: NodeType.NameSelector,
				start: next.start,
				end: next.end,
				name: next.value as string,
			});
			this.lexer.next();
		} else if (next.type === TokenType.WILDCARD) {
			selectors.push({
				type: NodeType.WildcardSelector,
				start: next.start,
				end: next.end,
			});
			this.lexer.next();
		} else {
			throw new JSONPathSyntaxError(
				`Unexpected token: ${next.type}` /** gitleaks:allow */,
				{
					position: next.start,
				},
			);
		}

		return {
			type: isDescendant ? NodeType.DescendantSegment : NodeType.ChildSegment,
			start,
			end: this.lexer.peek().start,
			selectors,
		};
	}

	private parseSelector(): SelectorNode {
		const token = this.lexer.peek();
		const start = token.start;

		if (token.type === TokenType.STRING) {
			this.lexer.next();
			return {
				type: NodeType.NameSelector,
				start,
				end: token.end,
				name: token.value as string,
			};
		}

		if (token.type === TokenType.NUMBER) {
			// Could be index or slice
			if (this.lexer.peekAhead(1).type === TokenType.COLON) {
				return this.parseSlice();
			}
			this.lexer.next();
			return {
				type: NodeType.IndexSelector,
				start,
				end: token.end,
				index: token.value as number,
			};
		}

		if (token.type === TokenType.COLON) {
			return this.parseSlice();
		}

		if (token.type === TokenType.WILDCARD) {
			this.lexer.next();
			return {
				type: NodeType.WildcardSelector,
				start,
				end: token.end,
			};
		}

		if (token.type === TokenType.FILTER) {
			this.lexer.next();
			this.expect(TokenType.LPAREN);
			const expression = this.parseExpression();
			this.expect(TokenType.RPAREN);
			return {
				type: NodeType.FilterSelector,
				start,
				end: this.lexer.peek().start,
				expression,
			};
		}

		throw new JSONPathSyntaxError(
			`Unexpected selector token: ${token.type}` /** gitleaks:allow */,
			{
				position: token.start,
			},
		);
	}

	private parseSlice(): SelectorNode {
		const startPos = this.lexer.peek().start;
		let startValue: number | null = null;
		let endValue: number | null = null;
		let stepValue: number | null = null;

		if (this.lexer.peek().type === TokenType.NUMBER) {
			startValue = this.lexer.next().value as number;
		}

		this.expect(TokenType.COLON);

		if (this.lexer.peek().type === TokenType.NUMBER) {
			endValue = this.lexer.next().value as number;
		}

		if (this.lexer.peek().type === TokenType.COLON) {
			this.lexer.next();
			if (this.lexer.peek().type === TokenType.NUMBER) {
				stepValue = this.lexer.next().value as number;
			}
		}

		return {
			type: NodeType.SliceSelector,
			start: startPos,
			end: this.lexer.peek().start,
			startValue,
			endValue,
			stepValue,
		};
	}

	private parseExpression(precedence = 0): ExpressionNode {
		let left = this.parsePrimary();

		while (true) {
			const token = this.lexer.peek();
			const op = token.value as string;
			const nextPrecedence = PRECEDENCE[op] || 0;

			if (nextPrecedence <= precedence) break;

			this.lexer.next();
			const right = this.parseExpression(nextPrecedence);
			left = {
				type: NodeType.BinaryExpr,
				start: left.start,
				end: right.end,
				operator: op,
				left,
				right,
			};
		}

		return left;
	}

	private parsePrimary(): ExpressionNode {
		const token = this.lexer.peek();
		const start = token.start;

		if (token.type === TokenType.NOT) {
			this.lexer.next();
			const operand = this.parseExpression(50);
			return {
				type: NodeType.UnaryExpr,
				start,
				end: operand.end,
				operator: '!',
				operand,
			};
		}

		if (token.type === TokenType.LPAREN) {
			this.lexer.next();
			const expr = this.parseExpression();
			this.expect(TokenType.RPAREN);
			return expr;
		}

		if (
			token.type === TokenType.STRING ||
			token.type === TokenType.NUMBER ||
			token.type === TokenType.TRUE ||
			token.type === TokenType.FALSE ||
			token.type === TokenType.NULL
		) {
			this.lexer.next();
			return {
				type: NodeType.Literal,
				start,
				end: token.end,
				value: token.value,
			};
		}

		if (token.type === TokenType.ROOT || token.type === TokenType.CURRENT) {
			return this.parseSingularQuery();
		}

		if (token.type === TokenType.IDENT) {
			// Function call
			if (this.lexer.peekAhead(1).type === TokenType.LPAREN) {
				const name = token.value as string;
				this.lexer.next();
				this.lexer.next();
				const args: ExpressionNode[] = [];
				if (this.lexer.peek().type !== TokenType.RPAREN) {
					while (true) {
						args.push(this.parseExpression());
						if (this.lexer.peek().type === TokenType.COMMA) {
							this.lexer.next();
						} else {
							break;
						}
					}
				}
				this.expect(TokenType.RPAREN);
				return {
					type: NodeType.FunctionCall,
					start,
					end: this.lexer.peek().start,
					name,
					args,
				};
			}
		}

		throw new JSONPathSyntaxError(
			`Unexpected expression token: ${token.type}`, // gitleaks:allow
			{ position: token.start },
		);
	}

	private parseSingularQuery(): SingularQueryNode {
		const token = this.lexer.peek();
		const start = token.start;
		const isRoot = token.type === TokenType.ROOT;
		this.lexer.next();

		const segments: SegmentNode[] = [];
		while (true) {
			const next = this.lexer.peek();
			if (
				next.type === TokenType.DOT ||
				next.type === TokenType.DOT_DOT ||
				next.type === TokenType.LBRACKET
			) {
				segments.push(this.parseSegment());
			} else {
				break;
			}
		}

		return {
			type: NodeType.SingularQuery,
			start,
			end: this.lexer.peek().start,
			root: isRoot,
			segments,
		};
	}

	private expect(type: TokenType): Token {
		const token = this.lexer.next();
		if (token.type !== type) {
			throw new JSONPathSyntaxError(`Expected ${type}, got ${token.type}`, {
				position: token.start,
			});
		}
		return token;
	}
}

export function parse(input: string): QueryNode {
	return new Parser(input).parse();
}
