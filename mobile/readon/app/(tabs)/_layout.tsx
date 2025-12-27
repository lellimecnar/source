import { type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs as ERTabs, Link } from 'expo-router';
import { cssInterop } from 'nativewind';
import React from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';

import { Ico } from '@/components/icons';

const TABS = [
	{
		name: 'index',
		options: {
			title: 'Tab One',
			tabBarIcon: ({ color, size }) => (
				<Ico name="code" color={color} size={size} />
			),
			headerRight: ({ tintColor }) => (
				<View className="mr-4 flex flex-row items-center justify-end gap-2">
					<Link href="/modal" asChild>
						<Ico name="info-outline" size={25} color={tintColor} />
					</Link>
				</View>
			),
		},
	},
	{
		name: 'two',
		options: {
			title: 'Tab Two',
			tabBarIcon: ({ color, size }) => (
				<Ico name="code" color={color} size={size} />
			),
		},
	},
] as const satisfies React.ComponentProps<typeof ERTabs.Screen>[];
export default function TabLayout(): JSX.Element {
	return (
		<Tabs
			headerClassName="bg-sky-200 border-sky-50 border-b-2 text-sky-800 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300"
			headerTitleClassName="text-sky-800 dark:text-sky-300"
			tabBarClassName="bg-sky-200 border-sky-50 border-t-2 text-sky-800 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300"
			sceneClassName="bg-sky-300 dark:bg-sky-950"
			tabBarIconClassName="size-7"
			tabBarActiveItemClassName="text-sky-950 dark:text-sky-100"
		/>
	);
}

interface ERTabsProps extends Omit<
	React.ComponentProps<typeof ERTabs>,
	'screenOptions'
> {
	headerStyle?: ViewStyle & TextStyle;
	headerBackgroundStyle?: ViewStyle;
	headerBackgroundContainerStyle?: ViewStyle;
	headerTitleStyle?: TextStyle;
	headerTitleContainerStyle?: ViewStyle;
	headerBackTitleStyle?: ViewStyle;
	headerLeftContainerStyle?: ViewStyle;
	headerRightContainerStyle?: ViewStyle;
	sceneStyle?: ViewStyle;
	tabBarStyle?: ViewStyle & TextStyle;
	tabBarActiveItemStyle?: ViewStyle & TextStyle;
	tabBarItemStyle?: ViewStyle;
	tabBarItemContainerStyle?: ViewStyle;
	tabBarIndicatorStyle?: ViewStyle;
	tabBarLabelStyle?: ViewStyle;
	tabBarLabelContainerStyle?: ViewStyle;
	tabBarIconStyle?: ViewStyle;
	tabBarBadgeStyle?: ViewStyle;
	screenOptions?: Omit<
		BottomTabNavigationOptions,
		| 'headerStyle'
		| 'tabBarStyle'
		| 'sceneStyle'
		| 'headerBackgroundContainerStyle'
	>;
}

export const Tabs = cssInterop(
	({
		headerStyle,
		headerBackgroundStyle,
		headerBackgroundContainerStyle,
		headerTitleStyle,
		headerTitleContainerStyle,
		headerBackTitleStyle,
		headerLeftContainerStyle,
		headerRightContainerStyle,
		sceneStyle,
		tabBarStyle,
		tabBarItemStyle,
		tabBarActiveItemStyle,
		tabBarItemContainerStyle,
		tabBarIndicatorStyle,
		tabBarLabelStyle,
		tabBarLabelContainerStyle,
		tabBarIconStyle,
		tabBarBadgeStyle,
		screenOptions,
		...props
	}: ERTabsProps): JSX.Element => {
		const tabOpts = {
			...screenOptions,
			sceneStyle,
			headerStyle,
			headerBackgroundContainerStyle,
			tabBarStyle,
			tabBarItemStyle,
			tabBarLabelStyle,
			tabBarIconStyle,
			tabBarBadgeStyle,
		} as BottomTabNavigationOptions;
		return (
			<ERTabs
				{...props}
				screenOptions={
					{
						...screenOptions,
						headerStyle,
						headerBackgroundStyle,
						headerTitleStyle,
						headerTitleContainerStyle,
						headerBackTitleStyle,
						headerLeftContainerStyle,
						headerRightContainerStyle,
						...(headerStyle?.color &&
							!screenOptions?.headerTintColor && {
								headerTintColor: headerStyle.color,
							}),
						sceneStyle,
						tabBarStyle,
						tabBarItemStyle,
						tabBarItemContainerStyle,
						tabBarIndicatorStyle,
						tabBarLabelStyle,
						tabBarLabelContainerStyle,
						tabBarIconStyle,
						tabBarBadgeStyle,
						tabBarActiveTintColor: tabBarActiveItemStyle?.color,
						...(tabBarStyle?.color &&
							!screenOptions?.tabBarInactiveTintColor && {
								tabBarInactiveTintColor: tabBarStyle.color,
							}),
					} as BottomTabNavigationOptions
				}
			>
				{TABS.map((opts) => (
					<ERTabs.Screen
						key={opts.name}
						{...opts}
						options={{
							...tabOpts,
							...opts.options,
						}}
					/>
				))}
			</ERTabs>
		);
	},
	{
		headerClassName: {
			target: 'headerStyle',
			nativeStyleToProp: {
				color: 'screenOptions.headerTintColor',
			},
		},
		headerBackgroundClassName: 'headerBackgroundStyle',
		headerBackgroundContainerClassName: 'headerBackgroundContainerStyle',
		headerTitleClassName: 'headerTitleStyle',
		headerTitleContainerClassName: 'headerTitleContainerStyle',
		headerBackTitleClassName: 'headerBackTitleStyle',
		headerLeftContainerClassName: 'headerLeftContainerStyle',
		headerRightContainerClassName: 'headerRightContainerStyle',
		sceneClassName: 'sceneStyle',
		tabBarClassName: 'tabBarStyle',
		tabBarItemClassName: {
			target: 'tabBarItemStyle',
			nativeStyleToProp: {
				color: 'screenOptions.tabBarInactiveTintColor',
			},
		},
		tabBarActiveItemClassName: 'tabBarActiveItemStyle',
		tabBarItemContainerClassName: 'tabBarItemContainerStyle',
		tabBarIndicatorClassName: 'tabBarIndicatorStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarLabelContainerClassName: 'tabBarLabelContainerStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
	},
);
