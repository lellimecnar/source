/* eslint-disable react/display-name -- ignore */
import { cssInterop } from 'nativewind';
import React from 'react';
import { FlatList as ERFlatList, type ViewStyle } from 'react-native';

interface ERFlatListProps
	extends Omit<
		React.ComponentProps<typeof ERFlatList>,
		| 'style'
		| 'contentContainerStyle'
		| 'columnWrapperStyle'
		| 'ListFooterComponentStyle'
		| 'ListHeaderComponentStyle'
	> {
	style?: ViewStyle;
	contentContainerStyle?: ViewStyle;
	columnWrapperStyle?: ViewStyle;
	ListFooterComponentStyle?: ViewStyle;
	ListHeaderComponentStyle?: ViewStyle;
}

export const FlatList = cssInterop(
	React.forwardRef<ERFlatList<unknown>, ERFlatListProps>(
		(
			{
				style,
				contentContainerStyle,
				columnWrapperStyle,
				ListFooterComponentStyle,
				ListHeaderComponentStyle,
				...props
			},
			ref,
		) => {
			return (
				<ERFlatList
					style={style}
					contentContainerStyle={contentContainerStyle}
					columnWrapperStyle={columnWrapperStyle}
					ListFooterComponentStyle={ListFooterComponentStyle}
					ListHeaderComponentStyle={ListHeaderComponentStyle}
					{...props}
					ref={ref}
				/>
			);
		},
	),
	{
		className: 'style',
		contentContainerClassName: 'contentContainerStyle',
		columnWrapperClassName: 'columnWrapperStyle',
		ListFooterComponentClassName: 'ListFooterComponentStyle',
		ListHeaderComponentClassName: 'ListHeaderComponentStyle',
	},
);

export type FlatListProps = React.ComponentProps<typeof FlatList>;
