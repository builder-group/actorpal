import React from 'react';
import { View, type ViewProps } from 'react-native';
import { ThemeColor } from '@/environment';
import { useTheme } from '@/hooks';

export const ThemedView: React.FC<TThemedViewProps> = (props) => {
	const { style, type, ...rest } = props;
	const theme = useTheme();

	const viewStyle = React.useMemo(
		() => [{ backgroundColor: theme[type ?? 'background'] }, style],
		[theme, type, style]
	);

	return <View style={viewStyle} {...rest} />;
};

export type TThemedViewProps = ViewProps & {
	type?: ThemeColor;
};
