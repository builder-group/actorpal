import { Colors } from '@/environment';
import { useColorScheme } from './use-color-scheme';

export function useThemeColor(
	props: { light?: string; dark?: string },
	colorName: keyof typeof Colors.light & keyof typeof Colors.dark
): string {
	const theme = useColorScheme() ?? 'light';
	const colorFromProps = props[theme as keyof typeof props];

	if (colorFromProps != null) {
		return colorFromProps;
	}

	return Colors[theme as keyof typeof Colors][colorName];
}
