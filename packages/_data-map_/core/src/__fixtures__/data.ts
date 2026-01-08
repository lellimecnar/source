export const complexData = {
	users: [
		{
			id: 1,
			profile: {
				name: 'Alice',
				tags: ['dev', 'admin'],
				contact: { email: 'alice@example.com', phone: null },
			},
			settings: { theme: 'dark', notifications: { email: true, push: false } },
		},
		{
			id: 2,
			profile: {
				name: 'Bob',
				tags: ['dev'],
				contact: { email: 'bob@example.com', phone: '555-0102' },
			},
			settings: { theme: 'light', notifications: { email: false, push: true } },
		},
	],
	meta: {
		version: 1,
		flags: { beta: true, internal: false },
	},
	settings: {
		app: { name: 'readon', locale: 'en-US' },
		featureFlags: ['a', 'b', 'c'],
	},
} as const;

export type ComplexData = typeof complexData;
