import { type ExpoConfig, type ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	name: 'Readon',
	slug: 'readon',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/icon.png',
	scheme: 'readon',
	userInterfaceStyle: 'automatic',
	newArchEnabled: true,

	splash: {
		image: './assets/splash.png',
		resizeMode: 'contain',
		backgroundColor: '#ffffff',
	},

	ios: {
		supportsTablet: true,
		bundleIdentifier: 'app.readon',
	},

	android: {
		adaptiveIcon: {
			foregroundImage: './assets/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'app.readon',
	},

	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/favicon.png',
	},

	plugins: [
		'expo-router',
		[
			'expo-build-properties',
			{
				android: {
					minSdkVersion: 24,
					compileSdkVersion: 34,
					targetSdkVersion: 34,
					buildToolsVersion: '34.0.0',
					enableProguardInReleaseBuilds: true,
					enableShrinkResourcesInReleaseBuilds: true,
				},
				ios: {
					deploymentTarget: '15.1',
				},
			},
		],
		'@lellimecnar/expo-with-modify-gradle',
	],

	experiments: {
		typedRoutes: true,
	},
});
