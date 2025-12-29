import { Stack as ERStack } from 'expo-router';
import { cssInterop } from 'nativewind';

// type DefaultStackProps = React.ComponentProps<typeof ERStack>;
// const DefaultStack = ERStack as unknown as (
// 	props: Omit<DefaultStackProps, 'screenOptions'> & {
// 		screenOptions?: Exclude<
// 			DefaultStackProps['screenOptions'],
// 			(...args: any[]) => any
// 		>;
// 	},
// ) => JSX.Element;

type DefaultStackScreenProps = React.ComponentProps<typeof ERStack.Screen>;
const DefaultStackScreen = ERStack.Screen as unknown as (
	props: Omit<DefaultStackScreenProps, 'options'> & {
		options?: Exclude<
			DefaultStackScreenProps['options'],
			(...args: any[]) => any
		>;
	},
) => JSX.Element;

export const Stack = Object.assign(
	cssInterop(ERStack, {
		headerClassName: {
			target: 'headerStyle',
			nativeStyleToProp: { color: 'headerTintColor' },
		},
		headerPressClassName: {
			target: false,
			nativeStyleToProp: { color: 'headerPressColor' },
		},
		headerBackgroundClassName: 'headerBackgroundStyle',
		headerTitleClassName: 'headerTitleStyle',
		headerTitleContainerClassName: 'headerTitleContainerStyle',
		headerBackTitleClassName: 'headerBackTitleStyle',
		headerLeftContainerClassName: 'headerLeftContainerStyle',
		headerRightContainerClassName: 'headerRightContainerStyle',
		sceneClassName: 'sceneStyle',
		tabBarClassName: {
			target: 'tabBarStyle',
			nativeStyleToProp: {
				color: 'tabBarInactiveTintColor',
				backgroundColor: 'tabBarInactiveBackgroundColor',
			},
		},
		tabBarActiveClassName: {
			target: false,
			nativeStyleToProp: {
				color: 'tabBarActiveTintColor',
				backgroundColor: 'tabBarActiveBackgroundColor',
			},
		},
		tabBarItemClassName: 'tabBarItemStyle',
		tabBarItemContainerClassName: 'tabBarItemContainerStyle',
		tabBarIndicatorClassName: 'tabBarIndicatorStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarLabelContainerClassName: 'tabBarLabelContainerStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
	} as any),
	{
		Screen: cssInterop(DefaultStackScreen, {
			contentClassName: 'options.contentStyle',
			headerClassName: {
				target: 'options.headerStyle',
				nativeStyleToProp: { color: 'options.headerTintColor' },
			},
			headerTitleClassName: 'options.headerTitleStyle',
			headerBackTitleClassName: 'options.headerBackTitleStyle',
			headerLargeClassName: 'options.headerLargeStyle',
			headerLargeTitleClassName: 'options.headerLargeTitleStyle',
			statusBarClassName: {
				target: 'options.statusBarStyle',
				nativeStyleToProp: {
					backgroundColor: 'options.statusBarBackgroundColor',
				},
			},
			navigationBarClassName: {
				target: false,
				nativeStyleToProp: {
					backgroundColor: 'options.navigationBarColor',
				},
			},
		}),
	},
);

export type StackProps = React.ComponentProps<typeof Stack>;
export type StackScreenProps = React.ComponentProps<typeof Stack.Screen>;
