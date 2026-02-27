import React from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Re-calculated on the client side so static rendering doesn't cause a flash.
export function useColorScheme() {
	const [hasHydrated, setHasHydrated] = React.useState(false);

	React.useEffect(() => {
		setHasHydrated(true);
	}, []);

	const colorScheme = useRNColorScheme();

	if (hasHydrated) {
		return colorScheme;
	}

	return 'light';
}
