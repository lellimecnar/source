import { type ExpoConfig } from '@expo/config-types';

const backgroundColor = '#082f49';
const headerBackgroundColor = '#0c4a6e';

export default (): ExpoConfig => ({
	name: 'Read On',
	slug: 'readon',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/images/icon.png',
	scheme: 'readon',
	userInterfaceStyle: 'automatic',
	newArchEnabled: true,
	backgroundColor,
	splash: {
		image: './assets/images/splash-icon.png',
		resizeMode: 'contain',
		backgroundColor: headerBackgroundColor,
	},
	ios: {
		supportsTablet: true,
		bundleIdentifier: 'pub.miller.readon',
	},
	android: {
		adaptiveIcon: {
			foregroundImage: './assets/images/adaptive-icon.png',
			backgroundColor: '#ffffff',
		},
		package: 'pub.miller.readon',
	},
	web: {
		bundler: 'metro',
		output: 'static',
		favicon: './assets/images/favicon.png',
	},
	plugins: ['expo-router'],
	experiments: {
		typedRoutes: true,
	},
	// androidStatusBar: {
	// 	backgroundColor: headerBackgroundColor,
	// },
	// androidNavigationBar: {
	// 	backgroundColor: headerBackgroundColor,
	// },
});
