import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { AnimatedSplashOverlay, AppTabs } from '@/components';
import { useColorScheme } from '@/hooks';

const Layout: React.FC = () => {
	const colorScheme = useColorScheme();
	const theme = React.useMemo(
		() => (colorScheme === 'dark' ? DarkTheme : DefaultTheme),
		[colorScheme]
	);

	return (
		<ThemeProvider value={theme}>
			<AnimatedSplashOverlay />
			<AppTabs />
		</ThemeProvider>
	);
};

export default Layout;
