import { Colors } from '@/environment';
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
	const scheme = useColorScheme();
	// null / 'unspecified' both fall back to light
	const resolvedScheme = scheme === 'dark' ? 'dark' : 'light';

	return Colors[resolvedScheme];
}
