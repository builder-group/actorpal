import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks';

export const ThemedView: React.FC<TThemedViewProps> = (props) => {
	const { style, lightColor, darkColor, ...rest } = props;
	const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

	return <View style={[{ backgroundColor }, style]} {...rest} />;
};

interface TThemedViewProps extends ViewProps {
	lightColor?: string;
	darkColor?: string;
}
