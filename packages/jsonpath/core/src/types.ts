/**
 * @jsonpath/core
 *
 * JSON type system and query result interfaces.
 *
 * @packageDocumentation
 */

import type { JSONPathPlugin } from './plugins.js';

/**
 * Represents any valid JSON value.
 */
export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };

/**
 * Represents a JSON primitive value.
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * Represents a JSON object.
 */
export type JSONObject = Record<string, JSONValue>;

/**
 * Represents a JSON array.
 */
export type JSONArray = JSONValue[];

/**
 * Represents a single segment in a JSON path.
 */
export type PathSegment = string | number;

/**
 * Represents a full JSON path as a sequence of segments.
 */
export type Path = readonly PathSegment[];

/**
 * Represents a node in a query result set.
 */
export interface QueryNode<T = unknown> {
	/** The value at this node */
	readonly value: T;
	/** The path to this node from the root */
	readonly path: Path;
	/** The root document this node belongs to */
	readonly root: unknown;
	/** Parent object/array containing this node */
	readonly parent?: unknown;
	/** Property name or index in parent */
	readonly parentKey?: PathSegment;
}

/**
 * Minimal interface for a JSON Pointer.
 */
export interface JSONPointerInterface {
	/** Returns the pointer as a string */
	toString: () => string;
	/** Evaluates the pointer against a root object */
	resolve: <T = any>(root: unknown) => T | undefined;
}

/**
 * Represents the result of a JSONPath query.
 */
export interface QueryResult<T = unknown> extends Iterable<QueryNode<T>> {
	/** Extract all values */
	values: () => T[];

	/** Extract all paths as segment arrays */
	paths: () => PathSegment[][];

	/** Extract all paths as JSON Pointer objects (RFC 6901) */
	pointers: () => JSONPointerInterface[];

	/** Extract all paths as JSON Pointer strings (RFC 6901) */
	pointerStrings: () => string[];

	/** Extract all paths as RFC 9535 Normalized Path strings */
	normalizedPaths: () => string[];

	/** Get all nodes */
	nodes: () => QueryNode<T>[];

	/** Get first node or undefined */
	first: () => QueryNode<T> | undefined;

	/** Get last node or undefined */
	last: () => QueryNode<T> | undefined;

	/** Check if result set is empty */
	isEmpty: () => boolean;

	/** Get result count */
	readonly length: number;

	/** Map values through a transform function */
	map: <U>(fn: (value: T, node: QueryNode<T>) => U) => U[];

	/** Filter nodes by predicate */
	filter: (fn: (value: T, node: QueryNode<T>) => boolean) => QueryResult<T>;

	/** Execute callback for each node */
	forEach: (fn: (value: T, node: QueryNode<T>) => void) => void;

	/** Get parents of all matched nodes */
	parents: () => QueryResult;
}

/**
 * Definition for a JSONPath function (RFC 9535).
 */
export interface FunctionDefinition<
	TArgs extends unknown[] = unknown[],
	TReturn = unknown,
> {
	readonly name: string;
	readonly signature: readonly ParameterType[];
	readonly returns: ReturnType;
	readonly evaluate: (...args: TArgs) => TReturn;
}

/**
 * Definition for a JSONPath selector.
 */
export interface SelectorDefinition {
	readonly name: string;
	readonly parse: (lexer: any) => any; // Will be refined when lexer/parser are implemented
	readonly evaluate: (
		node: QueryNode,
		ctx: any, // Will be refined when evaluator is implemented
	) => Iterable<QueryNode>;
}

/**
 * Definition for a JSONPath operator.
 */
export interface OperatorDefinition {
	readonly symbol: string;
	readonly precedence: number;
	readonly associativity: 'left' | 'right';
	readonly evaluate: (left: unknown, right: unknown) => unknown;
}

/**
 * Parameter types for JSONPath functions.
 */
export type ParameterType = 'ValueType' | 'LogicalType' | 'NodesType';

/**
 * Return types for JSONPath functions.
 */
export type ReturnType = 'ValueType' | 'LogicalType' | 'NodesType';

export interface SecureQueryOptions {
	readonly allowPaths?: readonly string[];
	readonly blockPaths?: readonly string[];
	readonly noRecursive?: boolean;
	readonly noFilters?: boolean;
	readonly maxQueryLength?: number;
}

export interface ParserOptions {
	/** When true, reject non-RFC conveniences/extensions. */
	readonly strict?: boolean;
	/** When true, allow arithmetic operators (+, -, *, /, %). */
	readonly arithmetic?: boolean;
}

export interface EvaluatorOptions extends ParserOptions {
	readonly maxDepth?: number;
	readonly maxResults?: number;
	readonly maxNodes?: number;
	readonly maxFilterDepth?: number;
	readonly timeout?: number;
	readonly detectCircular?: boolean;
	readonly secure?: SecureQueryOptions;
	readonly signal?: AbortSignal;
	readonly plugins?: readonly JSONPathPlugin[];
}
