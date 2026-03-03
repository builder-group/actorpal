import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { themeTokens } from '@/environment';

export default function SettingsLayout() {
	const colorScheme = useColorScheme();
	const tokens = themeTokens[colorScheme === 'dark' ? 'dark' : 'light'];

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{
					title: 'Settings',
					headerLargeTitle: true,
					headerTransparent: true,
					headerBlurEffect: 'systemChromeMaterial',
					headerTintColor: tokens.base900,
					headerLargeStyle: { backgroundColor: 'transparent' }
				}}
			/>
		</Stack>
	);
}
