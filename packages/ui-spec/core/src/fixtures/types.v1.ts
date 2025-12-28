import type {
	BindDirective,
	CallBinding,
	ExprBinding,
	FnBinding,
	NodeSchema,
	PathBinding,
	RouteSchema,
	UISpecSchema,
} from '../schema';

// Compile-only fixtures to lock the public type surface.

const _path: PathBinding = { $path: '$.user.name' };
const _expr: ExprBinding = { $expr: '1 + 1' };
const _call: CallBinding = { $call: { name: 'doThing', args: [_path] } };
const _fn: FnBinding = { $fn: '(ctx) => ctx' };

const _bind: BindDirective = {
	$bind: {
		path: '$.user.name',
		mode: 'twoWay',
		debounceMs: 100,
		validate: { schema: 'User', plugin: 'jsonschema' },
	},
};

const _node: NodeSchema = {
	type: 'div',
	class: 'p-4',
	props: { title: _path },
	children: ['hello', _expr, _call, _fn],
	..._bind,
};

const _route: RouteSchema = {
	path: '/users/:id',
	load: { url: 'https://example.com/schema.json' },
};

const _schema: UISpecSchema = {
	$uispec: '1.0',
	meta: { title: 'Example' },
	data: { user: { name: 'Ada' } },
	root: _node,
	routes: [_route],
};

void _schema;
