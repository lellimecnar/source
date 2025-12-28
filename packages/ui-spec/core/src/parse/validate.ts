import { UISpecError } from '../errors';
import { isBindingExpr, isPlainObject, type UISpecSchema } from '../schema';

export interface ValidateOptions {
	strictUnknownProps?: boolean;
	maxDepth?: number;
	maxNodes?: number;
}

function assert(
	condition: unknown,
	code: UISpecError['code'],
	message: string,
	path: string,
) {
	if (!condition) throw new UISpecError(code, message, path);
}

function validateChildren(
	children: unknown,
	path: string,
	state: { nodes: number; depth: number },
	options: ValidateOptions,
): void {
	if (children === undefined) return;

	const validateChild = (child: unknown, childPath: string) => {
		if (typeof child === 'string') return;
		if (isBindingExpr(child)) return;
		if (isPlainObject(child)) {
			validateNode(child, childPath, state, options);
			return;
		}
		throw new UISpecError(
			'INVALID_CHILDREN',
			'Invalid children value; expected string, node, binding, or array.',
			childPath,
		);
	};

	if (Array.isArray(children)) {
		children.forEach((c, index) => {
			validateChild(c, `${path}[${index}]`);
		});
		return;
	}

	validateChild(children, path);
}

export function validateNode(
	node: Record<string, unknown>,
	path: string,
	state: { nodes: number; depth: number },
	options: ValidateOptions,
): void {
	assert(isPlainObject(node), 'INVALID_NODE', 'Node must be an object.', path);

	state.nodes += 1;
	assert(
		options.maxNodes === undefined || state.nodes <= options.maxNodes,
		'SECURITY_LIMIT_EXCEEDED',
		`Node limit exceeded (maxNodes=${options.maxNodes}).`,
		path,
	);
	assert(
		options.maxDepth === undefined || state.depth <= options.maxDepth,
		'SECURITY_LIMIT_EXCEEDED',
		`Depth limit exceeded (maxDepth=${options.maxDepth}).`,
		path,
	);

	assert(
		typeof node.type === 'string' && node.type.length > 0,
		'INVALID_NODE_TYPE',
		'Node.type must be a non-empty string.',
		`${path}.type`,
	);

	if (node.class !== undefined) {
		assert(
			typeof node.class === 'string',
			'INVALID_NODE',
			'Node.class must be a string.',
			`${path}.class`,
		);
	}
	if (node.props !== undefined) {
		assert(
			isPlainObject(node.props),
			'INVALID_NODE',
			'Node.props must be an object.',
			`${path}.props`,
		);
	}

	validateChildren(
		node.children,
		`${path}.children`,
		{ ...state, depth: state.depth + 1 },
		options,
	);

	if (node.props && isPlainObject(node.props)) {
		for (const [key, value] of Object.entries(node.props)) {
			if (isBindingExpr(value)) continue;
			if (
				value === null ||
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				Array.isArray(value) ||
				isPlainObject(value)
			) {
				continue;
			}

			throw new UISpecError(
				'INVALID_BINDING',
				'Invalid prop value; supports literals, objects/arrays, or bindings.',
				`${path}.props.${key}`,
			);
		}
	}

	// Directive structural checks (minimal; runtime semantics are in later steps)
	if (node.$if !== undefined) {
		assert(
			node.$then !== undefined,
			'INVALID_DIRECTIVE',
			'$if requires $then.',
			`${path}.$then`,
		);
	}
	if (node.$switch !== undefined) {
		assert(
			isPlainObject(node.$switch) && Array.isArray((node.$switch as any).cases),
			'INVALID_DIRECTIVE',
			'$switch must have { on, cases[] }.',
			`${path}.$switch`,
		);
	}
	if (node.$for !== undefined) {
		assert(
			isPlainObject(node.$for) &&
				isPlainObject(node.$for as any) &&
				(node.$for as any).then,
			'INVALID_DIRECTIVE',
			'$for must have { each, then }.',
			`${path}.$for`,
		);
	}
	if (node.$bind !== undefined) {
		assert(
			isPlainObject(node.$bind) && typeof (node.$bind as any).path === 'string',
			'INVALID_DIRECTIVE',
			'$bind must have { path: string }.',
			`${path}.$bind`,
		);
	}
	if (node.$on !== undefined) {
		assert(
			isPlainObject(node.$on),
			'INVALID_DIRECTIVE',
			'$on must be an object.',
			`${path}.$on`,
		);
	}
}

export function validateSchema(
	schema: UISpecSchema,
	options?: ValidateOptions,
): void {
	const opts: ValidateOptions = {
		strictUnknownProps: options?.strictUnknownProps ?? false,
		maxDepth: options?.maxDepth ?? 200,
		maxNodes: options?.maxNodes ?? 50_000,
	};

	if (schema.routes && schema.routes.length > 0) {
		// Routed apps can omit root; shell semantics are handled by router packages.
		return;
	}

	if (!schema.root) {
		throw new UISpecError(
			'MISSING_ROOT',
			'UI-Spec schema must include a root node.',
			'$.root',
		);
	}

	validateNode(
		schema.root as unknown as Record<string, unknown>,
		'$.root',
		{ nodes: 0, depth: 0 },
		opts,
	);
}
