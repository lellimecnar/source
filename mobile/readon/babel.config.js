/** @type {import('@babel/core').ConfigFunction} */
module.exports = (api) => {
	api.cache(true);

	return {
		presets: [
			'@lellimecnar/babel-preset',
			['babel-preset-expo', { jsxImportSource: 'nativewind' }],
			'nativewind/babel',
		],
		plugins: ['react-native-reanimated/plugin'],
	};
};
