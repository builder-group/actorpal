import React from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib';
import type { TWheelPickerProps, TWheelValue } from './types';

export const WheelPicker = <TValue extends TWheelValue>(props: TWheelPickerProps<TValue>) => {
	const { className, style, testID } = props;

	return (
		<View
			testID={testID}
			className={cn('w-full items-center justify-center', className)}
			style={style}
		>
			<Text className="text-base-500 text-sm">Wheel picker is iOS-only.</Text>
		</View>
	);
};
