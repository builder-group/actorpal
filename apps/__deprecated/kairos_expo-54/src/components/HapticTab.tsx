import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React from 'react';

export const HapticTab: React.FC<BottomTabBarButtonProps> = (props) => {
	const { onPressIn, ...rest } = props;

	return (
		<PlatformPressable
			{...rest}
			onPressIn={(ev) => {
				if (process.env.EXPO_OS === 'ios') {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				}
				onPressIn?.(ev);
			}}
		/>
	);
};
