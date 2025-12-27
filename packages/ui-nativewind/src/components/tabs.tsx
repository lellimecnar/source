import { type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs as ERTabs, type Href } from 'expo-router';
import { cssInterop } from 'nativewind';
import React from 'react';
import { type TextStyle, type ViewStyle } from 'react-native';

interface ERTabsProps extends Omit<
	React.ComponentProps<typeof ERTabs>,
	'screenOptions'
> {
	headerStyle?: ViewStyle;
	headerBackgroundStyle?: ViewStyle;
	headerTitleStyle?: TextStyle;
	headerTitleContainerStyle?: ViewStyle;
	headerBackTitleStyle?: ViewStyle;
	headerLeftContainerStyle?: ViewStyle;
	headerRightContainerStyle?: ViewStyle;
	sceneStyle?: ViewStyle;
	tabBarStyle?: ViewStyle;
	tabBarItemStyle?: ViewStyle;
	tabBarItemContainerStyle?: ViewStyle;
	tabBarIndicatorStyle?: ViewStyle;
	tabBarLabelStyle?: ViewStyle;
	tabBarLabelContainerStyle?: ViewStyle;
	tabBarIconStyle?: ViewStyle;
	tabBarBadgeStyle?: ViewStyle;
	screenOptions?: Omit<
		BottomTabNavigationOptions,
		'headerStyle' | 'tabBarStyle' | 'sceneStyle'
	>;
}

interface ERTabsScreenProps extends Omit<
	React.ComponentProps<typeof ERTabs.Screen>,
	'options'
> {
	sceneStyle?: ViewStyle;
	headerStyle?: ViewStyle;
	tabBarStyle?: ViewStyle;
	headerBackgroundContainerStyle?: ViewStyle;
	tabBarItemStyle?: ViewStyle;
	tabBarLabelStyle?: ViewStyle;
	tabBarIconStyle?: ViewStyle;
	tabBarBadgeStyle?: ViewStyle;
	options?: Omit<
		BottomTabNavigationOptions,
		| 'sceneStyle'
		| 'headerStyle'
		| 'tabBarStyle'
		| 'headerBackgroundContainerStyle'
		| 'tabBarItemStyle'
		| 'tabBarLabelStyle'
		| 'tabBarIconStyle'
		| 'tabBarBadgeStyle'
	> & {
		href?: { href?: Href | null };
	};
}

export const Tabs = cssInterop(
	({
		headerStyle,
		headerBackgroundStyle,
		headerTitleStyle,
		headerTitleContainerStyle,
		headerBackTitleStyle,
		headerLeftContainerStyle,
		headerRightContainerStyle,
		sceneStyle,
		tabBarStyle,
		tabBarItemStyle,
		tabBarItemContainerStyle,
		tabBarIndicatorStyle,
		tabBarLabelStyle,
		tabBarLabelContainerStyle,
		tabBarIconStyle,
		tabBarBadgeStyle,
		screenOptions,
		...props
	}: ERTabsProps): JSX.Element => {
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
						sceneStyle,
						tabBarStyle,
						tabBarItemStyle,
						tabBarItemContainerStyle,
						tabBarIndicatorStyle,
						tabBarLabelStyle,
						tabBarLabelContainerStyle,
						tabBarIconStyle,
						tabBarBadgeStyle,
					} as BottomTabNavigationOptions
				}
			/>
		);
	},
	{
		headerClassName: 'headerStyle',
		headerBackgroundClassName: 'headerBackgroundStyle',
		headerTitleClassName: 'headerTitleStyle',
		headerTitleContainerClassName: 'headerTitleContainerStyle',
		headerBackTitleClassName: 'headerBackTitleStyle',
		headerLeftContainerClassName: 'headerLeftContainerStyle',
		headerRightContainerClassName: 'headerRightContainerStyle',
		sceneClassName: 'sceneStyle',
		tabBarClassName: 'tabBarStyle',
		tabBarItemClassName: 'tabBarItemStyle',
		tabBarItemContainerClassName: 'tabBarItemContainerStyle',
		tabBarIndicatorClassName: 'tabBarIndicatorStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarLabelContainerClassName: 'tabBarLabelContainerStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
	},
);

export const TabsScreen = cssInterop(
	({
		sceneStyle,
		headerStyle,
		headerBackgroundContainerStyle,
		tabBarStyle,
		tabBarItemStyle,
		tabBarLabelStyle,
		tabBarIconStyle,
		tabBarBadgeStyle,
		options,
		...props
	}: ERTabsScreenProps) => {
		return (
			<ERTabs.Screen
				{...props}
				options={
					{
						...options,
						sceneStyle,
						headerStyle,
						headerBackgroundContainerStyle,
						tabBarStyle,
						tabBarItemStyle,
						tabBarLabelStyle,
						tabBarIconStyle,
						tabBarBadgeStyle,
					} as BottomTabNavigationOptions
				}
			/>
		);
	},
	{
		sceneClassName: 'sceneStyle',
		headerClassName: 'headerStyle',
		headerBackgroundContainerClassName: 'headerBackgroundContainerStyle',
		tabBarClassName: 'tabBarStyle',
		tabBarItemClassName: 'tabBarItemStyle',
		tabBarLabelClassName: 'tabBarLabelStyle',
		tabBarIconClassName: 'tabBarIconStyle',
		tabBarBadgeClassName: 'tabBarBadgeStyle',
	},
);

export type TabsProps = React.ComponentProps<typeof Tabs>;
export type TabsScreenProps = React.ComponentProps<typeof TabsScreen>;
