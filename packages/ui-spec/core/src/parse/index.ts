import { UISpecError } from '../errors';
import {
	isPathBinding,
	isPlainObject,
	type NodeSchema,
	type UISpecSchema,
	type UISpecVersion,
} from '../schema';

function assertUISpecVersion(value: unknown): asserts value is UISpecVersion {
	if (value !== '1.0') {
		throw new UISpecError(
			'INVALID_SCHEMA_VERSION',
			'Invalid or unsupported $uispec version; expected "1.0".',
			'$.$uispec',
		);
	}
}

function validateChildren(children: unknown, path: string): void {
	if (children === undefined) return;

	const validateChild = (child: unknown, childPath: string) => {
		if (typeof child === 'string') return;
		if (isPathBinding(child)) return;
		if (isPlainObject(child)) {
			validateNode(child, childPath);
			return;
		}

		throw new UISpecError(
			'INVALID_CHILDREN',
			'Invalid children value; expected string, node, $path binding, or array.',
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

function validateNode(node: Record<string, unknown>, path: string): void {
	if (!isPlainObject(node)) {
		throw new UISpecError('INVALID_NODE', 'Node must be an object.', path);
	}

	if (typeof node.type !== 'string' || node.type.length === 0) {
		throw new UISpecError(
			'INVALID_NODE_TYPE',
			'Node.type must be a non-empty string.',
			`${path}.type`,
		);
	}

	if (node.class !== undefined && typeof node.class !== 'string') {
		throw new UISpecError(
			'INVALID_NODE',
			'Node.class must be a string when provided.',
			`${path}.class`,
		);
	}

	if (node.props !== undefined && !isPlainObject(node.props)) {
		throw new UISpecError(
			'INVALID_NODE',
			'Node.props must be an object when provided.',
			`${path}.props`,
		);
	}

	validateChildren(node.children, `${path}.children`);

	if (node.props && isPlainObject(node.props)) {
		for (const [key, value] of Object.entries(node.props)) {
			if (isPathBinding(value)) continue;
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
				'Invalid prop value; MVP supports literals, objects/arrays, or {$path: string} bindings.',
				`${path}.props.${key}`,
			);
		}
	}
}

export function parseUISpecSchema(input: unknown): UISpecSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError(
			'INVALID_SCHEMA',
			'UI-Spec schema must be a JSON object.',
			'$',
		);
	}

	assertUISpecVersion(input.$uispec);

	if (!isPlainObject(input.root)) {
		throw new UISpecError(
			'MISSING_ROOT',
			'UI-Spec schema must include a root node.',
			'$.root',
		);
	}

	validateNode(input.root, '$.root');

	return input as unknown as UISpecSchema;
}

export function parseNode(input: unknown, path = '$'): NodeSchema {
	if (!isPlainObject(input)) {
		throw new UISpecError('INVALID_NODE', 'Node must be an object.', path);
	}

	validateNode(input, path);
	return input as unknown as NodeSchema;
}
