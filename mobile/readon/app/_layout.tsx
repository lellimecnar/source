import {
	DarkTheme as DefaultDarkTheme,
	type Theme,
	ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

import { Ico } from '@/components/icons';
import { Stack } from '@/components/themed';
import Colors from '@/const/colors';

import './global.css';

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from 'expo-router';

// declare module 'expo-router' {
// 	// eslint-disable-next-line @typescript-eslint/no-namespace -- needed
// 	namespace ExpoRouter {
// 		// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/naming-convention -- needed
// 		interface __routes {}
// 	}
// }

// eslint-disable-next-line camelcase -- needed
export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout(): JSX.Element | null {
	const [loaded, error] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
		...Ico.font,
	});

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error;
	}, [error]);

	useEffect(() => {
		if (loaded) {
			void SplashScreen.hideAsync();
		}
	}, [loaded]);

	if (!loaded) {
		return null;
	}

	return <RootLayoutNav />;
}

function RootLayoutNav(): React.JSX.Element {
	const themeName = useColorScheme() as keyof typeof Colors;
	const theme: Theme = {
		...DefaultDarkTheme,
		colors: {
			...DefaultDarkTheme.colors,
			background: Colors[themeName].background,
			text: Colors[themeName].text,
		},
	};
	return (
		<ThemeProvider value={theme}>
			<Stack>
				<Stack.Screen
					name="(tabs)"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen
					name="modal"
					options={{
						presentation: 'modal',
					}}
				/>
			</Stack>
		</ThemeProvider>
	);
}
