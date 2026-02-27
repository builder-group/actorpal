import React from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';
import { Fonts, ThemeColor } from '@/environment';
import { useTheme } from '@/hooks';

export const ThemedText: React.FC<TThemedTextProps> = (props) => {
	const { style, type = 'default', themeColor, ...rest } = props;
	const theme = useTheme();

	const textStyle = React.useMemo(
		() => [
			{ color: theme[themeColor ?? 'text'] },
			type === 'default' && styles.default,
			type === 'title' && styles.title,
			type === 'small' && styles.small,
			type === 'smallBold' && styles.smallBold,
			type === 'subtitle' && styles.subtitle,
			type === 'link' && styles.link,
			type === 'linkPrimary' && styles.linkPrimary,
			type === 'code' && styles.code,
			style
		],
		[theme, themeColor, type, style]
	);

	return <Text style={textStyle} {...rest} />;
};

export type TThemedTextProps = TextProps & {
	type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
	themeColor?: ThemeColor;
};

const styles = StyleSheet.create({
	small: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: 500
	},
	smallBold: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: 700
	},
	default: {
		fontSize: 16,
		lineHeight: 24,
		fontWeight: 500
	},
	title: {
		fontSize: 48,
		fontWeight: 600,
		lineHeight: 52
	},
	subtitle: {
		fontSize: 32,
		lineHeight: 44,
		fontWeight: 600
	},
	link: {
		lineHeight: 30,
		fontSize: 14
	},
	linkPrimary: {
		lineHeight: 30,
		fontSize: 14
	},
	code: {
		fontFamily: Fonts.mono,
		fontWeight: Platform.select({ android: 700 }) ?? 500,
		fontSize: 12
	}
});
