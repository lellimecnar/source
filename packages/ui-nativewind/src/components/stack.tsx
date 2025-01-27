/* eslint-disable react/display-name -- ignore */
import { type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Stack as ERStack } from 'expo-router';
import { cssInterop } from 'nativewind';
import React from 'react';
import { type ViewStyle } from 'react-native';

interface ERStackProps
	extends Omit<React.ComponentProps<typeof ERStack>, 'screenOptions'> {
	headerStyle?: ViewStyle;
	headerBackgroundStyle?: ViewStyle;
	headerTitleStyle?: ViewStyle;
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
		NativeStackNavigationOptions,
		| 'headerStyle'
		| 'headerBackgroundStyle'
		| 'headerTitleStyle'
		| 'headerTitleContainerStyle'
		| 'headerBackTitleStyle'
		| 'headerLeftContainerStyle'
		| 'headerRightContainerStyle'
		| 'sceneStyle'
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

interface ERStackScreenProps
	extends Omit<React.ComponentProps<typeof ERStack.Screen>, 'options'> {
	contentStyle?: ViewStyle;
	headerStyle?: ViewStyle;
	headerTitleStyle?: ViewStyle;
	headerBackTitleStyle?: ViewStyle;
	headerLargeStyle?: ViewStyle;
	headerLargeTitleStyle?: ViewStyle;
	options?: Omit<
		NativeStackNavigationOptions,
		| 'contentStyle'
		| 'headerStyle'
		| 'headerTitleStyle'
		| 'headerBackTitleStyle'
		| 'headerLargeStyle'
		| 'headerLargeTitleStyle'
	>;
}

export const Stack = Object.assign(
	cssInterop(
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
				},
				ref,
			): JSX.Element => {
				return (
					<ERStack
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
							} as NativeStackNavigationOptions
						}
						ref={ref}
					/>
				);
			},
		),
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
	),
	{
		...ERStack,
		Screen: cssInterop(
			({
				contentStyle,
				headerStyle,
				headerTitleStyle,
				headerBackTitleStyle,
				headerLargeStyle,
				headerLargeTitleStyle,
				options,
				...props
			}: ERStackScreenProps): JSX.Element => {
				return (
					<ERStack.Screen
						{...props}
						options={
							{
								...options,
								contentStyle,
								headerStyle,
								headerTitleStyle,
								headerBackTitleStyle,
								headerLargeStyle,
								headerLargeTitleStyle,
							} as NativeStackNavigationOptions
						}
					/>
				);
			},
			{
				contentClassName: 'contentStyle',
				headerClassName: 'headerStyle',
				headerTitleClassName: 'headerTitleStyle',
				headerBackTitleClassName: 'headerBackTitleStyle',
				headerLargeClassName: 'headerLargeStyle',
				headerLargeTitleClassName: 'headerLargeTitleStyle',
			},
		),
	},
);

export type StackProps = React.ComponentProps<typeof Stack>;
export type StackScreenProps = React.ComponentProps<typeof Stack.Screen>;
