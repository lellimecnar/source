/* eslint-disable react/display-name -- ignore */
import {
	DarkTheme as DefaultDarkTheme,
	type Theme,
	ThemeProvider,
} from '@react-navigation/native';
import { type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { Stack as ERStack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { cssInterop, useColorScheme } from 'nativewind';
import React, { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import 'react-native-reanimated';

import { Ico } from '@/components/icons';
import Colors from '@/const/colors';

import './global.css';

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from 'expo-router';

// eslint-disable-next-line camelcase -- needed
export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

const SCREENS = [
	{ name: '(tabs)', options: { headerShown: false } },
	{ name: 'modal', options: { presentation: 'modal' } },
] as const satisfies React.ComponentProps<typeof ERStack.Screen>[];
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
	const { colorScheme = 'light' } = useColorScheme();
	const theme: Theme = {
		...DefaultDarkTheme,
		colors: {
			...DefaultDarkTheme.colors,
			background: Colors[colorScheme].background,
			text: Colors[colorScheme].text,
		},
	};

	return (
		<ThemeProvider value={theme}>
			<Stack
				headerClassName="bg-sky-200 border-sky-50 border-b-2 text-sky-800 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300"
				headerTitleClassName="text-sky-800 dark:text-sky-300"
				contentClassName="bg-sky-300 dark:bg-sky-950"
				navigationBarClassName="bg-sky-200 dark:bg-sky-900"
				statusBarClassName="bg-sky-200 dark:bg-sky-900"
			/>
		</ThemeProvider>
	);
}

interface ERStackProps
	extends Omit<React.ComponentProps<typeof ERStack>, 'screenOptions'> {
	headerStyle?: ViewStyle;
	headerBackgroundStyle?: ViewStyle;
	headerTitleStyle?: ViewStyle;
	headerTitleContainerStyle?: ViewStyle;
	headerBackTitleStyle?: ViewStyle;
	headerLeftContainerStyle?: ViewStyle;
	headerRightContainerStyle?: ViewStyle;
	contentStyle?: ViewStyle;
	tabBarStyle?: ViewStyle;
	tabBarItemStyle?: ViewStyle;
	tabBarItemContainerStyle?: ViewStyle;
	tabBarIndicatorStyle?: ViewStyle;
	tabBarLabelStyle?: ViewStyle;
	tabBarLabelContainerStyle?: ViewStyle;
	tabBarIconStyle?: ViewStyle;
	tabBarBadgeStyle?: ViewStyle;
	headerLargeStyle?: ViewStyle;
	headerLargeTitleStyle?: ViewStyle;
	screenOptions?: Omit<
		NativeStackNavigationOptions,
		| 'headerStyle'
		| 'headerBackgroundStyle'
		| 'headerTitleStyle'
		| 'headerTitleContainerStyle'
		| 'headerBackTitleStyle'
		| 'headerLeftContainerStyle'
		| 'headerRightContainerStyle'
		| 'contentStyle'
		| 'tabBarStyle'
		| 'tabBarItemStyle'
		| 'tabBarItemContainerStyle'
		| 'tabBarIndicatorStyle'
		| 'tabBarLabelStyle'
		| 'tabBarLabelContainerStyle'
		| 'tabBarIconStyle'
		| 'tabBarBadgeStyle'
	>;
}

const Stack = cssInterop(
	React.forwardRef<unknown, ERStackProps>(
		(
			{
				headerStyle,
				headerBackgroundStyle,
				headerTitleStyle,
				headerTitleContainerStyle,
				headerBackTitleStyle,
				headerLeftContainerStyle,
				headerRightContainerStyle,
				contentStyle,
				tabBarStyle,
				tabBarItemStyle,
				tabBarItemContainerStyle,
				tabBarIndicatorStyle,
				tabBarLabelStyle,
				tabBarLabelContainerStyle,
				tabBarIconStyle,
				tabBarBadgeStyle,
				headerLargeStyle,
				headerLargeTitleStyle,
				screenOptions,
				...props
			},
			ref,
		): JSX.Element => {
			const screenOpts = {
				...screenOptions,
				contentStyle,
				headerStyle,
				headerTitleStyle,
				headerBackTitleStyle,
				headerLargeStyle,
				headerLargeTitleStyle,
			} as NativeStackNavigationOptions;
			return (
				<ERStack
					{...props}
					screenOptions={
						{
							...screenOptions,
							statusBarStyle: 'auto',
							...(headerStyle &&
								'color' in headerStyle &&
								!screenOptions?.headerTintColor && {
									headerTintColor: headerStyle.color,
								}),
							// statusBarHidden: true,
							headerStyle,
							headerBackgroundStyle,
							headerTitleStyle,
							headerTitleContainerStyle,
							headerBackTitleStyle,
							headerLeftContainerStyle,
							headerRightContainerStyle,
							contentStyle,
							tabBarStyle,
							tabBarItemStyle,
							tabBarItemContainerStyle,
							tabBarIndicatorStyle,
							tabBarLabelStyle,
							tabBarLabelContainerStyle,
							tabBarIconStyle,
							tabBarBadgeStyle,
						} as NativeStackNavigationOptions
					}
					ref={ref}
				>
					{SCREENS.map((opts) => (
						<ERStack.Screen
							key={opts.name}
							{...opts}
							options={{
								...screenOpts,
								...opts.options,
							}}
						/>
					))}
				</ERStack>
			);
		},
	),
	{
		headerClassName: {
			target: 'headerStyle',
			// nativeStyleToProp: { color: 'screenOptions.headerTintColor' },
		},
		headerBackgroundClassName: 'headerBackgroundStyle',
		headerTitleClassName: 'headerTitleStyle',
		headerTitleContainerClassName: 'headerTitleContainerStyle',
		headerBackTitleClassName: 'headerBackTitleStyle',
		headerLeftContainerClassName: 'headerLeftContainerStyle',
		headerRightContainerClassName: 'headerRightContainerStyle',
		headerLargeClassName: 'headerLargeStyle',
		headerLargeTitleClassName: 'headerLargeTitleStyle',
		contentClassName: 'contentStyle',
		tabBarClassName: 'tabBarStyle',
		tabBarItemClassName: 'tabBarItemStyle',
		tabBarItemContainerClassName: 'tabBarItemContainerStyle',
		tabBarIndicatorClassName: 'tabBarIndicatorStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarLabelContainerClassName: 'tabBarLabelContainerStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
		statusBarClassName: {
			target: false,
			nativeStyleToProp: {
				backgroundColor: 'screenOptions.statusBarBackgroundColor',
			},
		},
		navigationBarClassName: {
			target: false,
			nativeStyleToProp: {
				backgroundColor: 'screenOptions.navigationBarColor',
			},
		},
	},
);
