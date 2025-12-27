module.exports = {
	ci: {
		collect: {
			numberOfRuns: 3,
			startServerCommand: 'pnpm miller.pub build && pnpm miller.pub start',
			url: ['http://localhost:3000'],
			startServerReadyPattern: 'Ready',
			startServerReadyTimeout: 60000,
			settings: {
				preset: 'desktop',
				throttling: {
					rttMs: 40,
					throughputKbps: 10240,
					cpuSlowdownMultiplier: 1,
				},
			},
		},
		assert: {
			preset: 'lighthouse:recommended',
			assertions: {
				'categories:performance': ['error', { minScore: 0.8 }],
				'categories:accessibility': ['error', { minScore: 0.9 }],
				'categories:best-practices': ['error', { minScore: 0.9 }],
				'categories:seo': ['error', { minScore: 0.9 }],
			},
		},
		upload: {
			target: 'temporary-public-storage',
		},
	},
};
